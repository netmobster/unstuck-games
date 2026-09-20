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
import shutil
import threading
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import close as session_close
import audit
import corpus
import dice
import dm
import files
import gate
import llm
import state
import weave

HOST = os.environ.get("SEREN_HOST", "127.0.0.1")
PORT = int(os.environ.get("SEREN_PORT", "8790"))
STATIC = Path(__file__).parent / "static"
TIER = os.environ.get("SEREN_TIER", "free")
SID_COOKIE = "seren_sid"

_sessions: dict[str, dict] = {}
_lock = threading.Lock()


# Until there is a login, everybody is the same player. The seam is the code path, not
# the cookie: when auth lands it fills ACCOUNT in and nothing else changes.
ACCOUNT = os.environ.get("SEREN_ACCOUNT", "solo")


def campaign_slug() -> str:
    named = os.environ.get("SEREN_CAMPAIGN")
    if named:
        return named
    base = corpus.ROOT / "campaigns"
    folders = sorted(p.name for p in base.iterdir() if p.is_dir()) if base.is_dir() else []
    return folders[0] if folders else "none"


def current_file() -> Path:
    """Which campaign this account is playing. On disk, because the server restarts and the
    player should not be quietly handed somebody else's world when it does."""
    return corpus.ROOT / "players" / ACCOUNT / "current.txt"


def campaign_dir() -> Path:
    """This player's own copy: the one they last wove, or the module they started from."""
    try:
        chosen = current_file().read_text(encoding="utf-8").strip()
    except OSError:
        chosen = ""
    if chosen:
        live = corpus.ROOT / "players" / ACCOUNT / chosen
        if live.is_dir():
            return live
    return state.player_campaign(corpus.ROOT, ACCOUNT, campaign_slug())


def _live_file(root: Path) -> Path:
    """Where an unfinished session waits between visits. Beside the campaign, not in it —
    it is this play's memory, and the close ceremony is what turns it into a session log."""
    return root / "state" / "session.json"


def _save(sess: dict) -> None:
    """Written after every turn. Small, whole-file, and last-write-wins by design."""
    camp = sess["campaign"]
    try:
        _live_file(camp.root).write_text(json.dumps({
            "session": camp.session,
            "turns": camp.turns,
            "spent": camp.spent,
            "stream": sess["stream"][-120:],
            "messages": sess["messages"][-24:],
            "pending": sess["pending"],
        }, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass  # a session that cannot be saved is still a session that can be played


def _session_for(sid: str) -> dict:
    with _lock:
        sess = _sessions.get(sid)
        if sess is None:
            root = campaign_dir()
            camp = state.Campaign(root=root, tier=TIER)
            camp.session = 1 + len(list((root / "sessions").glob("*.md"))) if (root / "sessions").is_dir() else 1
            sess = {"campaign": camp, "history": [], "messages": [], "pending": None, "stream": []}
            # Pick up where they left off, if they left off mid-session.
            try:
                saved = json.loads(_live_file(root).read_text(encoding="utf-8"))
                if saved.get("session") == camp.session:
                    camp.turns = saved.get("turns", 0)
                    camp.spent = float(saved.get("spent") or 0.0)
                    sess["stream"] = saved.get("stream") or []
                    sess["messages"] = saved.get("messages") or []
                    sess["history"] = sess["messages"][-24:]
                    sess["pending"] = saved.get("pending")
            except (OSError, ValueError):
                pass
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
        if path in ("/loom", "/loom/"):
            return self._file(STATIC / "loom.html")
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
            opening = [{"kind": "note", "text": f"SESSION {camp.session} — the table is set"}]
            if not corpus.ROOT.is_dir():
                opening.append({"kind": "note", "text": "NO CORPUS FOUND — set SEREN_CONTENT_DIR"})
            if not sess["stream"]:
                # A campaign nobody has played opens on the scene the weaver wrote, said by
                # her, before anybody types anything.
                said = camp.opening() if not dice.read(camp.ledger) else ""
                if said:
                    opening.append({"kind": "dm", "text": said})
                sess["stream"] = opening
            # Everything the player has been shown this session, so a refresh costs nothing.
            view["beats"] = sess["stream"]
            view["pending"] = bool(sess.get("pending"))
            _save(sess)
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
            sess["stream"].append({"kind": "said", "text": said})
            sess["stream"].extend(out["beats"])
            sess["pending"] = out.get("pending")
            sess["messages"] = out["messages"]
            view = camp.player_view()
            view["cap"] = f"${llm.cap_for(camp.tier):.2f}"
            view["beats"] = out["beats"]
            view["pending"] = bool(out.get("pending"))
            _save(sess)
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
            sess["stream"].extend(out["beats"])
            view = camp.player_view()
            view["cap"] = f"${llm.cap_for(camp.tier):.2f}"
            view["beats"] = out["beats"]
            view["pending"] = bool(out.get("pending"))
            _save(sess)
            return self._json(200, view, cookie)

        if path == "/api/weave":
            # The Loom hands over what it dealt; nothing here re-rolls it.
            body = self._body()
            picks = body.get("picks") or {}
            cards = body.get("cards") or {}
            dials = body.get("dials") or {}
            if not cards.get("trope") or not cards.get("trouble"):
                return self._json(400, {"error": "that hand is not finished"})
            if not llm.ready():
                return self._json(503, {"error": "the weaver is not connected (no Bedrock)"})

            try:
                out = weave.weave(picks, dials, cards, tier=TIER)
                campaign_obj, spent = out["campaign"], out["spent"]
                problems = audit.check(campaign_obj)
                mended = False
                if problems:
                    # One fix pass: the auditor's complaints go back to the weaver before
                    # anybody is asked to deal again.
                    out = weave.mend(campaign_obj, problems, picks, dials, cards, tier=TIER)
                    campaign_obj, mended = out["campaign"], True
                    spent += out["spent"]
                    problems = audit.check(campaign_obj)
                if problems:
                    return self._json(422, {"error": "the auditor refused it",
                                            "problems": problems, "spent": round(spent, 4)})
            except llm.CapReached as exc:
                return self._json(402, {"error": str(exc)})
            except Exception as exc:
                return self._json(500, {"error": f"{type(exc).__name__}: {exc}"})

            slug = weave.slugify(campaign_obj.get("title"), "a-campaign")
            root = corpus.ROOT / "players" / ACCOUNT
            module = root / "modules" / slug
            weave.write_module(module, campaign_obj, picks, dials, cards, body.get("seed"))

            # A module is inert. Playing it means instantiating a copy that may have state.
            live = root / slug
            if live.is_dir():
                slug = slug + "-" + secrets.token_hex(2)
                live = root / slug
            shutil.copytree(module, live)

            try:                       # remembered across restarts, and across tabs
                current_file().parent.mkdir(parents=True, exist_ok=True)
                files.write(current_file(), slug)
            except OSError:
                pass

            with _lock:
                camp = state.Campaign(root=live, tier=TIER)
                camp.session = 1
                sess.update({"campaign": camp, "history": [], "messages": [],
                             "pending": None, "stream": []})
            _save(sess)
            return self._json(200, {
                "ok": True, "slug": slug, "title": campaign_obj.get("title"),
                "premise": campaign_obj.get("premise"), "opening": campaign_obj.get("opening"),
                "where": campaign_obj.get("where"), "mended": mended,
                "spent": round(spent, 4), "play": "/table",
            }, cookie)

        if path == "/api/close":
            out = session_close.close(camp, sess["history"])
            counts = out["counts"]
            sess["history"] = []
            sess["messages"] = []
            sess["pending"] = None
            sess["stream"] = []
            camp.session += 1
            try:
                _live_file(camp.root).unlink(missing_ok=True)   # the log is the record now
            except OSError:
                pass
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
