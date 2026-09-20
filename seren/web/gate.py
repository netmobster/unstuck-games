"""A shared-password gate for the SEREN table.

Set SEREN_PASSWORD and every page and every API call needs the word first.
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

COOKIE = "seren_pass"
MAX_AGE = 60 * 60 * 24 * 14  # a fortnight, then type it again
# New secret per boot unless one is pinned: restarting the server signs everyone out.
SECRET = os.environ.get("SEREN_COOKIE_SECRET") or secrets.token_hex(16)


def password() -> str:
    return os.environ.get("SEREN_PASSWORD", "").strip()


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
<title>SEREN</title>
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
  .goog{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
        background:#e8e2d4;color:#17140f;border:none;border-radius:2px;cursor:pointer;
        font-family:Cinzel,Georgia,serif;letter-spacing:.1em;font-size:14px;padding:13px 18px;
        text-decoration:none;box-sizing:border-box}
  .goog:hover{background:#fff}
  .goog svg{width:18px;height:18px;flex:none}
  .or{display:flex;align-items:center;gap:12px;color:#6d665b;font-size:12px;
      letter-spacing:.16em;font-family:Cinzel,Georgia,serif;margin:22px 0 16px}
  .or::before,.or::after{content:"";flex:1;height:1px;background:#2a2622}
        padding:12px 13px;min-height:84px;resize:vertical;outline:none}
</style></head>
<body>
  <div class="door">
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-dim" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"/><circle class="ring-lit" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"/><circle class="disc" cx="32" cy="32" r="16"/><circle class="bite" cx="41" cy="26" r="16"/></svg>
    <h1>SEREN</h1>
    <p class="what">A dungeon master that cannot fudge the dice. It narrates; the rolls are made by the server and written down before anyone knows what they are for.</p>
    <p class="why">Every turn is written live by a model that costs real money to run, and the table is still being built. So for now the door is shut.</p>
    <!--GOOGLE-->
    <div class="have">HAVE A PASSWORD?</div>
    <form id="f" autocomplete="off">
      <input id="p" type="password" placeholder="password" aria-label="Password" autofocus>
      <button type="submit">ENTER</button>
    </form>
    <div class="no" id="no" role="status"></div>

    <a class="back" href="https://unstuck-games.com/">← Unstuck Games</a>
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
  document.getElementById('no').textContent = 'Not that one.';
  document.getElementById('p').value = '';
  document.getElementById('p').focus();
};

</script>
<script src="/switcher.js" defer></script>
</body></html>
"""


GOOGLE_BLOCK = """    <a class="goog" href="/auth/google">
      <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.3c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.8-1.5 4.6-4.4 6.4l6.7 5.2c4-3.7 6.3-9.1 6.3-15.6z"/><path fill="#34A853" d="M24 46c5.8 0 10.6-1.9 14.2-5.2l-6.7-5.2c-1.8 1.3-4.2 2.1-7.4 2.1-5.7 0-10.5-3.7-12.2-8.9l-7 5.4C8.4 41.2 15.6 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.8c-.5-1.3-.7-2.7-.7-4.1s.3-2.9.7-4.1l-7-5.4A22 22 0 0 0 2 24.7c0 3.6.9 6.9 2.4 9.9l7.4-5.8z"/><path fill="#EA4335" d="M24 10.6c4 0 6.7 1.7 8.3 3.2l6-5.9C34.6 4.5 29.8 2 24 2 15.6 2 8.4 6.8 4.8 14.5l7 5.4c1.7-5.2 6.5-8.9 12.2-8.9z"/></svg>
      SIGN IN WITH GOOGLE
    </a>
    <div class="or">OR</div>
"""


def page(google: bool = False) -> str:
    """The door. With Google on it when Google is configured, because a guest will never
    have the shared password and should not be told to ask for one."""
    return PAGE.replace("<!--GOOGLE-->", GOOGLE_BLOCK if google else "")
