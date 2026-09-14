# Red team — pass 2 on the PRD/TRD (stored 2026-09-13, review in the morning)

Stored for review, not acted on. Condensed faithfully; their examples kept. CC notes at the bottom.

**Verdict:** the core bet is viable. The biggest danger isn't scope; it's the system turning her into a
**random-content vending machine.** What must survive is **interpretation**: *"Ah, she did that because I
told her X"* is a game; *"the RNG gave me weird shit"* is a content generator.

1. **"Always different" needs a thread, and it should be behaviour, not inventory.** One carried part isn't enough. Aim for *"Oh. She's still doing that."* A habit, interpretation, relationship, obsession, recurring misunderstanding or consequence should *occasionally* survive (not every time). **Objects reset heavily; behavioural residue persists lightly.**
2. **Butterfly effect is a warning.** One card changing 43% of verdict bands is too powerful if the player can't see why. Don't just calm the RNG: **separate causal randomness** (because of your choice) **from ambient randomness** (because she lives in a stupid universe), on different streams, so the player can reconstruct "I caused that" and still get "what is THAT?"
3. **Absence:** the test is *does the player want to know what happened?* Fast-forward may be a second mode ("live with her" vs. "I need to know what the idiot did"). **Don't make waiting the source of value:** a week should manufacture more *history*, not more rewards.
4. **The Prestige taking toys: keep it,** but it must be **correct by its own model** (optimizing, not punishing). Taking the weirdest part because it's "inefficient" is excellent; random deletion for game balance makes it an asshole. Player: "that's the best thing she has." Prestige: OPTIMIZED.
5. **Whys: no Mad Libs.** Controlled semantic slots (subject / observed anomaly / consequence / classification) choose a sentence structure; object names become **evidence inside the sentence**. E.g. *"The Archive kept the karaoke beacon because nobody else would have."*
6. **Kill rubber-banding early.** Worse loot when you do well is visible and mobile-gamey. **Make the Prestige react instead:** better performance → more scrutiny → more customs interference → more interesting problems. You're not nerfed; you're becoming interesting to the antagonist.
7. **Text load needs a brutal rule:** *no return should require more than ~30 seconds of reading before the player can act.* Progressive disclosure; the action is the reward for reading.
8. **AI content ownership:** not a gameplay risk yet. Keep provenance, prompts, generation and curation records; sort rights before commercial distribution. Don't slow the prototype for it.
9. **Name:** NOT BETSY; the name is the first example of the central mechanic (an offhand statement becoming permanent system state).
10. **Scope knife:** *does this system create a new kind of story?* If it only adds something to manage, no. Stray with personality + persistent behaviour: maybe excellent. Stray with hunger/happiness meters and a feeding UI: you invented a pet-management game.

**Unlisted risk: she must be the source of the weirdness, not its narrator.** If behaviour is `goal + RNG → encounter → mutation`, she's just the interface to the database. Her habits should shape what she notices, keeps, trades, misunderstands, trusts, considers useful, and does with objects never meant for a spaceship. *"I told her to keep her head down. She took it literally."* is character emerging from mechanics.

**Architecture flag:** "same seed + same choices → same run" vs. "days advance on the wall clock" are in tension. Define the deterministic input as **seed + action history + elapsed-away intervals**, never wall-clock time as hidden state, or bug reports become "same seed, same choices, different result — you played it Tuesday."

**What to measure tomorrow:** not balance, record counts or causality. **Watch your own behaviour** over three stops: *when I came back, did I want to know what she had done?* Clicking through to see the next mechanic = a Paperclips derivative. *"Why would you do that?"* while wanting to leave again = the game.

---

## CC reading notes
1. **Name: Jay has decided BAD MONKEYS** (2026-09-13: "we keep it, it's goofy enough"), overriding pass 1 and 2's NOT BETSY recommendation. Recorded in BOUNDARIES.md.
2. **Who's who, again:** the red team writes "Jame" for the ship ("when you're gone, she runs things"; "Jame needs to be the source of the weirdness"). In our design the player is Jame and the ship is **Not Betsy**. Their points all still apply once you read "Jame" as "Not Betsy", but the briefs may need one clearer line so reviewers stop swapping them.
3. **Architecture flag is already satisfied in the prototype:** a session is `seed + actions[]`, and each elapsed day is itself an action (`day`), with real time only deciding *when* those actions get appended. Replaying a session never reads the clock. Worth stating explicitly in the TRD.
4. **Their points 2, 5 and 6 map to concrete, testable changes:** split RNG streams (causal vs. ambient); a why structure with semantic slots; replace state-gap loot selection with Prestige scrutiny. All are spec changes, not tuning; review before building.
5. **"Behavioural residue persists lightly"** is a direct answer to smoke finding 1 (the persist-parts toggle tested inventory persistence, not behaviour).
