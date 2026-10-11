# INFINITE FRONTIER — DESIGN PIVOT / JAY WENT SIDEWAYS

> Filed 2026-10-11 as handed over: Jay's brainstorm with GPT, pasted into Claude Code. CC's
> response is [PIVOT.md](PIVOT.md). Jay's framing: *"As tends to happen, pushback focuses
> ideas."*

**Date:** 11 October 2026
**Status:** New core-mechanic hypothesis. Not yet a locked implementation spec.

## 1. What happened

The previous Infinite Frontier brief explored an endless roguelike tower defense built around expanding 9×9 chunks, periodic bosses, tile rewards, and persistent unlocks.

During design exploration, a more fundamental mechanic emerged. Do not treat this as a request to add features to the existing design.

**The new hypothesis: there are no towers. The hex tile IS the defensive unit.**

Each placed hex represents a piece of the world with a denizen or inherent behavior. A volcano erupts. A swamp slows enemies. Other tiles might freeze, damage, redirect, generate resources, or interact with neighboring tiles.

Tiles occupy space. Their placement changes the paths enemies can take. Their inherent behaviors determine what happens to enemies along those paths.

The player builds and destroys the world to control enemy movement and exposure to hazards.

## 2. The theoretical tombstone

**Desktop Tower Defense (2007)** is the theoretical tombstone: the foundational reference for player-created mazing, where placing and removing objects changes the route enemies must follow.

However, Infinite Frontier is not intended to be a clone of Desktop Tower Defense. The opportunity is to explore that fundamental mechanic in a hex-based, roguelike construction system.

The question is whether making each obstacle a functional denizen of the world creates a richer system than placing conventional towers on a board.

## 3. The new core loop

The player's primary verbs are:

- **Place:** Spend resources to add a denizen-bearing hex at a legal location.
- **Destroy:** Remove a placed hex and recover a portion of its resource cost.
- **Adapt:** Change the physical arrangement of the world to redirect enemies or improve the effects of its denizens.
- **Upgrade:** Improve an existing tile's behavior, subject to the eventual upgrade rules.

There is no separate tower-placement layer. There is no independent road-drawing mechanic. There is no required network of connected structures.

The route emerges from the relationship between occupied and traversable hexes.

A swamp is simultaneously a spatial obstacle and a movement-control effect. A volcano is simultaneously a spatial obstacle and a damage source. Placement affects both pathfinding and defense.

## 4. Routing invariants

These are core design constraints:

1. Every spawn must have a valid route to the castle or equivalent destination.
2. Multiple routes may exist simultaneously.
3. Players may create, close, reopen, and redirect routes through tile placement and destruction.
4. Placement and destruction must validate the resulting route network.
5. The design must not depend on explicit route-switch controls unless a later experiment demonstrates their value.
6. Resource refunds for destruction are partial, not automatically a full refund.

The player should be able to construct alternative routes for different enemy types and change which route is available by altering the board.

Important unresolved questions include whether enemies immediately recalculate their routes when the board changes, whether existing enemies can be stranded by a legal change, and how flying, burrowing, or otherwise exceptional enemies interact with occupied hexes.

Do not silently invent answers to these questions. Identify them and propose small experiments.

## 5. Denizens: candidate archetypes, not commitments

Explore approximately twelve initial archetypes with fundamentally different behaviors. Examples include:

- Volcano — periodic burst damage.
- Swamp — movement slow.
- Glacier — periodic freeze.
- Briar — contact damage.
- Crystal — chain damage.
- Gale — displacement.
- Sporewood — lingering hazard.
- Ruin — resource generation.
- Stormwell — charge-and-discharge damage.
- Obsidian — specialized blocking or passability behavior.
- Spring — vulnerability amplification.
- Worldroot — adjacency-based synergy.

These are a starting hypothesis, not a feature commitment. Simplify, replace, or eliminate them when testing reveals better mechanics.

The purpose is to explore the design space, not to ship twelve types because they appeared in a list.

## 6. Automated simulation and balance

Claude Code should be able to run a deterministic, headless simulation independently of the renderer.

The long-term target is large-scale automated testing—potentially 100,000 seeded simulations per experiment or test sweep—covering:

- Route validity and unreachable destinations.
- Pathfinding exploits, loops, and pathological detours.
- Tile cost, destruction refunds, and resource farming.
- Individual tile effectiveness and pairwise interactions.
- Enemy compositions and route preferences.
- Draft quality and dominant strategies.
- Build survival and defensive efficiency.
- Whether destroying and replacing tiles is strategically meaningful.

Use multiple player policies, including random, greedy damage, economy-focused, route-focused, and adaptive strategies. Record reproducible seeds and meaningful metrics.

**Simulation is for finding broken rules, dominant combinations, and balance problems. It cannot establish whether the game is fun.** Human playtesting remains necessary.

Do not begin with 100,000 simulations of an unvalidated system. First establish a correct minimal simulator, prove the invariants, then scale the experiments.

## 7. What may survive from the previous design

Do not throw away the existing brief or silently assume everything in it remains valid.

Review the existing specification and classify each element as:

- **Preserved:** Compatible with the new core mechanic.
- **Needs reinterpretation:** Potentially useful but designed around the old tower/terrain distinction.
- **Unresolved:** Requires a deliberate decision.
- **Superseded:** Depends on the old model and should no longer constrain the design.

Elements to review include:

- Endless runs and death/reset behavior.
- Approximately 30-second waves.
- Bosses every tenth wave.
- Relics and chunk expansion at milestones.
- Reward drafting and tile upgrades.
- The 9×9 chunk architecture.
- Persistent lateral unlocks without permanent numerical power creep.
- Existing rendering, state, and procedural-generation architecture.

Do not assume the pivot automatically eliminates these systems. Equally, do not preserve them merely because they're in the old brief.

## 8. Jay's design process

Jay deliberately explores complexity before reducing it.

When a new mechanic appears, do not immediately turn every implication into a permanent feature. Explore the consequences, identify the smallest coherent underlying system, then remove complexity that does not earn its place.

Distinguish clearly between:
- What Jay has explicitly established.
- What is a promising hypothesis.
- What remains an open question.
- What has been tested and demonstrated.

Do not treat exploratory brainstorming as authorization to implement every suggested idea.

## 9. Immediate assignment

Before making significant implementation changes:

1. Inspect the current repository and the existing Infinite Frontier briefs.
2. Read the tombstone shortlist and identify where its A/B/C framing no longer describes the new hypothesis.
3. Produce a concise design-pivot document capturing the new core mechanic and routing invariants.
4. Identify which existing architectural decisions remain valid and which need revision.
5. Propose the smallest playable prototype that can validate the mechanic: hex grid, spawn, castle, a few denizens, enemies, deterministic pathfinding, placement, destruction, and partial refunds.
6. Define automated tests for routing correctness and basic economy exploits.
7. Recommend the first experiments that could disprove the hypothesis.

Do not build a dozen fully featured denizens, redesign the entire game, or rewrite the architecture before validating the minimal core.

The goal is to discover whether this mechanic produces an interesting game—not to defend the existing brief.

**Working thesis: The player builds a world of denizens, and controls the enemy by controlling the space through which it can move.**

---

*GPT's note to Jay, kept because it is the brief for the brief:* have Claude update the design
documents and propose the minimal prototype first, not immediately implement the twelve
denizens. The big risk now isn't insufficient content; it's that we get excited about the
emergent system and accidentally build six systems before finding out whether the first one
is fun. And explicitly tell it this is a design pivot, not feature creep.
