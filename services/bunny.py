#!/usr/bin/env python3
"""Bunny Goes: keeps one person's picks and Bebu's notes, behind a secret link.

The page at /bunny-goes/ is public: a general guide to moving to Paramaribo. What's private
is what Bunny picks there (her salary, her move date, the streets she likes) and the notes
Bebu hides for her. Those live here, on the box in BUNNY_DIR, and never in the repo.

There is no password screen. The page reads a key from its link (#k=...) and sends it in
X-Bunny-Key. Writing notes takes a second key, X-Bebu-Key, so only Bebu can change them.
Wrong keys are rate-limited per address. Bodies are never logged.

    GET    /state   -> {"state": {...}, "updatedAt": "..."}   (X-Bunny-Key)
    PUT    /state   <- the page's state, JSON, 64 KB at most    (X-Bunny-Key)
    DELETE /state   forgets it ("Forget my picks")              (X-Bunny-Key)
    GET    /notes   -> [{"where": ..., "text": ...}]           (X-Bunny-Key)
    PUT    /notes   <- the same list                            (X-Bunny-Key and X-Bebu-Key)
    GET    /health  -> {"ok": true}                             (no key, nothing private)

    env: BUNNY_KEY, BUNNY_BEBU_KEY (in /etc/bunny.env), BUNNY_DIR (/srv/bunny), BUNNY_PORT (8775)
"""
from __future__ import annotations

import hmac
import json
import os
import sys
import time
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

KEY = os.environ.get("BUNNY_KEY", "")
BEBU_KEY = os.environ.get("BUNNY_BEBU_KEY", "")
DIR = Path(os.environ.get("BUNNY_DIR", "/srv/bunny"))
PORT = int(os.environ.get("BUNNY_PORT", "8775"))

MAX_STATE = 64_000
MAX_NOTES = 32_000
MAX_NOTE_TEXT = 1_000
KEEP_HISTORY = 20                 # earlier copies of the state, so a bad save can be undone
WINDOW, MISSES = 3600, 10         # wrong keys per address per hour before a 429
_misses: dict[str, deque] = {}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def same(given: str, want: str) -> bool:
    return bool(want) and hmac.compare_digest(given.encode(), want.encode())


def write_json(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def keep_history() -> None:
    cur = DIR / "state.json"
    if not cur.exists():
        return
    hist = DIR / "history"
    hist.mkdir(mode=0o700, exist_ok=True)
    cur_copy = hist / f"state-{int(time.time())}.json"
    cur_copy.write_bytes(cur.read_bytes())
    os.chmod(cur_copy, 0o600)
    for old in sorted(hist.glob("state-*.json"))[:-KEEP_HISTORY]:
        old.unlink()


def clean_notes(raw) -> list | None:
    if not isinstance(raw, list):
        return None
    out = []
    for n in raw[:100]:
        if not isinstance(n, dict):
            return None
        where, text = str(n.get("where", ""))[:40], str(n.get("text", "")).strip()[:MAX_NOTE_TEXT]
        if where and text:
            out.append({"where": where, "text": text})
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "bunny-goes"

    def log_message(self, fmt, *args):            # the request line only: never a body or a key
        sys.stderr.write("[bunny] " + (fmt % args) + "\n")

    def _ip(self) -> str:
        return self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()

    def _reply(self, code: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _blocked(self) -> bool:
        q = _misses.setdefault(self._ip(), deque())
        t = time.time()
        while q and t - q[0] > WINDOW:
            q.popleft()
        return len(q) >= MISSES

    def _miss(self) -> None:
        _misses.setdefault(self._ip(), deque()).append(time.time())

    def _authed(self, bebu: bool = False) -> bool:
        if self._blocked():
            self._reply(429, {"error": "slow down"})
            return False
        ok = same(self.headers.get("X-Bunny-Key", ""), KEY)
        if ok and bebu:
            ok = same(self.headers.get("X-Bebu-Key", ""), BEBU_KEY)
        if not ok:
            self._miss()
            self._reply(401, {"error": "this needs the private link"})
        return ok

    def _body(self, cap: int):
        n = int(self.headers.get("Content-Length") or 0)
        if n > cap:
            return None, 413
        try:
            return json.loads(self.rfile.read(n) or b"null"), 200
        except ValueError:
            return None, 400

    def _route(self) -> str:
        p = self.path.split("?", 1)[0].rstrip("/")
        return p[len("/bunny-goes/api"):] if p.startswith("/bunny-goes/api") else p

    def do_GET(self):
        r = self._route()
        if r == "/health":
            return self._reply(200, {"ok": True, "keys": bool(KEY) and bool(BEBU_KEY)})
        if r not in ("/state", "/notes") or not self._authed():
            return None if r in ("/state", "/notes") else self._reply(404, {"error": "no"})
        if r == "/state":
            return self._reply(200, read_json(DIR / "state.json", {"state": None, "updatedAt": None}))
        return self._reply(200, read_json(DIR / "notes.json", []))

    def do_PUT(self):
        r = self._route()
        if r == "/state":
            if not self._authed():
                return None
            data, code = self._body(MAX_STATE)
            if code != 200 or not isinstance(data, dict):
                return self._reply(code if code != 200 else 400, {"error": "a state object, under 64 KB"})
            keep_history()
            write_json(DIR / "state.json", {"state": data, "updatedAt": now()})
            return self._reply(200, {"ok": True})
        if r == "/notes":
            if not self._authed(bebu=True):
                return None
            data, code = self._body(MAX_NOTES)
            notes = clean_notes(data) if code == 200 else None
            if notes is None:
                return self._reply(code if code != 200 else 400, {"error": "a list of {where, text}"})
            write_json(DIR / "notes.json", notes)
            return self._reply(200, {"ok": True, "notes": len(notes)})
        return self._reply(404, {"error": "no"})

    def do_DELETE(self):
        if self._route() != "/state":
            return self._reply(404, {"error": "no"})
        if not self._authed():
            return None
        keep_history()
        (DIR / "state.json").unlink(missing_ok=True)
        return self._reply(200, {"ok": True})


if __name__ == "__main__":
    if not KEY or not BEBU_KEY:
        print("[bunny] BUNNY_KEY and BUNNY_BEBU_KEY must be set (box.ps1 bunny-env writes them)", file=sys.stderr)
        sys.exit(1)
    DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    print(f"bunny-goes on 127.0.0.1:{PORT} · keeping state in {DIR}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
