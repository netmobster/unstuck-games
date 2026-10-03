"""hand.py — a Loom hand, brought into Claude Code.

    python scripts/hand.py check  <hand.json | ->                 is it a hand? print the cards
    python scripts/hand.py scaffold <hand.json | -> <slug> --level N
                                                                  LIVE/<slug>/, mechanical files only
    python scripts/hand.py runme  <slug>                          labs/playtest/RUN-ME-<slug>.md

The Loom (seren web, "Weave it in Claude Code") deals the hand. **Claude Code weaves it**,
following docs/weave-from-hand.md, which is docs/campaign-start.md with the hand as its
input. This script does only the part that is not judgement: it reads the hand, refuses a
malformed one, and lays out the folder that campaign-start.md §1 specifies.

It writes NOTHING the weave authors — no fronts, no persona, no antagonists, no builds, no
location. Those are missing on purpose, so scripts/preflight.py fails until the weave is
done. A scaffold that guessed them would be a campaign nobody wove.

Accepts both shapes: `seren-hand/1` from the Loom's button, and the server's own
`hand.json` (players/<account>/<slug>/hand.json), which has the same three keys.

⛔ Fog. The cards are the PLAYER's — they dealt them — so printing them spoils nothing.
Everything the weave writes afterwards is DM-side; this script never prints a LIVE file.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
from datetime import date

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = ("trope", "origin", "world", "trouble", "posture", "persona")
DIALS = ("absurdity", "stakes", "danger", "people", "length")


class Bad(Exception):
    pass


def load(src: str) -> dict:
    """A hand from a path or stdin ('-'). Tolerates a paste with chatter around the JSON."""
    raw = sys.stdin.read() if src == "-" else io.open(src, encoding="utf-8-sig").read()
    a, b = raw.find("{"), raw.rfind("}")
    if a < 0 or b < a:
        raise Bad("no JSON object in it")
    try:
        h = json.loads(raw[a:b + 1])
    except json.JSONDecodeError as exc:
        raise Bad(f"not valid JSON: {exc}")
    return validate(h)


def story_deck() -> dict:
    return json.load(io.open(os.path.join(ROOT, "decks", "story", "deck.json"), encoding="utf-8"))


def validate_story(h: dict) -> dict:
    """A story-deck hand (scripts/deal.py story, or the Elsible picker). Every slot the player
    picks, plus the dealer's card. Nothing hidden is dealt (3 Oct): the weave writes what is
    underneath. If a hand carries a hidden block (the picker's own weave, or a deck-v2 hand), it
    is kept and never printed."""
    d = story_deck()
    cards, dials = h.get("cards") or {}, h.get("dials") or {}
    for s in d["slots"]:
        if s.get("reference") or s.get("face_down"):
            continue
        c = cards.get(s["id"])
        if s.get("optional") and not c:
            continue
        if s.get("count", 1) > 1:
            if not isinstance(c, list) or len(c) < s["count"] or not all(x.get("name") for x in c):
                raise Bad(f"a story hand has {s['count']} {s['id']} cards")
        elif not (c or {}).get("name"):
            raise Bad(f"the hand is not fully dealt: no {s['id']}")
    for x in d["dials"]:
        v = dials.get(x["id"])
        if not isinstance(v, (int, float)) or not 0 <= v <= 100:
            raise Bad(f"dial {x['id']!r} is missing or not 0-100")
    return h


def validate(h: dict) -> dict:
    fmt = h.get("format")
    if fmt not in (None, "seren-hand/1"):
        raise Bad(f"unknown format {fmt!r} (this reads seren-hand/1)")
    if h.get("deck") == "story":
        return validate_story(h)
    if h.get("deck") not in (None, "adventure"):
        raise Bad(f"unknown deck {h.get('deck')!r}")
    picks, cards, dials = h.get("picks") or {}, h.get("cards") or {}, h.get("dials") or {}
    # The server's hand.json keeps a card as its bare name; the Loom button sends the card.
    for k, v in list(cards.items()):
        if isinstance(v, str):
            cards[k] = {"name": v}
        elif isinstance(v, list):
            cards[k] = [{"name": x} if isinstance(x, str) else x for x in v]
    h["cards"] = cards
    missing = [c for c in CATS if not picks.get(c) or not (cards.get(c) or {}).get("name")]
    if missing:
        raise Bad("the hand is not fully dealt: no " + ", ".join(missing))
    comps = cards.get("companions") or []
    if len(picks.get("companions") or []) < 2 or len(comps) < 2:
        raise Bad("a hand has two companions")
    for d in DIALS:
        v = dials.get(d)
        if not isinstance(v, (int, float)) or not 0 <= v <= 100:
            raise Bad(f"dial {d!r} is missing or not 0-100")
    return h


def describe(h: dict) -> str:
    if h.get("deck") == "story":
        d, c, rows = story_deck(), h["cards"], []
        for s in d["slots"]:
            v = c.get(s["id"])
            if s.get("reference") or s.get("face_down"):
                continue
            elif isinstance(v, list):
                rows += [f"  {s['id']:<10} {x['name']}  ·  {x.get('line', '')}" for x in v]
            elif v:
                rows.append(f"  {s['id']:<10} {v['name']}  ·  {v.get('line', '')}")
        rows.append("  dials      " + "  ".join(f"{k} {v}" for k, v in h["dials"].items()))
        if h.get("face_down") or h.get("hidden"):
            rows.append(f"  {'and then...':<10} [the weave's hidden half is inside, not shown]")
        return "\n".join(rows)
    c = h["cards"]
    rows = [f"  {cat:<10} {c[cat]['name']}  ·  {c[cat].get('line', '')}" for cat in CATS]
    rows += [f"  {'companion':<10} {x['name']}  ·  {x.get('line', '')}" for x in c["companions"]]
    rows.append("  dials      " + "  ".join(f"{d} {h['dials'][d]}" for d in DIALS))
    return "\n".join(rows)


SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,48}$")


def _w(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


HEAD = "<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. LIVE/ never ships. -->\n"


def scaffold(h: dict, slug: str, level: int) -> list[str]:
    if not SLUG_RE.match(slug):
        raise Bad("slug: lowercase letters, digits and hyphens")
    if not 1 <= level <= 20:
        raise Bad("level is 1-20")
    live = os.path.join(ROOT, "LIVE", slug)
    if os.path.exists(live):
        raise Bad(f"LIVE/{slug} already exists — a scaffold never writes over a campaign")
    c = h["cards"]
    if h.get("deck") == "story":
        hand_line = (" · ".join(c[k]["name"] for k in ("role", "world", "other"))
                     + (f" · {c['modifier']['name']}" if c.get("modifier") else "")
                     + f" · and now {c['pressure']['name'].lower()}")
        told, comps = c["told_by"]["name"], c["circle"]
    else:
        hand_line = " · ".join(c[k]["name"] for k in ("trope", "origin", "world", "trouble", "posture"))
        told, comps = c["persona"]["name"], c["companions"]
    files = {
        "hand.json": json.dumps(h, ensure_ascii=False, indent=1) + "\n",
        # ⛔ No tone line, no dials in prose. campaign.md is read by the DM at session start, and
        # a register written here gets performed (see LIVE/sheep-crazy/campaign.md, 2026-08-29).
        # The dials are weave-time inputs; they stay in hand.json.
        "campaign.md": HEAD + f"""---
campaign: "{slug}"
source: "loom-hand"
hand: "hand.json"
level: {level}
party_size: 3
started: null
licence: "Original. Woven in Claude Code from a hand dealt at the Loom; no third-party module."
status: SCAFFOLDED - not woven. docs/weave-from-hand.md has not been run.
---

# {slug}

**The hand:** {hand_line} · told by {told} · with {comps[0]['name'].lower()} and {comps[1]['name'].lower()}

<!-- The weave writes the premise and the session-zero record below. Nothing else goes here. -->
""",
        "ideas.md": HEAD + "\n# ideas\n\n<!-- Seeded by the weave: each idea with its trigger and its cost. -->\n",
        "rulings.md": HEAD + "\n# rulings\n\n<!-- Calls the rules do not cover, said out loud. Appended in play. -->\n",
        "state/facts.jsonl": "",          # t=0, EMPTY (SRN-11)
        "state/ledger.jsonl": "",         # t=0, EMPTY, appended every roll
        "state/queue.md": HEAD + "\n# queue\n",
        "sessions/README.md": HEAD + "\n# sessions\n\nOne log per session, written at close.\n",
        "canon/locations/README.md": HEAD + "\n# locations\n\nOne folder per place. The weave writes the starting one; the rest appear in play.\n",
        "canon/antagonists/README.md": HEAD + "\n# antagonists\n\nActivated at the weave (campaign-start.md §5b). Each has a `template:` and an interactions log.\n",
        "canon/characters/README.md": HEAD + "\n# characters\n\nPC secrets, when a subplot needs somewhere to live.\n",
        "builds/README.md": HEAD + "\n# builds\n\nOne per party member, companions included, at this campaign's level.\n",
    }
    for rel, text in files.items():
        _w(os.path.join(live, rel), text)
    return sorted(files)


RUNME = """<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. Published for review only; no licence granted. See LICENSE.txt -->

# RUN ME — {slug}

**You are the Dungeon Master. Jay is the player.** This campaign was dealt at the Loom and
woven in Claude Code ([`../../docs/weave-from-hand.md`](../../docs/weave-from-hand.md)).
It has no module: everything you run is in its folder.

## Before anything: the preflight

```
python scripts/preflight.py LIVE/{slug}
```

⛔ **If it reports a PROBLEM, stop and tell Jay.** The weave is not finished, and a DM who
fills the gaps at the table is authoring the campaign it was told to run.

## Read these, in this order. All of them.

| # | | |
|---|---|---|
| 1 | [`../../dm/DM.md`](../../dm/DM.md) | **the contract** |
| 2 | [`../../dm/table-agreement.md`](../../dm/table-agreement.md) | **Jay's standing position.** Outranks the persona |
| 3 | [`../../LIVE/{slug}/DM-persona.md`](../../LIVE/{slug}/DM-persona.md) | who you are |
| 4 | [`../../LIVE/{slug}/campaign.md`](../../LIVE/{slug}/campaign.md) | premise, the hand, session zero |
| 5 | [`../../LIVE/{slug}/fronts.md`](../../LIVE/{slug}/fronts.md) | what is in motion |
| 6 | [`../../LIVE/{slug}/canon/antagonists/`](../../LIVE/{slug}/canon/antagonists/README.md) | the activated antagonists, and their **templates** |
| 7 | [`../../library/srd-5.2/articles/`](../../library/srd-5.2/articles/) | look rules up rather than recalling them |

⛔ **Do not read `hand.json` or `docs/weave-from-hand.md` beyond this page's link.** The weave
is done; you run what it built (DM.md §9: you must not re-run campaign construction).

## Then run `DM.md` §6 session start, all steps, including step 0.

The table: `python scripts/live.py LIVE/{slug} --serve 8731`, then open http://localhost:8731.
"""


def runme(slug: str) -> str:
    if not os.path.isdir(os.path.join(ROOT, "LIVE", slug)):
        raise Bad(f"LIVE/{slug} does not exist — scaffold it first")
    out = os.path.join(ROOT, "labs", "playtest", f"RUN-ME-{slug}.md")
    if os.path.exists(out):
        raise Bad(f"{os.path.relpath(out, ROOT)} already exists — edit it by hand")
    _w(out, RUNME.format(slug=slug))
    return os.path.relpath(out, ROOT)


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("check", "scaffold", "runme"):
        print(__doc__.split("\n\n")[0], file=sys.stderr)
        return 2
    try:
        if argv[1] == "check":
            h = load(argv[2] if len(argv) > 2 else "-")
            print("A full hand.\n" + describe(h))
        elif argv[1] == "scaffold":
            if len(argv) < 4 or "--level" not in argv:
                raise Bad("usage: hand.py scaffold <hand.json|-> <slug> --level N")
            h = load(argv[2])
            level = int(argv[argv.index("--level") + 1])
            written = scaffold(h, argv[3], level)
            print(f"LIVE/{argv[3]}/ scaffolded: {len(written)} files, all mechanical.")
            print("Not written, on purpose (the weave authors them): DM-persona.md, fronts.md,")
            print("  canon/antagonists/*, builds/*, the starting location, state/party.md, state/scene.md")
            print("Next: docs/weave-from-hand.md, then: python scripts/preflight.py LIVE/" + argv[3])
        else:
            print("wrote " + runme(argv[2]))
    except Bad as exc:
        print("refused: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
