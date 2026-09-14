# BAD MONKEYS: game brief for UI design

For Claude Design. You already made the Bad Monkeys hero page (the Prestige Archive entry with GOOD struck out for *Bad*). This brief covers the **game itself**: the story, the flow and every feature. The screenshots come from a functional prototype, so treat them as wiring, not design.

> **Status:** rough, playable prototype. Content is placeholder, except the verdict sentences ("whys"), which are real. Numbers are untuned. Nothing here is final art direction.

---

## 1. The story

**The Prestige** is a spotless galactic empire that archives anything inefficient. It is auditing a glitch.

The glitch is **Not Betsy**. She's a deranged, oversized escape pod, and she got her name by accident. **Jame**, an Alberta mechanic, once told her flatly *"you're not Betsy."* She took it literally, and it became her name. That is the whole game in one line: **an offhand thing a human says becomes permanent system state.**

- **When you're here, you're Jame.** You land on a planet, read what she did while you were gone, and fix the planet's problem using whatever absurd parts she's bolted on. Then you give her a goal, say one offhand line on the way out, and leave.
- **When you're gone, she runs things.** She takes your last words literally. She salvages, trades, picks up strays, develops habits, and fits sci-fi tech nobody would ever put on an escape pod. The **External Potato Replicator** is useless until you land on a starving planet. She also dodges the Prestige.
- **You come back to a ship that is always different.** *Not always better. Always weirder.*

**Three stops, then a verdict.** Nobody wins or loses:
- The **Prestige files its verdict**: a cold score and a misclassification, in their clean UI.
- **The Archive keeps one sentence of why**, written *over* their report in her world's voice.

### The antagonists (the Prestige's "fronts")
Each front is an agenda on a clock. Every tick is visible, and each one does something when full.

| Front | What it wants | When its clock fills |
|---|---|---|
| **Vorian** (auditor) | Watches her whenever she's weirder than expected | Files an interim report and tidies away a part |
| **General Tubs** (customs) | Flags irregular cargo | A customs purge |
| **The Synthesis** | Scheduled "improvements" | An update that optimizes something away |

The Prestige must feel **correct by its own model**. It is optimizing, not punishing. When it removes her weirdest part because it's "inefficient", the player thinks *"that was the best thing she had"* and the Prestige stamps OPTIMIZED.

### Tone
Hitchhiker's Guide bureaucracy, played deadpan, with a real heart underneath. The jokes come from literal systems meeting offhand human speech. The UI starts **clean, white and silent** (the Prestige's). It **rusts at the edges** as she becomes harder to optimize.

---

## 2. The flow

```
NEW BARGAIN
  └─ Stop 1 ─┐
             │  LANDED  →  read her log  →  planet problem and/or customs
             │          →  fix with her parts (2 tries)
             │          →  choose a goal
             │          →  draw 3 last words, say 1
             │          →  (God Mode: keep one part)
             │          →  LEAVE: she sheds her other parts
             │
             │  AWAY    →  7 days pass (real time or fast-forward)
             │             each day: power drain + one rolled encounter
             │             shaped by the goal and her literal reading of your words
             └─ Stop 2 → Stop 3 → VERDICT
                                   └─ Prestige report (score, band, misclassification)
                                   └─ the WHY, written over it
                                   └─ added to the ARCHIVE of whys
                                   └─ if archived, the next Not Betsy starts with one "optimized" part
```

### Screen 1: LANDED (the main screen, most of the play time)
The player arrives, catches up and acts, in this order:
1. **Her log while you were away.** A day-by-day account in her deadpan voice. She may leave things out. There are four speakers: Not Betsy, the Prestige, Jame and system.
2. **The planet.** Name plus one problem sentence, e.g. *"Grainless Vesper: the harvest failed for the ninth year. The ration cubes ran out politely."*
3. **Customs**, sometimes: none, light or full, decided by dice. It may confiscate or tag parts.
4. **Her parts.** Each part has:
   - a name and category
   - an absurdity rating (✶–✶✶✶)
   - one upside and one downside (every positive has a negative)
   - two buttons: **Use on the problem** (2 tries per stop; results are solved, partial or failed) and **✦ Keep past this stop** (God Mode)
5. **Strays aboard** (small creatures or people) and **habits** she has developed.
6. **Before you go:**
   - **Goal**, pick 1 of 4: *Salvage run · Hurry to the next planet · Find some crew · Keep your head down*.
   - **Last words:** 3 cards are drawn and you say 1. For example: *"Keep her warm."* → she reads it as *"Keep everything warm. Everything."*
   - The **Leave** button.

### Screen 2: AWAY
- The clock: day N of 7, time until she lands.
- Resources and front clocks visible.
- Controls: **advance a day** or **fast-forward to landing**. Real-time mode also exists: close the tab and she keeps going.
- Design intent: this screen should make you *want to know what the idiot did*, not make waiting feel like the reward.

### Screen 3: VERDICT
- **The Prestige's report**, in their UI: score, verdict band and a misclassification.
  - **Archived:** she was deleted. One part carries into the next Not Betsy, "improved" by the Prestige.
  - **Deferred:** persistence detected, retry scheduled.
  - **Unclassifiable:** the audit form broke, because she fits no field.
- **The why card**, written *over* the report. It uses one of 4 registers (defiant, elegiac, absurd, tender). Real examples:
  - *"Filed under: Fern."*
  - *"Deletion order received, stamped, and placed under a mug."*
  - *"Her file came back marked INCOMPLETE, because under 'purpose' she had written 'yes.'"*
  - *"The why, it turns out, is that someone once told a machine she wasn't Betsy, and she tried very hard to be something anyway."*
- **New bargain** button.

### Screen 4: THE ARCHIVE
A list of every why you've earned across runs, with date, band and classification. This is the collection.

---

## 3. Features, itemised

**Core loop**
1. Three stops per bargain, then a verdict.
2. Each stop lasts 7 days: real-time absence, day-by-day, or fast-forward.
3. At a stop: the planet problem and/or customs, rolled by dice.
4. Fixing a planet uses her parts: 2 attempts, with solved, partial or failed results.
5. **Goals**: 4 choices that weight what she encounters while away.
6. **Last words**: draw 3, say 1. She interprets it literally, which changes her behaviour all week.
7. **Shedding**: parts reset between stops, so each stop makes the last one obsolete.

**Her body (the "always weirder" part)**
8. **Mutations/parts**: absurd sci-fi tech, each with a paired upside and downside. There are 7 categories: food, propulsion, hull, comms, defence, power, repair.
   - Placeholder examples: Karaoke Distress Beacon, Lava Lamp Reactor, Bouncy Castle Airlock, Tax-Deductible Hull Plating, Haunted Coffee Maker, Snow Plow Prow.
9. **Strays**: passengers she collects, up to 3 aboard.
10. **Habits**: behaviours she picks up.
11. **Foreshadowing**: sometimes she picks up a part the *next* planet will need, so it feels like fate.

**Economy**
12. **Scrap**: fix and bolt-on material.
13. **Power**: jumps drain it and recharge is slow. At zero she drifts and "waits and wonders."
14. **Smudge**: un-optimizability, the verdict currency. It's shown against a **target** the Prestige sets.

**Antagonist**
15. Three fronts on visible clocks: Vorian, Tubs and the Synthesis. They tidy parts and reduce Smudge.
16. **The degrading UI**: as Smudge outruns the target, grime creeps in from the edges and straight lines stop being straight. Near the end, the interface falls apart before the report arrives.

**Ending and meta**
17. The verdict report, with the why written over it.
18. The Archive of whys across runs.
19. **Loss carries forward**: when she's archived, the next Not Betsy starts with the Prestige's "improved" version of one part.

**Money (Unstuck model)**
20. Free is the whole game. **God Mode** (one ad buys one hour, or the $5/mo catalog) lets you **keep one part** past the end of a stop. It shows as a gold-outlined ✦. God Mode is intervention; it never paywalls the fun.

**Under the hood (no UI needed, but it shapes the UI)**
21. Deterministic: the same seed and the same choices always produce the same run. Runs survive reloads.
22. No AI at runtime. Content is pre-generated and picked by math and dice.

---

## 4. The three layout experiments (in the screenshots)

| | Idea | Works | Doesn't |
|---|---|---|---|
| **A · Panels** | Four panels: log · planet · parts · before you go | Everything visible; good for tuning | Reads like a dashboard, not a place |
| **B · Ship cutaway** | Not Betsy is the centre of the screen, with parts bolted onto 8 hardpoints and the log as a drawer | "Weirder" is *visible*: you see the new silhouette before reading | What happens at part 9+? |
| **C · Log-first (phone)** | Her log as a message thread, the planet as a card, parts in a swipe row, a bottom sheet for leaving | Matches the fiction (she reports to you); one thumb | The header and sheet eat half the phone screen |

Only the **LANDED** screen differs between layouts. Away and verdict are shared.

---

## 5. Design rules we already know

- **~30 seconds of reading, max,** before the player can act. The words already pass this; the *screen density* doesn't. Progressive disclosure is the design problem.
- **The player should always be able to tell what they caused.** *"She did that because I told her X"* is the game; *"the RNG gave me weird stuff"* is not.
- **Prestige = clean, white, silent. Her = grime, warmth, crooked lines.** The degradation is continuous, driven by a single 0–1 value.
- **The why is written over the report.** Data turning into meaning is the ending's whole image.
- **Four distinct log voices**: Not Betsy, the Prestige, Jame, system.
- **Sprites must be transparent SVG layers.** Ship stack from bottom to top: glow · hull · grime · window · modules (per category, with states idle / kept / pays-off / tidied-away) · strays · habits. The full layer and hardpoint spec is in `ASSET-MANIFEST.md`.
- **Mobile matters.** This is a check-in game.

## 6. Open design questions

1. Which layout direction, or what hybrid? Is the ship the centre, or the log?
2. How do we show 9+ parts?
3. Should parts use per-part art or a **kit-bash system** (category base plus 2–3 accessory layers)? The database is meant to grow to hundreds of parts, so this is the biggest art-cost question.
4. How does the Away screen make you *curious* rather than impatient?
5. What does "the UI falls apart" look like in its last moments before the report?
6. How do you make "you caused this" legible in her log?
