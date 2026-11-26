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
(LOCAL / "content").mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(WEB))

import audit  # noqa: E402  (the web port's modules, after its path)
import corpus  # noqa: E402
import llm  # noqa: E402
import published  # noqa: E402
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
  window.serenWeave=function(body){return call('seren_weave',body).then(function(j){return{ok:!!j.ok,j:j}})};
  window.serenDownload=function(j){
    var file={type:'resource',resource:{uri:'file:///'+j.slug+'.md',mimeType:'text/markdown',text:j.book||''}};
    return ready.then(function(){return app.downloadFile({contents:[file]})})
      .catch(function(){return app.openLink({url:j.download})}).catch(function(){});
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
    return {"campaigns": [_art(c) for c in published.listing()], "fake_ai": weave.mocking()}


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
    """The web table's /api/weave, as a tool: weave, audit (one mend), write the book, save it."""
    if picks.get("campaign"):
        for slot, card in published.sealed(str(picks["campaign"])).items():
            cards.setdefault(slot, card)       # sealed cards never reached the app
    if not cards.get("trope") or not cards.get("trouble"):
        return {"ok": False, "error": "that hand is not finished"}
    if not llm.ready():
        return {"ok": False, "error": "the weaver is not connected (no Bedrock)"}
    try:
        out = weave.weave(picks, dials, cards, tier=TIER)
        camp, spent = out["campaign"], out["spent"]
        problems = audit.check(camp)
        if problems:
            out = weave.mend(camp, problems, picks, dials, cards, tier=TIER)
            camp, spent = out["campaign"], spent + out["spent"]
            problems = audit.check(camp)
        if problems:
            return {"ok": False, "error": "the Doorkeeper sent it back", "problems": problems}
        written = weave.book(camp, picks, dials, cards, tier=TIER)
        camp["briefing"], spent = written["book"], spent + written["spent"]
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
    return JSONResponse({"ok": True, "public": PUBLIC, "fake_ai": weave.mocking(), "ai": llm.ready(),
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
