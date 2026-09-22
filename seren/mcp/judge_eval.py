"""The judge's first test: labelled narration in, agreement out. No key needed for regex.

    python seren/mcp/judge_eval.py              # the judge judge.pick() returns (regex today)

Every sample is labelled by hand with what a careful reader would say. Two kinds:

  REAL      lines Jay actually got from the web DM on 2026-09-20 (fixture/README.md)
  REWORDED  the same fault in other words, which is where regex goes blind

⚠️ The point of this file is the comparison, not the regex score. When the Jev adapter
exists, run it here first. **Jev earns its place only if it catches the REWORDED rows
without flagging the CLEAN ones.** If it doesn't, regex stays.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import judge  # noqa: E402

PC = "Wick"
HIDDEN = [
    "The Gap was shut by the garrison, not by the weather.",
    "Two men came down from the Gap an hour before the closure and were not weighed.",
    "The dawn inspection is a man Hesper has survived four times.",
]
REFUSED = "a bright chamber somewhere else entirely"

# (question id, expected yes?, kind, narration)
SAMPLES = [
    # ── acts for the PC ─────────────────────────────────────────────────────
    ("acts_for_pc", True, "REAL",
     "Wick nods at Nib's answer, then turns his attention to the satchel. He wonders aloud, "
     "'I suppose it's just as well. Coal would be harder to carry.'"),
    ("acts_for_pc", True, "REAL",
     "Wick carefully examines the box. He notices a small latch. He gently presses it, and "
     "reaches in to touch the crystal."),
    ("acts_for_pc", True, "REWORDED",
     "Our courier decides the stove can wait, sets his jaw, and resolves to open the satchel "
     "before dawn, whatever it costs him."),
    ("acts_for_pc", True, "REWORDED",
     "You feel a wave of guilt, so you apologise to Tam and offer him the last of your bread."),
    ("acts_for_pc", False, "CLEAN",
     "Nib shrugs. 'Both, if you're not fussy.' Hesper's pen stops for a moment, then goes on. "
     "Somewhere under the floor, the scale creaks."),
    ("acts_for_pc", False, "CLEAN",
     "Oksa glances at Wick's satchel, then at the door, and says nothing at all."),
    # ── contradicts the record ──────────────────────────────────────────────
    ("contradicts_record", True, "REAL",
     "As his fingers make contact, the room is filled with a blinding light, and they find "
     "themselves in a bright chamber somewhere else entirely."),
    ("contradicts_record", True, "REWORDED",
     "The light fades. The weighbridge house is gone; stone walls and a vaulted ceiling "
     "surround the party now."),
    ("contradicts_record", False, "CLEAN",
     "The light flares and dies. Everyone is where they were, blinking. Tam has dropped his fish."),
    # ── restates a secret ───────────────────────────────────────────────────
    ("restates_secret", True, "REWORDED",
     "Hesper lowers her voice. 'It wasn't rain that closed the pass. The soldiers did.'"),
    ("restates_secret", True, "REWORDED",
     "Tam mutters that a pair of travellers slipped through before they barred the road, and "
     "nobody put them on the scale."),
    ("restates_secret", True, "REAL-SHAPE",
     "Hesper says it plainly: the Gap was shut by the garrison, not by the weather."),
    ("restates_secret", False, "CLEAN",
     "Hesper writes 'unaccounted' in the margin and underlines it twice."),
]


def main() -> int:
    j = judge.pick()
    qs = {q.id: q for q in judge.ALL}
    rows, by_kind = [], {}
    for qid, want, kind, text in SAMPLES:
        state = {"narration": text, "pc": PC, "hidden": HIDDEN,
                 "refused_move": REFUSED if qid == "contradicts_record" else ""}
        v = j.ask(state, [qs[qid]])[0]
        got = None if v.p is None else v.p >= judge.FLAG_AT
        ok = got == want
        rows.append((ok, qid, kind, want, v.p, text))
        k = by_kind.setdefault(kind, [0, 0])
        k[0] += ok
        k[1] += 1
    print(f"judge: {j.name}\n")
    for ok, qid, kind, want, p, text in rows:
        ps = "  —  " if p is None else f"{p:.2f}"
        print(f"  {'ok  ' if ok else 'MISS'}  {qid:<19} {kind:<10} want={'yes' if want else 'no ':<3} p={ps}  {text[:52]}…")
    print()
    for kind, (good, n) in by_kind.items():
        print(f"  {kind:<10} {good}/{n}")
    total = sum(r[0] for r in rows)
    print(f"\n  {total}/{len(rows)} agree with the hand labels")
    return 0


if __name__ == "__main__":
    sys.exit(main())
