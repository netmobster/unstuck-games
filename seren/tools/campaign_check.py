"""Check a published campaign folder against seren-published/1 (seren/CAMPAIGN-FORMAT.md).

    python seren/tools/campaign_check.py <campaigns/published/slug> [more folders...]

Prints one line per problem and exits 1 if there are any. Shape only: whether the story is good
is the review's job, and whether the woven book is sound is the Doorkeeper's.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

FORMAT = "seren-published/1"
SLOTS = ("trope", "origin", "world", "trouble", "posture", "companions", "persona")
MODES = ("locked", "dealt", "hidden")
DIALS = ("absurdity", "stakes", "danger", "people", "length")
FACE = ("id", "name", "line", "changes", "as")
CARD_REQUIRED = ("format", "slug", "title", "tagline", "description", "level", "players", "length",
                 "key_info", "tags", "header_art", "art_brief", "card_back", "back_brief",
                 "selectable", "status")
# Origins and antagonists carry the campaign's secrets, so a dealt one without a truth is a hole.
NEEDS_TRUTH = ("origin", "posture")


def load(path: Path, problems: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        problems.append(f"{path.name}: missing")
    except json.JSONDecodeError as exc:
        problems.append(f"{path.name}: not valid JSON ({exc})")
    return None


def strings(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [s for v in value.values() for s in strings(v)]
    if isinstance(value, list):
        return [s for v in value for s in strings(v)]
    return []


def check(folder: Path) -> list[str]:
    p: list[str] = []
    card = load(folder / "card.json", p)
    if card is None:
        return p
    for key in CARD_REQUIRED:
        if key not in card:
            p.append(f"card.json: no '{key}'")
    if card.get("format") != FORMAT:
        p.append(f"card.json: format is not {FORMAT}")
    if card.get("slug") != folder.name:
        p.append(f"card.json: slug '{card.get('slug')}' is not the folder name '{folder.name}'")
    tags = card.get("tags") or {}
    if not isinstance(tags.get("locked"), list) or "chaos" not in tags:
        p.append("card.json: tags needs 'locked' (a list) and 'chaos'")

    # A card that can't be chosen yet only needs its shelf card.
    if not card.get("selectable"):
        return p

    deck = load(folder / "deck.json", p)
    truths = load(folder / "truths.json", p)
    if deck is None or truths is None:
        return p
    slots = deck.get("slots") or {}
    for name in SLOTS:
        if name not in slots:
            p.append(f"deck.json: no slot '{name}'")
    for name in slots:
        if name not in SLOTS:
            p.append(f"deck.json: '{name}' is not one of the seven slots")

    locked_names, faces = [], []
    cards_truth = truths.get("cards") or {}
    for name, slot in slots.items():
        mode = slot.get("mode")
        if mode not in MODES:
            p.append(f"deck.json: {name} has mode '{mode}'")
            continue
        if mode == "locked":
            c = slot.get("card")
            if not isinstance(c, dict):
                p.append(f"deck.json: {name} is locked but has no card")
                continue
            cards = [c]
            locked_names.append(c.get("name"))
        else:
            cards = slot.get("deck") or []
            pick = slot.get("pick", 1)
            if len(cards) < pick + 1:
                p.append(f"deck.json: {name} deals {pick} from {len(cards)} card(s), so nothing is dealt")
            if name in NEEDS_TRUTH:
                for c in cards:
                    if f"{name}:{c.get('id')}" not in cards_truth:
                        p.append(f"truths.json: no truth for {name}:{c.get('id')}")
        ids = [c.get("id") for c in cards]
        if len(ids) != len(set(ids)):
            p.append(f"deck.json: {name} repeats a card id")
        for c in cards:
            for key in FACE:
                if not c.get(key):
                    p.append(f"deck.json: {name}:{c.get('id')} has no '{key}'")
            extra = set(c) - set(FACE)
            if extra:
                p.append(f"deck.json: {name}:{c.get('id')} has fields the fog doesn't know: {sorted(extra)}")
            faces.extend(strings(c))

    if sorted(locked_names) != sorted(tags.get("locked") or []):
        p.append(f"card.json: tags.locked {tags.get('locked')} doesn't match the locked cards {locked_names}")

    dials = deck.get("dials") or {}
    ranges, defaults = dials.get("ranges") or {}, dials.get("defaults") or {}
    for d in DIALS:
        r = ranges.get(d)
        if not (isinstance(r, list) and len(r) == 2 and 0 <= r[0] <= r[1] <= 100):
            p.append(f"deck.json: dial '{d}' range {r} isn't [low, high] within 0-100")
            continue
        v = defaults.get(d)
        if not isinstance(v, (int, float)) or not r[0] <= v <= r[1]:
            p.append(f"deck.json: dial '{d}' default {v} isn't inside {r}")

    # The fog check: no truth's text may appear on anything the player is sent.
    public = " ".join(faces + strings(card)).lower()
    for key, entry in cards_truth.items():
        for s in strings(entry):
            if len(s) > 24 and s.lower() in public:
                p.append(f"fog: text from truths {key} appears on a player-facing face")
        # Short but deadly: a culprit's or antagonist's name on a face. "Jo Bloggs, the miller" -> "jo bloggs".
        for field in ("culprit", "antagonist"):
            name = str(entry.get(field, "")).split(",")[0].strip().lower()
            if name and name in public:
                p.append(f"fog: the {field} of {key} ('{name}') is named on a player-facing face")
    if truths.get("slug") != folder.name or truths.get("format") != FORMAT:
        p.append("truths.json: slug or format is wrong")
    return p


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    bad = 0
    for arg in argv:
        folder = Path(arg)
        problems = check(folder)
        if problems:
            bad += 1
            print(f"{folder.name}: {len(problems)} problem(s)")
            for line in problems:
                print(f"  - {line}")
        else:
            print(f"{folder.name}: ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
