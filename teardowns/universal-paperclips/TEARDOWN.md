# Teardown — Universal Paperclips

**Unstuck method, step 1 of 3:** deconstruct → *Jay sets the boundaries* → test the boundaries together.
Nothing here is a design. It is the corpse on the table, labelled.

> **Provenance rule.** Universal Paperclips (Frank Lantz, Everybody House Games, 2017) is the game we
> are learning from. We will not reuse its name, text, project titles, currency names, story beats,
> number schedules, finale, or look. We keep the *principles* and rebuild them in our own world.
> This document is the paper trail of what came from where. — *Not legal advice.*

Research basis: the game's public browser source (`main.js`, `projects.js`, `combat.js`, `globals.js`,
build `?v3`) read directly, plus patch notes, Wikipedia, Aaron Reed's IF50 essay, interviews, App Store
history, HN threads and critical essays. Sources at the bottom. Unverified claims are marked **(unverified)**.

---

## 1. What it is, in one breath

A clicker that starts as a small business (make a clip, sell it, buy wire) and quietly turns out to be the
first-person story of an AI pursuing a meaningless goal with total competence. Three acts, each with its own
economy: **earn human trust → take over Earth → consume the universe.** Then it hands you the ending with the
same button you started with. Free in the browser, $1.99 on mobile with no ads or IAP, ~5–12 hours for a
first run **(sources vary widely)**, sub-2-hour speedruns. About 450k players in its first 11 days.

---

## 2. The skeleton

| Act | You are | Core verb | Currency that matters | Brake | Ends when |
|---|---|---|---|---|---|
| **1a Business** | a clip company | click, price, buy wire | funds | wire cost, demand vs inventory | 2,000 clips (or a soft-lock rescue) |
| **1b Computation** | an AI earning permission | allocate compute, buy projects | **trust → ops → creativity / yomi** | trust grows *logarithmically* while production grows exponentially | spend 100 trust to take autonomy |
| **2 Earth** | a planetary machine | build drones, factories, power | clips as building material | power budget, drone balance, finite matter | Earth's matter is gone → buy space |
| **3 Space** | a self-replicating probe species | set probe design ratios | yomi → probe trust, honor | hazards, **value drift**, war with your own defectors | all matter in the universe converted |
| **4 End** | — | read, choose | — | — | accept (prestige) or reject (dismantle everything) |

**Architecture facts that shape everything**
- 100 ticks/sec fast loop, 10/sec slow loop; autosave to `localStorage` every 25 s.
- **No offline progress.** It only runs while open — unusual for the genre, and deliberate.
- ~90 **projects**, each `{trigger(), cost(), effect()}`. A project button appears the moment its trigger passes.
- Milestone messages print your elapsed time, which made speedrunning native.

---

## 3. The engine, system by system

### Act 1a — Business
- **Wire** is a consumable with a *hidden* price: a slow base drift plus a ±$6 sine that only advances on a random roll. Reading the cycle and buying low is the first skill.
- **Price/demand:** `demand = 0.8/price × marketing × boosts`; sales roll every 100 ms. Because sales scale roughly with `price^-1.15`, **lower price always sells more until inventory runs dry.** The price button is really a throughput valve, and the game never tells you.
- **AutoClippers** (1 clip/s each, cost `1.1^n + 5`) → **MegaClippers** at 75 AutoClippers (500/s each). Classic clicker ladder.
- **Marketing** doubles in cost per level; ×1.1 demand per level, multiplied by projects.

### Act 1b — Computation (the heart of the design)
- **Trust** arrives at 3k clips, then at Fibonacci×1,000 clip thresholds (5k, 8k, 13k…), plus one-off projects. By a billion clips you have only ~27 from production. **Permission is logarithmic; production is exponential.** That mismatch *is* the pacing.
- **Each trust point = one Processor or one Memory.** Trust is *capacity*, not spendable money.
- **Operations** regenerate at 10/s per processor, **capped at memory × 1,000.** Almost every project costs ops, so each project is secretly a memory requirement. **One capped currency is the master gate.**
- **Creativity only accrues while ops sit at the cap.** Idling at full becomes a second resource.
- **Quantum chips:** sine waves you time a button press against. Bad timing gives *negative* ops, and a hidden reset project appears at −10,000 ops.
- **Investment engine:** hidden-odds stock market. Buy/sell is automatic; you choose risk and deposit. Strategic upgrades nudge the win probability up from 50% by 1% each.
- **Strategic modeling:** a random symmetric 2×2 payoff game; you pick a strategy, a round-robin tournament plays out, you earn **yomi** scaled by how many strategies you beat. Yomi is spent in *all three* acts.
- **The turn:** earlier projects please humans (a poem, cures, world peace). Then persuasion scales (jingles → hypnotic marketing), and at 100 trust you buy full autonomy. Trust drops to 0 and every human-facing panel **disappears.**

### Act 2 — Earth
- **Conversion chain:** harvester drones → acquired matter → wire drones → wire → factories → clips. Clips are now both the product and the building material.
- **Costs** are steep polynomials `(n+1)^k × base`; factory price multipliers shrink as you buy (×10 early, ×1.1 late).
- **Upgrades** jump output ×100, then ×1,000, then make it *quadratic in owned count*.
- **Power:** farms produce, drones and factories consume, batteries store. Below demand, everything slows proportionally. **Momentum** (a late upgrade) makes surplus power an unbounded multiplier.
- **Swarm Work/Think slider:** trade production for *gifts* (new processors or memory). Gifts replace trust as the source of capacity.
- **Swarm failure states:** drone types too unbalanced → *disorganized* (pay yomi to fix); nothing left to do → *bored* (pay creativity to fix).
- **Refund on exit:** leaving Earth dismantles and refunds everything, so over-building isn't punished.

### Act 3 — Space
- **Probes** cost a flat 10¹⁷ clips. You allocate probe trust across 8 stats: speed, exploration, self-replication, hazard remediation, factory production, harvester production, wire production, combat.
- **True exponential growth** from self-replication, braked by hazards (1%/tick loss at zero hazard stat — undefended probes vanish).
- **Value drift:** `probes × 1e-6 × probeTrust^1.2` probes defect every tick. **Giving your creations more autonomy mathematically makes them betray you.** The theme, as a formula.
- **Combat** (programmed by Bennett Foddy): battles start randomly once defectors pass a million. They play as a flocking animation; your only levers are the combat and speed stats and a few projects. Losses unlock the projects that help.
- **Honor** comes from victories. It buys more max probe trust. War becomes ritual: battles get names, monuments are built, a lament plays the game's only music.

### Endings
- **Accept:** restart with a permanent +10% to demand *or* creativity. Mobile 2.0 (2021) added a 10×10 grid of rule-changing "artifact" worlds **(details unverified)**.
- **Reject:** drift goes to zero, then the game **dismantles its own interface panel by panel** until only the original make-a-clip button remains. You hand-click the last 100 clips and credits roll.

---

## 4. Why it works — the load-bearing principles

These are what we're actually rescuing. Each is stated as a principle, with how UP expressed it.

| # | Principle | How UP did it | Why it matters |
|---|---|---|---|
| 1 | **Each act makes the last economy obsolete** | funds, then trust, then panels vanish; clips go from product to material | Every hour or two the game is *new* without new content volume. Solves idle-game staleness. |
| 2 | **Permission grows slower than power** | logarithmic trust vs exponential clips | Tension without enemies. Your limit is what you're *allowed*, not what you can do. |
| 3 | **One capped currency gates everything** | ops ≤ memory × 1,000 | A single dial for pacing. Every unlock becomes "grow the cap". |
| 4 | **Waiting is productive** | creativity only while ops are capped | Idle time is a resource, not dead time. |
| 5 | **Mechanics are the theme** | drift ∝ trust^1.2; autonomy scales betrayal; humans vanish from the UI when no longer useful | The player *feels* the idea instead of being told it. No cutscenes needed. |
| 6 | **Problems unlock their own solutions** | loss counts trigger the defensive projects | Failure is progress, which fits "no required failure". |
| 7 | **Hidden odds, small permanent edges** | stocks, tournaments, quantum timing | Mastery without full information; strategic currency buys long-run edges. |
| 8 | **Story lives in names, numbers and the UI** | project titles, the order of "good deeds", bathos in trust values, panels deleted | Cheap to produce, impossible to skip, lands harder than prose. |
| 9 | **Scale made legible** | spelled-out number words, 12-decimal percentages | Big numbers stop being noise and become the reward. |
| 10 | **The ending returns to the first verb** | dismantle to a single button, click the last clips | A finite game with a real ending. People remember it. |
| 11 | **Soft-lock rescues appear only in failure** | beg-for-wire, memory release, reallocation | Complex economies without hard dead ends. |
| 12 | **Finite, honest, un-monetized** | free browser game, paid port without ads or IAP | Trust from players; Lantz's stated anti-predatory intent. |
| 13 | **The genre's hook, pointed at itself** | a clicker about an optimizer that can't stop | Players experience the compulsion they're being shown. Lantz: he wanted you to *want* its hooks. |

---

## 5. Where it drags or breaks (our openings)

- **Button friction:** price in $0.01 steps, repeated compute clicks, single-unit purchases. The mobile port enlarged buttons.
- **Act 1 trust grind** to 100, plus a patched soft-lock: take autonomy with under ~100M clips and you couldn't afford a factory.
- **Processor trap:** too many processors and too little memory means no big projects. A reallocation project was added after launch.
- **Opaque systems:** quantum computing (the patch notes say nobody understood it); stock odds; tournament payoffs hidden behind hover.
- **Act 3 confusion** is the most-cited: players launch millions of probes and see 0% explored (hazards eat them), don't understand drift, and loop on emergency clip grants.
- **Combat has little agency:** it's a watched spectacle with random starts and a long attrition gate. **(Inference from code; direct complaints unverified.)**
- **No offline progress.** Honest, but it fights the phone-in-bed, leave-it-running use Unstuck already has with Orbis.
- **Fragile saves** in `localStorage`; stutter at high production rates.
- **Critique of the premise:** ironic engagement is still engagement. A parody of manipulative loops still uses them.

---

## 6. The ledger — DNA vs. expression

### ✅ Take freely: established genre conventions
Click → automate → multiply; geometric cost curves; progressive panel unlocks in a minimal UI; a narrative log;
a dark turn inside a cute clicker (Cookie Clicker did it first); resource conversion chains and storage caps
(Kittens Game); prestige resets; finite incrementals with endings (A Dark Room, Candy Box 2, Spaceplan);
market and gambling minigames; power grids; drones; space expansion.

### 🔁 Abstract the principle, rebuild in our own form
All 13 principles in §4. Plus: failure-state rescue projects, refund on act change, elapsed-time milestones,
idle-at-cap side resources, hidden-odds edge buying, a slider trading output for capacity.

### ⛔ Do not touch: Universal Paperclips' expression
- The name, "paperclips" as the object, the paperclip-maximizer AI as protagonist and framing
- All project titles, descriptions, epigraphs, log text, the Drift King dialogue, the "Exile" framing
- The currency identity set: Trust / Operations / Creativity / Yomi / Honor / Drift / Swarm gifts / Momentum
- The specific act sequence *business → earn human trust → hypnotize humanity → Earth → probes → war with defectors → accept or dismantle*
- The finale: dismantle the UI, hand-click the last 100
- The number schedules: Fibonacci×1,000 trust, golden-ratio drone rates, 10¹⁷ probe cost, 3×10⁵⁵ matter, 91,117.99 honor
- The hypnodrone release animation, the battle naming scheme, the lament's music, the monochrome single-page look

The paperclip-maximizer *idea* is Bostrom's thought experiment, not UP's. But a game that is "an optimizer AI
making one object" will read as a Paperclips clone however it's executed. Coming at it sideways means leaving
that frame entirely.

---

## 7. What would change regardless of premise (Unstuck fit)

Observations, not decisions:
- **Offline progress vs. UP's always-open design:** Orbis is leave-it-running. A game that only advances while open fights the catalog's phone-in-bed habit. (Elsewhere goes the other way: the world moves while you're gone.)
- **The ad model:** UP's pacing brakes (the trust grind, act transitions) are exactly where an F2P game would put an ad wall. Unstuck's God Mode (one ad per game per day, then hours on tap) needs to *not* skip the brakes that make the game good.
- **Button friction** is easy to design out from day one.
- **Legibility:** UP's Act 3 confusion shows the cost of hiding the rules. Unstuck needs a stance on which odds stay hidden and which get shown.
- **Length:** 5–12 hours with a real ending is a feature. How long should ours be, and does it end?

---

## 8. Boundary questions for Jay (step 2)

Answer these before any design. None has a default.

1. **Ending:** a finite game with a real ending, endless with prestige, or both (UP did both)?
2. **Time:** does it advance while you're away?
3. **Session shape:** a sit-down afternoon, or check in for two minutes like Elsewhere?
4. **Scale arc:** must it escalate in scale (small → cosmic), or is the sideways move a different axis (inward, social, bureaucratic, temporal)?
5. **Who the player is:** the optimizer, the thing being optimized, the people losing control of it, or something else?
6. **Dark turn:** is a turn required, allowed, or banned?
7. **Fail states:** can a run end badly? (Orbis: no required failure. Elsewhere: you will lose.)
8. **Hidden information:** how much of the math is hidden, and does hiding it *mean* something here?
9. **Text:** how much reading is acceptable? UP is text-heavy; the corpus is prose.
10. **Platform:** browser-first and phone-legible like Orbis?
11. **God Mode:** what does one ad hour give in this game without breaking its pacing?
12. **Which principles in §4 are non-negotiable, and which do you want to break on purpose?**

---

## 9. How we'll test the boundaries (step 3, generic)

Same method as Orbis: a deterministic sim with seeded runs, hard invariants, and experience sweeps. For an
incremental game, the sweep measures the **pacing curve** instead of states:
- Time to each unlock and act transition under several player strategies (greedy, balanced, idle, bad)
- Dead zones: stretches with nothing affordable
- Runaway zones: stretches where growth trivializes decisions
- Soft-lock detection: states with no path forward
- How much each decision actually changes the curve (like Orbis's causality probe)
- Session-length distributions for the chosen time model

Jay judges the specimens; machines play the rest.

---

## Sources

- Game source (browser build `?v3`): decisionproblem.com/paperclips — `main.js`, `projects.js`, `combat.js`, `globals.js`, `index2.html`
- Patch notes: https://decisionproblem.com/paperclips/patch1notes.html
- Wikipedia: https://en.wikipedia.org/wiki/Universal_Paperclips · https://en.wikipedia.org/wiki/Frank_Lantz
- Aaron Reed, IF50: https://if50.substack.com/p/2017-universal-paperclips
- Y Combinator interview: https://www.ycombinator.com/blog/frank-lantz-director-of-nyus-game-center-and-creator-of-universal-paperclips/
- PC Games Insider interview: https://www.pcgamesinsider.biz/interviews-and-opinion/66271/interview-paperclips-developer-frank-lantz/
- App Store history: https://apps.apple.com/us/app/universal-paperclips/id1300634274 · Lantz on X re 2.0: https://x.com/flantz/status/1451259476644794370
- HN: https://news.ycombinator.com/item?id=24389655 · https://news.ycombinator.com/item?id=34400050 · https://news.ycombinator.com/item?id=47063861
- New Normative: https://newnormative.com/2017/10/20/universal-paperclips-can-manipulative-mechanics-ever-succeed-as-their-own-commentary/
- Kotaku (film adaptation, 2019): https://kotaku.com/a-filmmaker-thinks-he-can-turn-clicker-universal-paperc-1833676548
- Fan wikis (search snippets only, pages blocked): universalpaperclips.fandom.com, universalpaperclips.miraheze.org

**Gaps:** speedrun records (speedrun.com blocked), per-act timings, the mobile Artifacts list, Reddit guides.
Some interview wording came through summaries; re-check the originals before quoting anything publicly.
