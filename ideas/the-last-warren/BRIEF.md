# THE LAST WARREN — concept brief

> Filed 2026-10-01 from the red team, as handed over. Working title in the brief was
> **WARREN**; Jay's name is **The Last Warren**. A brief, not a spec — nothing here is
> decided until Jay's boundaries are in (method step 4).

**A tower defense game where you are the thing trying not to be found.**

## The inversion

Take the basic grammar of tower defense — **place → grow → upgrade → survive** — and invert it.

The player does not build a fixed defensive position against incoming enemies. The player
is a small troop trying to stay hidden, grow, and survive while enemies actively search the
map for them.

- The player's "tower" is their troop.
- The player's "map" is a network/grid of Warrens.

## Core loop

The world is a simple grid. The player occupies one Warren at a time. Every tick:

1. The player gains exactly one person.
2. The Warren's properties modify the troop.
3. Every enemy moves exactly one block.
4. The player chooses what to do.

### Primary actions

**STAY** — remain in the current Warren.
- Gain another person next tick.
- Continue accumulating the Warren's benefits.
- Risk giving enemies more time to locate you.

**MOVE** — travel from the current Warren to another available Warren.
- Preserve the accumulated troop.
- Become extremely vulnerable while moving.
- Arrive and begin growing from the new Warren.

**ATTACK** — send the troop against an enemy / target.
- The troop acts as one cohesive unit.
- Combat is resolved by the troop's current capabilities.
- Attacking may create additional risk/exposure.

The exact combat and movement resolution can remain minimal for V1.

## The troop

The troop is one entity, not individually managed units. Every tick adds one person:
1 → 2 → 3 → 4 → 5 → … The player never individually places or upgrades people.

The troop's capabilities emerge from: **population + Warren modifiers + accumulated effects.**

This should feel more like growing a single organism/tower than managing an army.

## Warrens

Each Warren provides a distinct strategic specialization: combat, defense, movement,
scouting, growth, etc. The exact initial set should be small. Example:

- **Combat Warren** — people are +30% effective for combat.
- **Scout Warren** — people are +30% effective for scouting.
- **Defensive Warren** — people are +30% effective defensively.

The important rule: **Warrens don't simply provide resources. They shape what the troop
becomes.** Moving therefore isn't just relocation. It is a strategic decision to change the
composition/strength of the troop.

## The central tension

The fundamental resource is **time**. Every tick you become stronger. But every tick the
enemy gets closer.

- **Stay too long:** you become powerful, but increasingly likely to be discovered.
- **Move early:** you remain difficult to find, but sacrifice accumulated safety and expose
  yourself during movement.
- **Attack:** you may remove threats or create space, but you're no longer simply hiding.

The game should constantly ask: **How much stronger do I need to be before I move?**

## Enemy behavior

V1 should be extremely simple: every tick, every enemy moves exactly one block. Do not
overbuild enemy AI initially. The interesting question is whether the player's timing
decisions create enough tension when the enemy is steadily advancing. Enemy search behavior
can become more sophisticated later.

## Fog of war

Do not implement it initially. First prototype with complete information. We need to
determine whether Stay / Move / Attack is intrinsically interesting when the player can see
the board. If the underlying loop works, information asymmetry/fog can be layered on
afterward.

Potential future direction: different Warrens provide different visibility/concealment
properties. Explicitly not V1 scope.

## Visual language

Extremely simple: grid, circles/dots, Warrens, enemy dots, troop, tick indicator, minimal
UI. The prototype should look almost embarrassingly simple. The point is to discover
whether the mechanic works, not whether the game looks good.

## V1 success condition

The prototype succeeds if the player repeatedly experiences:

> "Fuck, I should have moved one turn earlier."

or:

> "I could stay three more ticks and get much stronger, but I'm gambling that they won't
> reach me."

That tension is the game. Everything else is secondary.

## Explicitly NOT V1

Elaborate upgrade trees · individual unit management · classes · equipment · resource
economies · complex enemy AI · fog of war · procedural content · elaborate combat ·
multiplayer · progression systems · narrative · dozens of Warren types.

Prove the loop first.

---

## Next step · simulation / smoke test

Smoke tests come after the first deterministic prototype, and are separate from human
playtesting. Run thousands of automated simulations before spending much time balancing by
hand.

The simulator should be able to run a complete game with: seeded RNG · map generation ·
Warren placement/types · enemy spawning · enemy movement · troop growth · Warren modifiers ·
player policy · movement vulnerability · attack resolution · win/loss condition · tick count.

Run several thousand seeds per configuration. Don't just ask "who won?" — **capture
distributions.**

### Useful outputs

- win rate
- average and median game length
- average troop size at death/win
- average number of moves
- average time spent per Warren
- percentage of deaths while moving vs. while stationary
- attack frequency
- enemy distance at decision points
- which Warren types are selected, and which correlate with outcomes
- number of ticks between discoveries/attacks
- how often players are forced into obviously bad moves

### Test simple policies against each other

Not AI yet. Just dumb strategies:

- Always Stay
- Move every N ticks
- Move when enemy is X blocks away
- Grow until troop reaches X
- Attack whenever possible
- Hybrid threshold strategies

If one trivial policy dominates everything else, that's valuable information about the
mechanic, not something to hide with smarter AI.

### Then perturb

Map size · Warren density · enemy speed · enemy count · growth rate · movement
vulnerability · combat strength · Warren bonuses — and look for the region where outcomes
are interesting rather than predetermined.

The smoke test isn't balancing the game yet. **It's finding out whether the machine
produces a decision space at all.** Because the core is tick-based and deterministic, a few
thousand simulations can tell us quickly whether we've got a game or a cute mechanic.
