"""Published campaigns, as the shelf and the deal see them.

They live in the private SEREN-AI repo (`campaigns/published/<slug>/`, format
seren-published/1, seren/CAMPAIGN-FORMAT.md). Set SEREN_PUBLISHED to that folder; unset
means an empty shelf.

**Player-safe files only.** card.json and deck.json go to the browser. truths.json is the
DM's and is never read here, so nothing in this module can leak it.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

ORDER = ("blood-and-ink", "quire", "tallage")
ART = {"header.webp", "card-back.webp"}
SLUG = re.compile(r"^[a-z0-9-]{1,64}$")


def root() -> Path | None:
    where = os.environ.get("SEREN_PUBLISHED")
    if not where:
        return None
    p = Path(where).resolve()
    return p if p.is_dir() else None


def _read(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def listing() -> list[dict]:
    base = root()
    if base is None:
        return []
    found = [d.name for d in base.iterdir() if d.is_dir() and (d / "card.json").is_file()]
    found.sort(key=lambda s: (ORDER.index(s) if s in ORDER else len(ORDER), s))
    out = []
    for slug in found:
        card = _read(base / slug / "card.json")
        if not card:
            continue
        c = {k: card.get(k) for k in ("slug", "title", "tagline", "description", "level",
                                      "length", "key_info", "tags", "selectable", "status")}
        c["header"] = f"/published/{slug}/header.webp"
        c["back"] = f"/published/{slug}/card-back.webp"
        if card.get("selectable"):
            deck = _read(base / slug / "deck.json")
            if not deck:
                continue
            c["deck"] = deck
        out.append(c)
    return out


def art(slug: str, name: str) -> bytes | None:
    base = root()
    if base is None or not SLUG.match(slug) or name not in ART:
        return None
    try:
        return (base / slug / "art" / name).read_bytes()
    except OSError:
        return None
