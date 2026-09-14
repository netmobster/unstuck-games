# Content database spec — v0

**AI in production. Math and dice in deployment.** The game ships a database of authored records.
The database is generated here, in production, in batches. At runtime the game never generates
anything: math picks the *role* a record must play, a seed picks the *object*.

> **v0, on purpose.** SEREN's rule: *build one real thing, then say what shape it was.* This schema is a
> starting shape. After the playtest seed set is authored (§8), rewrite it from what the records
> actually needed. Structure lifted from SEREN (templates, dials, provenance gate); content is ours.

---

## 1. Four layers

| Layer | What it is | Who writes it | Changes |
|---|---|---|---|
| **Founding rules** | What every record must obey. Not dials. | Jay | Rarely |
| **Templates** | Lean scaffolds per category (20–30 lines). Bias generation so record #15 isn't record #1 | CC, Jay approves | Per batch |
| **Records** | The database: mutations, strays, habits, planets, last words, fronts, whys | Generated, linted, Jay-sampled | Append; retire, never rewrite |
| **Instances** | A record inside a live run, carrying run state (e.g. *improved by the Synthesis*) | The engine | Every tick |

## 2. Founding rules (lint fails the record if any is broken)

1. **Every positive has a negative, every negative has a positive.** Not balanced: absurd.
2. **Wrong object, wrong ship.** A mutation is sci-fi tech that exists somewhere but would *never* be fitted to a deranged oversized escape pod.
3. **Useless until it isn't.** A mutation's upside should mostly matter in a situation other than the one it arrived in.
4. **Her voice is literal.** Not Betsy's lines are deadpan, rule-bound and literal; she never jokes on purpose.
5. **Jame's voice is Alberta mechanic**; the Prestige's voice is clean, capitalised and sure.
6. **Bad Monkeys canon.** Nothing may contradict canon; unplaceable ideas go to `ideas`, not into a record.
7. **Provenance is non-negotiable:** every record carries batch, generator, date and review status (SEREN's canon gate).
8. **No mechanics spoken in fiction.** Log lines never say "+3 Scrap"; numbers live in the UI (SEREN's DM rule).
9. **Show the record, never state the moral.** *(Read off Jay's why review, batch why-seed-001.)* One concrete image or one bureaucratic record per line; no aphorisms, no thesis sentences. If it could go on a mug, cut it. See `seed/WHY-REVIEW-001.md`.

## 3. Record types

Fields marked ★ are used by runtime selection. Everything else is flavour or the log.

### Mutation (bolt-on)
```yaml
id: mut-potato-replicator
name: External Potato Replicator
category: ★ food | propulsion | defence | comms | hull | power | cosmetic-structural
source: ★ salvage | trade | stray | prestige | synthesis   # how she can get it
upside:   ★ { scrap: 0, power: -1, smudge: +2, tags: [feeds-planet] }
downside: ★ { scrap: 0, power: -1, smudge: 0,  tags: [potato-debris, customs-flag] }
solves: ★ [starving]                 # planet needs it can meet
absurdity: ★ 1-5
lifetime: stop                       # default; God Mode can keep one
synthesis_variant: mut-potato-replicator-optimized   # loss carries forward
log:                                 # her voice
  bolted: "…"
  useless: "…"
  pays_off: "…"
why_tags: [feeding, excess, uninvited-generosity]
provenance: { batch, generator, date, reviewed: sampled|approved|retired }
```

### Stray
Built from a **role template** (SEREN's NPC classes): `want` (one line), `voice`, `tell`, `arrives_when` ★,
`effect_on_ship` ★ (can grant, mutate, or undo a mutation), `goodwill_needs`, `leaves_when` ★, `log`,
`why_tags`, `source_project` (which of Jay's projects it was lifted from), `provenance`.

### Habit
A small quirk for the stop: `trigger` ★, `tiny_effect` ★ (may be zero), `log`, `why_tags`, `provenance`.

### Planet
`need` ★ (starving | silent | bureaucratic | …), `problem` (fiction), `solved_by_tags` ★, `partial_by_tags` ★,
`customs` ★ (none | light | full), `prestige_pressure` ★, `log`, `why_tags`, `provenance`.

### Last words
`line` (Jame, offhand) · `literal_reading` (how she hears it) · `goal_bias` ★ · `encounter_weights` ★ ·
`requires_tags` / `forbids_tags` ★ · `log` (how she reports following it) · `why_tags`.

### Front (Prestige agendas, SEREN format)
`who` (Vorian | Tubs | the Synthesis | …) · `wants` · `doing` · `clock` ★ (segments) ·
`advances_when` ★ (checkable condition only) · `if_full` ★ · `log`.

### Why
**Whole sentences, not fragments.** Stitched fragments read as fill-in-the-blanks.
`sentence` · `register` ★ (defiant | elegiac | absurd | tender) · `verdict_band` ★ ·
`needs_tags` ★ (dominant why_tags of the run) · `variation_slots` (max 1–2 seeded swaps) · `provenance`.

## 4. Dials (the boundary test applied)

A dial exists only if a great record could sit at **either** end. Set per template or per batch, written
as **token — clause of why** (SEREN format).

| Dial | One end | Other end |
|---|---|---|
| **Absurdity** | domestic-weird (a seat warmer that won't stop) | cosmic-deranged (a moon-shaped anchor) |
| **Usefulness** | almost always useless-until | often quietly handy |
| **Curse weight** | downside is a joke | downside is a real problem |
| **Corpus depth** | deep cut (only Bad Monkeys readers get it) | stands alone for anyone |
| **Visibility** | she mentions it constantly | she never logs it (Jame finds out) |
| **Stickiness** | vanishes at the stop | fights to survive into the next epoch |

## 5. Runtime selection (the dice side)

1. **The state gap picks the role.** Compare the run's current state to a target curve (set by sweeps): too strong → liability-heavy vector; struggling → upside-heavy. Output: a *required effect vector* and category spread.
2. **Filters:** source must fit what she did while away; last-words tags; no repeats within a bargain; category spread; a foreshadow chance that a coming planet's `need` appears among `solves`.
3. **The absurdity seed picks the object** from what survives the filters. Balance decided by math, the joke decided by dice.
4. **Everything logged** to the run ledger with its seed (roll-and-log, SEREN): any run can be replayed and audited.
5. **The why at the end:** verdict band + dominant `why_tags` → matching whys → seeded pick + at most two variation slots.

## 6. Generation (the production side)

1. Template per category (lean).
2. Generate a batch with the corpus digest as style bible and the dials set for that batch.
3. **Lint:** schema complete, founding rules 1–8, tags from the controlled vocabulary, vector within bounds, log lines in voice.
4. **Jay samples** a slice of each batch (taste gate). Rejections are data about the template.
5. Merge with provenance. Retire, never rewrite.
6. **Sweep** the database: divergence per return, planet-solve rates, why coverage (every reachable run state has at least N good whys).

## 7. Storage

Plain JSON records in the game's folder, one file per type, with a generated index. Records ship publicly
with the game. The **corpus digest does not**: it stays local as the style bible.

## 8. Playtest seed set (enough to test assumptions, not to ship)

| Type | Count | Why this many |
|---|---|---|
| Mutations | 24 | ~8 per stop, enough for "different every return" to be felt |
| Strays | 6 | two per stop at most |
| Habits | 10 | cheap, frequent |
| Planets | 6 | three stops with RNG variety |
| Last-words lines | 12 | draw 3, several returns without repeats |
| Fronts | 3 | Vorian, Tubs, the Synthesis |
| Whys | 16 | 4 registers × a few verdict bands |

**Authored the SEREN way:** generate, curate hard, then rewrite this spec from what the records needed.

## Open
- The tag vocabulary (controlled list): read it off the seed set, don't author it first.
- Target curves for the state gap: come from the first sweeps.
- How many strays come from Jay's other projects, and which ones.
- Whether habits and mutations are really two types, or one with a `scale` dial.
