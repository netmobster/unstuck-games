#!/usr/bin/env python3
"""The contact form's back end: keep the message, then try to email it.

Two jobs, in this order, because the order is the whole point:

  1. Write the message to disk. This cannot fail quietly, needs no credentials,
     and means a message is never lost because a mail service was unhappy.
  2. Try to send it on via SES. If that fails the sender still gets a yes, and
     the message is sitting in /srv/contact waiting to be read.

Nothing here trusts the client: fields are length-capped, the honeypot is
checked, and one sender cannot post more than a handful of times an hour.

    ELSEWHERE-style env:
      CONTACT_TO      where mail is sent        (default wearecleardigital@gmail.com)
      CONTACT_FROM    verified SES sender       (default hello@unstuck-games.com)
      CONTACT_DIR     where messages are kept   (default /srv/contact)
      CONTACT_PORT    listen port               (default 8770)
      AWS_REGION      SES region
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

TO = os.environ.get("CONTACT_TO", "wearecleardigital@gmail.com")
FROM = os.environ.get("CONTACT_FROM", "hello@unstuck-games.com")
DIR = Path(os.environ.get("CONTACT_DIR", "/srv/contact"))
PORT = int(os.environ.get("CONTACT_PORT", "8770"))
REGION = os.environ.get("AWS_REGION", "us-east-2")

LIMITS = {"name": 120, "email": 200, "topic": 80, "message": 8000}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]+$")
WINDOW, BURST = 3600, 6        # per IP, per hour
_seen: dict[str, deque] = {}


def clean(value, cap: int) -> str:
    return str(value or "").strip()[:cap]


def rate_ok(ip: str) -> bool:
    now = time.time()
    q = _seen.setdefault(ip, deque())
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= BURST:
        return False
    q.append(now)
    return True


def store(msg: dict) -> Path:
    DIR.mkdir(parents=True, exist_ok=True)
    path = DIR / f"{msg['at'][:10]}-{msg['id']}.json"
    path.write_text(json.dumps(msg, indent=1, ensure_ascii=False), encoding="utf-8")
    return path


def send(msg: dict) -> str:
    """Hand it to SES. Returns a status string; never raises."""
    try:
        import boto3
        body = (
            f"From: {msg['name'] or 'no name given'} <{msg['email']}>\n"
            f"About: {msg['topic']}\n"
            f"When: {msg['at']}\n"
            f"Ref:  {msg['id']}\n\n"
            f"{msg['message']}\n"
        )
        boto3.client("ses", region_name=REGION).send_email(
            Source=FROM,
            Destination={"ToAddresses": [TO]},
            ReplyToAddresses=[msg["email"]] if EMAIL_RE.match(msg["email"]) else [],
            Message={
                "Subject": {"Data": f"unstuck-games.com — {msg['topic']}"},
                "Body": {"Text": {"Data": body}},
            },
        )
        return "sent"
    except Exception as exc:                       # stored already; say why and move on
        print(f"[contact] SES declined ({exc.__class__.__name__}: {exc}); message kept on disk",
              file=sys.stderr, flush=True)
        return "stored-only"


class Handler(BaseHTTPRequestHandler):
    server_version = "unstuck-contact"

    def log_message(self, fmt, *args):
        sys.stderr.write("[contact] " + (fmt % args) + "\n")

    def _reply(self, code: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.rstrip("/") not in ("/api/contact", "/contact"):
            return self._reply(404, {"error": "no"})
        ip = self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
        if not rate_ok(ip):
            return self._reply(429, {"error": "slow down"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            data = json.loads(self.rfile.read(min(n, 64_000)) or "{}")
        except Exception:
            return self._reply(400, {"error": "unreadable"})

        if clean(data.get("company"), 50):         # honeypot: only bots fill it
            return self._reply(200, {"ok": True})  # look successful, keep nothing

        msg = {
            "id": uuid.uuid4().hex[:10],
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "ip": ip,
            "name": clean(data.get("name"), LIMITS["name"]),
            "email": clean(data.get("email"), LIMITS["email"]),
            "topic": clean(data.get("topic"), LIMITS["topic"]) or "Something else entirely",
            "message": clean(data.get("message"), LIMITS["message"]),
        }
        if not EMAIL_RE.match(msg["email"]) or len(msg["message"]) < 2:
            return self._reply(400, {"error": "an email and a message, please"})

        path = store(msg)
        msg["delivery"] = send(msg)
        path.write_text(json.dumps(msg, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"[contact] {msg['id']} from {msg['email']} — {msg['delivery']}", flush=True)
        return self._reply(200, {"ok": True, "ref": msg["id"]})

    def do_GET(self):
        # A health check the deploy can read, with nothing private in it.
        if self.path.rstrip("/") == "/api/contact":
            kept = len(list(DIR.glob("*.json"))) if DIR.exists() else 0
            return self._reply(200, {"ok": True, "stored": kept, "to": TO[:3] + "…", "from": FROM})
        return self._reply(404, {"error": "no"})


if __name__ == "__main__":
    DIR.mkdir(parents=True, exist_ok=True)
    print(f"contact service on 127.0.0.1:{PORT} · keeping messages in {DIR} · mailing {TO}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
