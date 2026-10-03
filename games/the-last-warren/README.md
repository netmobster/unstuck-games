# The Last Warren — prototype

A tower defense game where you are the thing trying not to be found.
Tombstone: **Tokyo Jungle** (2012). Brief and tombstone: [`ideas/the-last-warren/`](../../ideas/the-last-warren/).

Plain HTML, CSS and JS. No build step, no dependencies. The simulation is one set of ES
modules that both the page and the Node sweep runner load, so **the game you play and the
game the machines played are the same code.**

## Run it

The page uses ES modules, so it needs a local server rather than a double-click:

```
python -m http.server 5193 --directory games/the-last-warren
```

Then open http://localhost:5193.

| | |
|---|---|
| **Stay** | `Space` (hold it to keep staying) |
| **Move** | Click a warren. Hover first: it shows the route, your ticks and theirs. |
| **Attack** | Click a hunter with a ring round it (in reach), or press `A` for the weakest |
| **Watch** | The top-right dropdown makes any policy (or the expert) play the seed |

## The rules as built

Every tick: **+1 person** if you're in a warren and not under siege · the Warren shapes you
(**+30%** Combat / Scout / Defense, carried and fading when you leave) · **every hunter moves**.

- **The map** is seeded and procedural: open ground, fast loud roads, slow quiet forest, lakes
  you can swim and they can't, and mountains that block feet and eyes. The format is shaped
  for SEREN's campaign creator ([MAP-FORMAT.md](MAP-FORMAT.md)).
- **The search** is a shared Bayesian belief over where you are. Every tick each hunter
  multiplies it by what it saw (sightlines; forest and mountains cut them), what it heard
  (a bigger troop is louder; deep warrens muffle it; forest muffles it in the open; listeners
  hear through forest) and the warren mouths it poked into. Then the belief diffuses by a
  motion model. **Sweepers** split the map into sectors. **Trackers** follow your tracks.
  **Listeners** hear further. **Hounds** are fast. **A Scout warren lets you see the belief
  map.**
- **Found** means a hunter reached you. It doesn't fight alone: the hunters **muster** at three
  blocks until the group outweighs you, and **under siege you stop growing**. Then they go in
  together. You can break out (attack) or run.
- **Transit:** you route around the hunters you can see. In the open you're seen and heard,
  and caught if one lands on your square. You're a little faster than everything except
  hounds.
- **Attack:** a sally on a hunter within two blocks: ×1.2 ambush, and loud.
- **Nights escalate.** You survive to dawn, and then:
  - you keep a remnant of the troop;
  - you draft one of three boons;
  - the hunters' prior is weighted by where you hid before;
  - a new hunter kind joins each night.

## The machines

```
node --test test/invariants.test.mjs    # hard invariants: pass or the build is broken
node scripts/tune.mjs 200 150 --strict  # search the config space against the targets
node scripts/report.mjs reports/tune-strict-*.json 2000   # the full evidence run
```

- **Policies** (`src/policies.js`): the brief's dumb strategies (always stay, move every N,
  move when a hunter is X away, grow to X, attack whenever), hybrids, a scout-aware hybrid,
  and random.
- **The expert** (`src/expert.js`) is a lookahead search on dice it can't see. It's the skill
  ceiling.
- **Twins:** every roll is hashed by (seed, tick, who), so a run replayed with one decision
  changed differs only where it chose to. That's how *"I should have moved one tick earlier"*
  is measured, not guessed.
- **Targets** (`scripts/metrics.mjs` → `judge`): no one-rule policy dominates · skill pays ·
  night 1 is learnable · a curve across nights · all three verbs used · transit is a risk,
  not suicide · always-stay is not safe · attack earns its place · the one-tick-late rate.

## Lineage and the single-file build (2 Oct)

- **Nights are 54 ticks** (+20%, Jay's call for playtesting). `scripts/check-lineage.mjs`: every
  policy loses a little, and the skill gap widens from 1.06 to 1.20 nights.
- **Lineage** (`src/lineage.js`): each run is a generation of a named line, kept in the browser.
  - When it falls, you pick **one heirloom** for the next generation: an attunement to a kind, or a held boon. Only one carries, so there's no power creep. Heirlooms measure at about ±0.1–0.2 nights, except **Walls, which is a trap**: it tempts you to stay, and the hybrids drop 0.3 nights.
  - **The hunters remember the family.** Their opening guess is weighted toward the kinds the line favours.
  - **A generation that never sees a dawn ends the line.**
- **Tabs:** Play · Chronicle · CD brief (`cd-brief.html`).
- **One file:** `node scripts/bundle.mjs dist-the-last-warren.html --full` writes the whole game as a
  single `.html` that opens with a double-click: no server, no module loading.
