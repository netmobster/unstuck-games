"""The roll gate. The one control in SEREN, ported without softening it.

`scripts/gate.py`'s rule, and the reason the whole system exists:

    THE ROLL AND THE LEDGER LINE ARE ONE OPERATION.
    An unlogged roll is an unrolled roll.

SEREN learned this the hard way — the first played session narrated two rolls it never
wrote — and drew the conclusion that matters here: *an instruction is not a control*. So
the DM does not roll. It asks for a roll, this module rolls, writes the line, and hands
back a number the model is then stuck with.

Refusals kept verbatim in spirit from gate.py: an entry arriving with `roll`, `total`,
`pass` or `hit` already filled in is rejected, because declaring the outcome before the
die exists is how a false verdict gets written.
"""
from __future__ import annotations

import json
import re
import secrets
from pathlib import Path

RNG = secrets.SystemRandom()
DICE = re.compile(r"^(\d+)d(\d+)([+-]\d+)?$", re.I)

# The verdict fields the caller may never supply.
FORBIDDEN = ("roll", "total", "pass", "hit", "dice")

# Envelope from docs/state-formats.md §2.1.
ENVELOPE = {"id", "rd", "t", "ref", "note"}


class Refused(ValueError):
    """The gate said no. The reason is the message, and nothing was written."""


def parse(spec: str) -> tuple[int, int, int]:
    m = DICE.match((spec or "").strip())
    if not m:
        raise Refused(f"unreadable dice: {spec!r}. Use 1d20, 2d6, 1d20+3.")
    n, faces, mod = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
    if not (1 <= n <= 50 and 2 <= faces <= 100):
        raise Refused(f"implausible dice: {spec}")
    return n, faces, mod


def _last_id(path: Path, prefix: str) -> int:
    if not path.is_file():
        return 0
    last = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            got = json.loads(line).get("id", "")
        except json.JSONDecodeError:
            continue
        if isinstance(got, str) and got.startswith(prefix) and got[1:].isdigit():
            last = max(last, int(got[1:]))
    return last


def _append(path: Path, entry: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def roll(ledger: Path, spec: str, entry: dict | None = None) -> dict:
    """Roll and log, one operation. Returns the entry as written.

    The caller describes the attempt — who, what type, what DC, which modifiers — and
    gets back the outcome. It never gets to propose one.
    """
    entry = dict(entry or {})
    for banned in FORBIDDEN:
        if banned in entry:
            raise Refused(
                f"do not supply `{banned}` — the roll produces it. "
                "Declaring the outcome before the die exists is how a false verdict gets written."
            )
    if not entry.get("t"):
        raise Refused("every entry needs `t`: what kind of event this is (check, attack, save, cast…)")

    # A d20 with nothing to beat is not a check — it is a number, and the verdict then has
    # to come from the narrator, which is the whole thing we are stopping. The event
    # vocabulary is open (state-formats §2.2), so this tests the dice, not the name.
    NO_TARGET = ("damage", "heal", "encounter", "initiative", "temp_hp", "hit_dice", "death_save")
    n_dice, faces, _ = parse(spec)
    if faces == 20 and entry.get("t") not in NO_TARGET:
        if not isinstance(entry.get("dc"), int) and not isinstance(entry.get("vs"), int):
            raise Refused(
                "a d20 roll needs `dc` (or `vs` for an attack): an integer target taken from "
                "the object, the stat block or the rules — not chosen for drama. Say where it "
                "came from in `note`."
            )

    n, faces, dmod = n_dice, faces, parse(spec)[2]
    dice = [RNG.randint(1, faces) for _ in range(n)]

    # Advantage is two dice and one of them kept. The dropped die is recorded, never
    # hidden: showing the maths is the whole point (ROLL-MECHANIC.md).
    adv = str(entry.pop("advantage", "") or "").lower()
    kept = None
    if adv in ("advantage", "disadvantage") and n == 1:
        second = RNG.randint(1, faces)
        pair = [dice[0], second]
        kept = max(pair) if adv == "advantage" else min(pair)
        entry["dice_all"] = pair
        entry["kept"] = adv
        dice = [kept]

    mods = entry.get("mods") or []
    if not isinstance(mods, list) or any(
        not (isinstance(m, (list, tuple)) and len(m) == 2) for m in mods
    ):
        raise Refused("`mods` must be a list of [name, value] pairs")
    mod_total = sum(int(v) for _, v in mods)

    entry["id"] = "e%03d" % (_last_id(ledger, "e") + 1)
    if entry.get("s") is not None:
        entry["s"] = int(entry["s"])
    entry.setdefault("rd", None)
    entry["roll"] = dice[0] if n == 1 else sum(dice)
    entry["total"] = entry["roll"] + dmod + mod_total
    if n > 1:
        entry["dice"] = spec
    # The verdict must match the arithmetic. A true total with a false verdict is what
    # softening looks like (gate.py §S2.3).
    if isinstance(entry.get("dc"), int):
        entry["pass"] = entry["total"] >= entry["dc"]
    if isinstance(entry.get("vs"), int):
        entry["hit"] = entry["total"] >= entry["vs"]

    _append(ledger, entry)
    return entry


def note(ledger: Path, kind: str, text: str, **fields) -> dict:
    """A ledger line with no die under it — a ruling, a cast, an encounter table result."""
    entry = {"id": "e%03d" % (_last_id(ledger, "e") + 1), "rd": None, "t": kind, "note": text}
    entry.update({k: v for k, v in fields.items() if v is not None})
    _append(ledger, entry)
    return entry


FACT_OPS = {
    "flip": {"fact", "from", "to"},
    "establish": {"fact", "visibility"},
    "believe": {"fact", "truth"},
}
VISIBILITY = {"true", "known", "suspected", "false"}

# Nobody in the world has heard of "the user". A fact naming the person holding the mouse
# is a transcript line wearing a fact's clothes, and it poisons two things at once: the
# knowledge record fills with things that are not about the world, and the fog gate — which
# compares narration against DM-side material — starts holding the DM for quoting the
# player back to himself. Both happened in Jay's session on 2026-09-20.
TABLE_PERSON = re.compile(r"\bthe\s+(user|player)\b", re.I)


def fact(facts: Path, session: int, op: str, **fields) -> dict:
    """Append to facts.jsonl: what is true, and who knows it.

    The op vocabulary is closed (state-formats §5.3), unlike the ledger's.
    """
    if op not in FACT_OPS:
        raise Refused(f"unknown fact op {op!r}. The vocabulary is closed: flip, establish, believe.")
    missing = FACT_OPS[op] - set(fields)
    if missing:
        raise Refused(f"`{op}` needs {', '.join(sorted(missing))}")
    for key in ("from", "to", "visibility"):
        if key in fields and fields[key] not in VISIBILITY:
            raise Refused(f"`{key}` must be one of {sorted(VISIBILITY)}")
    if op == "flip" and fields.get("from") == fields.get("to"):
        raise Refused("a flip that changes nothing is not a flip")
    if op == "believe" and not isinstance(fields.get("truth"), bool):
        raise Refused("`believe` needs truth: true or false — whether the party is right")

    text = str(fields.get("fact") or "")
    if TABLE_PERSON.search(text):
        raise Refused(
            "a fact says what is true in the world, and nobody in the world is called "
            "\"the user\" or \"the player\". Name the character, or do not record it: "
            "what somebody announced they want is not yet a fact about anything."
        )
    if str(fields.get("src") or "").lower() == "player":
        vis = str(fields.get("visibility") or fields.get("to") or "").lower()
        if vis in ("true", "false"):
            raise Refused(
                "a thing the player did in the open cannot be a secret. `src: player` "
                "means they watched it happen, so the visibility is `known` — `true` and "
                "`false` are for what the party has not found out. And if it is only that "
                "they said what they want, it is not a fact at all yet."
            )

    entry = {"id": "f%03d" % (_last_id(facts, "f") + 1), "s": int(session), "op": op}
    entry.update(fields)
    _append(facts, entry)
    return entry


def read(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def count(ledger: Path) -> dict[str, int]:
    """For the close ceremony: rolls written, against rolls spoken."""
    tally: dict[str, int] = {}
    for e in read(ledger):
        tally[e.get("t", "?")] = tally.get(e.get("t", "?"), 0) + 1
    return tally
