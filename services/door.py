#!/usr/bin/env python3
"""A password door for playtest games that are only files.

SEREN and Elsewhere keep their own doors, because they are programs and can check a cookie
themselves. A game that is only files (The Last Warren's /play/) has nowhere to put one,
so nginx asks this service first (`auth_request /door/check`). With a valid pass the files
are served exactly as before. Without one, nginx sends the visitor to the door page, which
is drawn in the game's own look.

This is a door, not a security system: one shared password, no accounts. The pass is a
signed cookie, never the password. It is signed with the host and the password, so it
opens one game's door only, and changing the password signs everyone out.

    DOOR_PASSWORD   the shared word. Unset means the door stays shut for everyone
    DOOR_SECRET     signs the pass. Pin it, or every restart signs everyone out
    DOOR_PORT       listen port (default 8771)

Routes, which nginx forwards; none of them is public on its own:
    GET  /door/check         204 with a valid pass, 401 without (for auth_request)
    GET  /door?next=/play/   the door page (or straight through, with a pass)
    POST /door/enter         {"password": "..."}: sets the pass and answers 204, or 403
"""
from __future__ import annotations

import hashlib
import hmac
import html
import json
import os
import secrets
import time
import urllib.parse
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("DOOR_PORT", "8771"))
SECRET = os.environ.get("DOOR_SECRET") or secrets.token_hex(16)
COOKIE = "ug_door"
MAX_AGE = 60 * 60 * 24 * 14  # a fortnight, then type it again

# One door per game. A host that isn't listed gets the plain studio door.
DOORS = {
    "last-warren.unstuck-games.com": {
        "name": "THE LAST WARREN",
        "what": "A tower defense game where you are the thing trying not to be found. "
                "Every tick you grow, and every hunter takes a step.",
        "why": "It is in playtest and still changing under its players, so for now the door is invite-only.",
        "back": ("/", "← The diary"),
        "topic": "The Last Warren: asking for a password",
    },
}
STUDIO = {
    "name": "UNSTUCK GAMES",
    "what": "A game in playtest.",
    "why": "It is still rough, so for now the door is invite-only.",
    "back": ("https://unstuck-games.com/", "← Unstuck Games"),
    "topic": "Asking for a playtest password",
}


def password() -> str:
    return os.environ.get("DOOR_PASSWORD", "").strip()


def _sign(host: str, expires: int) -> str:
    msg = f"{host}|{expires}|{password()}".encode("utf-8")
    return hmac.new(SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def mint(host: str) -> str:
    expires = int(time.time()) + MAX_AGE
    return f"{expires}.{_sign(host, expires)}"


def valid(host: str, header: str) -> bool:
    if not password() or not header:
        return False
    jar = SimpleCookie()
    try:
        jar.load(header)
    except Exception:
        return False
    if COOKIE not in jar:
        return False
    try:
        raw, sig = jar[COOKIE].value.split(".", 1)
        expires = int(raw)
    except (ValueError, AttributeError):
        return False
    return expires > time.time() and hmac.compare_digest(sig, _sign(host, expires))


def safe_next(query: str) -> str:
    """Where to go after the door. Taken raw, because nginx passes the original request
    on unencoded: /door?next=/play/?watch&seed=1. Only paths on this host are allowed."""
    raw = query.split("next=", 1)[1] if "next=" in query else "/play/"
    nxt = urllib.parse.unquote(raw)
    if not nxt.startswith("/") or nxt.startswith("//") or "\\" in nxt:
        return "/play/"
    return nxt


def page(door: dict, nxt: str) -> bytes:
    e = html.escape
    back_href, back_text = door["back"]
    body = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(door['name'].title())} · the door</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&family=Big+Shoulders+Stencil+Display:wght@600..900&display=swap">
<style>
  :root{{--bg:#070806;--ink:#e4ddcc;--mute:#8f8a76;--line:rgba(228,221,204,.14);--moss:#8fbf63;--blood:#e2654c;--gold:#d2b052;color-scheme:dark}}
  *{{box-sizing:border-box}} html,body{{margin:0;background:var(--bg);color:var(--ink)}}
  body{{font:400 14px/1.6 "JetBrains Mono",ui-monospace,Consolas,monospace;min-height:100vh;display:grid;place-items:center;padding:24px 16px}}
  .door{{width:min(480px,100%)}}
  h1{{font:800 clamp(44px,11vw,72px)/.9 "Big Shoulders Stencil Display",Impact,sans-serif;letter-spacing:.02em;margin:0 0 16px;color:var(--moss);text-shadow:0 0 24px rgba(143,191,99,.3)}}
  p{{margin:0 0 12px}} .why{{color:var(--mute)}}
  .label{{font-size:11px;letter-spacing:.16em;color:var(--mute);margin:26px 0 8px}}
  form{{display:flex;gap:8px;flex-wrap:wrap}}
  input,textarea{{flex:1;min-width:0;background:#11120f;border:1px solid var(--line);color:var(--ink);font:inherit;font-size:16px;padding:11px 12px;border-radius:2px;outline:none}}
  input:focus,textarea:focus{{border-color:var(--gold)}}
  button{{font:700 13px "JetBrains Mono",monospace;letter-spacing:.14em;padding:11px 16px;border:1px solid var(--gold);background:var(--gold);color:#11120f;cursor:pointer;border-radius:2px}}
  button:disabled{{opacity:.5;cursor:default}}
  .no{{min-height:22px;margin-top:8px;color:var(--blood)}}
  .ask{{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}} .ask.lit{{border-top-color:var(--gold)}}
  .ask form{{flex-direction:column}} .ask button{{align-self:flex-start;background:transparent;color:var(--gold)}}
  .hp{{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}}
  .sent{{min-height:20px;margin-top:8px;color:var(--mute)}}
  a{{color:var(--mute)}} .back{{display:inline-block;margin-top:26px}}
</style></head>
<body><div class="door">
  <h1>{e(door['name'])}</h1>
  <p>{e(door['what'])}</p>
  <p class="why">{e(door['why'])}</p>
  <div class="label">HAVE A PASSWORD?</div>
  <form id="f" autocomplete="off">
    <input id="p" type="password" placeholder="password" aria-label="Password" autofocus>
    <button type="submit">ENTER</button>
  </form>
  <div class="no" id="no" role="status"></div>
  <section class="ask" id="ask" aria-labelledby="at">
    <div class="label" id="at">NO PASSWORD?</div>
    <p class="why">Ask, and a person will read it.</p>
    <form id="af">
      <input id="ae" type="email" required autocomplete="email" placeholder="your email" aria-label="Your email">
      <textarea id="am" required rows="3" placeholder="A line about you, or why you want in." aria-label="Message"></textarea>
      <div class="hp"><label for="ac">Company</label><input id="ac" tabindex="-1" autocomplete="off"></div>
      <button type="submit">ASK FOR A KEY</button>
    </form>
    <div class="sent" id="as" role="status"></div>
  </section>
  <a class="back" href="{e(back_href)}">{e(back_text)}</a>
</div>
<script>
const NEXT = {json.dumps(nxt)}, TOPIC = {json.dumps(door['topic'])};
document.getElementById('f').onsubmit = async e => {{
  e.preventDefault();
  const r = await fetch('/door/enter', {{ method: 'POST', headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify({{ password: document.getElementById('p').value }}) }});
  if (r.ok) {{ location.replace(NEXT); return; }}
  document.getElementById('no').textContent = 'Not that one. No password? Ask for one below.';
  document.getElementById('ask').classList.add('lit');
  document.getElementById('p').value = ''; document.getElementById('p').focus();
}};
document.getElementById('af').onsubmit = async e => {{
  e.preventDefault();
  const b = e.target.querySelector('button'), out = document.getElementById('as');
  b.disabled = true; out.textContent = 'Sending…';
  try {{
    const r = await fetch('/api/contact', {{ method: 'POST', headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ email: document.getElementById('ae').value, message: document.getElementById('am').value,
        company: document.getElementById('ac').value, topic: TOPIC }}) }});
    if (r.ok) {{ e.target.hidden = true; out.textContent = 'Sent. A person will get back to you.'; return; }}
    out.textContent = r.status === 429 ? 'That is a lot of asking. Try again in an hour.' : 'That did not send. Check the email address and try again.';
  }} catch {{ out.textContent = 'That did not send. Try again in a moment.'; }}
  b.disabled = false;
}};
</script>
<script src="/switcher.js" defer></script>
</body></html>"""
    return body.encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "unstuck-door"

    def log_message(self, fmt, *args):
        pass  # the door does not keep a diary of who knocked

    def _host(self) -> str:
        return (self.headers.get("Host") or "").split(":")[0].lower()

    def _send(self, code: int, body: bytes = b"", ctype: str = "text/plain; charset=utf-8", extra=()):
        self.send_response(code)
        for k, v in extra:
            self.send_header(k, v)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        path, _, query = self.path.partition("?")
        host = self._host()
        if path == "/door/check":
            return self._send(204 if valid(host, self.headers.get("Cookie", "")) else 401)
        if path.rstrip("/") == "/door":
            nxt = safe_next(query)
            if valid(host, self.headers.get("Cookie", "")):
                return self._send(302, extra=[("Location", nxt)])
            return self._send(200, page(DOORS.get(host, STUDIO), nxt), "text/html; charset=utf-8")
        return self._send(404, b"no")

    def do_POST(self):
        if self.path.partition("?")[0] != "/door/enter":
            return self._send(404, b"no")
        try:
            n = int(self.headers.get("Content-Length") or 0)
            word = str(json.loads(self.rfile.read(min(n, 4096)) or "{}").get("password", "")).strip()
        except Exception:
            word = ""
        if password() and hmac.compare_digest(word.encode("utf-8"), password().encode("utf-8")):
            cookie = f"{COOKIE}={mint(self._host())}; Path=/; Max-Age={MAX_AGE}; HttpOnly; Secure; SameSite=Lax"
            return self._send(204, extra=[("Set-Cookie", cookie)])
        time.sleep(0.4)  # a wrong word costs a moment; guessing costs a lot of them
        return self._send(403, b"not that one")


if __name__ == "__main__":
    print(f"door on 127.0.0.1:{PORT} · {'password set' if password() else 'NO PASSWORD: the door stays shut'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
