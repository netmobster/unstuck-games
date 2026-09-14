# Morning report — Not Betsy rough prototype (night of 2026-09-13)

Jay's brief: *rough test, random stuff that makes sense with random properties that don't; speedrun it to
find where edge cases break and where edge cases are needed.* The equivalent of SEREN's single mapped combat
sequence. Nothing committed, nothing deployed. Throwaway by design.

## Play it

```bash
bun run --cwd games/not-betsy-proto dev
```
→ http://localhost:5191 · `?seed=123` pins a run · **Playtest controls** at the bottom:
- **Time:** manual (default), 1 day = 10 s, 1 day = 1 min, or 1 day = 1 real day (the spec)
- **Parts persist between stops:** the one structural question left as a toggle (see finding 1)
- **Show hints + ledger:** marks parts that fit the planet, shows the raw event ledger
- **Autoplay** to the verdict, **restart seed**, **new run**, **copy session JSON** (paste it to me for any bug)

A full bargain takes ~2 minutes with fast-forward. The run survives reloads (it's replayed from your choices).

## What got built (itemised)
1. **Placeholder content generator:** 24 mutations, 6 strays, 10 habits, 6 planets, 12 last-words lines. Names make sense; properties are rolled from a fixed seed. Your 22 reviewed whys are the real content.
2. **Deterministic bargain sim:** 3 stops × 7 days; route rolled at start; landing → planet problem and/or customs (RNG) → fix with her parts (2 attempts) → goal → draw 3 last words, say 1 → she sheds her parts (God Mode keeps one) → away.
3. **Away engine:** each day she drains power (drifts and "waits and wonders" at zero), rolls an encounter weighted by your goal and her literal reading of your last words: salvage, trade, strays, habits, repairs, quiet, Prestige.
4. **Selection = math + dice:** the state gap (her Smudge vs a rising target) picks the *role* of a new part; an absurdity-weighted seed picks the *object*; 25% foreshadow toward the next planet's need.
5. **Prestige fronts:** Vorian (watches when she's weirder than target; files an interim report when full), Tubs (customs flags; purge when full), the Synthesis (scheduled updates). All remove parts and tidy Smudge.
6. **Verdict + why:** the Prestige's score → archived / deferred / unclassifiable + a misclassification; the why is matched from the run's accumulated tags within the band. Archived runs carry one part into the next Not Betsy.
7. **Playable UI** (functional only; CD designs later): her log while you were away, the planet, her parts with upsides/downsides, strays, habits, goals, last words, day-by-day or fast-forward, the verdict report with the why written over it, the Archive of whys across runs.
8. **Degrading UI:** grime creeps in from the edges and panels lose their straight lines as Smudge outruns the Prestige's target.
9. **Real-time absence:** set a speed, close the tab; she advances on the wall clock. Interest (scrap) accrues for long real absences, capped.
10. **Smoke harness:** 6 player styles × 3,000 bargains; invariants (no negative resources, no duplicate parts, always reaches a verdict, deterministic replay) all **PASS**.

## Tuning done tonight (placeholder numbers, each from a smoke finding)
| Change | Why |
|---|---|
| "Keep your head down" no longer gives power | Run 1: passive play won the top verdict 57% of the time |
| Solving a planet worth ×6 in the verdict (was ×3) | Run 1: fixing barely mattered |
| Starting power 6 → 8, drift recharge 3 → 7 | Run 1: she drifted ~7 of 21 days |
| Panic salvage if she'd land with no parts | Run 1: 13–22% of landings were empty-handed |
| **Bug fix:** foreshadowing aimed at the wrong planet | It guessed from list order while landings were random; now a route is rolled up front |
| Foreshadow chance 0.3 → 0.45 → 0.25 | After the bug fix, 0.45 made parts fit the planet 54% of the time: automatic, not fate |
| Vorian's clock now does something when full | Browser playtest: it filled by stop 2 and then nothing happened |
| **Bug fix:** carried-forward part could duplicate a starting part | Carried part now added first |
| Verdict bands re-centred twice | To keep a spread after each change |

## Final smoke (3,000 bargains per style)
| Player style | Archived | Deferred | Unclassifiable | Parts fit the planet | Solved stops | Drift days/run |
|---|---|---|---|---|---|---|
| thoughtful (fixes smart, uses God Mode) | 8% | 53% | 39% | 45% | 43% | 4.0 |
| random | 11% | 56% | 33% | 42% | 35% | 3.9 |
| absent (never fixes) | **41%** | 51% | 9% | 46% | 0% | 3.9 |
| always salvage | 9% | 59% | 32% | 45% | 44% | 3.5 |
| thoughtful + parts persist | 6% | 52% | 42% | 52% | 50% | 4.0 |
| always keep your head down | 8% | 56% | 36% | 42% | 40% | 3.5 |

All 22 whys are reachable; the most-used appears in 13% of runs. Zero dead weeks, zero empty-handed landings.

## Findings for tomorrow's regroup (questions, not decisions)
1. **"Always different" is trivially true.** With shedding, consecutive landings share *nothing* (median distance 1.00). With parts persisting, 0.67. "Always weirder" may need something to carry through a bargain so the weirdness has a thread. **Try both with the toggle.**
2. **Consequences are real.** Never fixing gets you archived 5× as often. Across whole strategies, goals average out (always-salvage ≈ always-lie-low ≈ random), **but single choices do bite.** Causality probe (lifted from Orbis, `scripts/causal.ts`, 2,000 twin bargains per row, twins identical except one choice at the first stop):

   | One different choice | Parts she came back with (1 = all different) | Days that went differently | Verdict band changed | Why changed |
   |---|---|---|---|---|
   | A different last-words card | 0.57 | 2 of 7 | 43% | 84% |
   | Goal: salvage vs keep your head down | 0.71 | 3 of 7 | 46% | 86% |
   | Goal: salvage vs find crew | 0.67 | 2.5 of 7 | 41% | 78% |
   | Control: identical choices | 0.00 | 0 | 0% | 0% |

   **Caveat:** the run uses one random stream, so any different roll reshuffles everything after it. Part of that "why changed" is butterfly effect rather than the words themselves. Whether that's a bug (choices should bite *legibly*) or a feature (chaos theory is on-theme) is a spec question.
3. **Parts fit the planet about 45% of the time.** Is that fate or noise? Feel it.
4. **The Prestige is busy:** ~4.7 tidies per run. Does that read as pressure, or as the game taking your toys away?
5. **Whys ignore the actual objects.** You chose "Prestige misreads objects" as the next thread; that needs a why to be able to name a part she actually had.
6. **Strays and habits are thin.** They arrive, drip a resource and get logged; they don't want anything yet.

## Added after your "keep iterating" (layouts for CD)
- **Three layouts,** switchable in Playtest controls or with `?layout=panels|ship|log`:
  - **A · Panels:** the tuning dashboard.
  - **B · Ship cutaway:** Not Betsy drawn as a layered sprite with parts bolted onto 8 hardpoints, grime tied to Smudge, and an amber glow when she outruns the Prestige.
  - **C · Log-first for phones:** her log as a message thread, a planet card, parts in a swipe row, and a bottom sheet for leaving.
- **`ASSET-MANIFEST.md`:** every sprite layer (`data-layer` names match the placeholder SVG), hardpoint coordinates, module categories, UI assets and their states, and the degradation rules. Open questions for CD: parts beyond 8, and per-part art vs. a kit-bash system.
- **Two more fixes from browser play:**
  - Labels collided when parts filled the top hardpoints first; fill order is now spread around the hull.
  - A week of "Trader encountered. Nothing to trade. We waved." read as dead air, even though the smoke metric counted it as eventful. Empty trades now yield a pity part.

## Late additions (after "keep building"; nothing from the red-team passes was implemented)
- **Renamed to BAD MONKEYS** (decided). The folder is still `not-betsy-proto` until the review.
- **Reading-load metric** in smoke, for the red team's "≤ ~30 s of reading before you can act" rule. It counts her log + landing entries + the planet problem at 200 wpm: **median 10 s, p90 14 s, max 22 s, 0% of landings over 30 s** in every player style. So the *words* already pass. The density problem the red team saw is the *screen* (parts detail, goals, last words, strays and habits all at once), which is a layout and progressive-disclosure question for CD, not a content-length one.
- **Red-team passes stored for review:** `teardowns/universal-paperclips/REDTEAM-001.md`, `REDTEAM-002.md`. Their four spec-level changes (split causal vs. ambient random streams, Prestige scrutiny instead of rubber-banding, behavioural residue that persists, whys with semantic slots) are untouched until we review.

## Not in this prototype
Real content · art · balance · a real week between stops by default · strays with wants that matter · the Prestige-misreads why thread · anything permanent.

## Also filed last night (backlog, undecided)
Ferret Bowling · Pip from *Dear Satan* as a corpus (Drive link saved, not read) · Elsewhere browser version → Unstuck, with God Mode as simple non-winning mechanics (two watchers, two tasks in one tick, time-shift backwards). All in `IDEAS.md`.
