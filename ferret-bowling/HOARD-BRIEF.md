# INSPECT HER HOARD

A second face on the end-of-run modal. Filed 2026-09-16 (Jay).

The hoard is the thing that makes players say "one more run", and right now it is a list of
names. Give every object **a reason**, in her words, and the list becomes a diary.

## The interaction

The modal flips (or tabs) between two faces:

| Face | What it holds |
|---|---|
| **THE DAY** | Current: portrait, the sentence, what you learned, what she took, tomorrow's mood. |
| **HER HOARD** | Everything under the couch, oldest first, each with the thought that put it there. |

Flip, don't navigate: the back of the same card, not a new screen. One control, both ways,
and the button back to the cage stays visible on both faces.

## The voice

**Superseded 2026-09-16 by Jay's three lines, which are what shipped:**

- `Shoe is nice. My shoe.`
- `Am fish. Good fish.`
- `Soft and warm. Soft and warm.`

Two tiny sentences, capitals and full stops, no grammar to speak of. The second one claims
the thing or repeats the first. The generator is `games/lucy-proto/src/thoughts.ts`.

*The original draft, kept for the record:*

**Two to four words. No grammar. No sentences. Never a full thought.**

- `soft is soft`
- `for nest`
- `treats okey, no grumps`
- `it squeak once`
- `was in way`
- `smell like you`
- `mine now`
- `cold thing, keep`
- `bit crunchy`
- `no reason. good though`

Rules: lowercase; no apostrophes where she would not bother; present tense; she never explains
herself to you, she is just labelling. If a line could be said by a person, it is wrong.

## Where the reasons come from

**Derived, not authored per object.** The sim already knows everything needed:

- **the tag she was tuned to** when she took it (soft · food · shiny · noise · warm · hide · fabric · water · small)
- **the cause** on the steal event (a plain want, a combo, a habit, a ritual, a nemesis grudge)
- **her leftover mood** that run (hyper · sleepy · grudgy · none · damp)
- **the run number**, so the first thing she ever stole can say something different

A thought is a lookup on (tag × cause), with mood bending the wording and a seeded pick among
2–3 variants so the same object in two different worlds does not always say the same thing.
Habit and ritual thefts should say so in her words — a thing taken for the shoe nest says
`for nest`, not `soft is soft`.

## Rules

- **Never invent a reason the run did not have.** Same rule as the Elsewhere narrator: the
  ledger decides, the words only report.
- **Things that arrived on their own** (the house restocking) get no thought. They are not hers
  yet. Blank is honest.
- **Returned items** — the ones you put back during tidy-up — stay listed with a struck-through
  thought, so she remembers what you took off her.
