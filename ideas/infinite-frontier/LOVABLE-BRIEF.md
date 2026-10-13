# INFINITE FRONTIER — build brief for a first playable (P0)

> Filed 2026-10-13 for a Lovable build attempt. Self-contained: everything needed is in
> this file. Where the design is not yet decided, a **P0 default** is given so the build
> can proceed; defaults are marked and can change. The game's design record lives in the
> Unstuck Games repo under `ideas/infinite-frontier/`.

## 1. The game in one breath

A tower defence with no towers. You grow a world outward on an endless hex plain, one tile
at a time. Every tile you place is a piece of the world with a **denizen**: a briar that
cuts, a volcano that erupts, a swamp that slows. Tiles occupy space, so where you put them
decides where the enemy can walk. The enemy walks the gaps. You can destroy what you placed,
but you get only part of it back. The frontier keeps growing; the threat arrives from further
away each wave; the run ends when the core falls. **The player controls the enemy by
controlling the space it can move through.**

Phone-first, portrait. No backend, no accounts, no ads. Deterministic simulation from a
seed. Math-drawn visuals on a canvas. No runtime AI.

## 2. What is decided, what is a default, what is out

**Decided (do not change):**
- No towers. The hex tile is the unit. Each placed tile has one inherent behaviour.
- Verbs: **place**, **destroy**, **adapt** (destroy then place), **upgrade** (not in P0).
- Routes are not drawn. Enemies path over empty hexes; placed tiles are not walkable.
- The world is unbounded. It grows. There is no edge.
- Tiles come from a **draft**: three offers, take one, place it now.
- Destroying a tile returns only part of its value.
- The simulation is deterministic from a seed and separated from rendering.
- The six routing invariants in §5.

**P0 defaults (chosen so the build can proceed; marked ⚙ below):** three denizens; the
spawn-distance growth rule; the salvage-and-reroll economy; editing allowed during waves;
the numbers in §7.

**Out of P0 (do not build):** upgrades, bosses, relics, unlocks between runs, fog of war,
flying or burrowing enemies, more than three denizens, sound, art assets, accounts, a
backend, a meta-progression, any "God Mode" feature.

## 3. Stack and constraints

- **Vite + React + TypeScript** is fine. **No Supabase, no auth, no server.** Static deploy.
- One `<canvas>` for the board. HUD in ordinary DOM. Portrait phone is the primary layout
  (360×640 up to 430×932); desktop just gets a centred column.
- All game logic in `src/sim/` as pure TypeScript modules with **no React imports and no
  DOM access**. The React layer reads state and dispatches actions. Drawing code must never
  decide a gameplay outcome.
- Seeded PRNG (mulberry32 or similar). Two streams: `simRng` for the game, `fxRng` for
  visual effects, so effects never change outcomes.
- Fixed timestep: the sim advances in **100 ms ticks**. The renderer interpolates.
- `localStorage` only for: best wave reached, last seed. Wrap in try/catch.
- Vitest for the invariant tests in §9.

## 4. The hex grid

- **Pointy-top hexes, axial coordinates (q, r).** Key cells as the string `"q,r"`.
- Neighbour offsets, in this fixed order (used for deterministic tie-breaking):
  `(+1,0) (+1,-1) (0,-1) (-1,0) (-1,+1) (0,+1)`.
- Distance: `(|dq| + |dr| + |dq + dr|) / 2`.
- Pixel conversion for drawing, hex size `s`: `x = s * sqrt(3) * (q + r/2)`, `y = s * 1.5 * r`.
- The world is a `Map<string, Cell>`. Any coordinate not in the map is an **empty, walkable
  hex**. The **core** is at (0,0) and is not walkable; enemies reaching any hex adjacent to
  the core deal damage and vanish.

## 5. Routing invariants (assert these; they are the rules)

1. **Reachability.** After every accepted action, every active spawn hex has a path of
   empty hexes to a hex adjacent to the core.
2. **Multiplicity.** Nothing forces a single route. Pathing is a **flow field** (BFS from
   the core's six neighbours outward over empty hexes). Any empty hex within the search
   bound has a distance-to-core.
3. **Editability.** Place and destroy are the only route-editing actions. There is no
   "switch route" control.
4. **Validate before commit.** A place or destroy is simulated against invariants 1 and 7
   and **rejected** (not undone) if it fails. The rejection is logged with a reason.
5. **No route-switch controls.** (Same as 3; kept for fidelity to the design record.)
6. **Partial refund.** Destroying never returns a full tile's value. See §7.
7. **No stranding.** ⚙ A placement that would leave any living enemy on a hex with no path
   to the core is illegal.
8. **Determinism.** Same seed + same action log ⇒ identical event log, byte for byte.

**Search bound:** because the plain is infinite, BFS runs over the hexes within
`maxSpawnDistance + 2` of the core. Placement is only allowed within that bound.

**Enemies recompute every tick** ⚙ from the current flow field. They always step to the
neighbour with the lowest distance; ties break by the neighbour order in §4.

## 6. The loop

```
NEW RUN (seed shown)
  → opening draft: three times, draw 3 offers, take 1, place it
  → [BUILD]  player may place (only via a drafted tile) and destroy freely
  → tap START WAVE
  → [WAVE]   enemies spawn and walk; denizens act; place/destroy still allowed ⚙
  → wave ends when every enemy is dead or has reached the core
  → core HP ≤ 0 ? RUN OVER (show waves survived, tiles placed, seed; "Again" / "Same seed")
  → otherwise draft: draw 3 offers, take 1, place it  → back to BUILD
```

There is no gold and no shop in P0. The draft is the only way to get a tile.

## 7. Numbers (P0 defaults ⚙)

**Core.** HP 10. An enemy that reaches a hex adjacent to the core deals 1 and is removed.

**Waves.** Wave `w` (1-based) spawns `5 + w` enemies, one every 0.6 s, split round-robin
across all active spawn points.

**Growth: the frontier.** Spawn points are hexes on the plain. Spawn point `k`
(k = 1, 2, 3…) is created at the start of wave `2k − 1`, at distance `D = 4 + k` from the
core, in a direction drawn from `simRng` (pick a hex on ring `D` uniformly). **Spawn points
never go away.** So wave 1 has one spawn at distance 5; wave 3 adds a second at distance 6;
wave 5 a third at distance 7; and so on. The world you have to hold keeps getting bigger in
more directions. A spawn point is never placeable.

**Enemy (one type).** HP `10 + 2w`. Speed 2 hexes/s (one step per 5 ticks). Walks the flow
field. No attack except reaching the core.

**Denizens (three).** Every tile is not walkable. Effects act on nearby hexes:

| Denizen | Effect | Numbers |
|---|---|---|
| **Briar** | Continuous damage to enemies on any of its 6 neighbours | 2 damage/s per enemy |
| **Volcano** | Periodic burst to all enemies within distance 2 | 8 damage every 3 s; first burst 3 s after placement |
| **Swamp** | Enemies on its 6 neighbours move slower | ×0.5 speed; multiple swamps multiply, floor ×0.25 |

**Draft.** Offers are drawn with equal weight from the three denizens using `simRng`
(offer `n` of the run is derived from `seed` and `n`, so the same seed gives the same
offers regardless of where tiles were placed).

**Destroy and salvage.** Destroying a tile grants **+1 salvage**. A draft **reroll costs 2
salvage**. That is the entire economy: two destroys buy one new look at three cards.
(Partial refund, invariant 6: you never get a tile back, only a chance at a different one.)

**Placement legality.** The target hex must be empty, not the core, not a spawn point, not
occupied by an enemy, within the search bound, and must satisfy invariants 1 and 7.

## 8. Interface

Portrait. Canvas fills the screen under a thin HUD.

- **HUD (top):** Wave · Core HP (hearts or a bar) · Salvage · the seed (tap to copy).
- **Draft tray (bottom), when a draft is pending:** three cards, each naming the denizen and
  its one-line effect. Tap a card to select it; legal hexes highlight; tap a hex to place.
  A **Reroll (2 salvage)** button, disabled when unaffordable.
- **Between waves, no draft pending:** a single big **START WAVE** button.
- **Tap a placed tile:** a small sheet shows its name and effect and a **Destroy (+1
  salvage)** button. Tap elsewhere to dismiss.
- **Illegal placement:** flash the hex red and show the reason for one second ("would seal
  the route", "enemy standing there", "too far out").
- **Pan** by drag, **zoom** by pinch; a **fit** button frames core + all spawn points + all
  tiles. Auto-fit when a new spawn point appears.
- **Debug toggle** (small, in a corner): draw the flow field as arrows on empty hexes.

**Drawing (math only, no images).** Empty hexes faint outline; core a filled hex with a
distinct colour; spawn points a dashed hex; Briar/Volcano/Swamp each one flat colour and one
simple glyph drawn with canvas paths; enemies small circles with a thin HP ring; Briar hits
as a short line flick; Volcano burst as an expanding ring over distance 2; Swamp as a tint
on its six neighbours. Light and dark both readable. Respect `prefers-reduced-motion` by
removing the burst animation (the sim is unaffected).

## 9. Tests (Vitest, in `src/sim/__tests__/`)

- Hex: six neighbours, distance symmetric, ring(D) has 6·D cells, neighbour order fixed.
- Flow field: every empty hex connected to the core has a finite distance; each step along
  a path lowers distance by exactly 1.
- Invariant 1: a property test over thousands of random legal action streams never leaves
  a spawn unreachable; sealing the core or a spawn is always rejected.
- Invariant 4: a rejected action leaves the world byte-identical.
- Invariant 6: no action sequence without a draft ever yields a tile; salvage from a
  destroy is 1, a reroll costs 2.
- Invariant 7: no accepted action strands a living enemy.
- Invariant 8: run the same seed and action log twice; event logs are identical. Visual
  effects consuming `fxRng` do not change the sim log.
- Enemies never occupy a tile hex, never skip a hex, and always step to a lower distance.

## 10. Definition of done for P0

A person on a phone can start a run, see the seed, draft and place three tiles, start a
wave, watch enemies walk the gaps and take damage from Briar, Volcano and Swamp, lose a
heart on a leak, draft again, destroy a tile for salvage, reroll a draft, watch the second
spawn point appear further out on wave 3, and lose the run on wave N with a result screen.
The tests in §9 pass. Same seed, same choices, same outcome.

## 11. What we are trying to find out (don't optimise around it, just make it possible)

1. Does path length dominate, or do the denizens matter?
2. Does destroying ever beat not destroying?
3. Does which denizen sits where change the outcome, or is a tile just a wall with a name?
4. Is editing during a wave the best moment of the game, or an exploit?

Keep an **action log** (every accepted and rejected action with the tick) and an **event
log** (spawns, damage, kills, leaks, wave ends) in memory and allow export as JSON from the
result screen, so these questions can be answered from play data later.

## 12. Design record (for context, not for building)

The tombstone, in the studio's method, is the dead game whose living organ this one
resurrects. It is not yet chosen; the researched candidates are Dungeon Keeper (1997),
Dungeon of the Endless (2014), The Settlers II (1996) and Desktop Tower Defense (2007),
with Dungeon Keeper recommended. The pick does not change P0.
