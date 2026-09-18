"""A shared-password gate for the web prototype.

Set ELSEWHERE_PASSWORD and every page and every API call needs the word first.
Leave it unset and the server is exactly as it was: open, local, no gate.

This is a door, not a security system: one password, shared, no accounts. It exists
because the API spends real money on Bedrock per call, so a gate that only lives in
the browser's JavaScript would not actually protect anything — anyone can skip the
page and POST to /api/session directly. So the check runs here, on the server, and
the pass is a signed cookie rather than the password itself.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from http.cookies import SimpleCookie

COOKIE = "elsewhere_pass"
MAX_AGE = 60 * 60 * 24 * 14  # a fortnight, then type it again
# New secret per boot unless one is pinned: restarting the server signs everyone out.
SECRET = os.environ.get("ELSEWHERE_COOKIE_SECRET") or secrets.token_hex(16)


def password() -> str:
    return os.environ.get("ELSEWHERE_PASSWORD", "").strip()


def enabled() -> bool:
    return bool(password())


def _sign(expires: int) -> str:
    msg = f"{expires}.{password()}".encode("utf-8")
    return hmac.new(SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def mint() -> str:
    expires = int(time.time()) + MAX_AGE
    return f"{expires}.{_sign(expires)}"


def valid(token: str) -> bool:
    try:
        raw, sig = token.split(".", 1)
        expires = int(raw)
    except (ValueError, AttributeError):
        return False
    if expires < time.time():
        return False
    return hmac.compare_digest(sig, _sign(expires))


def cookie_ok(header: str) -> bool:
    if not header:
        return False
    jar = SimpleCookie()
    try:
        jar.load(header)
    except Exception:
        return False
    morsel = jar.get(COOKIE)
    return bool(morsel and valid(morsel.value))


def check(candidate: str) -> bool:
    """Compare in constant time, so the answer doesn't leak through the clock."""
    return bool(candidate) and hmac.compare_digest(candidate.strip(), password())


def set_cookie_header() -> tuple[str, str]:
    return ("Set-Cookie", f"{COOKIE}={mint()}; Path=/; Max-Age={MAX_AGE}; SameSite=Lax; HttpOnly")


PAGE = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Elsewhere</title>
<meta name="theme-color" content="#0d0c0b">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Spectral:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0c0b;color:#e8e2d4;
       font-family:Spectral,Georgia,serif;padding:24px}
  .door{width:min(460px,100%);text-align:center;padding:28px 0}
  .mark{width:64px;height:64px;display:block;margin:0 auto 14px}
  .mark .ring-dim{fill:none;stroke:#2a2622;stroke-width:5;stroke-dasharray:14.8 2.8}
  .mark .ring-lit{fill:none;stroke:#ff4d00;stroke-width:5;stroke-dasharray:105 71;animation:ember 3s ease-in-out infinite}
  .mark .disc{fill:#e9e1d3}.mark .bite{fill:#0d0c0b}
  @keyframes ember{0%,100%{opacity:.55}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){.mark .ring-lit{animation:none}}
  h1{font-family:Cinzel,Georgia,serif;font-weight:600;font-size:30px;letter-spacing:.14em;margin:0 0 6px}
  p{margin:0 0 22px;font-style:italic;color:#9a9182;line-height:1.5}
  .what{font-style:normal;color:#e8e2d4;font-size:17px;margin-bottom:12px}
  .why{font-size:15px;margin-bottom:26px}
  .have{font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:.16em;color:#c2a46a;margin:0 0 8px;text-align:left}
  .back{display:inline-block;margin-top:26px;color:#9a9182;font-size:14px;text-decoration:none;border-bottom:1px solid #3b352c}
  .back:hover{color:#e8e2d4}
  form{display:flex;gap:8px}
  input{flex:1;background:#151311;border:1px solid #3b352c;border-radius:2px;color:#e8e2d4;
        font:inherit;font-size:16px;padding:12px 13px;outline:none}
  input:focus{border-color:#c2a46a}
  button{font-family:Cinzel,Georgia,serif;letter-spacing:.1em;font-size:14px;padding:12px 18px;
         background:#c2a46a;color:#17140f;border:none;border-radius:2px;cursor:pointer}
  button:hover{background:#e8e2d4}
  .no{margin-top:14px;min-height:20px;color:#b4573f;font-style:italic}
  /* No password: ask for one right here, without leaving the door. */
  .ask{margin-top:34px;text-align:left;border:1px solid #3b352c;border-radius:3px;padding:20px 20px 18px;background:#12100e;transition:border-color .4s}
  .ask.lit{border-color:#c2a46a}
  .ask h2{font-family:Cinzel,Georgia,serif;font-weight:600;font-size:16px;letter-spacing:.12em;margin:0 0 6px;color:#c2a46a}
  .ask p{margin:0 0 14px;font-size:15px}
  .ask form{flex-direction:column;gap:8px}
  .ask textarea{background:#151311;border:1px solid #3b352c;border-radius:2px;color:#e8e2d4;font:inherit;font-size:16px;
        padding:12px 13px;min-height:84px;resize:vertical;outline:none}
  .ask textarea:focus{border-color:#c2a46a}
  .ask button{align-self:flex-start}
  .ask .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .ask .sent{margin:10px 0 0;min-height:20px;font-size:15px;color:#9a9182}
</style></head>
<body>
  <div class="door">
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-dim" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"/><circle class="ring-lit" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"/><circle class="disc" cx="32" cy="32" r="16"/><circle class="bite" cx="41" cy="26" r="16"/></svg>
    <h1>ELSEWHERE</h1>
    <p class="what">A small kingdom that keeps running while you are away. You give orders in plain words, a deterministic engine rolls what actually happens, and a narrator tells you how it went.</p>
    <p class="why">The world is still rough, and every turn is written live by an AI that costs real money to run. So for now the door is invite-only.</p>
    <div class="have">HAVE A PASSWORD?</div>
    <form id="f" autocomplete="off">
      <input id="p" type="password" placeholder="password" aria-label="Password" autofocus>
      <button type="submit">ENTER</button>
    </form>
    <div class="no" id="no" role="status"></div>

    <section class="ask" id="ask" aria-labelledby="askTitle">
      <h2 id="askTitle">NO PASSWORD?</h2>
      <p>It is invite-only while the world is rough. Ask, and a person will read it.</p>
      <form id="af">
        <input id="ae" type="email" required autocomplete="email" placeholder="your email" aria-label="Your email">
        <textarea id="am" required placeholder="A line about you, or why you want in. Optional charm." aria-label="Message"></textarea>
        <div class="hp"><label for="ac">Company</label><input id="ac" tabindex="-1" autocomplete="off"></div>
        <button type="submit">ASK FOR A KEY</button>
      </form>
      <div class="sent" id="as" role="status"></div>
    </section>
    <a class="back" href="/">← What is Elsewhere?</a>
  </div>
<script>
document.getElementById('f').onsubmit = async e => {
  e.preventDefault();
  const r = await fetch('/api/gate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ password: document.getElementById('p').value })
  });
  // Reload wherever we are: the world may be mounted at / on its own host, or at
  // a path like /elsewhere/play/ when it is served inside the studio site.
  if (r.ok) { location.reload(); return; }
  document.getElementById('no').textContent = 'Not that one. No password? Ask for one below.';
  document.getElementById('ask').classList.add('lit');
  document.getElementById('p').value = '';
  document.getElementById('p').focus();
};
document.getElementById('af').onsubmit = async e => {
  e.preventDefault();
  const b = e.target.querySelector('button'), out = document.getElementById('as');
  b.disabled = true; out.textContent = 'Sending…';
  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: document.getElementById('ae').value,
        message: document.getElementById('am').value,
        company: document.getElementById('ac').value,
        topic: 'Elsewhere: asking for a password'
      })
    });
    if (r.ok) { e.target.hidden = true; out.textContent = 'Sent. A person will get back to you.'; return; }
    out.textContent = r.status === 429 ? 'That is a lot of asking. Try again in an hour.' : 'That did not send. Check the email address and try again.';
  } catch { out.textContent = 'That did not send. Try again in a moment.'; }
  b.disabled = false;
};
</script>
<script src="/switcher.js" defer></script>
</body></html>
"""
