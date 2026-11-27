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
            # A hidden slot is sealed: the browser learns only that it exists.
            for name, slot in (deck.get("slots") or {}).items():
                if slot.get("mode") == "hidden":
                    deck["slots"][name] = {"mode": "hidden"}
            c["deck"] = deck
        out.append(c)
    return out


def sealed(slug: str) -> dict:
    """The hidden slots' cards, for the weaver only. {slot: card}; a dealt-hidden slot draws one."""
    import random
    base = root()
    if base is None or not SLUG.match(slug):
        return {}
    deck = _read(base / slug / "deck.json") or {}
    out = {}
    for name, slot in (deck.get("slots") or {}).items():
        if slot.get("mode") != "hidden":
            continue
        card = slot.get("card") or (random.choice(slot["deck"]) if slot.get("deck") else None)
        if card:
            out[name] = card
    return out


def story(slug: str, cards: dict) -> dict | None:
    """The published campaign's own story, for the WEAVER ONLY (server-side, DM-side).

    Without this a real weave of Blood and Ink only had the dealt cards, and wrote a different story
    each time (26 Nov: three weaves, one title, none of them Agnes and the press). This is the shelf
    card plus the house rules and the truths for the cards actually dealt. It never goes to the
    browser, the app, or the book writer."""
    base = root()
    if base is None or not SLUG.match(slug):
        return None
    card = _read(base / slug / "card.json") or {}
    truths = _read(base / slug / "truths.json") or {}
    known = truths.get("cards") or {}
    dealt = {}
    for slot, value in (cards or {}).items():
        for c in (value if isinstance(value, list) else [value]):
            key = f"{slot}:{(c or {}).get('id')}"
            if key in known:
                dealt[key] = known[key]
    out = {"title": card.get("title"), "tagline": card.get("tagline"), "description": card.get("description"),
           "key_info": card.get("key_info"), "level": card.get("level"), "length": card.get("length"),
           "rules": truths.get("rules") or [], "truths_for_this_hand": dealt}
    # A campaign whose truths name a fixed player character can say so in "pc_name", and that name becomes
    # the player's. Blood and Ink no longer needs it: since 27 Nov its truths say "the ward", whoever walks
    # in (Wren, the first weave's character, was retired; 26 Nov an Opus book had called Odo Fenn "Wren").
    written = truths.get("pc_name")
    pc = (cards or {}).get("pc") or {}
    first = str(pc.get("name") or "").split(" ")[0] if isinstance(pc, dict) else ""
    if written and first and first != written:
        out = json.loads(re.sub(r"\b" + re.escape(written) + r"\b", first, json.dumps(out, ensure_ascii=False)))
    return out


CHAR_ART = re.compile(r"^(in-situ/)?[a-z0-9-]{1,64}\.webp$")


def _shared() -> Path | None:
    """SEREN-AI's characters/shared/, beside campaigns/published/ (27 Nov: the shared six)."""
    base = root()
    if base is None:
        return None
    p = base.parent.parent / "characters" / "shared"
    return p if p.is_dir() else None


def characters() -> list[dict]:
    """Who you play: the shared six, player-side (Jay, 27 Nov: campaign, character, fortune teller).

    Each one carries both cards' art and a build per starting level; the table shows the build for
    the chosen campaign's level. Nothing here is secret: it's the character's own sheet."""
    base = _shared()
    data = _read(base / "shared-six.json") if base else None
    out = []
    for p in (data or {}).get("characters") or []:
        c = dict(p)
        c["art"] = {"p": f"/characters/{p['id']}.webp", "s": f"/characters/in-situ/{p['id']}.webp"}
        out.append(c)
    return out


def character_art(name: str) -> bytes | None:
    base = _shared()
    if base is None or not CHAR_ART.match(name):
        return None
    try:
        return (base / "art" / name).read_bytes()
    except OSError:
        return None


def art(slug: str, name: str) -> bytes | None:
    base = root()
    if base is None or not SLUG.match(slug) or name not in ART:
        return None
    try:
        return (base / slug / "art" / name).read_bytes()
    except OSError:
        return None
