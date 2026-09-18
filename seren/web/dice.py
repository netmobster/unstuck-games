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

    n, faces, dmod = parse(spec)
    dice = [RNG.randint(1, faces) for _ in range(n)]

    mods = entry.get("mods") or []
    if not isinstance(mods, list) or any(
        not (isinstance(m, (list, tuple)) and len(m) == 2) for m in mods
    ):
        raise Refused("`mods` must be a list of [name, value] pairs")
    mod_total = sum(int(v) for _, v in mods)

    entry["id"] = "e%03d" % (_last_id(ledger, "e") + 1)
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
