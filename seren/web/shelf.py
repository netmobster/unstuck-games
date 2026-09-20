"""What this account has to play, and which of it they are playing.

A campaign is a folder. The shelf is that fact, read out loud: no index, no database, no
second copy of the truth that can drift from the first. Everything here is derived from
`campaign.md` and the state files each time it is asked for, which costs a few
milliseconds per campaign and can never be stale.

**Archiving is a marker file; deleting is a move.** The ledger inside a played campaign is
append-only and the whole system argues that the record is the thing you can trust — so
the one operation that destroys a record is not going to be a single unrecoverable click.
A deleted campaign goes to `.trash/`, out of the shelf and off the player's mind, still
there for whoever has a terminal.
"""

from __future__ import annotations

import json
import re
import shutil
import time
from pathlib import Path
from typing import List, Optional

ARCHIVED = ".archived"          # a marker file inside the campaign folder
TRASH = ".trash"                # beside the campaigns, not inside one
HIDDEN = {"modules", TRASH}     # folders on the shelf that are not campaigns


def account_root(root: Path, account: str) -> Path:
    return root / "players" / account


def _heading(text: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].split("—")[0].split(" - ")[0].strip()
    return ""


def _section(text: str, name: str) -> str:
    """The body of one `## name` section, stopping at the next heading."""
    out, taking = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            taking = line[3:].strip().lower() == name.lower()
            continue
        if line.startswith("# "):
            taking = False
            continue
        if taking:
            out.append(line)
    return "\n".join(out).strip()


def _premise(text: str) -> str:
    """The first paragraph that is actually prose.

    A woven campaign puts it right under the title. A hand-built one carries YAML
    frontmatter and a blockquote warning first, so both are skipped rather than shown —
    the shelf is for deciding what to play, and "THE TONE IS NOT WRITTEN DOWN HERE" is
    not a premise.
    """
    head = text.find("\n# ")
    if head == -1 and not text.startswith("# "):
        return ""
    after = text[text.index("\n", head + 1) + 1:] if head != -1 else text.split("\n", 1)[-1]
    for block in after.split("\n\n")[:3]:
        block = block.strip()
        if not block or block.startswith(("#", "<!--", "**", "-", ">", "|", "```", "---")):
            continue
        if block[0].isalnum() or block[0] in "\"'":
            return block
        break  # an admonition or a note, not a premise — better to show nothing
    return ""


def _companions(text: str) -> List[str]:
    out = []
    for line in _section(text, "At the table").splitlines():
        m = re.match(r"^-\s*\*\*(.+?)\*\*", line.strip())
        if m:
            out.append(m.group(1).strip())
    return out


def _player(text: str) -> str:
    first = _section(text, "The player").splitlines()
    return first[0].strip().rstrip(".") if first else ""


def summary(folder: Path, playing: bool = False) -> dict:
    """One row. Cheap enough to do for every campaign on every shelf load."""
    try:
        text = (folder / "campaign.md").read_text(encoding="utf-8", errors="ignore")
    except OSError:
        text = ""
    sessions_dir = folder / "sessions"
    played = len(list(sessions_dir.glob("*.md"))) if sessions_dir.is_dir() else 0
    ledger = folder / "state" / "ledger.jsonl"

    # "Session open" meant "session.json exists", and that file is written the moment a
    # table is opened — so every campaign on the shelf claimed an open session, including
    # ones nobody had said a word to. It means mid-scene or it means nothing.
    unfinished = False
    try:
        live = json.loads((folder / "state" / "session.json").read_text(encoding="utf-8"))
        unfinished = int(live.get("turns") or 0) > 0 and bool(live.get("stream"))
    except (OSError, ValueError, TypeError):
        pass

    try:
        touched = int(max(p.stat().st_mtime for p in (folder / "state").glob("*")))
    except (OSError, ValueError):
        touched = int(folder.stat().st_mtime) if folder.exists() else 0

    return {
        "slug": folder.name,
        "title": _heading(text) or folder.name.replace("-", " ").title(),
        "premise": _premise(text),
        "player": _player(text),
        "companions": _companions(text),
        "opening": _section(text, "The opening"),
        "hand": (re.search(r"\*\*The hand:\*\*\s*(.+)", text) or [None, ""])[1].strip()
                if "**The hand:**" in text else "",
        "sessions": played,
        "unfinished": unfinished,
        "rolls": sum(1 for _ in ledger.open(encoding="utf-8")) if ledger.is_file() else 0,
        "touched": touched,
        "archived": (folder / ARCHIVED).is_file(),
        "playing": playing,
    }


def listing(root: Path, account: str, current: str = "") -> List[dict]:
    """Every campaign this account can sit down at, newest touch first."""
    base = account_root(root, account)
    if not base.is_dir():
        return []
    rows = [summary(p, playing=(p.name == current))
            for p in base.iterdir()
            if p.is_dir() and p.name not in HIDDEN and not p.name.startswith(".")]
    rows.sort(key=lambda r: (r["archived"], -r["touched"]))
    return rows


def find(root: Path, account: str, slug: str) -> Optional[Path]:
    """Resolve a slug to a folder this account owns, or nothing.

    The slug arrives from a browser, so it is checked rather than trusted: it must be a
    direct child of this account's folder and not a path at all."""
    if not slug or "/" in slug or "\\" in slug or slug.startswith(".") or slug in HIDDEN:
        return None
    folder = account_root(root, account) / slug
    try:
        base = account_root(root, account).resolve()
        if folder.resolve().parent != base or not folder.is_dir():
            return None
    except OSError:
        return None
    return folder


def archive(folder: Path, on: bool) -> bool:
    marker = folder / ARCHIVED
    if on:
        marker.write_text(f"archived {int(time.time())}\n", encoding="utf-8")
    elif marker.is_file():
        marker.unlink()
    return marker.is_file()


def discard(root: Path, account: str, folder: Path) -> str:
    """Off the shelf, not off the disk. Returns where it went."""
    trash = account_root(root, account) / TRASH
    trash.mkdir(parents=True, exist_ok=True)
    dest = trash / f"{folder.name}-{int(time.time())}"
    shutil.move(str(folder), str(dest))
    return dest.name
