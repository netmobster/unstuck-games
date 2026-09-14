# Boundaries — Game #2 (step 2)

Jay's answers to the questions in [TEARDOWN.md §8](TEARDOWN.md#8-boundary-questions-for-jay-step-2) and the
decision rounds. Jay's own words are the decision; options were only a map. Not yet tested.

> Corpus details (characters, rules of the world) live in a local-only digest, not in this public repo.

## Decided

| Topic | Decision | Round |
|---|---|---|
| **Design sequencing** | CD's **Bad Monkeys hero** exists (Prestige Archive entry header, GOOD struck out for *Bad*, "Not always better. *Always weirder.*", a pod with Prestige-labelled parts: SNOWPLOW · MUNICIPAL, GRAIN AUGER · 40 FT, DOG · UNLISTED). **Homepage incoming; in-game UI design waits** until Jay has tested more. | 10 |
| **Name** | **BAD MONKEYS.** *"We keep it, it's goofy enough."* (Jay, 2026-09-13, over red team's NOT BETSY recommendation) | 10 |
| **Rights** | Game rights are Jay's. The Netflix project is a different everything that uses the universe's mechanics, not its characters or plot. Jay owns everything we make here, **including Jame/James**, which he fought for. | 1 |
| **Canon** | **Bad Monkeys** | 1 |
| **Time** | Borrow Elsewhere's offline mechanic: the world advances while you're away | 0 |
| **Point of view** | **Split by presence.** When you're here, you're **Jame**. When you're away, **Not Betsy** runs things and makes the choices (like Elsewhere's standing orders / fronts). | 0–1 |
| **Platform constraint** | **Web-based means no AI at runtime.** So "offhand words parsed literally" can't work the way free-text orders do in Elsewhere. | 1 |
| **Spine** | **Repair makes things weirder** + **Salvage → grow yourself** | 1 |
| **The return** | *"What you come back to is always a DIFFERENT Not Betsy — not always better, but always weirder."* | 1 |
| **What "weirder" is** | **Body mutations** + **strays** + **habits**. Mutations are sci-fi tech that would *never* be fitted to a deranged oversized escape pod (e.g. an external replicator that constantly spews potatoes, useless until you meet a starving planet). | 2 |
| **Mutation rule** | *"Every negative needs a positive, every positive needs a negative."* Not balanced: absurd. | 2 |
| **Mutation lifetime** | They last a session / epoch / phase, not forever. Not hard-coded runs → high replayability; the authored library is the content. | 2 |
| **Strays** | Lift from Jay's ~3 other projects | 2 |
| **Framing** | *"Not Betsy is your superpowers/modifiers that shift on every session."* | 2 |
| **Jame's verb** | **Fix/tinker, set goals, then leave.** Elsewhere-esque, but *"you're not making decisions, you're dealing with consequences."* | 2 |
| **Words without AI** | **Last words, from a deck.** Before leaving, Jame says one offhand line; Not Betsy takes it literally by authored rules. | 2 |
| **Stakes / structure** | **Three stops, then a verdict** (Bad Monkeys' bargain). Finite. | 2 |

| **Unit of change** | **Per stop.** Three stops = three epochs; she mutates on the way to each planet, and the stop is where mutations meet a problem. | 3 |
| **While you're away** | **All four:** chasing Jame's goal literally (goal + last words read like a crane-SI job description) · salvaging and bolting on (rolled encounters → paired-upside/downside mutations) · the Prestige is moving (SEREN-style fronts on clocks) · collecting strays. | 3 |
| **The verdict** | **Is she un-optimizable?** The Prestige wants to archive her; the verdict is how impossible she became to compress. Weirder wins; a tidy run loses. | 3 |
| **Last-words deck** | **Draw 3, say 1.** Before leaving, three offhand lines; one goes in; she takes it literally. | 3 |

| **Stop length** | **About a week** of real time, but **fast-forward is allowed**: play straight through, or be away. Away has benefits (e.g. interest on resources) but *never enough to force the choice*. Sitting down and playing for 30 minutes is a valid way to play. | 4 |
| **At a stop** | **The planet has a problem** and/or **customs intake**. Either/or or both, possibly decided by RNG. | 4 |
| **Losing** | **Loss carries forward.** When she's archived, the Synthesis keeps one mutation; the next Not Betsy starts with the Prestige's "improved" version of it. | 4 |
| **The return** | **Her log, in her voice.** Not Betsy's literal, deadpan account. She may leave things out. | 4 |

| **Economy** | **Scrap** (fix and bolt-on material) · **Smudge** (un-optimizability, the verdict currency) · **Power** (jumps drain it, recharge is slow; bounds how far she wanders while away) | 5 |
| **God Mode** | **Keep one mutation** past the end of a stop | 5 |
| **Look** | **Terminal-minimal + Prestige-vs-Smudge UI.** *"Getting closer to loss the UI degrades at the edges, then falls apart, boom, loss, report/score."* | 5 |
| **UP principles kept on purpose** | Each stop obsoletes the last · Permission < power · Mechanics are the theme · End on the first verb | 5 |

| **What Jame fixes at a stop** | **The planet's problem**, using her absurd parts (the potato replicator, finally useful) | 6 |
| **MVP** | **Full first bargain:** real week-long stops (with fast-forward), customs and planet problems, God Mode, the degrading UI | 6 |
| **Win/lose** | *"Maybe you don't win or lose? You... something?"* | 6 |
| **The something** | **You leave a why.** Vorian's audit was hunting the Motivation, the "Why" of the human glitch. A bargain ends by producing one sentence of why, built from what she became. The Archive keeps it. The degrading UI = data turning into meaning. | 7 |

| **Verdict + why** | *"Verdict is the score? Why is the story?"* (Jay, proposed). CC: yes, if **the verdict is the Prestige's score, not the game's** (their cold compression number, their UI) and **the why is what's kept** (her voice, written over their report). The score can shape the why's register. Pending Jay's reaction. | 8 |

| **Content pipeline** | *"The AI is in the production, math and RNGs are in the deployment."* Bolt-ons, strays and whys are generated SEREN-style at authoring time (schema → dials → categorized output), then chosen at runtime by math (**match to where the player is too strong or too weak**) and a separate **absurdity seed** that picks the actual object. | 9 |

| **In-game UI** | **CD's workbench design** (`games/not-betsy-proto/design/`). *"Layouts as STATES, not OPTIONS"*: its three screens are the bargain's three states (landed → away → verdict) and replace CC's A/B/C layout experiments. | 11 |
| **Blame** | **Only her voice.** No "that's on me" UI note; when your last words drove what happened, her log line ends *"You said."* | 11 |
| **Last words** | **Show her literal reading before you pick** ("she'll hear: …"). You choose the misunderstanding on purpose. | 11 |
| **Fit hint** | **Always visible.** Parts that solve this planet glow pink with *"this one!"* | 11 |

## Prototype placeholders (NOT decisions — just enough to smoke test)

Jay: *"For first rough test just put random stuff in that makes sense with random properties that don't."*
The equivalent of SEREN's single mapped combat sequence: before the tables, before generation.

| Open question | Placeholder in `games/not-betsy-proto` |
|---|---|
| Strays from Jay's other projects | Generic placeholder strays (plus Widget) |
| Habits vs. mutations | Two separate types |
| What the Archive of whys does | A list that persists across runs; nothing more |
| Replay after a bargain | Start a new Not Betsy; if archived, she carries one "optimized" mutation |

## Open
How a why is built without runtime AI · what the Archive of whys does across runs · replay after a bargain.

## Implications to test (not decisions)
- **Offline time × exponential growth.** UP's curves assume presence; absence needs a brake that is itself interesting. Measure "what did a day away do" distributions (Elsewhere's absentee criterion).
- **Weirder, not better.** The sweep can't just measure growth; it has to measure *divergence*: how different is the Not Betsy you return to, and is it ever boring-different or broken-different?
- **UP principle #2** (permission slower than power) may map onto absence: what Jame authorises before leaving bounds what Not Betsy can do.
- **No runtime AI** means every "literal interpretation" must be a deterministic rule set: authored, testable, sweepable.
