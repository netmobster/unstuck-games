# The Unstuck Method

How an Unstuck game gets made. Living document: every game should change it a little.

## The loop

1. **Find the fun.** A loved game stuck somewhere: buried under monetization, a dead platform, bad scope, or a creator's own overbuild.
2. **Teardown.** Deconstruct it to principles, not features. Label every piece: genre DNA (take freely), principle (abstract and rebuild), expression (do not touch). This is also the provenance trail. → `teardowns/<source>/TEARDOWN.md`
3. **Lift from the library first.** Before designing anything new, check what our own shipped games already solve. See *The Library* below.
4. **Boundaries.** Jay sets them. Nothing is designed before they exist. → `teardowns/<source>/BOUNDARIES.md`
5. **Test the boundaries.** Deterministic sim, hard invariants, experience sweeps, causality probes. Machines play thousands of runs; Jay judges the specimens.
6. **Build tiny, make it good, ship.** UI and art pipeline:
   - CC builds the UI functionally first; **CD (Claude Design) designs it afterwards**.
   - Visuals that need sprite layers come from CD as **transparent SVGs**.
   - CC starts with placeholder art it can generate, and writes an **asset manifest**: every asset, its layers, anchors, states and variants, so CD's SVGs drop straight in.
7. **Contribute back.** Every game must add **one new thing** to the library: a mechanic, a system, a tool, or a technique no earlier game had. If it adds nothing, ask why it exists.

**Decision rounds (how steps 4–5 run).** "We're taking shortcuts to find unique magic, and that magic is the
game." CC asks in rounds of multiple-choice questions, but the options are a *map*, not a menu: spread
across genuinely different positions, each with its cost, including an edge case, always with an escape
hatch. A good option set is one Jay usually rejects, writing his own answer aimed at the shape the options
revealed. His own words are the decision. (Jay, [*I almost never click the options*](https://echofiles.substack.com/p/i-almost-never-click-the-options).)

**The compounding rule:** the more we ship, the more there is to lift from, so each game should cost less Jay-time than the last *and* leave the next one richer. (HOURS.md measures the first half; this library measures the second.)

---

## The Library

What each shipped game proved, available to every later game. Lift freely — it's ours.

### Orbis (game #1)
| Entry | What it is | Where |
|---|---|---|
| **Deterministic sim + seeded replay** | Same seed → same world; sim returns events, never touches the DOM | `games/orbis/src/sim/` |
| **Hard invariants vs. experience metrics** | `bun test` must pass; `sweep` never passes/fails, it reports distributions | `games/orbis/test/`, `scripts/sweep.ts` |
| **Causality probe** | Run twins, move one control mid-run, measure if the change is perceptible | `sweep --causal` |
| **Conditions, not interference** | Free controls change the world's rules; direct intervention is God Mode | Orbis dials |
| **God Mode = intervention** | The ad hour / subscription buys the stick, not the fun | Orbis God Mode |
| **The homepage is the game** | The live world runs behind the splash; "Reveal the world" removes the UI | Orbis splash |
| **Event-sliced sound** | Events pull random faded slices from full tracks; music and SFX become one composition | `games/orbis/src/audio/` |
| **Time skip as a free toy** | Skip ahead by running the real deterministic sim, not a coarse approximation | Orbis skip |

### Elsewhere (Jay's original, pre-Unstuck)
| Entry | What it is | Where |
|---|---|---|
| **Real-time absence** | The world advances whether you're there or not | [elsewhere-idle-cc](https://github.com/netmobster/elsewhere-idle-cc) |
| **Orders execute into a moved world** | A bounded queue of standing orders fires on a cadence; they land in whatever the world has become | Elsewhere engine |
| **Unknown ≠ zero** | Unobserved values are shown as unknown, not empty; attention is a resource | The Board |
| **Engine rolls, narrator lives with it** | Outcomes rolled in code with arithmetic shown; prose may not contradict the ledger | Elsewhere PRD |
| **Absentee criteria in balance tests** | "What does a day away do" is a tested ratio, not a vibe | `bench.py` |

### SEREN (Jay's AI Dungeon Master, pre-Unstuck; patterns only, not content)
SEREN is a rules-and-formats system driven by a coding agent plus ~4.9K lines of stdlib Python checkers.
Lift the **patterns**; its module content is third-party-derived and all-rights-reserved.

| Entry | What it is |
|---|---|
| **Roll-and-log in one step** | You never see a number that wasn't written down first; verdicts derived by code, narration can't reverse them |
| **Knowledge ledger** | Facts are `true` / `known` / `suspected` / `false`; wrong beliefs are kept on purpose. POV knowledge vs. world truth |
| **Engine-owned hidden truth** | The engine exposes only `view(pov)`, never full state; state is a replayed action log |
| **Fog-of-war render gate** | UI allow-lists what a panel may show, then scans the output for leaks |
| **Fronts and clocks** | Agendas (`wants / doing / clock / if full`) that advance at checkable moments; beats unlocked by clocks. A world that moves without the player |
| **"A script has a plot; a module has agendas"** | Corpus → 2–4 fronts, not 30 scenes; don't promote every named character |

SEREN has **no real-time absence model**; its time is fictional. Elsewhere supplies that.

### Game #2 (in progress) — pledged contributions
| Entry | What it will be |
|---|---|
| **⭐ Generation + dice** (core Unstuck mechanic) | *AI in production, math and dice in deployment.* Content is generated whole (a whole why, a whole mutation, like SEREN generates a whole champion), linted, taste-sampled, and **pre-generated into a database** (SEREN generates just-in-time; Unstuck pre-generates, so it runs in a browser with no runtime AI). At runtime, math picks the role a record must play and a seed picks the object. Jay: better magic than just ingesting a corpus. Spec: `teardowns/universal-paperclips/CONTENT-SPEC.md` |
| **An ending that is a sentence, not a score** | The run's verdict is the antagonist's score; what's kept is one pre-generated why that matches what the run became |
| **Corpus → playable world** | An existing body of fiction as the world the player plays *inside*, from a specific character's point of view. (Now the input to generation + dice, not the contribution itself) |

---

## Worked example: Universal Paperclips' problems vs. our library

Most of what the teardown flagged as broken is already solved by things we've built:

| UP problem (teardown §5) | Already solved by |
|---|---|
| Only runs while the tab is open | Elsewhere: real-time absence + order queue |
| Anonymous AI frame reads as a clone | Corpus POV (game #2's contribution) |
| Opaque hidden systems confuse players | Elsewhere: unknown ≠ zero; rolls shown with arithmetic |
| Act 3 confusion, soft-locks, dead zones | Orbis: sweeps + invariants find them before players do |
| Controls that don't visibly matter (combat you just watch) | Orbis: causality probe |
| Pacing brakes are where F2P puts ad walls | Orbis: God Mode = intervention, never a paywall on the brake |
| Button friction, fragile saves, stutter at scale | Orbis: fixed-step deterministic loop, event-driven UI |

What's genuinely new work is the part only this game can contribute.
