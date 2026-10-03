#!/usr/bin/env python3
# Copyright (c) 2026 Jeremy Wright. All rights reserved. See LICENSE.txt
"""
gate.py - the write-gate for ledger.jsonl

    python scripts/gate.py roll   <file.jsonl> 1d20 '<entry>'   # roll AND log, one op
    python scripts/gate.py batch  <file.jsonl> 8d20             # commit a sequence first
    python scripts/gate.py append <ledger.jsonl> '<json entry>'
    python scripts/gate.py check  <file.jsonl>                   # validate a whole file
    python scripts/gate.py count  <file.jsonl>                   # entries by type
    python scripts/gate.py canon  <canon-dir>                   # provenance on every file

APPEND validates one entry and writes it only if it passes. CHECK validates a
whole file and touches nothing.

Exit 0 = accepted. Exit 1 = REFUSED, with the reason and the spec section.

------------------------------------------------------------------------------
WHY THIS EXISTS

architecture.md S1: the model owns narration, voice and adjudication, and owns
nothing about what is true. The ledger made drift *detectable* and nothing made
it *impossible* - "a file the model reads and then writes to is the model with
a notepad."

This is the deterministic thing S1 asked to put back. It is deliberately the
SMALLEST one that works.

IT KNOWS NOTHING ABOUT D&D. It cannot tell you whether a ruling was correct,
whether a DC was fair, or whether a chuul should have attacked. It knows that a
d10 stops at ten and that addition is not optional. Every check below is
arithmetic or a field name.

    The first three grind probe runs produced 338 entries. Ten were
    unreconstructable, all for the same reason, and none of them looked wrong.
    This catches all ten.

WHAT IT DOES NOT DO - on purpose

  * It does not reconstruct state. That needs the rules, and it is the session
    START check, not this. See SRN-34: a different session with a cold context
    is a better auditor than a script, because it can read a ruling.
  * It does not gate party.md. Once entries are trustworthy the reconstruction
    is trustworthy, and that is where the semantic check belongs.
  * It does not judge adjudications. Three runs made zero rules errors that a
    script could have caught and several that only a reader could.

Keep it this size. Every rule added is a rule that can be wrong.
"""

import json
import os
import secrets
import re
import sys

SPEC = "docs/state-formats.md"

# --- the schema, transcribed from state-formats.md S2.3 and S2.4 -------------
# Envelope fields (S2.1) are legal on every entry and are not repeated here.
ENVELOPE = {"id", "rd", "t", "ref", "note"}

TYPES = {
    # roll types - S2.3
    "attack":     (("src", "tgt", "roll", "total", "vs", "hit"), ("mods", "crit")),
    "damage":     (("dice", "roll", "total", "dtype"),           ("tgt", "src", "mods", "crit")),
    "save":       (("who", "kind", "dc", "roll", "total", "pass"), ("mods", "for")),
    "check":      (("who", "dc", "roll", "total", "pass"),       ("skill", "ability", "mods")),
    "init":       (("who", "roll", "total"),                     ("mods",)),
    "death_save": (("who", "roll", "result"),                    ()),
    "death_fail": (("who", "n", "why"),                          ()),
    "hit_dice":   (("who", "dice", "roll"),                      ()),
    # state-event types - S2.4
    "cast":       (("who", "spell", "slot"),                     ("conc",)),
    "use":        (("who", "feature"),                           ("n",)),
    "recover":    (("who", "feature"),                           ("slots", "uses")),
    "cond":       (("who", "cond", "op"),                        ("src", "until")),
    "conc":       (("who", "op"),                                ("spell", "why")),
    "heal":       ((),                                           ("who", "roll", "amount", "dice", "total", "src")),
    "temp_hp":    ((),                                           ("who", "amount", "dice", "roll", "total", "src")),
    "rest":       (("kind",),                                    ()),
    "down":       (("who", "why"),                               ()),
    # A ruling with no die under it - R-0, added 2026-08-30.
    #
    # DM.md S7 says the DM should "make a call, say you are making it, and
    # write it to `note` on the ledger entry" - and then says the first game
    # "declared a `ruling` type to hold it". THERE WAS NO SUCH TYPE. The
    # contract mandated a write the schema could not accept, and session zero
    # of playtest B produced five rulings with nowhere to put any of them.
    #
    # `note` is envelope-legal on every entry, so a ruling attached to a roll
    # always had a home. This is for the ones with NO ROLL - which is most of
    # them, and all the interesting ones.
    # SHAPE READ OFF THE FIRST GAME, not invented here. e010 declares it
    # inline: "NEW TYPE ruling {who, note}". A first draft of this used
    # {what, why} and retroactively invalidated all three of the entries
    # the type exists to legalise - which is the wrong way round.
    "ruling":     (("who", "note"),                              ("src", "scope")),
    # A roll against a TABLE, added 2026-08-30, session 2.
    #
    # extension.md S2 says encounters are ROLLED and is emphatic about why:
    # "the model owns narration and owns nothing about what is true, and WHAT
    # YOU MEET is a fact about the world. A table takes that authorship away
    # from it." It even names the command - `gate.py roll <ledger> 1d12`.
    #
    # ⛔ AND THERE WAS NO TYPE THAT COULD HOLD THE RESULT. Every roll type here
    # carries a verdict (`pass`, `hit`, `result`) or is initiative. A table roll
    # has no target number and nothing to beat - it has an OUTCOME, and the
    # table owns which one.
    #
    # Second instance of R-0's exact failure: a document mandating a write the
    # schema cannot accept. The first was `ruling`, described as existing and
    # never added. Using `init` instead would have been the "SRD Thug" mistake
    # one layer down - right number, wrong provenance, on a die nobody could
    # later audit.
    #
    # `table` names WHICH table, so a stranger can re-read the row. `result` is
    # the row it landed on, written from the table, not chosen after the fact.
    "encounter":  (("table", "roll", "total"),                   ("who", "result")),
    # Elsible's relationships - added 2026-10-02 (docs/elsible.md S8). Written only by
    # scripts/bond.py: a bond moves with a reason, in steps; tension only rises, and
    # `topped` marks the point of no return. The numbers stay DM-side: the table shows
    # words, and the Record tab does not list these rows.
    "bond":       (("who", "delta", "why"),                      ()),
    "tension":    (("who", "delta", "why"),                      ("topped",)),
    "bond_lock":  (("who",),                                     ("text", "clear")),
}

ENUMS = {
    ("death_save", "result"): {"success", "fail", "crit_success", "crit_fail"},
    ("death_fail", "why"):    {"damage", "crit_damage_at_0"},
    ("conc", "why"):          {"damage", "new_spell", "incapacitated", "voluntary", "ended"},
    ("conc", "op"):           {"start", "end"},
    ("cond", "op"):           {"start", "end"},
    ("rest", "kind"):         {"short", "long"},
}

# Types whose `roll` is a d20 and therefore cannot exceed 20.
D20 = {"attack", "save", "check", "init", "death_save"}

DICE = re.compile(r"^(\d+)d(\d+)([+-]\d+)?$")


class Refused(Exception):
    """A refusal carries what was wrong and where the rule is written down."""

    def __init__(self, entry_id, why, section):
        self.entry_id, self.why, self.section = entry_id or "?", why, section
        super().__init__(why)


def _dice(expr, eid):
    m = DICE.match(str(expr))
    if not m:
        raise Refused(eid, f'dice "{expr}" is not an NdM or NdM+K expression', "S2.3")
    n, faces, mod = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
    return n, faces, mod


# --- facts.jsonl -----------------------------------------------------------
# S5. A separate file with a separate envelope: `f` ids, a session number, and
# `op` where the ledger has `t`. Same discipline, because the ledger's own
# lesson was that an append-only file nobody validates drifts quietly.

FACT_ENVELOPE = {"id", "s", "op", "beat", "note"}

FACT_OPS = {
    "flip":      ({"fact", "from", "to"}, {"how"}),
    "establish": ({"fact", "visibility"}, {"src"}),
    "believe":   ({"fact", "truth"},      set()),
}

VISIBILITY = {"true", "known", "suspected", "false"}
FACT_ENUMS = {
    "from":       VISIBILITY,
    "to":         VISIBILITY,
    "visibility": VISIBILITY,
    "truth":      {"true", "false"},
    "src":        {"module", "play", "player"},
}


def validate_fact(e, seen_ids, last_n):
    """Validate one facts.jsonl entry. Raise Refused, or return its id number."""

    if not isinstance(e, dict):
        raise Refused(None, "entry is not a JSON object", "S5")

    eid = e.get("id")
    if not eid:
        raise Refused(None, "`id` is required on every entry", "S5.2")
    if not re.match(r"^f\d+$", str(eid)):
        raise Refused(eid, f'`id` must be "f" plus a number, got "{eid}"', "S5.2")
    if eid in seen_ids:
        raise Refused(eid, f"`id` {eid} is already used - ids are never reused", "S5.2")
    n = int(str(eid)[1:])
    if last_n is not None and n <= last_n:
        raise Refused(eid, f"`id` must increase in file order - {eid} follows f{last_n}", "S5.2")

    s_ = e.get("s")
    if s_ is None:
        raise Refused(eid, "`s` (session number) is required - the close ceremony "
                           "cannot tell what is new without it", "S5.2")
    if not isinstance(s_, int) or isinstance(s_, bool) or s_ < 1:
        raise Refused(eid, f"`s` must be a positive integer, got {s_!r}", "S5.2")

    op = e.get("op")
    if not op:
        raise Refused(eid, "`op` is required on every entry", "S5.2")
    if op not in FACT_OPS:
        raise Refused(eid, f'unknown op "{op}" - expected one of '
                           f"{', '.join(sorted(FACT_OPS))}. Unlike ledger types, "
                           "the op vocabulary is CLOSED", "S5.3")

    required, optional = FACT_OPS[op]
    allowed = FACT_ENVELOPE | required | optional

    for field in sorted(required):
        if e.get(field) in (None, ""):
            raise Refused(eid, f'op "{op}" requires `{field}`', "S5.3")

    for field in sorted(e):
        if field not in allowed:
            raise Refused(eid, f'`{field}` is not a field of op "{op}" - '
                               f"allowed: {', '.join(sorted(allowed))}", "S5.3")

    for field, values in FACT_ENUMS.items():
        if field in e and str(e[field]) not in values:
            raise Refused(eid, f'`{field}` must be one of {", ".join(sorted(values))}, '
                               f'got "{e[field]}"', "S5.1")

    if op == "flip" and str(e.get("from")) == str(e.get("to")):
        raise Refused(eid, f'`from` and `to` are both "{e.get("to")}" - '
                           "a flip that changes nothing is not a flip", "S5.3")

    return n


def validate(e, seen_ids, last_n):
    """Validate one parsed entry. Raise Refused, or return its id number."""

    if not isinstance(e, dict):
        raise Refused(None, "entry is not a JSON object", "S2")

    # --- envelope -----------------------------------------------------------
    eid = e.get("id")
    if not eid:
        raise Refused(None, "`id` is required on every entry", "S2.1")
    if not re.match(r"^e\d+$", str(eid)):
        raise Refused(eid, f'`id` must be "e" plus a number, got "{eid}"', "S2.1")
    if eid in seen_ids:
        raise Refused(eid, f"`id` {eid} is already used - ids are never reused", "S2.1")
    n = int(str(eid)[1:])
    if last_n is not None and n <= last_n:
        raise Refused(eid, f"`id` must increase in file order - {eid} follows e{last_n}", "S2.1")

    t = e.get("t")
    if not t:
        raise Refused(eid, "`t` is required on every entry", "S2.1")

    # --- an undeclared type needs a declaration, per S2.2 -------------------
    if t not in TYPES:
        if not e.get("note"):
            raise Refused(
                eid,
                f'unknown type "{t}". S2.2 allows new types, but a new type '
                f"DECLARES its required and optional fields before first use - "
                f"put the declaration in `note`, then add it to the spec",
                "S2.2",
            )
        return n  # declared in good faith; the shape is the author's to state

    required, optional = TYPES[t]

    for f in required:
        if f not in e:
            raise Refused(eid, f'`{f}` is required on `{t}`', "S2.3/S2.4")

    known = ENVELOPE | set(required) | set(optional)
    unknown = sorted(set(e) - known)
    if unknown:
        raise Refused(
            eid,
            f'`{t}` has no field {", ".join(unknown)} - the vocabulary is open '
            f"but the shapes are not",
            "S2.2",
        )

    # --- either/or requirements the table states in prose -------------------
    if t == "heal" and not ({"roll", "amount"} & set(e)):
        raise Refused(eid, "`heal` needs `roll` or `amount`", "S2.4")
    if t == "temp_hp" and "amount" not in e and not ({"dice", "roll"} <= set(e)):
        raise Refused(eid, "`temp_hp` needs `amount`, or `dice` and `roll`", "S2.4")
    if t == "damage" and "tgt" not in e and "ref" not in e:
        raise Refused(
            eid,
            "`tgt` is required on `damage` unless the damage is an area effect, "
            "in which case per-target outcome comes from `save` entries that "
            "`ref` this one - so an area `damage` still needs to be referenceable",
            "S2.3",
        )

    # --- enums --------------------------------------------------------------
    for (etype, field), allowed in ENUMS.items():
        if t == etype and field in e and e[field] not in allowed:
            raise Refused(
                eid,
                f'`{field}` on `{t}` must be one of {sorted(allowed)}, got "{e[field]}"',
                "S2.3/S2.4",
            )

    mods = e.get("mods") or []
    if mods and not all(isinstance(m, (list, tuple)) and len(m) == 2 for m in mods):
        raise Refused(eid, "`mods` is a list of [name, value] pairs", "S2.3")
    modsum = sum(v for _, v in mods)

    roll = e.get("roll")

    # --- a d20 stops at twenty ---------------------------------------------
    if t in D20 and isinstance(roll, int) and not 1 <= roll <= 20:
        raise Refused(eid, f"`roll` on `{t}` is a d20 and cannot be {roll}", "S2.3")

    # --- the dice have to be able to produce the roll -----------------------
    if "dice" in e and isinstance(roll, int):
        count, faces, dmod = _dice(e["dice"], eid)
        if not count <= roll <= count * faces:
            raise Refused(
                eid,
                f'`roll` is the RAW dice, before anything is added. '
                f'{e["dice"]} rolls {count}-{count * faces} and cannot roll {roll}. '
                f"If {roll} is the damage dealt, it belongs in `total`",
                "S2.3",
            )
    else:
        dmod = 0

    # --- the VERDICT has to match the arithmetic ---------------------------
    # Added 2026-08-28. A reader ran the published validator against the
    # published ledger and found this hole in about ten minutes: the gate
    # checked that `total` rebuilt from the die, and never checked that
    # `pass` agreed with it. A total of 7 against DC 13 was accepted as
    # `pass: true`.
    #
    # That is the exact failure this project exists to exclude. Softening a
    # result does not require bad arithmetic - it requires an honest total
    # and a dishonest verdict, which is the cheapest lie available and was
    # the one thing nothing was watching.
    for value_field, threshold_field in (("pass", "dc"), ("hit", "vs")):
        if value_field in e and threshold_field in e:
            got, thr, tot = e[value_field], e[threshold_field], e.get("total")
            if isinstance(got, bool) and isinstance(thr, int) and isinstance(tot, int):
                if got != (tot >= thr):
                    raise Refused(
                        eid,
                        f"`{value_field}` is {str(got).lower()} but total {tot} "
                        f"vs `{threshold_field}` {thr} says "
                        f"{str(tot >= thr).lower()} - the verdict must match the "
                        f"arithmetic. A true total with a false verdict is what "
                        f"softening looks like",
                        "S2.3",
                    )

    # --- and the arithmetic has to close -----------------------------------
    if "total" in e and isinstance(roll, int) and isinstance(e["total"], int):
        expected = roll + dmod + modsum
        if e["total"] != expected:
            bits = f"roll {roll}"
            if dmod:
                bits += f" {dmod:+d} (in dice)"
            if modsum:
                bits += f" {modsum:+d} (mods)"
            raise Refused(
                eid,
                f'`total` must equal {bits} = {expected}, got {e["total"]}',
                "S2.3",
            )

    return n


def scan(path):
    """Validate every entry in a file. Returns (count, [Refused]).

    The validator is chosen by filename: facts.jsonl has its own envelope
    (S5.2) and a CLOSED op vocabulary, where ledger types are open (S2.2).
    """
    check = validate_fact if os.path.basename(path) == "facts.jsonl" else validate
    seen, last, refusals, count = set(), None, [], 0
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            if not line.strip():
                continue
            count += 1
            try:
                e = json.loads(line)
            except json.JSONDecodeError as err:
                refusals.append(Refused(f"line {lineno}", f"not valid JSON - {err}", "S2"))
                continue
            try:
                n = check(e, seen, last)
                seen.add(e["id"])
                last = n
            except Refused as r:
                refusals.append(r)
                # keep going: one bad entry should not hide the next
                if isinstance(e, dict) and e.get("id"):
                    seen.add(e["id"])
    return count, refusals



# ---------------------------------------------------------------------------
# CANON - provenance, the one rule that had no control.
#
# canon/README.md: "Every file here records where it came from, when, and by
# what route. A canon fact with no source is a fact nobody can audit, and this
# directory is exactly where an unsourced assertion does the most damage."
#
# That rule was enforced by nothing. gate.py validated JSONL and never opened a
# markdown file, so the directory the DM treats as TRUE was protected by the
# class of rule DM.md S2 already says does not hold. An instruction is not a
# control - it cost two lost dice rolls to learn that the first time.
#
# WHAT THIS FOUND ON ITS FIRST RUN, 2026-08-28: nine of nine files already
# carried a source and a date. The gap was real and nothing had gone through
# it. Both halves are worth stating - the runs were honest, and the gate was
# not the reason.
#
# IT CHECKS THE CONVENTION THE REPO ALREADY USES, not one invented here.
# Provenance in canon/ is a prose "**Source:**" line, not front matter, and
# rewriting nine compliant files to satisfy a new validator would be the tail
# wagging the dog.
# ---------------------------------------------------------------------------

CANON_SOURCE = re.compile(r'^\s*(?:\*\*Source:?\*\*|\|\s*\*\*source\*\*\s*\||source:)',
                          re.M | re.I)
CANON_DATE = re.compile(r'20\d\d-\d\d-\d\d')


def scan_canon(root):
    """Every .md under root must say where it came from and when.

    Returns (count, [Refused], [(path, note)] warnings).

    REFUSED  - no source line, or no date. The spec calls provenance
               non-negotiable, so these are refusals.
    WARNING  - a derived file that cites no capture in archive/. The spec says
               "derived files cite the capture", which is softer than the
               source requirement and is not yet universal in the tree.
    """
    refusals, warnings, count = [], [], 0
    for dirpath, _dirs, files in os.walk(root):
        for name in sorted(files):
            if not name.endswith(".md") or name == "README.md":
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, root).replace("\\", "/")
            count += 1
            try:
                text = open(path, encoding="utf-8").read()
            except OSError as err:
                refusals.append(Refused(rel, f"cannot read - {err}", "canon/README.md"))
                continue

            if not CANON_SOURCE.search(text):
                refusals.append(Refused(
                    rel,
                    "no provenance - canon files record where they came from. "
                    "Add a `**Source:**` line naming the origin",
                    "canon/README.md"))
                continue

            if not CANON_DATE.search(text[:2000]):
                refusals.append(Refused(
                    rel,
                    "provenance has no date - `where it came from` and `when` "
                    "are both required. Add an ISO date near the source line",
                    "canon/README.md"))
                continue

            in_archive = rel.startswith("archive/") or "/archive/" in "/" + rel
            if not in_archive and "archive/" not in text:
                warnings.append((rel, "derived file cites no capture in archive/"))
    return count, refusals, warnings


def report(refusals, prefix="REFUSED", spec=SPEC):
    """`spec` is which document the refusal is quoting.

    It is a parameter because canon refusals quote canon/README.md, not the
    state-formats spec. A refusal that names a document which does not contain
    the rule it is enforcing is worse than no citation - gate.py cited [S2.3]
    for a rule S2.3 did not contain for several hours on 2026-08-28.
    """
    for r in refusals:
        where = f"{spec} {r.section}".strip()
        print(f"{prefix}  {r.entry_id}: {r.why}  [{where}]", file=sys.stderr)


def main(argv):
    if len(argv) < 3:
        print(__doc__.strip().split("\n\n")[1], file=sys.stderr)
        return 2

    cmd, path = argv[1], argv[2]

    if cmd == "check":
        count, refusals = scan(path)
        if refusals:
            report(refusals)
            print(f"\n{len(refusals)} of {count} entries refused.", file=sys.stderr)
            return 1
        print(f"{count} entries, all valid.")
        return 0

    # ---------------------------------------------------------------------
    # ROLL - the structural fix for the failure that mattered.
    #
    # The first played session narrated two rolls it never wrote, and `check`
    # said "all valid" because a missing entry is not an invalid entry. The
    # first remedy was a line in the contract asking the DM to append before
    # narrating - an instruction the same model has to remember, which is not
    # a control.
    #
    # This is the control. The dice and the ledger line are produced by one
    # operation, so AN UNLOGGED ROLL IS AN UNROLLED ROLL: you do not have the
    # number until it is on disk. Narrating a die you did not log is no longer
    # a discipline problem, it is impossible.
    # ---------------------------------------------------------------------
    if cmd in ("roll", "batch"):
        if len(argv) < 4:
            print("roll  <file.jsonl> <NdM> '<entry without roll/total>'", file=sys.stderr)
            print("batch <file.jsonl> <NdM> [note]", file=sys.stderr)
            return 2
        spec = argv[3]
        m = re.match(r"^(\d+)d(\d+)([+-]\d+)?$", spec)
        if not m:
            print(f"REFUSED  '{spec}' is not NdM or NdM+K", file=sys.stderr)
            return 1
        n_dice, faces, dmod = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
        if not (1 <= n_dice <= 50 and 2 <= faces <= 100):
            print("REFUSED  implausible dice", file=sys.stderr)
            return 1
        rng = secrets.SystemRandom()
        dice = [rng.randint(1, faces) for _ in range(n_dice)]

        seen, last = set(), None
        try:
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        prev = json.loads(line)
                        seen.add(prev.get("id"))
                        pid = str(prev.get("id", ""))
                        if pid[1:].isdigit():
                            last = int(pid[1:])
        except FileNotFoundError:
            pass
        nid = "e%03d" % ((last or 0) + 1)

        if cmd == "batch":
            # A batch is COMMITTED BEFORE IT IS CONSUMED. Every entry that
            # later spends one of these dice references this id, so the
            # sequence and its order are on disk before anyone knows what
            # they are for. That is what makes "no cherry-picking" checkable
            # by a third party rather than a claim.
            entry = {"id": nid, "rd": None, "t": "batch", "dice": spec,
                     "rolls": dice,
                     "note": (argv[4] if len(argv) > 4 else
                              "Rolled as one batch and committed before use. "
                              "Consumed strictly in order; consuming entries ref this id.")}
        else:
            try:
                entry = json.loads(argv[4]) if len(argv) > 4 else {}
            except json.JSONDecodeError as err:
                print(f"REFUSED  not valid JSON - {err}", file=sys.stderr)
                return 1
            for banned in ("roll", "total", "pass", "hit"):
                if banned in entry:
                    print(f"REFUSED  do not supply `{banned}` - roll produces it. "
                          "Declaring the outcome before the die exists is how a "
                          "false verdict gets written.", file=sys.stderr)
                    return 1
            entry["id"] = nid
            entry.setdefault("rd", None)
            entry["roll"] = dice[0] if n_dice == 1 else sum(dice)
            mods = sum(int(v) for _, v in entry.get("mods", []))
            entry["total"] = entry["roll"] + dmod + mods
            # Derive the verdict. It is never an input: `pass` is required on
            # check and save, so accepting it would mean declaring the outcome
            # before the die existed - which made the fix for the lost rolls
            # the easiest way to write a false one.
            if isinstance(entry.get("dc"), int):
                entry["pass"] = entry["total"] >= entry["dc"]
            if isinstance(entry.get("vs"), int):
                entry["hit"] = entry["total"] >= entry["vs"]
            if n_dice > 1:
                entry["dice"] = spec

        try:
            check = validate_fact if os.path.basename(path) == "facts.jsonl" else validate
            check(entry, seen, last)
        except Refused as r:
            report([r])
            print("  nothing was written.", file=sys.stderr)
            return 1

        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        print("rolled  " + " ".join(str(d) for d in dice))
        print(f"logged  {nid}" + (f"  total {entry['total']}" if "total" in entry else ""))
        return 0

    if cmd == "canon":
        count, refusals, warnings = scan_canon(path)
        for rel, note in warnings:
            print(f"WARNING  {rel}: {note}  [canon/README.md]", file=sys.stderr)
        if refusals:
            report(refusals, spec="")
            print(f"\n{len(refusals)} of {count} canon files refused.", file=sys.stderr)
            return 1
        tail = f", {len(warnings)} warning(s)" if warnings else ""
        print(f"{count} canon files, all carry source and date{tail}.")
        return 0

    if cmd == "count":
        # Added 2026-08-27. The first played session narrated two rolls it never
        # wrote, and `check` said "all valid" - because a missing entry is not an
        # invalid entry. check validates SHAPE; nothing validated COMPLETENESS.
        # This prints what is there so a human can compare it to what was said.
        from collections import Counter
        kinds, n = Counter(), 0
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    n += 1
                    e = json.loads(line)
                    kinds[e.get("t") or e.get("op") or "?"] += 1
        print(f"{n} entries in {path}")
        for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
            print(f"  {v:4d}  {k}")
        rolls = sum(v for k, v in kinds.items()
                    if k in {"attack", "save", "check", "damage", "init", "heal", "death_fail"})
        if os.path.basename(path) != "facts.jsonl":
            print("")
            print(f"  {rolls} of these involved a die.")
            print("  Compare that against the rolls you spoke aloud. If they")
            print("  disagree, the ledger is incomplete and check will not say so.")
        return 0

    if cmd == "append":
        if len(argv) < 4:
            print("append needs an entry", file=sys.stderr)
            return 2
        try:
            entry = json.loads(argv[3])
        except json.JSONDecodeError as err:
            print(f"REFUSED  not valid JSON - {err}", file=sys.stderr)
            return 1

        # The validator is chosen by filename, exactly as scan() does. Without
        # this, append validated every file as a ledger and facts.jsonl was
        # unwritable - its `f` ids were refused by the `e` id rule.
        is_facts = os.path.basename(path) == "facts.jsonl"
        check = validate_fact if is_facts else validate
        prefix = "f" if is_facts else "e"

        seen, last = set(), None
        try:
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        prev = json.loads(line)
                        seen.add(prev.get("id"))
                        if re.match(rf"^{prefix}\d+$", str(prev.get("id", ""))):
                            last = int(str(prev["id"])[1:])
        except FileNotFoundError:
            pass

        try:
            check(entry, seen, last)
        except Refused as r:
            report([r])
            print("\nNothing was written.", file=sys.stderr)
            return 1

        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        print(f"accepted  {entry['id']}")
        return 0

    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
