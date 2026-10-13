# INFINITE FRONTIER — the pivot

> Filed 2026-10-11, CC's response to [PIVOT-HANDOFF.md](PIVOT-HANDOFF.md). It supersedes
> [REVIEW.md](REVIEW.md) wherever the two disagree, and re-reads
> [TOMBSTONE-SHORTLIST.md](TOMBSTONE-SHORTLIST.md) in the new light. A design document, not
> a spec: nothing below is built, and the boundaries in §7 are Jay's to set.

**The thesis, in Jay's words:** the player builds a world of denizens, and controls the
enemy by controlling the space through which it can move.

**The one-sentence version of the pivot:** there are no towers. The hex tile is the
defensive unit. A placed tile is an obstacle *and* an effect, and the enemy's route is
whatever the tiles leave open.

---

## 1. What is established, hypothesis, open, tested

The handoff asks for this distinction kept clean. It is the spine of the document.

| | |
|---|---|
| **Established** (Jay) | No towers. The hex tile is the unit. Each tile has an inherent behaviour. Place, destroy, adapt, upgrade are the verbs. Routes emerge from occupancy. The six routing invariants (§3). Desktop Tower Defense as the theoretical tombstone. Deterministic headless sim, shared with the page. Scale the sweeps only after the minimal sim is proven. Classify the old brief, don't inherit it. |
| **Hypothesis** (promising, untested) | That a functional obstacle is richer than a tower on a board. The twelve denizen archetypes. Partial refunds as the cost of adapting. That hex is the right grid. Roguelike structure on top of the mazing core. |
| **Open** (needs a decision or an experiment) | Everything in §7. Chiefly: where tiles come from (shop or draft); whether any tile is passable; what the board is and whether it grows; recalculation and stranding; exceptional enemies; wave shape; God Mode. |
| **Tested** | Nothing. There is no code. |

## 2. The graveyard, re-read

The shortlist split "the board is the build" into three organs. The pivot picks **A** (you
draw the enemy's road) and changes it in one place the shortlist did not foresee: in
Desktop Tower Defense the walls *happen to shoot*; here the wall *is* the weather. **B**
(opening is attacking) and **C** (what you don't pick becomes terrain) are no longer
candidates for the heart. They are flags in the ground.

```
THE GRAVEYARD
Tombstone:  Desktop Tower Defense (2007) — chosen by Jay, 2026-10-13
Markers:    Dungeon Keeper — a shape of ground earns its denizen; surround a gate to kill it
            Dungeon of the Endless — the ground you can't afford to hold is where they spawn
            The Settlers II — your first ten tiles shape your last hour; demolition burns
            Mamono Sweeper / A Few Billion Square Tiles — the revealed board is the world
            Rampart — damage is a hole in your build; rebuild under the clock
            Fieldrunners — mazing that fit in a hand, 2008
DNA only:   Against the Storm · Carcassonne/Dorfromantik · Isle of Arrows/Rogue Tower ·
            Kingdom/Thronefall · Infinitode 2/Mindustry (alive; stay unlike them)
```

**Where the A/B/C framing breaks.** It assumed the organ and the tile grammar were
separate layers: a route grammar (chunks, ports, masks) with a defence layer on top. The
pivot deletes the seam. There is no route grammar and no defence layer, only occupancy with
behaviour. So the shortlist's "if A, the tile grammar goes" was half right: the *path* tile
grammar goes, and the tile becomes the whole game.

**What was alive in the tombstone.** The road is the negative space of your defence. You
never place a path; you place things, and the path is what is left.

**Cremation.** Named now so it cannot creep back in at 2am:
- The desktop and the Flash-era joke. Square cells. The fixed rectangle.
- **Towers as guns**: range circles, targeting modes, damage-per-second as the whole
  identity of a piece. A denizen has a behaviour, not a weapon.
- Gold-per-kill as the only economy, upgrade tiers 1 to 5 of the same gun.
- The juggling exploit (sell-and-rebuild to trap creeps mid-route). We decide what
  mid-wave change means instead of inheriting the loophole.
- The leaderboard as the ending.

**Transplant.** Place-and-reroute · sell for partial refund · the can't-seal-the-exit rule
(invariant 1) · the skill is the shape of the road.

**Unstuck.** Put that organ on a hex grid where every obstacle is a piece of a world that
does something, and make *destroying* a first-class verb rather than a refund button.

**The honest risk, now a standing test.** As written in the handoff, the core loop is Desktop
Tower Defense's loop with biomes for guns. METHOD's test is that the finished game be so unlike the
tombstone that the credit reads as homage in spirit only. The pivot earns that only if the
things that are *not* in DTD turn out to matter: tiles that act on their neighbours, a
world you re-sculpt mid-run, and the roguelike draw. Experiment 3 in §6 tests exactly this.
If swapping denizen types on a fixed layout barely changes outcomes, we have rebuilt DTD.

## 3. The routing invariants, made precise

Jay's six, restated so they can be asserted in code. Numbering matches the handoff.

1. **Reachability.** After every legal action, every spawn hex has a path of traversable
   hexes to the castle.
2. **Multiplicity.** Nothing in the rules forces one route; the pathfinder is a flow field
   from the castle, and any traversable hex has a distance.
3. **Editability.** Place and destroy are the only route-editing actions. There is no
   "switch route" control (invariant 5).
4. **Validate before commit.** A place or destroy is simulated against invariant 1 (and 7
   below) and rejected, not undone, if it fails. The rejected action is still logged.
5. **No route-switch controls** until an experiment shows they are needed.
6. **Partial refund.** `refund(tile) < cost(tile)` always, so place-destroy loops lose
   resources. The ratio is a tuning knob, default 50%.

Two more that P0 needs in order to run at all, proposed, not established:

7. **No stranding.** A placement that would leave any living enemy on a hex with no path to
   the castle is illegal. (The alternative, stranded enemies die or dig, is experiment 4.)
8. **Determinism.** Same seed and same action log give the same event log, byte for byte.
   Ties in the pathfinder break by a fixed hex ordering. Visual effects draw from a separate
   random stream.

**The open questions the handoff names, with the P0 rule and the experiment that tests it:**

| Question | P0 rule (simplest thing that runs) | Experiment |
|---|---|---|
| Do enemies recalculate on board change? | Yes, every tick, from one flow field recomputed on each change. | 4: compare with "commit to route at spawn". |
| Can a legal change strand an enemy? | No (invariant 7). | 4: allow it; stranded enemies dig through at a cost. |
| Flying, burrowing, exceptional enemies | None in P0. | Later: flyers ignore occupancy but take effects; burrowers pass one tile. |

## 4. The old brief, classified

| v0.5 element | Verdict | Why |
|---|---|---|
| Endless runs, death resets the run | **Preserved** | Independent of towers vs tiles. |
| Simulation-first, renderer decides nothing, seeded, no runtime AI | **Preserved** | House rule; the handoff restates it. |
| Math-generated visuals, 2D top-down | **Preserved** | Hexes drawn from geometry suit it better than squares did. |
| ~30-second waves | **Needs reinterpretation** | Wave length is now a function of the maze the player built. A wave is a spawn window; the fight lasts as long as the road. |
| Boss every tenth wave | **Unresolved** | Nothing in the pivot needs it. Keep as a config flag, decide after P1 shows what a long wave feels like. |
| Three-card reward draft | **Unresolved**, and the biggest fork | The handoff's "spend resources to place" is a **shop** (DTD). The brief's "draw three, take one" is a **draft** (Slay the Spire, Gem TD). They produce different games. See §7 Q1. |
| Tile upgrades | **Needs reinterpretation** | "Upgrade" is one of Jay's four verbs, so it stays, but it upgrades a behaviour, not a gun tier. Out of P0. |
| Relics at milestones | **Unresolved** | A relic bends a rule; a denizen already is a rule. May be redundant. Out of P0. |
| Chunk expansion at milestones | **Needs reinterpretation** | As *path* it is gone. As *more buildable ground* it may survive: the frontier grows where you may place. Hex "chunks" are super-hexes of radius r (19 cells at r=2, 37 at r=3), not 9×9 squares. Out of P0; P0 is one fixed board. |
| 9×9 chunk architecture: ports, four-bit masks, rotation, chunk↔local coordinates | **Superseded** | There are no ports. Routes emerge. The appendix's grammar should not constrain anything. |
| Fog of war | **Superseded** | The brief's fog hid nothing; the pivot gives it no job. If the board grows, the frontier is simply unbuilt. |
| Lateral unlocks, no permanent power | **Preserved** in principle | Unlock denizens, not stats. Out of P0. Achievement-gated, never death-count-gated (REVIEW §H). |
| Phone-first input | **Preserved** (from REVIEW, not the brief) | Hexes are good tap targets. Place = tap empty hex, destroy = tap a tile then confirm. No rotation needed any more, which removes the brief's hardest phone interaction. |
| God Mode | **Unresolved** | Candidates now: destroy refunds 100% for the hour; or place and destroy during a wave with no penalty. Must be intervention, never a paywall on the brake. |
| REVIEW's slot-arithmetic problem (§A) | **Dissolved** | There are no slots. Any empty hex that keeps invariant 1 is legal. |
| REVIEW's wave-length problem (§B) | **Still present** | A longer maze is a longer wave. Measured, not fixed, in P1. |
| REVIEW's spawn-migration problem (§C) | **Deferred** | Only arises if the board grows. |
| REVIEW's two-grammars problem (§D) | **Dissolved** | No grammar. |

**Architecture that remains valid:** everything the house already does. One set of ES
modules for the sim, loaded by both the page and a Node sweep runner (The Last Warren);
seeded replay, hard invariants vs experience sweeps, the causality probe (Orbis); policies
plus a lookahead expert and worker-pool sweeps (The Last Warren). **Architecture that needs
revision:** nothing exists for Infinite Frontier yet, so nothing needs rewriting. The v0.5
appendix's data model (chunk grid, ports, masks) is not to be built.

## 5. The smallest playable prototype (P0)

The smallest machine that can be wrong about the hypothesis.

**Board.** One hex board, axial coordinates, radius 6 (127 hexes), fits a phone in
portrait. One spawn hex on the north edge, one castle hex on the south edge, both fixed for
a given seed. All other hexes start empty and traversable.

**Enemies.** One type. Spawns in a wave of N at a fixed interval, walks the flow-field
shortest path at a fixed speed, has HP, damages the castle on arrival. Recalculates every
tick. Dies when HP reaches zero and pays a bounty.

**Denizens.** Three, chosen to span the space, not twelve:

| Denizen | Behaviour | Why it is in P0 |
|---|---|---|
| **Briar** | Contact damage per tick to enemies on any of its six neighbours | Steady damage: the baseline a wall-that-hurts gives |
| **Volcano** | Every k ticks, burst damage to enemies within distance 2 | Burst and area: the first interaction with path shape |
| **Swamp** | Enemies on its six neighbours move at half speed | Control: the first tile whose value is *other tiles'* exposure time |

Every tile is impassable in P0 (§7 Q2 is the alternative). Effects act on the ring of
neighbours, because the tile itself is never walked on.

**Economy.** One resource. Start with a stake; kills pay a bounty; every tile costs the same
flat price in P0; destroy refunds 50%. Place and destroy are allowed between waves and
during waves alike (experiment 4 varies this).

**Loop.** Place and destroy freely → start wave → enemies walk, tiles act → wave ends
when all are dead or through → castle HP shown → repeat until the castle falls. No draft,
no boss, no relic, no unlock, no growth. One run, one board, one question.

**Interface.** Tap an empty hex to place the selected denizen (three buttons). Tap a tile
to select it; tap again to destroy. Illegal placements show the broken route in red before
rejecting. The flow field is drawable as arrows, as a debug layer. Everything is canvas 2D,
plain ES modules, no build step, like The Last Warren.

**Files.**

```
games/infinite-frontier/
  sim/hex.js        axial coords, neighbours, distance, ring, fixed ordering
  sim/board.js      occupancy, place/destroy with validation (invariants 1, 6, 7)
  sim/route.js      flow field from the castle; path for a hex; reachability
  sim/denizens.js   the three behaviours as pure functions of (board, enemies, tick)
  sim/wave.js       spawn schedule, enemy movement, damage, bounty, castle HP
  sim/run.js        tick loop; event log; seeded RNG; replay from action log
  policies/         random, greedy-damage, serpentine, economy, adaptive
  scripts/sweep.js  Node runner over seeds × policies, worker pool, metrics to CSV
  test/             the invariants below
  index.html, ui.js the page; reads state, never decides it
```

Published later at `infinite-frontier/play/` for GitHub Pages, as the other games are.

## 6. Tests and experiments

**Hard invariants (`node --test`, must pass):**

- Hex math: six neighbours, distance symmetric, ring(r) has 6r cells, ordering total.
- Flow field: every traversable hex connected to the castle has a finite distance; every
  path step decreases distance by exactly one.
- Invariant 1: no legal action sequence ever leaves a spawn unreachable (property test over
  random legal action streams, thousands of seeds).
- Invariant 4: a rejected action leaves the board byte-identical to before.
- Invariant 6: `refund < cost` for every denizen; a place-destroy cycle strictly loses
  resources; no sequence of actions with no kills ever increases the balance (economy
  exploit probe).
- Invariant 7: no legal action leaves a living enemy without a path.
- Invariant 8: same seed and action log → same event log; two runs diffed byte for byte.
- Enemy never occupies an occupied hex; never teleports (moves one hex per step).

**Experience sweeps (report distributions, never pass or fail):** waves survived, leaks,
route length, damage per resource spent, destroys per run, time-to-castle per enemy, per
policy and per seed. Serpentine policy = place to maximise path length. Greedy = place the
tile with the highest expected damage next to the current route. Economy = hoard and place
late. Adaptive = destroy and re-place between waves to chase the enemy. Random = legal noise
as the floor.

**The experiments that could disprove the hypothesis, in order:**

1. **Does route length dominate?** If the serpentine policy beats every other policy at
   every budget, denizens are decoration and this is DTD with a skin. Kill or redesign.
2. **Does destroy matter?** If the adaptive policy never beats the best static build, two
   of Jay's four verbs are dead and the "re-sculpt the world" claim fails.
3. **Does the denizen matter?** The causality probe from Orbis: take the best layouts from
   experiment 1, permute which denizen sits on which hex, hold everything else fixed. If
   survival barely moves, the tile-as-unit is a wall with a name. This is the test the whole
   pivot rests on.
4. **Mid-wave editing.** Three rules side by side: edit freely during waves with per-tick
   recalculation; commit-to-route-at-spawn; no editing during waves. Measure whether free
   editing is a dominant exploit (the juggling we cremated) or the game's best moment.
5. **Hex vs square.** Run the same policies on a square grid with four neighbours. If the
   hex adds nothing measurable, it is a style choice and should be made as one.

Each experiment is a few thousand seeds, not a hundred thousand. The scale comes after the
machine is proven right.

## 7. Round two: the decisions only Jay can make

The options are a map, not a menu. Write your own answer if none fits.

**Q1. Where do tiles come from?**
- (a) **Shop.** You choose any denizen any time, for its price. Pure spatial skill; this is
  DTD's economy and the handoff's wording ("spend resources to add"). P0 as written.
- (b) **Draft.** Three offers, take one; what you take you must place now. Spatial skill
  under a random hand; closer to roguelike.
- (c) **Gem TD's rule.** Three offers, take one, and the two you leave are laid down as
  dead rock where they were offered. No dead draws, and the draft shapes the maze.
- (d) Shop in P0 to isolate the spatial question; draft as experiment 6.

**Q2. Is any tile passable?**
- (a) **No.** Every tile is a wall with a behaviour; effects act on neighbours. P0 as written.
- (b) **Some.** Swamp and Sporewood are walked *through*; Volcano and Obsidian are walls.
  Two kinds of tile, two kinds of placement decision.
- (c) **All passable at a cost.** Every tile slows and hurts; the "wall" is just the one
  that hurts most. Routing becomes weighted shortest path, which is a different game.

**Q3. What is the board?**
- (a) **One fixed board per run.** P0 as written. The run ends when the castle falls.
- (b) **The board grows** at milestones, as buildable ground, not path. Keeps the brief's
  frontier.
- (c) **The board grows every wave by one ring.** Growth is the clock.
- (d) **Spawns multiply** over time on a fixed board; the pressure is routes, not ground.

**Q4. Mid-wave editing.** Free (a), between waves only (b), free but destroy is refused
while an enemy is adjacent (c), or let experiment 4 decide (d).

**Q5. God Mode's hour.** Destroy refunds in full (a); edit during waves with no restriction
(b); one undo of the last wave (c); see the flow field the enemies see (d).

**Q6. P0 scope.** Build §5 as written (a); trim to one denizen and no economy to test
routing first (b); add the draft now because it is the game's feel (c).

## 8. What this game contributes to the library

Pledged, not delivered: **the obstacle is the effect.** A grid where every placed thing
both reroutes and acts, with the sweep harness that can tell a wall-with-a-name from a
denizen. If experiment 3 fails, the contribution is the harness and the negative result.
