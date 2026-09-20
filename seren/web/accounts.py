"""Who is at the table.

One row per person, in a sqlite file next to the campaigns. Deliberately small: an
account exists to answer two questions — *which folder are this person's campaigns in*
and *what may they spend* — and nothing else belongs here.

The folder name is derived once, at signup, and then never changes. Email addresses
change; Google's `sub` does not, so that is the identity and the folder is only a label
that happens to be readable when you ssh in and look.
"""

from __future__ import annotations

import os
import re
import sqlite3
import time
from pathlib import Path
from typing import Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
  slug        TEXT PRIMARY KEY,
  sub         TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  picture     TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL DEFAULT 'free',
  api_key     TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  seen_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS accounts_email ON accounts(email);
"""


def db_path(root: Path) -> Path:
    return root / "players" / "accounts.db"


def _connect(root: Path) -> sqlite3.Connection:
    p = db_path(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(p))
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def _adopted(email: str) -> str:
    """Folders that existed before accounts did.

    SEREN_ADOPT="someone@example.com=jay,other@example.com=solo" hands an existing player
    folder to the first person who signs in with that address. Without it, the day auth
    ships is the day everybody's campaigns appear to vanish — they are still on disk, but
    under a name nothing looks up any more.
    """
    for pair in os.environ.get("SEREN_ADOPT", "").split(","):
        addr, _, slug = pair.partition("=")
        if addr.strip().lower() == email.strip().lower() and slug.strip():
            return slug.strip()
    return ""


def _slug_for(con: sqlite3.Connection, email: str) -> str:
    """A readable folder name, unique, settled once and never revisited."""
    claim = _adopted(email)
    if claim and not con.execute("SELECT 1 FROM accounts WHERE slug=?", (claim,)).fetchone():
        return claim
    base = re.sub(r"[^a-z0-9]+", "-", (email.split("@")[0] or "player").lower()).strip("-")
    base = (base or "player")[:24]
    slug, n = base, 1
    while con.execute("SELECT 1 FROM accounts WHERE slug=?", (slug,)).fetchone():
        n += 1
        slug = f"{base}-{n}"
    return slug


def upsert(root: Path, sub: str, email: str, name: str = "", picture: str = "") -> dict:
    """Sign somebody in, creating the row and the folder the first time."""
    now = int(time.time())
    con = _connect(root)
    try:
        row = con.execute("SELECT * FROM accounts WHERE sub=?", (sub,)).fetchone()
        if row is None:
            slug = _slug_for(con, email)
            con.execute(
                "INSERT INTO accounts (slug, sub, email, name, picture, created_at, seen_at)"
                " VALUES (?,?,?,?,?,?,?)",
                (slug, sub, email, name, picture, now, now),
            )
        else:
            slug = row["slug"]
            # Email and display name are Google's to change, and it does change them.
            con.execute(
                "UPDATE accounts SET email=?, name=?, picture=?, seen_at=? WHERE sub=?",
                (email, name or row["name"], picture or row["picture"], now, sub),
            )
        con.commit()
        out = dict(con.execute("SELECT * FROM accounts WHERE sub=?", (sub,)).fetchone())
    finally:
        con.close()
    (root / "players" / out["slug"]).mkdir(parents=True, exist_ok=True)
    return out


def by_slug(root: Path, slug: str) -> Optional[dict]:
    if not slug:
        return None
    con = _connect(root)
    try:
        row = con.execute("SELECT * FROM accounts WHERE slug=?", (slug,)).fetchone()
    finally:
        con.close()
    return dict(row) if row else None


def touch(root: Path, slug: str) -> None:
    con = _connect(root)
    try:
        con.execute("UPDATE accounts SET seen_at=? WHERE slug=?", (int(time.time()), slug))
        con.commit()
    finally:
        con.close()


def set_fields(root: Path, slug: str, **fields) -> Optional[dict]:
    """Settings writes. Only the columns a person is allowed to change."""
    allowed = {"name", "plan", "api_key"}
    sets = {k: v for k, v in fields.items() if k in allowed}
    if not sets:
        return by_slug(root, slug)
    con = _connect(root)
    try:
        clause = ", ".join(f"{k}=?" for k in sets)
        con.execute(f"UPDATE accounts SET {clause} WHERE slug=?", (*sets.values(), slug))
        con.commit()
    finally:
        con.close()
    return by_slug(root, slug)


def count(root: Path) -> int:
    if not db_path(root).exists():
        return 0
    con = _connect(root)
    try:
        return int(con.execute("SELECT COUNT(*) FROM accounts").fetchone()[0])
    finally:
        con.close()


def solo_slug() -> str:
    """The account used when nobody has signed in — local work, and the old behaviour."""
    return os.environ.get("SEREN_ACCOUNT", "solo")
