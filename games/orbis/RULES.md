# Orbis — MVP Rules

The experiment is **not** "can we make Orbis into a game." It is:

> Can we take a beautiful existing watchable system, simplify its controls, preserve its
> audiovisual magic, expose just enough agency to make intervention meaningful, and use
> deterministic simulation to discover a compelling state space?

**Where we landed (Jay, 2026-09-13):** an ant farm you watch evolve — pretty chaos, merges,
explosions — plus sound you want to fall asleep to, plus God Mode to interfere. The original
Orbis was a 90s fish-screensaver × idle orbital game with a dynamic background and sound to
play with; the ant-farm quality emerged and is now the goal.

**What we optimise for is event texture, not body count.** Merges, shatters, supernovae and
singularities per minute are the content. Bodies are only the fuel.

Source: [netmobster/lumina-orbits](https://github.com/netmobster/lumina-orbits) (the original Orbis).

## The five non-negotiables

1. **Watchability survives.** Left alone indefinitely, it remains interesting.
2. **Intervention is causal.** Touching a control produces a response the player can perceive.
3. **No grind.** No resource treadmill whose only purpose is to keep you playing.
4. **No required failure.** A run may destabilise, recover, transform, or die. That is data, not GAME OVER.
5. **The audiovisual system is sacred.** Optimise its implementation, never its behaviour.
   The bar for audio is *perceived behaviour is identical* — if an optimisation changes how it
   feels, throw the optimisation away.

## Decisions (2026-09-13)

| Topic | Decision |
|---|---|
| Home | `unstuck-games` monorepo → `games/orbis/` |
| Enemies / Defend | Cut from v1 |
| Free vs God Mode | Free: Environment, Affinity, Breathe, time skip (10/30/60 min; phones 10/30), sound. God Mode: the 10 chaos agents + every advanced knob. |
| Dial roles (after 3 causal probes) | **Environment** = the space: drag, arrivals, how often the sky acts. **Affinity** = relationships: mutual pull (repulsive at Aloof), stickiness, merge threshold. Moving any dial to an end changes speed or liveliness by ≥20% within 60s. |
| Design | Keep the new Unstuck-era UI; don't revert to the old Orbis console look. |
| The homepage is the game | The live world runs behind the splash from page load; Begin only removes the splash, starts sound, shows controls. The pitch *is* the product — Unstuck refusal A ("build the thing you advertise") made literal. Never replace it with a video or a fake loop. |
| Free controls | Two dials + Breathe, defined by **causal role**, not by numbers: one changes the **environment**, one changes **relationships/behaviour**. Breathe = stop touching it. Mappings are provisional until the sweep says they're perceptible. |
| God Mode (ad hour / subscription) | The chaos agents. Free = the ant farm. Paid = the magnifying glass and the stick. Free must be satisfying with zero intervention. |
| Tech | Vite + TypeScript, plain canvas, no UI framework |
| Performance target | **Phone in bed**, not the Legion 16. Budgets assume a phone is ~5× slower. |
| Sleep use | Orbis is a sleepy app. Audio must survive a hidden tab or locked screen, and the screen should be able to go dark while the sound carries on. |
| Body count | Don't cut the ~1,000-body feel before profiling. Measure bodies × trails × background separately; replace whatever is actually expensive. |
| Jay-hours | Tracked in `/HOURS.md` from hour zero. Machine time ≠ Jay time. |

## Testing philosophy

The sim is deterministic: **same seed → same world → replayable → measurable.**

**Hard invariants** (`bun test` — must always pass): no NaN, no runaway values, bodies in
bounds, bounded body count, numerically stable, deterministic replay, every chaos agent *can* fire.

**Experience metrics** (`bun run sweep` — never pass/fail, always reported): extinction,
runaway clustering, stagnation, soup, event frequency, time to first surprise, dial causality.
We do not decide the answer ("the world never goes empty") before looking at the system.

**Harness scope:** built for Orbis only, kept clean enough to extract. Nothing gets abstracted
into a shared package until game #2 shows what is actually shared.
