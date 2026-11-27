"""Seren's MCP server: the fortune teller's table inside Claude.

Written from scratch on 25 Nov 2026 (seren/MCP-MVP-PLAN.md). MINDER on the selfActual vault
server is the pattern we follow, not code we copy:

- The app is a tool. `open_seren` is the one tool Claude sees; it opens the app.
- The app's own work goes through app-only tools (`visibility: ["app"]`): `seren_deal` reads the
  shelf and the decks, `seren_weave` writes the book. Claude never sees them in its tool list.
- One HTML resource, served as `text/html;profile=mcp-app`, at an address that carries a hash of
  the HTML. A catch-all template answers old addresses, because claude.ai keeps the tool list it
  saw when it connected.
- Tools are typed read-only or write, with matching hints (the vault server's tool-types.js).
- Streamable HTTP, stateless.

**One engine (A1).** The app is the web table's own deal page (`seren/web/static/deal.html`), and
the tools import the web port's own modules: `published` (campaigns, never truths), `weave` (the
weaver, fake or real, and the book), `audit` (the auditor). Nothing is copied.

**Assets over the tunnel.** Art and music are served by this server at `/assets/...`, and the
app's content security policy allows `SEREN_PUBLIC_URL`, the tunnel's address (see run-tunnel.ps1).

Run it:   .venv/Scripts/python server.py      (http://127.0.0.1:3020/mcp)
Test it:  .venv/Scripts/python test_server.py
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shutil
import sys
import threading
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
SEREN = HERE.parent
WEB = SEREN / "web"
PROJECTS = SEREN.parent.parent
LOCAL = SEREN / ".local"

# The web port's settings, as run_local.py sets them: fake AI unless told otherwise.
os.environ.setdefault("SEREN_AI", "mock")
os.environ.setdefault("SEREN_CONTENT_DIR", str(LOCAL / "content"))
os.environ.setdefault("SEREN_PUBLISHED", str(PROJECTS / "SEREN" / "campaigns" / "published"))
# Real AI from this laptop: UG's corner of SA's AWS account (the 'selfactual' sign-in, us-east-2), and
# Opus for the paid tier. Only Bedrock model calls are made; nothing else in the account is touched.
os.environ.setdefault("AWS_PROFILE", "selfactual")
os.environ.setdefault("AWS_REGION", "us-east-2")
os.environ.setdefault("SEREN_MODEL_PAID", "us.anthropic.claude-opus-5-5")
(LOCAL / "content").mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(WEB))

import audit  # noqa: E402  (the web port's modules, after its path)
import corpus  # noqa: E402
import llm  # noqa: E402
import narrate  # noqa: E402
import published  # noqa: E402
import bring  # noqa: E402
import weave  # noqa: E402

from mcp.server.apps import Apps, ResourceCsp, client_supports_apps  # noqa: E402
from mcp.server.mcpserver import Context, MCPServer  # noqa: E402
from mcp.server.transport_security import TransportSecuritySettings  # noqa: E402
from mcp_types import ToolAnnotations  # noqa: E402
from starlette.requests import Request  # noqa: E402
from starlette.responses import FileResponse, JSONResponse, Response  # noqa: E402

VENDOR = HERE / "vendor" / "ext-apps-1.7.5-app-with-deps.js"
DEAL = WEB / "static" / "deal.html"
AUDIO = WEB / "static" / "audio" / "forest-pulse.mp3"
BOOKS = LOCAL / "books"            # every woven book, kept for red team
TIER = os.environ.get("SEREN_TIER", "free")
PORT = int(os.environ.get("SEREN_MCP_PORT", "3020"))
PUBLIC = (os.environ.get("SEREN_PUBLIC_URL") or f"http://127.0.0.1:{PORT}").rstrip("/")
ACCOUNT = "mcp"                    # one local player until sign-up exists
AI_MODE = LOCAL / "ai-mode"        # "real" or "fake": switch without restarting (ai.ps1)


def ai_mode() -> str:
    """Real or fake AI, read on every call, so the switch needs no restart and no new tunnel address."""
    try:
        want = AI_MODE.read_text(encoding="utf-8").strip().lower()
    except OSError:
        want = ""
    if want in ("real", "fake"):
        os.environ["SEREN_AI"] = "bedrock" if want == "real" else "mock"
    return "fake" if weave.mocking() else "real"

# The vault server's tool types. Read-only tools leave out the destructive and idempotent hints:
# the MCP spec says those only mean something when a tool writes.
READ = ToolAnnotations(readOnlyHint=True, openWorldHint=False)
CREATE = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)


def _library() -> str:
    """The MCP Apps browser library, made loadable inline.

    The vendored build is an ES module ending in one `export{a as B,...}`. An inline module
    can't be imported from, so the export becomes `window.McpApps = {B: a, ...}`.
    """
    src = VENDOR.read_text(encoding="utf-8")
    match = re.search(r"export\{([^}]*)\};?\s*$", src)
    if not match:
        raise RuntimeError(f"{VENDOR.name}: no trailing export statement to rewrite")
    pairs = []
    for item in match.group(1).split(","):
        local, _, public = item.strip().partition(" as ")
        pairs.append(f"{(public or local).strip()}:{local.strip()}")
    return src[: match.start()] + "window.McpApps={" + ",".join(pairs) + "};if(window.__mcpResolve)window.__mcpResolve();"


# The bridge: the deal page's three hooks, answered by MCP tool calls instead of fetch.
BRIDGE = """<script>
window.SEREN_APP=true;window.SEREN_AUDIO=%(audio)s;
window.__mcpReady=new Promise(function(r){window.__mcpResolve=r});
(function(){
  var app=null,ready=window.__mcpReady.then(function(){
    var A=window.McpApps;if(window.parent===window)throw new Error('open this through Claude');
    // autoResize off: left on, the app reports its whole page height and Claude stretches the chat
    // frame to fit it (26 Nov: "more than the full page"). A fixed frame scrolls inside instead.
    app=new A.App({name:'seren-table',version:'0.3.1'},{availableDisplayModes:['inline','fullscreen']},{autoResize:false});
    return app.connect().then(function(){
      app.sendSizeChanged({width:Math.ceil(window.innerWidth),height:INLINE_HEIGHT});
      var ctx=app.getHostContext()||{},modes=ctx.availableDisplayModes||[];
      fullButton(modes.indexOf('fullscreen')>=0,ctx.displayMode);
      app.onhostcontextchanged=function(){var c=app.getHostContext()||{};fullButton((c.availableDisplayModes||modes).indexOf('fullscreen')>=0,c.displayMode)};
      // Jay's flow: the table pops out full screen, MINDER-style. Hosts may only allow it after a click,
      // so ask now and again on the first click.
      var go=function(){var c=app.getHostContext()||{};if((c.availableDisplayModes||modes).indexOf('fullscreen')>=0&&c.displayMode!=='fullscreen')app.requestDisplayMode({mode:'fullscreen'}).catch(function(){})};
      go();document.addEventListener('click',function once(){document.removeEventListener('click',once,true);go()},true);
    });
  });
  var INLINE_HEIGHT=640;
  function fullButton(can,mode){
    var b=document.getElementById('seren-full');
    if(!can){if(b)b.remove();return}
    if(!b){b=document.createElement('button');b.id='seren-full';b.type='button';
      b.style.cssText='position:fixed;right:12px;bottom:12px;z-index:80;font:600 10.5px/1 Work Sans,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:11px 14px;border-radius:999px;border:1px solid #c9a44a;background:#0f1728;color:#e3c06a;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.6)';
      b.onclick=function(e){e.stopPropagation();var full=(app.getHostContext()||{}).displayMode==='fullscreen';
        app.requestDisplayMode({mode:full?'inline':'fullscreen'}).catch(function(){})};
      document.body.appendChild(b)}
    b.textContent=mode==='fullscreen'?'Back to the chat':'Full screen';
  }
  function call(name,args){
    return ready.then(function(){return app.callServerTool({name:name,arguments:args||{}})}).then(function(r){
      var s=r&&r.structuredContent;if(r&&r.isError&&!s)throw new Error(((r.content||[])[0]||{}).text||'the tool failed');return s||{};
    });
  }
  window.serenShelf=function(){return call('seren_deal')};
  window.serenWeave=function(body){
    // A real weave runs in the background on the server; ask every 4 seconds until it is done (about 2-3 minutes).
    return call('seren_weave',body).then(function(j){
      if(!j.pending)return{ok:!!j.ok,j:j};
      var n=0;return new Promise(function(done){(function ask(){
        if(++n>120)return done({ok:false,j:{error:'The weave took longer than eight minutes. Try again.'}});
        setTimeout(function(){call('seren_weave_status',{job:j.job}).then(function(s){
          if(window.serenWeaveProgress)window.serenWeaveProgress(s);
          if(s.pending)return ask();done({ok:!!s.ok,j:s})}).catch(function(){ask()})},4000)})()});
    });
  };
  window.serenDownload=function(j){
    var file={type:'resource',resource:{uri:'file:///'+j.slug+'.md',mimeType:'text/markdown',text:j.book||''}};
    return ready.then(function(){return app.downloadFile({contents:[file]})})
      .catch(function(){return app.openLink({url:j.download})}).catch(function(){});
  };
  window.serenCharacter=function(url){return call('seren_character',{url:url})};
  window.serenLevel=function(b){return call('seren_level',b)};
  window.serenSaveBuild=function(b){return call('seren_save_build',b)};
  window.serenAsk=function(text){
    // "Talk it over in chat": the question goes into the conversation as the player's own message.
    return ready.then(function(){return app.sendMessage({role:'user',content:[{type:'text',text:text}]})});
  };
  window.serenWoven=function(j){
    // Claude learns what was woven, so the player can talk about the book in the chat.
    ready.then(function(){return app.updateModelContext({content:[{type:'text',text:
      'The player wove a Seren campaign at the table: '+j.title+'. Their book follows. It is player-side and true; '+
      'do not add secrets to it.\\n\\n'+(j.book||'')}]})}).catch(function(){});
  };
})();
</script>
"""


def app_html() -> str:
    """The deal page, with the MCP Apps library and the bridge put in front of its own script."""
    page = DEAL.read_text(encoding="utf-8")
    head = (BRIDGE % {"audio": json.dumps(f"{PUBLIC}/assets/audio/forest-pulse.mp3")}
            + "<script type=\"module\">" + _library() + "</script>\n")
    marker = "<script>\n(function(){"
    if marker not in page:
        raise RuntimeError("deal.html: can't find the start of its script to put the bridge before")
    return page.replace(marker, head + marker, 1)


HTML = app_html()
HASH = hashlib.sha256((HTML + PUBLIC).encode("utf-8")).hexdigest()[:8]
APP_URI = f"ui://seren/table-{HASH}.html"
CSP = ResourceCsp(
    resource_domains=[PUBLIC, "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    connect_domains=[PUBLIC],
)

apps = Apps()
apps.add_html_resource(APP_URI, HTML, name="Seren", title="Seren · the fortune teller's table",
                       csp=CSP, prefers_border=False)


@apps.tool(
    resource_uri=APP_URI,
    name="open_seren",
    title="Open Seren",
    description=(
        "Open Seren, the fortune teller's table, full screen. Use this when the player wants to "
        "play Seren, start or choose a campaign, or sit at the table. It takes no arguments."
    ),
    annotations=READ,
)
def open_seren(ctx: Context) -> dict[str, Any]:
    """The one tool Claude sees. Read-only: it opens the app and changes nothing."""
    note = ("The table is open. The player chooses a campaign, is dealt a hand, tunes it and weaves "
            "a book, all in the app." if client_supports_apps(ctx) else
            "Seren's table is an app, and this client can't show apps. Try it in Claude.")
    return {"app": "seren", "screen": "shelf", "note": note}


def _art(c: dict) -> dict:
    """The shelf card with its art on this server's public address."""
    c = dict(c)
    for key in ("header", "back"):
        if c.get(key, "").startswith("/published/"):
            c[key] = f"{PUBLIC}/assets{c[key]}"
    return c


@apps.tool(
    resource_uri=APP_URI,
    visibility=["app"],
    name="seren_deal",
    title="Seren: the shelf and the decks",
    description="The published campaigns, their decks and dials. Player-side only: never the truths.",
    annotations=READ,
)
def seren_deal() -> dict[str, Any]:
    ai_mode()
    chars = []
    for p in published.characters():
        p = dict(p)
        p["art"] = {k: f"{PUBLIC}/assets{v}" for k, v in p["art"].items()}
        chars.append(p)
    return {"campaigns": [_art(c) for c in published.listing()], "characters": chars, "fake_ai": weave.mocking()}


@apps.tool(
    resource_uri=APP_URI,
    visibility=["app"],
    name="seren_weave",
    title="Seren: weave the book",
    description=("Weave the dealt hand into a campaign and write the player's book. Creates a new "
                 "campaign and book each time; changes nothing that exists."),
    annotations=CREATE,
)
def seren_weave(picks: dict[str, Any], cards: dict[str, Any], dials: dict[str, Any]) -> dict[str, Any]:
    """The web table's /api/weave, as a tool: weave, audit (one mend), write the book, save it.

    A real weave on Opus takes about two and a half minutes, and Claude gives up on a tool call at two
    (26 Nov, the play-through: "MCP error -32001: Request timed out", while the server went on to write
    the book). So a real weave starts in the background and returns a job at once; the app asks
    seren_weave_status until it is done. Fake AI answers in a second, so it still answers inline."""
    tier = "paid" if ai_mode() == "real" else TIER      # real from the switch means Opus
    if weave.mocking():
        return _weave_now(picks, cards, dials, tier)
    job = secrets.token_hex(6)
    JOBS[job] = {"pending": True, "started": time.time(), "log": [], "teller": None}

    # The fortune teller talks while Opus writes (Jay, 27 Nov). She gets a copy of the hand as the app
    # sent it, before the sealed cards are added below, and the shelf card: only what the player saw.
    seen = json.loads(json.dumps(cards))
    shelf = next((c for c in published.listing() if c.get("slug") == picks.get("campaign")), None)

    def tell():
        out = narrate.lines(shelf, seen, dials)
        if job in JOBS:
            JOBS[job]["teller"] = out
        print(f"  [weave {job}] the teller is talking ({out.get('source')}, {len(out.get('lines') or [])} lines)", flush=True)
    threading.Thread(target=tell, daemon=True, name=f"teller-{job}").start()

    def note(say: str) -> None:
        # Where the weave is, for the table's live log and this window (Jay, 27 Nov: "so we know where
        # things are hanging"). Each line carries the seconds since the weave began.
        t = int(time.time() - JOBS[job]["started"])
        JOBS[job]["log"].append({"t": t, "say": say})
        print(f"  [weave {job}] {t // 60}:{t % 60:02d}  {say}", flush=True)

    def run():
        started, log = JOBS[job]["started"], JOBS[job]["log"]
        try:
            out = _weave_now(picks, cards, dials, tier, note)
        except Exception as exc:  # never leave a job pending forever
            out = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
        note("Done." if out.get("ok") else "Stopped: " + str(out.get("error")))
        out["log"], out["seconds"] = log, int(time.time() - started)
        out["teller"] = JOBS[job].get("teller")
        JOBS[job] = out
    threading.Thread(target=run, daemon=True, name=f"weave-{job}").start()
    return {"ok": True, "pending": True, "job": job, "note": "Weaving. Ask seren_weave_status with this job."}


JOBS: dict[str, dict] = {}       # weaves in flight and done, this server's lifetime only


@apps.tool(
    resource_uri=APP_URI,
    visibility=["app"],
    name="seren_weave_status",
    title="Seren: is the book woven yet",
    description="Whether a weave started by seren_weave has finished, and its book when it has.",
    annotations=READ,
)
def seren_weave_status(job: str) -> dict[str, Any]:
    out = JOBS.get(job)
    if out is None:
        return {"ok": False, "error": "no weave with that job here (the server may have restarted)"}
    if out.get("pending"):
        return {"ok": True, "pending": True, "seconds": int(time.time() - out["started"]), "log": out["log"],
                "teller": out.get("teller")}
    return out


def _weave_now(picks: dict[str, Any], cards: dict[str, Any], dials: dict[str, Any], tier: str,
               note=lambda say: None) -> dict[str, Any]:
    if picks.get("campaign"):
        for slot, card in published.sealed(str(picks["campaign"])).items():
            cards.setdefault(slot, card)       # sealed cards never reached the app
    if not cards.get("trope") or not cards.get("trouble"):
        return {"ok": False, "error": "that hand is not finished"}
    if not llm.ready():
        return {"ok": False, "error": "the weaver is not connected (no Bedrock)"}
    try:
        note("She weaves your hand into one story" + ("" if weave.mocking() else " (Claude Opus, the longest step)"))
        out = weave.weave(picks, dials, cards, tier=tier)
        camp, spent = out["campaign"], out["spent"]
        note("The Doorkeeper reads it")
        problems = audit.check(camp) + weave.player_leaks(camp, picks, cards)
        if problems:
            note(f"The Doorkeeper sent back {len(problems)} thing{'s' if len(problems) != 1 else ''}; she mends it")
            out = weave.mend(camp, problems, picks, dials, cards, tier=tier)
            camp, spent = out["campaign"], spent + out["spent"]
            note("The Doorkeeper reads the mend")
            problems = audit.check(camp) + weave.player_leaks(camp, picks, cards)
        if problems:
            return {"ok": False, "error": "the Doorkeeper sent it back", "problems": problems}
        note("It passed. She writes your book")
        written = weave.book(camp, picks, dials, cards, tier=tier)
        camp["briefing"], spent = written["book"], spent + written["spent"]
        note("Binding it and saving your copy")
    except llm.CapReached as exc:
        return {"ok": False, "error": str(exc)}
    except Exception as exc:  # the app shows it; the server keeps running
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    slug = weave.slugify(camp.get("title"), "a-campaign") + "-" + secrets.token_hex(2)
    module = corpus.ROOT / "players" / ACCOUNT / "modules" / slug
    weave.write_module(module, camp, picks, dials, cards)
    BOOKS.mkdir(parents=True, exist_ok=True)
    (BOOKS / f"{slug}.md").write_text(camp["briefing"], encoding="utf-8")   # for red team
    return {
        "ok": True, "slug": slug, "title": camp.get("title"), "premise": camp.get("premise"),
        "opening": camp.get("opening"), "where": camp.get("where"), "book": camp["briefing"],
        "download": f"{PUBLIC}/book/{slug}.md", "spent": round(spent, 4), "fake_ai": weave.mocking(),
    }


# ── bring your own character: the ladder (Jay, 26 Nov). The store is seren/web/bring.py ──

@apps.tool(
    resource_uri=APP_URI,
    name="seren_character",
    title="Seren: bring a character",
    description=("Bring a player's own D&D character to Seren's table. Pass `url`: a D&D Beyond character link "
                 "whose owner set it to Public. Or, when the player attached a character sheet (such as D&D Beyond's "
                 "PDF export) in the chat, read it and pass `sheet` in this shape: {name, species, cls (one of the "
                 "twelve 2024 classes), subclass, level, abilities {str,dex,con,int,wis,cha}, hp, spells [{name, level, "
                 "source: class|species|subclass|feat|item, always}], feats [{name}], items [{name, magic, rarity, "
                 "attuned}]}. Saves the sheet so the table's ladder can fit it to the campaign's level."),
    annotations=CREATE,
)
def seren_character(url: str = "", sheet: dict[str, Any] | None = None) -> dict[str, Any]:
    return bring.bring(url, sheet)



@apps.tool(
    resource_uri=APP_URI,
    visibility=["app"],
    name="seren_level",
    title="Seren: the ladder",
    description="Every rung between a brought character's level and the campaign's, with the choice still to make.",
    annotations=READ,
)
def seren_level(key: str, target: int, decisions: dict[str, Any] | None = None) -> dict[str, Any]:
    return bring.level(key, target, decisions)



@apps.tool(
    resource_uri=APP_URI,
    name="seren_ruling",
    title="Seren: rule on something the table can't check",
    description=("Make a ruling for the player's character on Seren's ladder, when the table asked about something "
                 "the rules on disk don't cover. kind is class, subclass, spell, item or feat. `name` is the name "
                 "on the sheet; `to` is what Seren should treat it as (an SRD class, subclass, spell, item or feat), "
                 "or empty to drop it. Give the reason in `why`. Talk it over with the player first; the table "
                 "picks the ruling up by itself."),
    annotations=CREATE,
)
def seren_ruling(key: str, kind: str, name: str = "", to: str = "", why: str = "") -> dict[str, Any]:
    return bring.rule(key, kind, name, to, why)



@apps.tool(
    resource_uri=APP_URI,
    visibility=["app"],
    name="seren_save_build",
    title="Seren: write the fitted character",
    description=("Write the fitted character, only if every rung was decided and every item has a fate "
                 "(SEREN devolve.md section 2). Returns the card that takes the who-you-play slot."),
    annotations=CREATE,
)
def seren_save_build(key: str, target: int, decisions: dict[str, Any], campaign: str = "", name: str = "") -> dict[str, Any]:
    return bring.save(key, target, decisions, campaign, name)



server = MCPServer(
    "seren",
    title="Seren",
    version="0.3.0",
    instructions=("Seren is a single-player tabletop RPG. Call open_seren to open the table, where the "
                  "player chooses a campaign, is dealt a hand, tunes it and weaves their book."),
    extensions=[apps],
)


@server.resource("ui://seren/{file}", mime_type="text/html;profile=mcp-app", name="Seren (any address)")
def any_address(file: str) -> str:
    """Old app addresses still answer, with today's page (MINDER's catch-all, apps.js 376-382)."""
    return HTML


# ── assets and the book, over the tunnel ───────────────────────────────────────────────────
SAFE = re.compile(r"^[a-z0-9-]{1,64}$")


@server.custom_route("/assets/published/{slug}/{name}", methods=["GET"])
async def art(request: Request) -> Response:
    body = published.art(request.path_params["slug"], request.path_params["name"])
    if body is None:
        return JSONResponse({"error": "no such art"}, status_code=404)
    return Response(body, media_type="image/webp", headers={"Cache-Control": "public, max-age=3600"})


@server.custom_route("/assets/characters/{name}", methods=["GET"])
async def character_art(request: Request) -> Response:
    return _char(request.path_params["name"])


@server.custom_route("/assets/characters/in-situ/{name}", methods=["GET"])
async def character_art_situ(request: Request) -> Response:
    return _char("in-situ/" + request.path_params["name"])


def _char(name: str) -> Response:
    body = published.character_art(name)
    if body is None:
        return JSONResponse({"error": "no such art"}, status_code=404)
    return Response(body, media_type="image/webp", headers={"Cache-Control": "public, max-age=3600"})


@server.custom_route("/assets/audio/forest-pulse.mp3", methods=["GET"])
async def music(request: Request) -> Response:
    return FileResponse(AUDIO, media_type="audio/mpeg")


@server.custom_route("/book/{file}", methods=["GET"])
async def book_file(request: Request) -> Response:
    slug = request.path_params["file"].removesuffix(".md")
    path = BOOKS / f"{slug}.md"
    if not SAFE.match(slug) or not path.is_file():
        return JSONResponse({"error": "no such book"}, status_code=404)
    return FileResponse(path, media_type="text/markdown; charset=utf-8", filename=f"{slug}.md")


@server.custom_route("/health", methods=["GET"])
async def health(request: Request) -> Response:
    return JSONResponse({"ok": True, "public": PUBLIC, "ai_mode": ai_mode(), "fake_ai": weave.mocking(), "ai": llm.ready(),
                         "campaigns": len(published.listing())})


class NoStream:
    """A GET on /mcp asks for a standing event stream. Stateless, we have none to offer, and the
    SDK answered 200 with a stream it closed at once: through the tunnel that's a dropped
    connection, and claude.ai showed the connector as "Server not responding" (26 Nov). The spec's
    answer is 405, which clients take to mean "no stream here"."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http" and scope.get("method") == "GET" and scope.get("path", "").rstrip("/") == "/mcp":
            await send({"type": "http.response.start", "status": 405,
                        "headers": [(b"allow", b"POST"), (b"content-type", b"application/json")]})
            await send({"type": "http.response.body", "body": b'{"error":"no event stream: this server is stateless"}'})
            return
        await self.app(scope, receive, send)


def asgi_app():
    hosts = ["127.0.0.1:*", "localhost:*"]
    if PUBLIC.startswith("https://"):
        hosts.append(urlparse(PUBLIC).netloc)
    return NoStream(server.streamable_http_app(
        streamable_http_path="/mcp",
        stateless_http=True,
        # json_response=True would be tidier, but in mcp 2.2.0 stateless it sends an empty body (26 Nov).
        transport_security=TransportSecuritySettings(allowed_hosts=hosts, allowed_origins=["https://claude.ai", PUBLIC]),
        host=os.environ.get("SEREN_MCP_HOST", "127.0.0.1"),
    ))


CERT, KEY = HERE / "certs" / "cert.pem", HERE / "certs" / "key.pem"


def main() -> None:
    """HTTPS when there's a local certificate, which is how the tunnel reaches us.

    AVG's Web Shield rewrites plain-HTTP loopback traffic on /mcp (Imprint Desk found it on 10 Nov,
    the-desktop/DECISIONS.md), and claude.ai saw "Couldn't reach" for Seren the same way on 26 Nov.
    Over TLS it can't touch the traffic. cloudflared connects with --no-tls-verify (run-tunnel.ps1).
    The certificate is self-signed for localhost, made locally and gitignored."""
    import uvicorn
    tls = {"ssl_certfile": str(CERT), "ssl_keyfile": str(KEY)} if CERT.is_file() and KEY.is_file() else {}
    uvicorn.run(asgi_app(), host=os.environ.get("SEREN_MCP_HOST", "127.0.0.1"), port=PORT, log_level="info", **tls)


if __name__ == "__main__":
    main()
