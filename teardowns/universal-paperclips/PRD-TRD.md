# PRD / TRD — Unstuck game #2 (working title: NOT BETSY)

**For red team.** Brief on purpose. Status: boundaries set, rough throwaway prototype and smoke tests done,
nothing permanent built. Sources of truth: `BOUNDARIES.md` (decisions), `GAME-SHAPE.md`, `CONTENT-SPEC.md`,
`games/not-betsy-proto/MORNING-REPORT.md` (prototype findings).

---

## 1. Product

### Problem
Universal Paperclips proved players will fall for a system that escalates while telling a story through
mechanics. But it only runs while the tab is open, it ends by explaining its theme, and an anonymous optimizer
AI is now a cliché. Idle games that run while you're away usually become chores: come back, collect, repeat.

### The bet
A game where **absence is the content**. You don't make decisions so much as deal with consequences: an
unsupervised, literal-minded ship keeps changing, and every return is a story, not a cleanup job.

### Player and platform
Phone-in-bed and desktop, browser-first, no install, no account. Sessions: a two-minute check-in or a
thirty-minute sit-down; both are valid.

### Goals
1. **Always weirder:** every return is different in interesting ways, never broken or boring.
2. **A week away is a story.**
3. **The ending lands as meaning:** one sentence of why, not a score.
4. **Choices bite legibly:** goals and last words visibly change what she does.
5. **Content scales cheaply:** thousands of records without runtime AI.

### Non-goals (v1)
Winning or losing · runtime AI · multiplayer · real ads or payments (stubbed) · final art (CD designs after
the UI works) · more than one bargain.

### Core loop
| Phase | Who | What happens |
|---|---|---|
| Land | Jame | Read her log (in her voice, may omit things); the stop is a planet problem and/or customs intake (RNG) |
| Fix | Jame | Use her absurd parts on the planet's problem |
| Brief | Jame | Set a goal; draw 3 last words, say 1 |
| Leave | — | She sheds this stop's parts (God Mode keeps one) |
| Away (a real week; fast-forward allowed) | Not Betsy | Reads goal + last words literally; rolls encounters: salvage, trade, strays, habits, repairs; Prestige fronts advance on clocks |
| ×3 stops, then verdict | The Prestige | Un-optimizability score → archived / deferred / unclassifiable + misclassification |
| End | The Archive | Keeps one matching why. Archived runs carry one "optimized" part into the next Not Betsy |

### Systems
- **Resources:** Scrap (build and fix) · Power (bounds wandering; at zero she "waits and wonders") · Smudge (un-optimizability).
- **Mutations:** every positive has a negative; wrong object, wrong ship; useless until it isn't.
- **Strays, habits:** crew and quirks that arrive while away.
- **Fronts:** Vorian (watches weirdness), Tubs (customs flags → purge), the Synthesis (scheduled updates).
- **Degrading UI:** clean Prestige terminal → rust at the edges as Smudge outruns the Prestige's target.
- **Absence economics:** staying away pays a little (capped), never enough to force it.

### Monetization
Free is the whole game. **God Mode: keep one mutation** past the end of a stop. Unlock is studio-wide: one ad per game per day, then repeatable one-hour activations (see `GOD-MODE.md`).

### Success metrics
Prototype stage: Jay's speedrun verdict ("is this interesting / could it be fun"). Smoke: no dead weeks or
empty-handed landings, every why reachable, choices change outcomes (causality probe), a verdict spread that
rewards engagement. Later: day-7 return rate, bargains completed, whys shared.

---

## 2. Technical

### Architecture
- **Deterministic sim** (TypeScript, no DOM): same seed + same choices → same run. State is rebuilt by replaying the player's action list, which gives save/load, real-time absence, bug reports and replays for free.
- **Content database:** JSON records shipped with the game. **Generation happens in production, selection at runtime.**
- **Runtime selection:** the state gap (Smudge vs. a rising target) picks the *role* of the next part; an absurdity-weighted seed picks the *object*; filters handle source, tags, no repeats and foreshadowing toward the next planet's need.
- **Real-time absence:** days advance on the wall clock from the recorded leave time; fast-forward allowed.
- **UI:** functional web UI first; CD designs it afterwards, with SVG sprite layers from an asset manifest.
- **Stack:** Bun + Vite + TypeScript, static hosting (GitHub Pages, like Orbis). No backend in v1; saves in local storage.

### Content pipeline ("generation + dice")
1. Lean template per category (SEREN's NPC-template pattern).
2. AI generates **whole** records (never fragments) against dials: absurdity, usefulness, curse weight, corpus depth, visibility, stickiness.
3. **Lint:** schema, tag vocabulary, and 9 founding rules (e.g. every positive has a negative; no mechanics in fiction; show the record, never state the moral).
4. **Jay's taste gate:** sample each batch. First batch: 36 whys → 22 kept.
5. Merge with provenance; retire, never rewrite.
6. Sweep the database: coverage, divergence, solve rates.

### Testing
- **Hard invariants** (must pass): non-negative resources, no duplicate parts, always reaches a verdict, deterministic replay.
- **Experience smoke:** six player styles × thousands of bargains → verdict spread, empty-handed landings, parts that fit planets, dead weeks, drift days, why coverage, divergence per return.
- **Causality probe:** twin runs identical except one choice → did it change what happened?

### Prototype results (throwaway, placeholder content)
- **Invariants:** pass. **Speed:** ~0.06 ms per bargain, so thousands of runs take seconds.
- **Verdicts:** a thoughtful player lands 8% archived / 53% deferred / 39% unclassifiable; a player who never fixes anything is archived 41% of the time.
- **Coverage:** 0% dead weeks, 0% empty-handed landings, all 22 whys reachable.
- **One different last-words card** changes 2 of 7 days, 57% of the parts she returns with, and the verdict band 43% of the time (inflated by one shared random stream).

---

## 3. Risks and open questions (please attack these)
1. **"Always different" is trivially true.** Shedding everything each stop makes consecutive ships share nothing. Does weirdness need a thread that persists?
2. **Butterfly effect vs. legibility.** One RNG stream means a small choice reshuffles the rest of the run. On-theme chaos, or choices that don't feel like *yours*?
3. **Absence design.** Does a week between stops kill momentum? Is fast-forward the real game, and is that fine?
4. **The Prestige takes your toys** (~4.7 tidies per run). Pressure, or punishment?
5. **Whys ignore the actual objects.** The chosen thread ("Prestige misreads objects") needs a controlled slot for part names without turning sentences into fill-in-the-blanks.
6. **Rubber-banding is visible.** If players notice "doing well → worse parts", it reads as a nerf.
7. **Text load on phones.** The log is the content; can it stay short?
8. **Ownership of AI-generated content.** Human curation is real, but it's worth deciding how records are credited.
9. **Name:** NOT BETSY vs. BAD MONKEYS vs. both (see `CONCEPT-BRIEF.md`).
10. **Scope creep.** Strays with wants, customs as a set piece and multiple bargains all pull toward SEREN-sized.
