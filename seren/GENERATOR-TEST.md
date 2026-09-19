<!-- First run of the test build, 2026-09-19. -->
# Ten campaigns, generated and marked

**What was built:** `tools/generate.py` rolls the seven tables and asks one model for the
connective tissue, then writes a module folder in SEREN's formats. `tools/score.py` marks
it twice — **an audit in code**, and **a review by a second model** that did not write it.

```bash
python generate.py --n 10 --seed 19 --out ../content/generated
python score.py --dir ../content/generated
```

Ten campaigns cost about **nine cents** on Nova Pro, all in, generation and marking.

## The result

| | |
|---|---|
| Passed the audit | **9 of 10** |
| Refused | 1 — *Orchards of Discord*, two facts starting `known` |
| Verdicts | publish **0** · keep **9** · bin **0** |
| Best | *Heist of the Hidden Vale*, 22 of 30 |
| Worst axis across all ten | **wanting** (2–3 of 5): fronts still mostly point at the party |
| Best axis | **spine** (4 of 5 everywhere): the trope does run through them |

## What the run proves

**The dice-plus-model split works.** Every campaign used its rolled parts and none of them
read as the same campaign. The trope is doing its job as the spine — it is the only axis
that scored 4 across the board.

**The audit is worth having, and it caught a real one.** *Orchards of Discord* opened with
two facts marked `known` that the party could not possibly know. That is precisely the
failure the brief predicted: not a leak the fog gate can catch, because the campaign had
declared them visible. Code caught it in a millisecond, for nothing.

**Exact counts beat ranges.** Asked for "six to eight facts" and "two or three fronts",
Nova produced three or four facts and two fronts, every time. Asked for **exactly seven**
and **exactly three**, it produced seven and three, every time. Worth remembering wherever
we ask a model for a quantity.

## What it does not prove

**Nothing scored `publish`.** Nine "keep" is a fair mark for what they are: competent,
playable, unmemorable. The reviewer's fix note was the same sentence nine times —
*"enhance the interplay between fronts"* — which is the **wanting** score talking.

**Two causes, and they are separable.**

1. **The generator's prompt** only asks for one interlock, and gets exactly one, weakly. It
   should require that every front wants something another front holds, and say what a
   strong version looks like. *(Cheap to fix. Do this first.)*
2. **The model.** Nova Pro writes serviceable structure and flat prose, and the reviewer
   running on the same model cannot spread its own scores — everything landed 3 or 4. A
   better model on both ends would move generation *and* discrimination.

⚠️ **The scorer marking work by its own sibling is a weak test.** It is fine as a gate for
mechanical quality and useless as taste. Jay reading three of them is worth more than the
whole rubric, which is the point of the "would I play it" axis existing at all.

## What I would change next

1. **Require an interlock on every front**, with an example in the prompt of a strong one.
2. **Two-pass generation:** write it, then hand it back with the audit's complaints and the
   instruction to fix them. The audit becomes the generator's own editor, which costs one
   more call and should clear the refusals entirely.
3. **Name the antagonist properly.** Every one of the ten is a role with a name bolted on;
   the corpus's own six antagonists are people, and the generator never sees them.
4. **Then re-run ten, and read the top three by hand.** The only mark that matters.
