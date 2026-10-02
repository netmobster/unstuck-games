"""The table, over MCP: CC SEREN's renderer and leak check, vendored in cc_table/.

    render  → cc_table/render_table.build()     one self-contained HTML file
    check   → cc_table/table.check_render()     and if anything leaked, it is deleted

⛔ **A leaked table is never served.** The tool returns a plain notice instead. That is the
CC rule (pieces-table.md: "filter alone is prevention with no proof; check alone is
detection after the fact; build both or neither") and over MCP it is the last fog gate we
still own, because the narration no longer passes through us.

Phase 0 serves the file at a local address (127.0.0.1) that redraws after every write and
reloads itself in the browser; `seren_table_view` offers the MCP Apps `ui://` panel to
clients that show one. Phase 1 serves it from a signed, short-lived link instead.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "cc_table"))

import render_table            # noqa: E402  (vendored)
import table as table_gate     # noqa: E402  (vendored)

import play                    # noqa: E402


def _articles() -> Path:
    return play.content_root() / "library" / "srd-5.2" / "articles"


# The artifact build carries the SRD attribution and strips the self-poll; the served build
# needs a poll back. Not the renderer's own: that one re-fetches the whole page (~840 KB, the
# SRD library is inside it) every 4 s to read one meta tag, and on this machine a stream that
# size through the antivirus stalls or is reset (2026-10-02). This one asks /stamp, which is
# a few bytes, and reloads only when the stamp has changed.
_POLL = """/*POLL-START (seren-mcp: polls /stamp, not the page)*/
const STAMP=(document.querySelector('meta[name=seren-stamp]')||{}).content||'';
if(location.protocol.startsWith('http')&&STAMP){
  setInterval(async()=>{
    try{
      const r=await fetch('stamp',{cache:'no-store'});
      const s=(await r.text()).trim();
      if(s&&s!==STAMP) location.reload();
    }catch(e){}
  },3000);
}
/*POLL-END*/"""
_STRIPPED = "/* live-poll stripped: this build is republished, not polled */\n"
_STAMP_RE = re.compile(rb'name="seren-stamp" content="([^"]*)"')


def render(folder: Path) -> tuple[str | None, list]:
    """Render and check. Returns (html, []) or (None, leaks)."""
    arts = _articles()
    page = render_table.build(str(folder), artifact=True,
                              articles_dir=str(arts) if arts.is_dir() else None)
    page = page.replace(_STRIPPED, _POLL + "\n", 1)
    out = folder / "table.html"
    out.write_text(page, encoding="utf-8")
    leaks = table_gate.check_render(str(out), str(folder))
    if leaks:
        out.unlink()
        return None, leaks
    return page, []


class _Live:
    """The table at a local address, so an open browser tab reloads itself.

    Chat clients that can't show an inline panel (Claude Desktop chat, 2026-10-02: the
    `ui://` call never reached the server) get a link instead. It is served on 127.0.0.1
    only, it serves one file and nothing else, and it reads that file fresh on every
    request. A held table has no file, so the tab shows "not drawn" rather than a stale
    page that leaked.
    """
    HELD = ("<!doctype html><meta charset='utf-8'><meta http-equiv='refresh' content='4'>"
            "<title>Seren table</title><body style='background:#100d0b;color:#e8e1d6;"
            "font:16px system-ui;padding:24px'>The table isn't drawn right now. Play on; "
            "this tab checks again every few seconds.</body>")

    def __init__(self):
        self.path: Path | None = None
        self.url: str | None = None
        self._srv = None

    def start(self) -> str:
        if self.url:
            return self.url
        import threading
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        live = self

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                route = self.path.split("?")[0]
                if route not in ("/", "/table", "/stamp"):
                    self.send_error(404)
                    return
                p = live.path
                page = p.read_bytes() if p and p.is_file() else None
                if route == "/stamp":                 # what the open tab polls
                    m = _STAMP_RE.search(page[:8192]) if page else None
                    body = m.group(1) if m else b"held"
                else:
                    body = page if page is not None else live.HELD.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a):        # stdout is the MCP pipe; never print on it
                pass

        class Srv(ThreadingHTTPServer):
            # ⛔ No SO_REUSEADDR. On Windows it lets a second process bind the SAME port, and
            # requests then land on whichever listener Windows picks (seen 2026-10-02: a
            # timeout against a dying check run). Exclusive bind is what makes "the next
            # port" true when Desktop and Claude Code both run seren.
            allow_reuse_address = False
            daemon_threads = True

        base = int(os.environ.get("SEREN_TABLE_PORT", "8794"))
        for port in range(base, base + 10):   # a second seren process takes the next port
            try:
                self._srv = Srv(("127.0.0.1", port), H)
                break
            except OSError:
                continue
        else:
            raise play.Refused("no free local port for the table")
        threading.Thread(target=self._srv.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self._srv.server_address[1]}/table"
        return self.url


LIVE = _Live()


def publish(t: "play.Table") -> dict:
    camp = t._need()
    page, leaks = render(camp.root)
    LIVE.path = camp.root / "table.html"
    url = LIVE.start()
    if page is None:
        return {"table": url,
                "held": f"The table was not drawn: {len(leaks)} thing(s) on it the player "
                        "must not see. Play on; the record is unaffected.",
                "for_the_operator": [f"{lk.what!r}: {lk.why}" for lk in leaks[:5]]}
    return {"table": url, "size_kb": round(len(page) / 1024),
            "tell_the_player": (f"Your table is at {url}. Open it in your browser beside this "
                                "chat. It redraws after every roll and change, and the tab "
                                "reloads itself.")}


def redraw(t: "play.Table") -> None:
    """After every write, once the player has asked for the table. Never breaks the write."""
    if not LIVE.url or not t.campaign:
        return
    try:
        render(t.campaign.root)
        LIVE.path = t.campaign.root / "table.html"
    except Exception:                         # a table that fails to draw is held, not fatal
        pass


# ── the inline table's data ──────────────────────────────────────────────────

def data(t: "play.Table") -> dict:
    """What the inline table (table_app.html) draws: the engine's own player_view, which is
    where the web table's fog is enforced, then checked again before it leaves.

    ⛔ Same rule as the rendered table: if the check finds anything, the view is held, not
    trimmed. A partial table that leaked is still a table that leaked.
    """
    camp = t._need()
    view = camp.player_view()
    view["title"] = camp.title()
    # The engine's player_view lists the party and `also_present`, but not non-party names in
    # scene `present` — so the fixture's cast, who are in the room on record, never showed.
    # The web table has the same gap; fixed here, in this layer, not in the engine.
    shown = {str(p.get("who") or "").lower() for p in view.get("present") or []}
    party = set(camp.party().keys())
    for slug in (camp.scene().get("present") or []):
        name = str(slug).replace("-", " ").title()
        if str(slug).lower() not in party and name.lower() not in shown:
            view["present"].append({"who": name, "state": "", "hp": ""})
    for k in ("spent", "cap", "turns"):          # web-only bookkeeping; nothing to show here
        view.pop(k, None)
    text = json.dumps(view, ensure_ascii=False)
    leaks = [l for l in play.fog.check(text, camp.dm_side()) if not play._table_talk(l)]
    if leaks:
        return {"held": "The table is not shown right now: something on it the player must "
                        "not see. Play on; the record is unaffected."}
    return view


# ── rules lookup ─────────────────────────────────────────────────────────────

def rules_lookup(query: str) -> dict:
    """SRD 5.2 articles by name first, then by body. Rules are not secret; no filter."""
    words = [w for w in re.findall(r"[a-z0-9]+", (query or "").lower()) if len(w) > 2]
    if not words:
        raise play.Refused("name the rule, spell, condition or item")
    base = _articles()
    if not base.is_dir():
        raise play.Refused("the rules library is not installed on this server")
    scored = []
    for p in base.rglob("*.md"):
        name = p.stem.replace("-", " ")
        s = sum(3 for w in words if w in name)
        if not s:
            body = p.read_text(encoding="utf-8", errors="ignore").lower()
            s = sum(1 for w in words if w in body) if all(w in body for w in words) else 0
        if s:
            scored.append((s, p))
    scored.sort(key=lambda x: (-x[0], len(x[1].stem)))
    out = []
    for s, p in scored[:3]:
        text = p.read_text(encoding="utf-8", errors="ignore")
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()
        out.append({"article": f"{p.parent.name}/{p.stem}", "text": text[:4000]})
    return {"results": out,
            "attribution": "SRD 5.2 by Wizards of the Coast LLC, CC-BY-4.0."}
