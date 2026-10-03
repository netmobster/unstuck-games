"""bond.py — bonds and tension, the engine half of Elsible's relationships (docs/elsible.md §8).

    python engine/bond.py LIVE/<c> add <who> --name "Ilse" [--start 0]
    python engine/bond.py LIVE/<c> move <who> <steps> --why "she saw you cover for her"
    python engine/bond.py LIVE/<c> lock <who> "something she hasn't told you"   (or --clear)
    python engine/bond.py LIVE/<c> tension <who> <+n> --why "the almost-confession, interrupted"
    python engine/bond.py LIVE/<c> show            the DM's view, numbers included
    python engine/bond.py LIVE/<c> show --player   what the table shows: words only

WHY A SCRIPT. Seren's rule since August: the model interprets, the engine computes. A bond the
narrator can set by saying so is the thing every AI roleplay gets wrong — the character adores you
because the model is agreeable, and resets when the context scrolls. Here a bond only moves through
this script, it needs a reason, it moves in steps, and every move is a ledger line.

THE RULES (locked 2026-10-02, DECISIONS.md)
  * The number is DM-side. The table shows a word, a direction and a lock:
        Ilse · warming ↑ · something she hasn't told you · tension charged
  * A move needs a `--why`, and is at most 3 steps (a step is 10 points on -100..100).
    A bigger swing is a turning point and is made of several moves, each with its own reason.
  * Tension only rises. It cannot be reset or lowered. When it reaches the cap (10) it TOPS OUT:
    the world acts — the Other does something that cannot be taken back — and the point of no
    return arrives. This script says so; the narrator writes what happens.
  * The lock is player-visible: a hint the player is allowed to see. Never put a secret in it;
    table.py's leak check hunts DM-side phrases in the rendered page either way.

Writes state/bonds.md (frontmatter) and appends `bond`, `tension` and `bond_lock` entries to
state/ledger.jsonl, which engine/gate.py validates.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

import yaml

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

STEP, MAX_STEPS, CAP = 10, 3, 10
WORDS = [(-60, "hostile"), (-25, "cold"), (-6, "wary"), (5, "unread"), (24, "warming"),
         (54, "fond"), (84, "trusts you"), (101, "devoted")]
TENSION_WORDS = [(2, "calm"), (5, "building"), (8, "charged"), (9, "at the edge"), (10, "breaking")]
ARROW = {"up": "↑", "down": "↓", None: ""}
HEAD = ("<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. LIVE/ never ships. -->\n"
        "<!-- DM-side numbers. The table shows words only (engine/bond.py show --player). -->\n")


class Refused(Exception):
    pass


def word(value: int) -> str:
    for edge, w in WORDS:
        if value <= edge:
            return w
    return WORDS[-1][1]


def tension_word(t: int) -> str:
    for edge, w in TENSION_WORDS:
        if t <= edge:
            return w
    return TENSION_WORDS[-1][1]


def _paths(live: str) -> tuple[str, str]:
    return os.path.join(live, "state", "bonds.md"), os.path.join(live, "state", "ledger.jsonl")


def load(live: str) -> dict:
    p, _ = _paths(live)
    if not os.path.isfile(p):
        return {}
    m = re.search(r"^---\n(.*?)\n---", io.open(p, encoding="utf-8").read(), re.S | re.M)
    return ((yaml.safe_load(m.group(1)) or {}).get("bonds") or {}) if m else {}


def save(live: str, bonds: dict) -> None:
    p, _ = _paths(live)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    body = yaml.safe_dump({"bonds": bonds}, allow_unicode=True, sort_keys=True)
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(HEAD + "---\n" + body + "---\n\n# bonds\n\nOne entry per person the player has a bond with. "
                "Change them only through engine/bond.py.\n")


def ledger(live: str, entry: dict) -> str:
    _, p = _paths(live)
    last = 0
    if os.path.isfile(p):
        for line in io.open(p, encoding="utf-8"):
            if line.strip():
                m = re.match(r"^e(\d+)$", str(json.loads(line).get("id", "")))
                if m:
                    last = max(last, int(m.group(1)))
    entry = {"id": f"e{last + 1:03d}", "rd": None, **entry}
    with io.open(p, "a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry["id"]


def _need(bonds: dict, who: str) -> dict:
    if who not in bonds:
        raise Refused(f"no bond with {who!r}. Add it first: bond.py <live> add {who} --name ...")
    return bonds[who]


def _why(why: str | None) -> str:
    if not why or len(why.strip()) < 8:
        raise Refused("a bond does not move without a reason: --why \"what happened\" (8+ characters)")
    return why.strip()


def add(live, who, name, start=0):
    if not re.match(r"^[a-z0-9][a-z0-9-]{0,40}$", who):
        raise Refused("who is a slug: lowercase letters, digits and hyphens")
    bonds = load(live)
    if who in bonds:
        raise Refused(f"there is already a bond with {who!r}")
    if not -100 <= start <= 100:
        raise Refused("--start is -100..100")
    bonds[who] = {"name": name or who.replace("-", " ").title(), "value": start, "dir": None,
                  "lock": None, "tension": 0, "topped": False}
    save(live, bonds)
    return f"bond with {bonds[who]['name']}: {word(start)}"


def move(live, who, steps, why):
    why = _why(why)
    if steps == 0:
        raise Refused("a move of 0 steps is not a move")
    if abs(steps) > MAX_STEPS:
        raise Refused(f"a bond moves at most {MAX_STEPS} steps at a time. A bigger swing is a turning "
                      "point: make it several moves, each with its own reason")
    bonds = load(live)
    b = _need(bonds, who)
    before = b["value"]
    b["value"] = max(-100, min(100, before + steps * STEP))
    b["dir"] = "up" if steps > 0 else "down"
    save(live, bonds)
    eid = ledger(live, {"t": "bond", "who": who, "delta": b["value"] - before, "why": why})
    return f"{eid} {b['name']}: {word(before)} → {word(b['value'])} {ARROW[b['dir']]}"


def lock(live, who, text=None, clear=False):
    bonds = load(live)
    b = _need(bonds, who)
    if clear:
        b["lock"] = None
        entry = {"t": "bond_lock", "who": who, "clear": True}
    else:
        if not text or not text.strip():
            raise Refused("a lock needs its text, or --clear")
        b["lock"] = text.strip()
        entry = {"t": "bond_lock", "who": who, "text": b["lock"]}
    save(live, bonds)
    return f"{ledger(live, entry)} {b['name']}: lock {'cleared' if clear else 'set'}"


def tension(live, who, n, why):
    why = _why(why)
    if n <= 0:
        raise Refused("tension only rises. It cannot be lowered or reset (DECISIONS.md, 2026-10-02)")
    bonds = load(live)
    b = _need(bonds, who)
    if b["topped"]:
        raise Refused(f"tension with {b['name']} has already topped out. The point of no return has come; "
                      "play what happened")
    before = b["tension"]
    b["tension"] = min(CAP, before + n)
    topped = b["tension"] >= CAP
    b["topped"] = topped
    save(live, bonds)
    entry = {"t": "tension", "who": who, "delta": b["tension"] - before, "why": why}
    if topped:
        entry["topped"] = True
    eid = ledger(live, entry)
    msg = f"{eid} {b['name']}: tension {tension_word(before)} → {tension_word(b['tension'])}"
    if topped:
        msg += (f"\n⚑ TOPPED OUT. The world acts: {b['name']} does something that cannot be taken back, now. "
                "This is the point of no return. Write it as the next beat, and as a ruling if the rules "
                "do not cover it.")
    return msg


def player_line(b: dict) -> str:
    parts = [b["name"], f"{word(b['value'])} {ARROW[b.get('dir')]}".strip()]
    if b.get("lock"):
        parts.append(b["lock"])
    if b.get("tension", 0) > 0:
        parts.append(f"tension {tension_word(b['tension'])}")
    return " · ".join(parts)


def show(live, player=False):
    bonds = load(live)
    if not bonds:
        return "no bonds yet"
    rows = []
    for who, b in sorted(bonds.items()):
        rows.append("  " + player_line(b) if player else
                    f"  {who:<14} value {b['value']:>4}  dir {b.get('dir') or '-':<4}  tension {b['tension']:>2}"
                    f"{' TOPPED' if b['topped'] else ''}  lock: {b.get('lock') or '-'}  →  {player_line(b)}")
    return "\n".join(rows)


def _opt(argv, flag):
    return argv[argv.index(flag) + 1] if flag in argv and argv.index(flag) + 1 < len(argv) else None


def main(argv):
    if len(argv) < 3:
        print(__doc__.split("\n\n")[0], file=sys.stderr)
        return 2
    live, cmd = argv[1].rstrip("/\\"), argv[2]
    try:
        if not os.path.isdir(live):
            raise Refused(f"no campaign folder {live}")
        if cmd == "add":
            print(add(live, argv[3], _opt(argv, "--name"), int(_opt(argv, "--start") or 0)))
        elif cmd == "move":
            print(move(live, argv[3], int(argv[4]), _opt(argv, "--why")))
        elif cmd == "lock":
            clear = "--clear" in argv
            print(lock(live, argv[3], None if clear else argv[4], clear))
        elif cmd == "tension":
            print(tension(live, argv[3], int(argv[4]), _opt(argv, "--why")))
        elif cmd == "show":
            print(show(live, "--player" in argv))
        else:
            raise Refused(f"unknown command {cmd!r}")
    except Refused as exc:
        print("refused: " + str(exc), file=sys.stderr)
        return 1
    except (IndexError, ValueError):
        print("refused: missing or malformed arguments — see the usage at the top of engine/bond.py",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
