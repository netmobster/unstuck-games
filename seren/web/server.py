"""The table server. Python stdlib, one process, behind nginx.

Same shape as elsewhere/web/server.py, which has been running the other game for a week:
ThreadingHTTPServer, a password at the door, JSON in and out, and no framework. The
campaign lives on disk in SEREN's own formats, so you can read it with your eyes, and the
two things that must not be trusted to instructions — the dice and the fog — are code.

    SEREN_CONTENT_DIR   where the corpus and campaigns live (default /srv/seren)
    SEREN_CAMPAIGN      which campaign folder to play (default the only one)
    SEREN_PASSWORD      the shared door; unset means no door
    SEREN_TIER          free | paid — which model and which cap
"""
from __future__ import annotations

import json
import os
import secrets
import threading
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import close as session_close
import corpus
import dm
import gate
import llm
import state

HOST = os.environ.get("SEREN_HOST", "127.0.0.1")
PORT = int(os.environ.get("SEREN_PORT", "8790"))
STATIC = Path(__file__).parent / "static"
TIER = os.environ.get("SEREN_TIER", "free")
SID_COOKIE = "seren_sid"

_sessions: dict[str, dict] = {}
_lock = threading.Lock()


def campaign_dir() -> Path:
    named = os.environ.get("SEREN_CAMPAIGN")
    base = corpus.ROOT / "campaigns"
    if named:
        return base / named
    folders = sorted(p for p in base.iterdir() if p.is_dir()) if base.is_dir() else []
    return folders[0] if folders else base / "none"


def _session_for(sid: str) -> dict:
    with _lock:
        sess = _sessions.get(sid)
        if sess is None:
            root = campaign_dir()
            camp = state.Campaign(root=root, tier=TIER)
            camp.session = 1 + len(list((root / "sessions").glob("*.md"))) if (root / "sessions").is_dir() else 1
            sess = {"campaign": camp, "history": [], "messages": [], "pending": None}
            _sessions[sid] = sess
        return sess


class Handler(BaseHTTPRequestHandler):
    server_version = "seren"

    # ── plumbing ─────────────────────────────────────────────────────────────
    def log_message(self, fmt, *args):  # quieter than the default
        pass

    def _send(self, code: int, body: bytes, ctype: str, extra: list[tuple[str, str]] | None = None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in extra or []:
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, payload: dict, extra=None):
        self._send(code, json.dumps(payload).encode("utf-8"), "application/json", extra)

    def _body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(min(length, 64_000)) or "{}")
        except (ValueError, json.JSONDecodeError):
            return {}

    def _sid(self) -> tuple[str, bool]:
        jar = SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie") or "")
        except Exception:
            pass
        got = jar.get(SID_COOKIE)
        if got and got.value:
            return got.value, False
        return secrets.token_hex(8), True

    def _gated(self) -> bool:
        """True when the door is shut against this request."""
        return gate.enabled() and not gate.cookie_ok(self.headers.get("Cookie") or "")

    # ── routes ───────────────────────────────────────────────────────────────
    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/health":
            return self._json(200, {
                "ok": True,
                "corpus": corpus.health(),
                "campaign": str(campaign_dir()),
                "bedrock": llm.ready(),
                "tier": TIER,
                "model": llm.model_for(TIER),
                "cap": llm.cap_for(TIER),
                "door": gate.enabled(),
            })

        if path in ("/gate", "/gate/"):
            return self._send(200, gate.PAGE.encode("utf-8"), "text/html; charset=utf-8")

        if self._gated():
            return self._send(200, gate.PAGE.encode("utf-8"), "text/html; charset=utf-8")

        if path in ("/", "/play", "/play/", "/table"):
            return self._file(STATIC / "table.html")
        if path == "/chat":
            return self._file(STATIC / "index.html")
        if path.startswith("/static/"):
            return self._file(STATIC / path[len("/static/"):])
        return self._json(404, {"error": "no such thing"})

    def _file(self, path: Path):
        try:
            path = path.resolve()
            if STATIC.resolve() not in path.parents and path != STATIC.resolve():
                return self._json(403, {"error": "no"})
            body = path.read_bytes()
        except OSError:
            return self._json(404, {"error": "no such file"})
        kinds = {".html": "text/html; charset=utf-8", ".js": "text/javascript",
                 ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png"}
        self._send(200, body, kinds.get(path.suffix, "application/octet-stream"))

    def do_POST(self):
        path = self.path.split("?")[0]

        if path == "/api/gate":
            ok = gate.check(str(self._body().get("password") or ""))
            if not ok:
                return self._json(401, {"ok": False})
            return self._json(200, {"ok": True}, [gate.set_cookie_header()])

        if self._gated():
            return self._json(401, {"error": "the door is shut"})

        sid, fresh = self._sid()
        cookie = [("Set-Cookie", f"{SID_COOKIE}={sid}; Path=/; SameSite=Lax; HttpOnly")] if fresh else None
        sess = _session_for(sid)
        camp = sess["campaign"]

        if path == "/api/session":
            view = camp.player_view()
            view["cap"] = f"${llm.cap_for(camp.tier):.2f}"
            # Sent once, at the door: the parts of the table that are not in play.
            view["pages"] = camp.pages()
            view["sheet"] = camp.sheet()
            view["library"] = camp.library()
            view["campaign"] = camp.title()
            view["beats"] = [{"kind": "note", "text": f"SESSION {camp.session} — the table is set"}]
            if not corpus.ROOT.is_dir():
                view["beats"].append({"kind": "note", "text": "NO CORPUS FOUND — set SEREN_CONTENT_DIR"})
            return self._json(200, view, cookie)

        if path == "/api/turn":
            said = str(self._body().get("text") or "").strip()[:2000]
            if not said:
                return self._json(400, {"error": "say something"})
            if not llm.ready():
                return self._json(503, {"error": "the DM is not connected (no Bedrock)"})
            try:
                out = dm.take_turn(camp, sess["history"], said)
            except llm.CapReached as exc:
                return self._json(402, {"error": str(exc)})
            except Exception as exc:
                return self._json(500, {"error": f"{type(exc).__name__}: {exc}"})
            sess["history"] = out["messages"][-24:]  # a session's worth, trimmed at the edges
            sess["pending"] = out.get("pending")
            sess["messages"] = out["messages"]
            view = camp.player_view()
            view["cap"] = f"${llm.cap_for(camp.tier):.2f}"
            view["beats"] = out["beats"]
            view["pending"] = bool(out.get("pending"))
            return self._json(200, view, cookie)

        if path == "/api/roll":
            # The player pressed the dice. The server rolls; the tray only ever shows
            # numbers it was given (ROLL-MECHANIC.md).
            pending = sess.get("pending")
            if not pending:
                return self._json(409, {"error": "nothing has been asked for"})
            try:
                out = dm.resume_roll(camp, sess.get("messages") or sess["history"], pending)
            except llm.CapReached as exc:
                return self._json(402, {"error": str(exc)})
            except Exception as exc:
                return self._json(500, {"error": f"{type(exc).__name__}: {exc}"})
            sess["pending"] = out.get("pending")
            sess["messages"] = out["messages"]
            sess["history"] = out["messages"][-24:]
            view = camp.player_view()
            view["cap"] = f"${llm.cap_for(camp.tier):.2f}"
            view["beats"] = out["beats"]
            view["pending"] = bool(out.get("pending"))
            return self._json(200, view, cookie)

        if path == "/api/close":
            out = session_close.close(camp, sess["history"])
            counts = out["counts"]
            sess["history"] = []
            camp.session += 1
            return self._json(200, {
                "beats": [
                    {"kind": "note", "text": f"SESSION CLOSED — {counts['rolls']} rolls, "
                                             f"{counts['facts_this_session']} facts, written to "
                                             + ", ".join(out["written"])},
                    {"kind": "dm", "text": out["log"]},
                ],
                **camp.player_view(),
            }, cookie)

        return self._json(404, {"error": "no such thing"})


def main():
    print(f"seren on http://{HOST}:{PORT}  corpus={corpus.ROOT}  campaign={campaign_dir().name}")
    print(f"  door={'on' if gate.enabled() else 'OFF'}  bedrock={llm.ready()}  tier={TIER} -> {llm.model_for(TIER)}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
