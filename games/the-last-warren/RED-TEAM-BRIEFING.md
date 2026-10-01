# THE LAST WARREN — red team briefing

> **As of 2026-10-01, 17:40 ET.** The prototype is playable. The strict tuner is mid-run, and
> the held-out evidence run hasn't happened yet, so every number below is **provisional
> smoke**, not the verdict. Code: `games/the-last-warren/` on branch `ideas/the-last-warren`.
> Earlier documents: [BRIEF](../../ideas/the-last-warren/BRIEF.md) ·
> [TOMBSTONE](../../ideas/the-last-warren/TOMBSTONE.md).

**What we want from you:** attack the math in §3–§5, the targets in §6, and the reading of
the smoke in §7. §9 lists the specific things we think are weakest.

---

## 1 · The graveyard

```
Tombstone:  Tokyo Jungle (2012) — where you settle decides what the next generation is
Markers:    Agar.io (bigger = more findable) · Rodent's Revenge (the clock that brings hunters)
            Hitman GO (when you move, everything moves) · Invisible, Inc. (the alarm only rises)
            Anomaly: Warzone Earth (tower defense, direction reversed)
DNA only:   Eufloria · Robots/Daleks
```

## 2 · Boundaries Jay set (2026-10-01)

| Question | Jay's call |
|---|---|
| What "found" means | **A fight**: troop vs hunter, using the troop's capabilities |
| Transit exposure | **Sim decides.** Three variants built: `exposed`, `tracks`, `bleed` |
| Attack in V1 | **Yes, behind a toggle** (swept on and off) |
| How a run ends | **Escalating nights.** Survive to dawn, and the next night is worse |
| Search AI | **Belief map + tracks + sightlines** |
| Hunter coordination | **Two kinds**, trackers and sweepers (we added two more for the escalation) |
| Terrain | **All four:** mountains block movement and sight; lakes block or cost a lot; forest slows and hides; roads are fast and loud |
| Maps | **Seeded procedural** |
| Belief visibility | **Only from a Scout Warren** |
| Warrens beyond +30% | **Specialty carried, then fades** · **concealment differs by warren** |
| Balance target | **No policy dominates, and all three verbs get used** |
| Progression | **All four:** remnant at dawn · a 1-of-3 boon draft · hunters learn your habits · new hunter kinds each night |
| Map source | **Read SEREN's campaign creator first** and shape the format to take it |
| Build | One plain ES-module sim shared by the browser and Node. No build step |
| Scope | **"Go until it's fun by the numbers"** |

---

## 3 · The rules, with the math

All numbers are the current defaults (`src/sim.js → DEFAULTS`). The tuner is perturbing them.

### 3.1 Time and space

- **Grid:** 28×18. A night is **45 ticks**, and a run is at most **8 nights**.
- **Movement points.** Everyone banks points per tick and spends them to *enter* a tile.

  | Tile | Troop | Hunter | Notes |
  |---|---|---|---|
  | `.` open | 2 | 2 | |
  | `=` road | 1 | 1 | Fast. Noise ×1.4 |
  | `f` forest | 3 | 3 | Slow. Hides you, noise ×0.6 |
  | `~` lake | 6 | ∞ | You swim; they can't. Noise ×1.2 |
  | `^` mountain | ∞ | ∞ | Blocks movement and line of sight |

  - **Troop in transit:** 3 points a tick. **Hunters:** 2. **Hounds:** 3.
  - So on open ground a hunter covers **1 block a tick** (the brief's rule), the troop 1.5, and a hound 1.5.

### 3.2 The tick, in order

1. **Your choice.** STAY, MOVE (pick a warren) or ATTACK. Only possible while in a warren; in transit you're committed.
2. **The troop.**
   - **In a warren and not under siege:** `size += 1`. Specialty attunes toward the warren's kind at +0.25 a tick (cap 1); the other two kinds decay ×0.92.
   - **In transit:**
     - walk the route;
     - all specialty decays ×0.92;
     - `bleed` variant: −1 person every 2 ticks;
     - `tracks` variant: the cell you leave is stamped with the tick.
3. **Contact check** (walking into them counts).
4. **The hunters sense**, update the shared belief, and move (§4).
5. **Contact check** again. Siege status is recomputed.
6. **Reinforcements.** One new hunter every **12 ticks**. Killed hunters respawn after **10**.
7. **Dawn** at tick 45 (§3.7).

### 3.3 The troop

- **Strength, attacking or caught in transit:**

  ```
  size × (1 + C)
  ```

- **Strength, defending in a warren:**

  ```
  size × (1 + C) × fortify(1.25) × (1 + D) × [walls 1.2]
  ```

- **Strength on your own attack:**

  ```
  size × (1 + C) × ambush(1.2) × [teeth 1.2]
  ```

- **Bonus by kind,** where `k` is C, S or D:

  ```
  bonus_k = 0.30 × max(in a k-warren ? 1 : 0, carried_k)
  ```

  So the +30% is immediate inside a warren of that kind, and fades at ×0.92 a tick once you leave. Half-life is about 8 ticks.

- **Noise.** In a warren:

  ```
  noise = √size × depth
  ```

  where depth is deep 0.45, mid 0.70, shallow 1.00. In transit:

  ```
  noise = √size × terrain × (1 − 0.3 × carried_S) × [hush 0.8]
  ```

  √size is the Agar.io marker: twice the troop is about 1.4× as loud.

### 3.4 Hunters

| Kind | Strength × base | Speed | Sight | Hearing × | Special | Arrives |
|---|---|---|---|---|---|---|
| Sweeper | 1.0 | 2 | 5 | 1.0 | Sweeps its own sector of the map | Night 1+ |
| Tracker | 0.9 | 2 | 4 | 1.0 | Follows your tracks (`tracks` transit only) | Night 2+ |
| Listener | 0.8 | 2 | 3 | **1.9** | Hears through forest (no muffling) | Night 3+ |
| Hound | 1.3 | **3** | 4 | 0.8 | Fast: the one that catches runners | Night 4+ |

- **Hunter strength:**

  ```
  7 × kind × (1 + 0.32 × (night − 1))
  ```

- **Count at dusk:** 2 on night 1, then +1 per night, plus the reinforcements every 12 ticks.

### 3.5 Contact, the muster, and siege

This is the rule that made the game. It arrived in iteration 3 (§7).

- **Contact radius:**
  - **in a warren:** a hunter within 1 block (Manhattan);
  - **in transit:** 0, so a hunter has to land on your square.
- **On contact, they don't fight alone:**

  ```
  group  = hunters within 3 blocks
  assault if Σ group strength ≥ aggression(1.0) × your defending strength
  ```

  Otherwise they **hold**.
- **The muster.** Once you're *located* (belief at your cell > 0.5), hunters stop at **3 blocks** until the group within 4 is strong enough, then walk in together.
- **Siege:** you're located and a hunter is within 3. **Under siege you don't grow.**
- **The fight:**

  ```
  win if  mine × U(0.75, 1.25)  ≥  theirs × U(0.75, 1.25)
  ```

  - **Win:** every hunter in the group dies, and you lose this many:

    ```
    round(0.45 × theirs × r₂ / (mine / size))
    ```

    capped at size − 1.
  - **Lose:** the run ends.
  - **Either way the fight is loud,** so the belief collapses onto your cell.
- **Attack:** a sally on one hunter within **2 blocks**, from a warren only. It uses the same fight math with the ambush multiplier.

### 3.6 Moving

- **You pick a destination.** The route is Dijkstra over troop costs, **plus a danger term**, recomputed every tick:

  ```
  +6 × (3 / 2 / 1)   at distance (0 / 1 / 2) from each hunter you can see
  ```

- **In the open** you can be seen, heard and tracked.
- **The UI shows the race** before you commit: your ticks to the warren against the nearest hunter's ticks to it.

### 3.7 Dawn and the escalation

- **Remnant:** you start the next night at `max(4, round(0.4 × size))`, at the same warren and with carried specialty intact.
- **The draft.** Dice deal 3 of 8 pre-written boons; you keep 1:
  - **brood:** +1 every third tick
  - **hush:** noise ×0.8
  - **teeth:** +20% on your attacks
  - **walls:** +20% defending
  - **legs:** +1 movement point in transit
  - **dig deeper:** your current warren becomes deep
  - **dig:** a new warren 4–7 blocks away
  - **scatter:** halves the hunters' prior at dusk
- **Learning.** The hunters' prior at dusk is:

  ```
  prior(w) ∝ 1 + 4 × (share of all your past ticks spent in w)
  ```

  Hide in the same place every night and they start there.
- **New kinds by night,** as in the table in §3.4.

---

## 4 · The search AI: a shared Bayesian belief

**The player sees everything.** The hunters don't know where you are; they share one
probability map, `b`, over all 504 cells.

- **Dusk.** `b` is non-zero only on warrens, using the learned prior from §3.7.
- **Each tick, for each hunter `h`:**
  - **Hearing, a real roll.** First the hunter's hearing radius and the chance it hears you:

    ```
    r = 1.15 × noise × hear_h
    P(heard | troop at distance d) = σ((r − d) / 0.75)      (logistic)
    ```

    Then the roll: `heard ~ Bernoulli(P_true)`.
  - **Bayesian update over every cell `i`:**

    ```
    b_i ×= heard ? p_i : (1 − 0.9 p_i)
    ```

    Here `p_i` is the same logistic, evaluated as if the troop were at `i`, using that cell's concealment and the hunter's estimate of the troop size.
  - **Sight.**
    - Line of sight is Bresenham. Mountains block it; each forest cell along the line costs 2 sight, and +2 more if you're standing in forest.
    - **Seen** collapses the belief: `b = δ(your cell)`.
    - Every open cell the hunter can see and that's empty gets `b_i ×= 0.08`.
    - **Warrens are underground,** so sight never clears them.
  - **Poking a mouth.** A warren within 1 block that you're not in gets `b_w ×= 0.05`.
- **The motion model.**
  - 12% of each cell's mass diffuses to its passable neighbours.
  - Then 4% of all open-ground mass pools back into the warrens: a troop in the open goes to ground.
  - Then the map is renormalised.
- **Choosing a target.** Each hunter scores every cell:

  ```
  b_i / (1 + d/9) / (1 + number of other hunters targeting within 3)
  ```

  - **Sweepers** score only their own vertical sector of the map, unless the sector holds less than 2% of the mass.
  - **Trackers** on a fresh track (younger than 14 ticks) follow the newest neighbouring track instead. At the end of the trail they bump the warrens within 4 blocks.
  - **Everyone** retargets every 3 ticks, or immediately on a sighting.
- **Paths** are Dijkstra distance fields over hunter costs, cached per target cell.

**A Scout warren (or carried Scout above 0.5) shows you `b`** as a gold heat map: where they think you are.

---

## 5 · The machine

| Piece | What it does |
|---|---|
| `src/rng.js` | **Stateless hashed RNG.** Every roll is `hash(seed, purpose, night, tick, id)`, never sequential, so changing one decision changes nothing else in the world |
| `src/map.js` | Value-noise terrain from **five dials** (water, relief, cover, roads, warrens) set by **twelve frames**. Warrens are spread out; roads follow a minimum spanning tree between warrens. Soundness is checked on every map |
| `src/sim.js` | The rules above. Pure, deterministic, returns events. `cloneGame()` for lookahead |
| `src/policies.js` | **Dumb players:** always-stay · move-every-6/10/16 · move-at-3/5/8 (hunter ticks away) · grow-to-15/30 · attack-always · random · **hybrid(X, margin)** (attack what you beat by the margin; run when a hunter is within X and the threat beats you) · **scout(X, margin)** (the hybrid, plus run when the belief on your cell exceeds 0.25) |
| `src/expert.js` | **The skill ceiling.** At any moment that matters, it rolls each option (stay, each attack, the top 3 destinations) 14 ticks ahead, twice, on **salted seeds** so it can't see the real dice, and takes the best average |
| Twins | For every *found while staying* death, replay the same seed with a forced MOVE at 1, 2 and 3 ticks before the fatal tick, with the policy continuing after. Did it see dawn that night? |
| `scripts/` | Worker pool (30 cores, **~1,300 games/s**), aggregation, the judge, a tuner (random search plus local refinement), and the evidence run |
| `test/` | 8 hard invariants, all passing: determinism · map soundness (300 seeds) · belief sums to 1 · nobody on impassable tiles · clone isolation · twin isolation · growth rule · kinds valid |

---

## 6 · The targets ("fun by the numbers")

Written before tuning. The judge pools every policy except the expert. "Best" means the best
mean nights in that pool.

| # | Target |
|---|---|
| 1 | **No dominant rule:** the best one-rule policy reaches night 3 in ≤45% of runs |
| 2 | **Skill pays:** the best player beats the best one-rule policy by ≥1.0 nights |
| 3 | **Night 1 is learnable:** the best player survives it in 85–97% of runs |
| 4 | **A curve:** the best player averages 2.5–5 nights; reaches night 3 in 40–70% of runs and night 5 in 10–30% |
| 5 | **Stay matters:** the best player spends 55–92% of ticks staying |
| 6 | **Move matters:** ≥0.8 moves a night |
| 7 | **Attack earns its place:** ≥0.5 attacks a night, and attack-always is ≥1 night behind the best |
| 8 | **Transit is a risk, not suicide:** 20–60% of skilled deaths happen in transit |
| 9 | **Staying isn't safe:** always-stay averages ≤1.5 nights |
| 10 | **Kinds differ:** no warren kind takes >55% of the best player's ticks |
| 11 | **One tick late:** ≥25% of the best player's *found* deaths are saved by moving one tick earlier |

---

## 7 · Smoke status

### How we got here: four iterations, each killed by the machine

| # | Rules | What the smoke said | Fix |
|---|---|---|---|
| v1 | Contact means a fight; hunters attack alone | **always-stay dominates** (4.5 nights; night 1 won 100%). Moving is suicide (38 of 40 move-at-5 deaths in transit) | A fortified warren outgrew hunters arriving one at a time. Hunters must coordinate |
| v2 | + hunters hold until the group is strong enough; siege | **attack-always dominates** (3.7 nights). Moving still suicide | Lone hunters wander into ambush range |
| — | Transit trace of 6 deaths | **Three bugs, not balance.** Routes ignored hunters. Dumb policies ran toward warrens the hunters reach first. Leaving a siege was instant death because the stationary contact radius applied in transit | Danger-aware routing; transit radius 0; troop 1.5 blocks a tick; no run without a safe destination |
| v3 | + the **muster** (stop at 3 until enough) and siege halts growth | **The decision space appeared.** Hybrids beat every single rule by more than a night, all three verbs are used, and deaths split between found and caught | Current |

### Current numbers (starting rules; provisional)

| Player | Mean nights | Notes |
|---|---|---|
| **Expert** (lookahead) | **3.63** | 30 seeds. **12.6 moves and 1.8 attacks per game** |
| Best hybrid (`hybrid-3-1.8`) | 3.23 | 30 seeds |
| `hybrid-5-1.3` | 2.93–3.00 | |
| `scout-5-1.3` | 2.67 | |
| **move-at-3** (best one-rule) | 2.53 | Reaches night 3 in **46%** of runs (150 seeds) |
| move-at-5 | 1.73 | |
| attack-always | 1.60 | |
| always-stay | 1.02–1.17 | **Every run dies found** |

### Strict judge, 150 seeds per policy

- **Starting rules: miss score 0.657.** Three misses:
  - no-dominant-rule at 46% (cap 45%)
  - skill-pays at 0.81 nights (target 1.0)
  - one-tick-late at 16.9% (target 25%)
- **Refinement, in progress** (best so far at config #33): **miss score 0.135, with one miss left: one-tick-late at 20.5%.** Everything else is in range.
- **Still to run:** the held-out evidence run on seeds 100,000+ (the tuner only saw seeds 1–150):
  - 2,000 seeds of every policy, with twins;
  - 600 seeds of the expert;
  - a toggle study, switching off each progression mechanic, attack, siege, and each transit variant;
  - one-dial sensitivity on hunter strength, reinforcement rate, aggression, transit speed, the warren bonus (including **0%**), hearing and night length.

---

## 8 · What we think it means so far

1. **The organ transplanted.** Neither "always stay" nor "always run" works. The best play stays, reads the board, and leaves at the right moment.
2. **Coordination is the hunters' core rule, not a nicety.** Every version where hunters engage alone produced one dominant strategy.
3. **"Found" became a clock, not a coin flip:** located → the ring forms at 3 → growth stops → they muster → they go in. That sequence is where *"I should have moved"* lives, and it's visible on the board (the dashed ring).
4. **Attack may be the weakest verb.** The expert uses it about twice a game. The toggle study will say whether removing it costs the expert anything. If it doesn't, the red team's question 5 is answered: the prototype killed attack.

## 9 · Where we think it's weakest (please attack these)

1. **The hunters count perfectly.** Their likelihood uses your true troop size; they "know how long you've had". Defensible, since growth is public and deterministic, but it makes hearing sharper than it feels.
2. **The skill proxy is our own code.** The judge's "best player" is a hand-written hybrid. The expert is better, but it's a 14-tick horizon on a hybrid base policy, not a strong searcher. A clever human may find a dominant line neither found.
3. **One-tick-late depends on what happens next.** After the forced move the twin continues with the same policy, so the rate measures "one tick earlier *and then this policy*". It's stuck at ~17–20%, which may mean most deaths are *three* ticks late or simply unwinnable. The report will split it.
4. **Scout is mostly informational.** It shows the belief map and quiets transit by 30%. Policies use the map crudely. If Scout warrens lose in the kind-share data, their job isn't strong enough.
5. **The belief motion model has a hack.** The 4% pooling of open-ground mass into warrens is a prior, not a physics. It may make hunters too good at re-finding a troop that just went to ground.
6. **Sight is Manhattan with a forest tax,** not Euclidean, and contact is asymmetric (radius 1 stationary, 0 moving). Both are tuned for feel. Is either exploitable?
7. **The boons were never tested one by one.** The draft is on in every run, and policies pick by a fixed preference. "dig" or "scatter" could be degenerate.
8. **Sample size in the tuner:** 150 seeds per policy per config, so roughly ±4 points on rates. The held-out run is how we guard against overfitting.
9. **Not built:** fog for the player (deliberately), the SEREN weave (format ready, see [MAP-FORMAT.md](MAP-FORMAT.md)), sound, CD art.

## 10 · Questions for the red team

1. Is the **muster** the right hunter rule, or is there a simpler rule that kills both dominant strategies?
2. Should **siege halt growth**, or should it be something else, such as growth continuing but each tick of siege adding a hunter?
3. If attack dies in the toggle study, **do we cut it or give it a job** (for example, attacking is the only way to kill a tracker that's on your trail)?
4. Is **"one tick earlier"** the right success metric when the honest answer turns out to be "three ticks"? Or should the ending report whichever it was?
5. Is anything in §4 **too clever for a player to feel**? If nobody can read the belief map without a Scout warren, does the search AI matter beyond its outcomes?
