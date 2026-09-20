"""Sign in with Google, and a signed cookie that remembers who it was.

The server-side code flow, which is the boring one on purpose:

    /auth/google            → send them to Google with a signed `state`
    /auth/google/callback   → Google sends back a `code`; we swap it for an id_token
                              over TLS, straight to Google, and read the email out of it

**Why the id_token is not signature-checked here.** It arrives in the body of a response
to a request *we* made, to `oauth2.googleapis.com`, over a verified TLS connection, using
our client secret. Nobody else can put a token in that response. Verifying the JWT
signature guards the other flow — the one where the token reaches us via the browser —
and this is not that flow. Google's own documentation says so, and the alternative is
shipping a JWKS cache and a crypto dependency to re-prove something TLS already proved.

**The session cookie carries a slug, not an email**, so a leaked cookie names a folder
rather than a person, and it is signed with `SEREN_SESSION_SECRET` — set that on the box
or everyone is signed out on every restart.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie
from typing import Optional, Tuple

COOKIE = "seren_who"
STATE_COOKIE = "seren_state"
MAX_AGE = 60 * 60 * 24 * 30  # a month at the table before you sign in again
STATE_MAX_AGE = 60 * 10  # a round trip to Google, generously

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
SCOPE = "openid email profile"

SECRET = os.environ.get("SEREN_SESSION_SECRET") or secrets.token_hex(32)


def client_id() -> str:
    return os.environ.get("SEREN_GOOGLE_CLIENT_ID", "").strip()


def client_secret() -> str:
    return os.environ.get("SEREN_GOOGLE_CLIENT_SECRET", "").strip()


def enabled() -> bool:
    return bool(client_id() and client_secret())


def redirect_uri(host: str) -> str:
    """Must match one of the URIs registered on the client, character for character."""
    fixed = os.environ.get("SEREN_OAUTH_REDIRECT", "").strip()
    if fixed:
        return fixed
    scheme = "http" if host.startswith("localhost") or host.startswith("127.") else "https"
    return f"{scheme}://{host}/auth/google/callback"


# ---------------------------------------------------------------- signing

def _sign(msg: str) -> str:
    return hmac.new(SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()


def _mint(payload: str, max_age: int) -> str:
    expires = int(time.time()) + max_age
    body = f"{expires}.{payload}"
    return f"{body}.{_sign(body)}"


def _open(token: str) -> Optional[str]:
    try:
        expires_raw, payload, sig = token.split(".", 2)
        expires = int(expires_raw)
    except (ValueError, AttributeError):
        return None
    if expires < time.time():
        return None
    if not hmac.compare_digest(sig, _sign(f"{expires}.{payload}")):
        return None
    return payload


def cookie_header(slug: str, secure: bool = True) -> Tuple[str, str]:
    bits = [f"{COOKIE}={_mint(slug, MAX_AGE)}", "Path=/", f"Max-Age={MAX_AGE}",
            "SameSite=Lax", "HttpOnly"]
    if secure:
        bits.append("Secure")
    return ("Set-Cookie", "; ".join(bits))


def clear_header() -> Tuple[str, str]:
    return ("Set-Cookie", f"{COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly")


def _read_cookie(header: str, name: str) -> str:
    if not header:
        return ""
    jar = SimpleCookie()
    try:
        jar.load(header)
    except Exception:
        return ""
    morsel = jar.get(name)
    return morsel.value if morsel else ""


def whoami(cookie_header_value: str) -> str:
    """The signed-in account slug, or empty. Never trusts the cookie's contents."""
    return _open(_read_cookie(cookie_header_value, COOKIE)) or ""


# ---------------------------------------------------------------- the round trip

def begin(host: str, next_path: str = "/") -> Tuple[str, Tuple[str, str]]:
    """Where to send them, and the one-shot cookie that proves they came back from there."""
    nonce = secrets.token_urlsafe(16)
    if not next_path.startswith("/") or next_path.startswith("//"):
        next_path = "/"  # never bounce to somebody else's site on our say-so
    state = _mint(f"{nonce}|{next_path}", STATE_MAX_AGE)
    query = urllib.parse.urlencode({
        "client_id": client_id(),
        "redirect_uri": redirect_uri(host),
        "response_type": "code",
        "scope": SCOPE,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    })
    jar = ("Set-Cookie", f"{STATE_COOKIE}={state}; Path=/; Max-Age={STATE_MAX_AGE}; "
                         f"SameSite=Lax; HttpOnly")
    return f"{AUTH_ENDPOINT}?{query}", jar


def check_state(returned: str, cookie_header_value: str) -> Optional[str]:
    """Both halves must match and be ours. Returns where to go next, or None."""
    payload = _open(returned or "")
    if payload is None:
        return None
    held = _read_cookie(cookie_header_value, STATE_COOKIE)
    if not hmac.compare_digest(returned, held):
        return None
    _, _, next_path = payload.partition("|")
    return next_path or "/"


def _b64url(seg: str) -> bytes:
    return base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4))


def exchange(code: str, host: str) -> Optional[dict]:
    """Swap the code for an id_token and read the person out of it."""
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id(),
        "client_secret": client_secret(),
        "redirect_uri": redirect_uri(host),
        "grant_type": "authorization_code",
    }).encode("utf-8")
    req = urllib.request.Request(
        TOKEN_ENDPOINT, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = json.loads(r.read().decode("utf-8"))
    except Exception:
        return None

    token = body.get("id_token") or ""
    try:
        claims = json.loads(_b64url(token.split(".")[1]).decode("utf-8"))
    except Exception:
        return None

    # TLS proved who sent this; these two checks prove it was minted for us.
    if claims.get("aud") != client_id():
        return None
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None
    if not claims.get("email") or not claims.get("sub"):
        return None
    if claims.get("email_verified") is False:
        return None

    return {
        "sub": str(claims["sub"]),
        "email": str(claims["email"]),
        "name": str(claims.get("name") or ""),
        "picture": str(claims.get("picture") or ""),
    }
