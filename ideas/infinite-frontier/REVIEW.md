# INFINITE FRONTIER — review of build brief v0.5

> Filed 2026-10-11. The brief ([BRIEF-v0.5.html](BRIEF-v0.5.html)) came from another AI and
> is filed as handed over. This is CC's review of it against [METHOD.md](../../METHOD.md),
> the library, [GOD-MODE.md](../../GOD-MODE.md) and [PRE-ADS.md](../../PRE-ADS.md). A brief,
> not a spec: nothing is decided until Jay's boundaries are in (method step 4). The
> round-one questions are at the bottom.

**One line:** a roguelike tower defense where the player builds the route out of 9×9
chunks, drafts one of three cards after every wave, and loses everything but unlocks on
death. Sim-first, seeded, no runtime AI, math-drawn. Phone is the test device.

---

## What the brief gets right

- **Simulation-first, deterministic, seeded.** Rendering reads state and never decides
  outcomes. That is Orbis's rule word for word, so the whole Orbis test kit applies.
- **No runtime AI; math-generated visuals.** Matches the studio (generation + dice happens
  in production, math and dice in deployment). No asset pipeline to wait on, nothing for
  PRE-ADS to register.
- **Measure before you penalise.** The long-path callout ("no arbitrary route-length tax
  without evidence") is exactly what the sweep machine is for.
- **Chunk vs cell kept distinct**, world coordinates vs local coordinates through one
  tested helper, and offers derived from the run seed plus a counter, never a shared
  stream that visual effects also consume. All correct and worth keeping verbatim.
- **Guardrails.** Gray-box first, prove geometry before combat, no content library, no
  meta, no menus, no polish until the loop is playable. Agreed.
- **The boss-also-gets-a-card question is called out** as a configurable rule rather than
  silently decided. Good habit.

## What the method requires and the brief does not have

1. **No graveyard record.** Every brief opens with `Tombstone:` and `Markers:`. This one
   names Slay the Spire as a feel reference and nothing else. As written, the design is
   very close to one specific living game: **Rogue Tower** (2022, Die of Death Games), which
   is a roguelike TD where you choose one of several tiles after each wave to extend the
   path, draft cards, lose the run on death and unlock towers between runs. METHOD's test
   applies: *a teardown that ends in "so let's rebuild that" has failed.* Before anything
   is built we need the four beats written down: what was alive in the corpse, what we
   are burning, what survives, and where the organ goes that it has never been. Plausible
   markers: **Loop Hero** (the board you lay is the enemy's road and your record), **Carcassonne**
   (tile grammar, committed placement), **Slay the Spire** (the three-card beat),
   **Infinitode 2** (TD that runs on a phone and is readable at any zoom). Candidate organ
   worth arguing about: *the player authors the enemy's route, and the finished map is the
   story of the run.*
2. **No cremation.** Reward cards, relics, potions, upgrades, bosses every ten waves,
   unlock pools: this is the roguelite expression layer, taken whole. Some of it may
   survive, but it has to be chosen, not inherited.
3. **Library not lifted.** The brief says "inspect the repo" but lifts nothing. Already
   ours and directly applicable:
   - Orbis: deterministic sim, seeded replay, hard invariants vs experience sweeps, the
     causality probe (does placing this tower *perceptibly* change the wave?).
   - The Last Warren: seeded map generator, the Node sweep runner that loads the same ES
     modules as the page, dumb policies plus a lookahead expert, worker pools at ~1,300
     games/s, twin replays, a strict tuner. The chunk catalogue and the long-path question
     are both sweep jobs.
   - Generation + dice: "10,000 seeded chunks" is pre-generation with lint and
     taste-sampling, which is the Bad Monkeys content spec. It should not be invented again.
   - Elsewhere: unknown ≠ zero, if fog is to mean anything (see §Fog below).
4. **No contribution named.** What is the one new library entry? Candidates: chunk
   attachment with cross-boundary route validation; the board as a readable record of the
   run; a draft whose options are filtered by what the board can actually hold.
5. **Boundaries are not Jay's.** 9×9, thirty-second waves, bosses every ten waves, three
   cards, three tiles, three tower types are all stated as fact. They are boundary
   questions and belong to Jay. Round one is below.
6. **God Mode is missing.** Every Unstuck game has one, it is intervention and never a
   paywall on the brake. It shapes the design, so it should be decided before P0 locks the
   rules (lift a committed tile, reroll a draft, pause mid-wave, one undo per hour).
7. **The clock.** HOURS.md gets a Game #6 section from the moment the brief was pasted.
   Started in this commit; Jay corrects the time.

## Design problems the numbers show

**A. The slot arithmetic does not close.** Chunk one has "two or three good tower
positions". A reward arrives every wave, usually two towers and an upgrade. The next chunk
arrives after the wave-10 boss. So from roughly wave three, every tower card is dead and the
brief's own line ("a powerful tower is only valuable if there is somewhere useful to put
it") turns into "most drafts are useless for seven waves". Something has to give: more slots
per chunk (8 to 12, not 2 or 3), a faster tile cadence, towers that merge, replace or sell,
or drafts that stop offering towers when there is nowhere to put one. This is the first
thing a sweep should measure once P2 exists, and the first boundary question.

**B. "Thirty seconds a wave" is only true on chunk one.** Enemies walk the whole route.
Every chunk adds nine to twenty cells of path, so by chunk four the route is several times
longer. Either waves get longer (the "fast loop" quietly dies), or enemies get faster
(towers near the core get less time), or the wave is defined as a spawn window and the
route length is allowed to stretch the fight. Needs a stated rule.

**C. Where does the spawn go when a chunk attaches?** "Extend the connected path" implies
the core stays on chunk one and the spawn migrates to the new chunk's open port. The brief
never says so. It decides whether early towers stay useful (they do, if the route passes
them on the way to the core), whether old chunks become dead ground, and whether the
"strategic overview" is a route or a tree. Alternatives: several spawns on the frontier;
or the route is a loop and enemies circle (Loop Hero's answer, and a real design fork).

**D. Two tile grammars are mixed.** §09 gives a four-bit per-cell port mask with a
rotation rule. §10 says the unit of expansion is a 9×9 chunk. Rotating a 9×9 chunk moves a
port's *offset along its edge*, so the mask alone does not tell you if two chunks fit. The
cheap fix is a convention: every chunk port sits at the edge midpoint (local index 4), so
the four-bit mask is true at chunk scale and the rotation rule in §09 holds. Otherwise a
port must carry (edge, offset). Either way, the mask rotation `((m<<1)&15)|(m>>3)` is
correct and the test ("rotate four times gives the original") is right. Add: an open port
on the frontier is exactly what makes a cell attachable; a chunk with a port facing an
existing closed edge is illegal; a placed chunk must leave at least one open port or the
run cannot grow.

**E. Fog hides nothing.** The player places every chunk knowingly, so fog of war over a
board the player built has no information to conceal. Either drop it or give it a job:
the offered chunk's *consequence* is unknown until placed (Elsewhere's unknown ≠ zero),
or the next wave's composition is fogged until it spawns. Pure decoration is fine too, but
then it is not a mechanic and should not be in P0.

**F. Three resource types in a thirty-second beat.** Towers, upgrades and potions, each
with its own apply flow. Potions are an inventory. Suggest the prototype has none until P3
proves the draft is fast without them.

**G. No phone.** The brief never mentions touch. Jay tests from a phone, so P0 has to
answer: tap to select, tap to place, a rotate button (not drag-rotate), pinch or a zoom
toggle as the map grows, and whether the overview and the tactical board are one view or
two. Designing input after rendering is how you get a desktop game on a phone.

**H. Meta unlocks.** "Rapid death should not be the optimal unlock strategy" is right. The
rule that enforces it: unlocks come from *achievements in a run* (reach wave N, hold a
boss with no leaks, place a chunk of family X), never from death count or runs played.
A policy sweep can check whether suicide-cycling is ever the fastest unlock path.

**I. Boss also gets a card?** Agree it is a config flag. Suggested default: no, the
milestone *is* the reward, and the regular draft resumes after the boss. Keep the flag.

**J. The name.** "Infinite Frontier" is a 2021 DC Comics line and appears on other
products. Not blocking a prototype; check before it ships under that name.

## Platform

Jay wants to instruct and test from a phone, with GitHub as the build and GitHub Pages as
the host. So:

- **Plain ES modules, no build step**, like The Last Warren: the same `sim/` modules load in
  the page and in the Node sweep runner, so the game you play is the game the machines
  played. Pages serves the repo as-is; `.nojekyll` is already present.
- **Canvas 2D**, no WebGL, no framework. The brief says the same.
- **Saves and unlocks in `localStorage`**, which means per device. Fine for a prototype.
- **Paths**, when boundaries are in: source and tests in `games/infinite-frontier/`;
  the public landing page and the playable build at `infinite-frontier/` and
  `infinite-frontier/play/`, matching every other game. When it moves to the box, INFRA
  needs a DNS record and a certificate name for it (no wildcard).

## Proposed P0, once boundaries are in

Gray-box, portrait-phone-first:

1. `sim/chunk.js`: port masks, rotation, the midpoint-port convention, four hand-validated
   archetypes (straight, bend, offset, junction), seeded variation.
2. `sim/world.js`: chunk grid, local ↔ world coordinate helper, attach-at-frontier with
   reciprocal-port validation and whole-route spawn→core reachability.
3. `sim/offer.js`: three seeded chunk offers from the run seed plus an offer counter.
4. Tests: all 16 masks × 4 rotations; every archetype × 4 rotations attaches legally
   somewhere on a fresh start chunk; no offer can be accepted that breaks the route.
5. A page that draws it, with tap-select, a rotate button and tap-to-place.
6. A sweep: random legal attachment for N chunks, reporting route length, buildable cells
   and open-port count per chunk, so question A has numbers before P1 adds combat.

---

## Round one: boundaries for Jay

The options are a map, not a menu. Write your own answer if none fits.

**1. The graveyard.** What is the tombstone?
- (a) **Rogue Tower**, named honestly, and we cremate the tile-after-every-wave loop and the
  card economy, keeping only "the player lays the enemy's road". Cost: we must then be
  visibly unlike it.
- (b) **Loop Hero**: the organ is "the board you lay is the record of the run and the enemy's
  road at once". Cost: Loop Hero's organ is more about tempo than defense, so the TD side
  needs its own justification.
- (c) **Carcassonne**: the tile grammar is the organ, TD is just where we put it. Cost: a
  board game's organ has no waves, so combat becomes genre DNA rather than the point.
- (d) Research shortlist first, as for The Last Warren, and pick from it.

**2. The slot problem (A).** How does chunk one not run out of room by wave three?
- (a) Chunks are generous: eight to twelve build cells each; scarcity comes from range and
  geometry, not from slot count.
- (b) Tiles come faster: a chunk every five waves, bosses every ten.
- (c) Towers stack: a tower card placed on an existing tower upgrades it; slots stay scarce.
- (d) The draft reads the board: no tower offered when no legal slot exists.

**3. Spawn and core (B, C).** When a chunk attaches, what moves?
- (a) Core fixed on chunk one, spawn migrates to the newest open port; waves lengthen with
  the route and we accept that the "thirty seconds" is an early-game number.
- (b) Same, but enemies speed up per chunk so wave time stays roughly flat.
- (c) The route is a loop; enemies circle and the frontier grows the loop.
- (d) Multiple spawns, one per open frontier port.

**4. God Mode.** What is the one-hour intervention here?
- (a) Lift and re-place one committed chunk.
- (b) Reroll any draft, as often as you like for the hour.
- (c) Pause mid-wave and build.
- (d) Undo the last placement, once per wave.

**5. Fog (E).** Keep, cut, or give it a job?
- (a) Cut it from P0.
- (b) Offered chunks hide their consequence until placed.
- (c) Next wave's composition is fogged until it spawns.
- (d) Keep it as pure visual frontier, no mechanic.

**6. Phone (G).** What is the primary layout?
- (a) Portrait, one view, pinch or a zoom toggle as the board grows; rotate is a button.
- (b) Portrait, two views: tactical board and a thumbnail overview you tap to pan.
- (c) Landscape only.
- (d) Desktop-shaped game; phone is for reading the sweeps and approving, not playing.

**7. Scope of P0.** Build the proposed gray-box above as written, or trim?
