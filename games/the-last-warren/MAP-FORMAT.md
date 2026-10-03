# The map format — `warren-map/1`

**Shaped to take SEREN's campaign creator later, without a rewrite.** Jay, 2026-10-01: use
the SEREN web creator for maps. I read it first (`seren/CAMPAIGN-BUILDER.md`,
`seren/BUILDER-TABLES.md`, `seren/web/weave.py`). What carries over is not its content but its
three-layer shape:

| SEREN | The Last Warren | Here |
|---|---|---|
| **The hand**: picks from tables of twelve (origin, *world frame*, trouble…) | `hand.frame`: one of twelve frames (`FRAMES` in `src/map.js`) | Picked, or rolled from the seed |
| **The dials**: each one changes a number, never just an adjective | `dials`: `water · relief · cover · roads · warrens`, 0–1 | Every dial moves a threshold in the generator |
| **The weave**: the AI writes the named, reasoned parts as files, once, ahead of play | `weave` + each warren's `name` / `why` | `null` today; the creator fills it |

SEREN's world table even has **frame #7, "The warren"**: *people live under, and what is under
them is older.*

## The file

```json
{
  "format": "warren-map/1",
  "seed": 1,
  "hand":  { "frame": "The drowned coast" },
  "dials": { "water": 0.7, "relief": 0.2, "cover": 0.25, "roads": 0.3, "warrens": 0.5 },
  "w": 28, "h": 18,
  "tiles": ["~~~~fff....", "..."],
  "warrens": [ { "id": 0, "x": 4, "y": 8, "kind": "C", "depth": "deep", "name": null, "why": null } ],
  "spawns": [[0, 7], [0, 8]],
  "weave": null
}
```

- **tiles:** `.` open (1 block a tick) · `=` road (2 a tick, loud) · `f` forest (slow, hides,
  muffles) · `~` lake (the troop swims slowly; hunters can't) · `^` mountain (blocks movement and
  sight).
- **warrens:** `kind` is `C`ombat / `S`cout / `D`efense. `depth` is `deep` / `mid` / `shallow`,
  which sets how loud the troop is inside.
- **spawns:** edge cells the hunters can enter from. The generator guarantees every warren is
  reachable by the troop, and by hunters from the spawns.

## How the creator plugs in (generation + dice)

The house rule is *AI in production, math and dice in deployment*. So the creator never runs
during play:

1. **Offline,** the creator weaves a library of hands: a frame, its dials, and for each warren
   kind and depth a pool of **names with reasons** (*"the Tithe Barn, deep, because the
   monks dug the cellar twice"*). The hunter kinds get the same treatment: a pack with an
   impulse, SEREN-front style (*Sweepers: to leave no ground unwalked*).
2. **At runtime,** dice pick a hand, the generator builds terrain from its dials and the seed,
   and dice deal names from the pools onto the warrens by kind and depth.
3. **The ending sentence** then gets proper nouns: *"Found in the Tithe Barn, 31 strong…"*

Nothing in the sim reads `name`, `why` or `weave`. They are for the page and the ending only, so
weaving can never change the balance.

**Open:** whether the creator should also author *hand-shaped* terrain, such as a named river,
rather than leaving terrain to the dials. If yes, `tiles` takes an authored layer, and the
generator fills only what it leaves blank.
