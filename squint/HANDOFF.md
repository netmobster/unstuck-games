<!-- Opened 2026-09-20. The playable web build of Squint, and what is still missing from it. -->
# Squint — the web build

**What this is.** A playable single-player Squint against Noke, built 2026-09-20 as a Claude
artifact so Jay could actually play the thing. **558 hands of soak had been run in
`SEREN/labs/squint` and zero hands had ever been played by a person.** Now some have.

**Where it lives:** https://claude.ai/artifact/GDc5ocCkQfoSWBomvXbz6C
Source in this session's scratchpad; ⚠️ **not yet in the repo** — see *What to do next* §1.

**The rules it implements** are `SEREN/labs/squint/RULES.md`, and the series layer is
`BRIEFING.md` §3.3. ⛔ **Nothing here re-derives the rules** — where the docs disagree
(`BRIEFING` says non-dealer acts first, `RULES.md` says dealer speaks first) **`RULES.md`
wins**, because it is the later and normative one.

---

# Built, and verified by playing

## The hand
- 40 cards, 1–10 in Coins · Cups · Rods · Blades. Three each. **No card is ever played.**
- Dealer puts up 1, the other 2, **dealer speaks first** — that is what the smaller stake buys.
- Fold · Match · Raise (1–3, **two each per hand**) · See (**double what you owe**).
- ⭐ **On a see that loses, the winner never shows.** Permanently. The screen says so and
  gives you nothing else. **This is the mechanic the whole game rests on and it is intact.**
- Ties go to the player who was **seen**, not the one who paid to see.
- **Blind:** declare before looking, stake half, **cannot be seen.** Look whenever; you are
  then open at full stakes.
- Rankings **counted, not inherited** — running flush > prial > flush > run > pair > high
  card. Runs do not wrap.

## The series
- Race to 5.
- ⭐ **The jackpot** — proposed between hands, **only happens if he agrees**, refusing is
  free, and the winner of the series takes it. Every proposal and refusal is logged.
- **The stake ladder** — coin · a possession · a favour · an answer · a secret ·
  **something that was never yours to wager.** Picked at the start, described in your own
  words, and ⛔ **the game never adjudicates what it means.**
- **Agree to stop** splits the jackpot if he accepts. **Walk away** forfeits everything.
- **Commit–reveal:** the deal is shuffled from a secret number whose fingerprint is
  published before the first card and whose value is revealed at the end, so the deal can
  be re-derived and checked.

## Noke
**Not odds — the temperament from `PREDICTION-KEY.md`**, which derives it from ten
decisions rather than a sheet:

> **He folds when it is about cards and escalates when he is made to wait, or looked past.**

- unremarkable when the cards are just cards
- **cornered** (one loss from losing the series) — raises the maximum, and says why
- **match point** — pays to see rather than fold. He buys knowing, not the pot
- **played blind at** — the maximum raise. Not being looked at is the thing that does it
- **knocked at twice or more** — he answers you instead of the cards

## The knock
Mechanically nothing, per the rules. ⭐ **But the channel is two-way and he uses it.** He
knocks back; he knocks before moves that come from pressure rather than from cards; and
being drummed at feeds his temperament. **The rules define no meaning — meaning arrives by
correlation, and it is readable off the ledger.**

## The ledger
Every move by both players, in order, with what it cost and the pot after. His spoken line
hangs off his row, **so silence reads as silence rather than as nothing happening.** Added
because Jay played it and said *"it's not making sense to me somehow"* — and it did not,
because the one spoken line replaced itself each turn and the sequence existed nowhere.

---

# ⛔ Not built

| | |
|---|---|
| **Table actions** | `BRIEFING` §3.5: he refuses a stake, accuses you of cheating, sulks, stands up and leaves. **Model, unbounded** — and the rule that makes them safe is that a table action may end, refuse or abandon a game but **may never change who won a hand.** Also: every one should be logged **with the hand he was holding**, so the character is auditable — if he storms off on principle only when holding garbage, the record catches him |
| **Extension between series** | the loser usually wants another and the winner can walk. ⭐ *The natural place for stakes to climb* — the end screen mentions it and does not offer it |
| **Two-player** | the whole point of the standalone reframe. Needs the trust model first — see below |
| **The information wager, enforced** | *"one question, answered honestly"* is a stake the game deliberately does not adjudicate. `OPEN-QUESTIONS` C3 suggests recording the answer as a fact with a visibility tag so there is at least something to check. Unbuilt, and arguably should stay that way until two humans have played |
| **A deviation profile** | `analysis.py deviation` exists in the lab and nothing here feeds it |

---

# ⚠️ Bugs found by playing, and what they were

**Kept because the pattern is the point: every one was found by using it, and four of the
seven were introduced minutes earlier by the fix before them.**

| what happened | cause |
|---|---|
| Every face-down card invisible | `.back` was **both** the modal backdrop (`position:fixed; display:none`) and the card-back class. A cascade collision I wrote |
| A hand could score twice | no guard on `settle()`. Added one |
| ⛔ The table deadlocked | …and the guard's early return **skipped releasing the turn lock.** The fix caused the next bug |
| **Fold was the only legal move** in 5 states | I required `owed > 0` before See was offered. **The rule says "once you owe nothing, your only moves are to raise, to see, or to fold" — see is one of the three** |
| Noke ground every hand to the wall | ⭐ **the same bug, left in his code.** His `canSee` still required `toStay > 0`, so when he owed nothing he could only raise or fold. He burned the raise cap every hand. Fixing it took him from **0% sees to 28%** |
| Facing a blind player with raises gone | a blind player cannot be seen, so only Fold remained. **The blind now ends when the betting caps out** — it is protection, not protection for ever |
| The rules card said "prial" and "480 in 9,880" | and explained neither. Now every rank has a plain description, an example, and odds in words |
| A worse-looking hand took the pot in silence | it had genuinely won — a run beats three high cards. **The game was right and silent, and silent is the same as wrong.** Every showdown now says why |

⚠️ **And three measurement failures of my own**, recorded because they nearly became
findings: I reported "Noke never sees" twice off a counter that skipped the modal path;
I reported horizontal overflow at every zoom level from two properties that `zoom` skews
against each other; and **three separate `.replace()` calls silently did not match** and
left code referencing an identifier that was never declared. Everything is asserted now.

---

# What to do next

1. ⛔ **Get the source into this repo.** It is a single HTML file in a session scratchpad
   and that is the most fragile thing about it.
2. **The trust model.** `OPEN-QUESTIONS` A2 — the commit–reveal is **not safe
   player-versus-player as built**, because whoever generates the nonce can grind it
   offline for a favourable deal. Both sides must contribute entropy. **Cheap, and it must
   be decided and written down or the honesty guarantee is decoration.**
3. **Table actions** — the largest missing piece, and the one that makes him a person
   rather than a policy.
4. **Two-player**, and with it: B3 (a dropped socket is not a character act — and on a
   phone it is not even a choice) and B5 (free-text stakes between strangers have no
   moderation story at all).
5. ⚠️ **Re-measure the pacing.** `OPEN-QUESTIONS` C5: the race-to-5 target was tuned
   against chat being slow. A browser hand is much faster and a phone hand faster again.
   **Re-measure rather than inherit the number.**

---

# The open design questions this build does not answer

- ⭐ **Does the jackpot ever actually grow?** `OPEN-QUESTIONS` C1 predicted it might only
  fire on irrationality, or never. **First observation: he refused a proposal of 3 while
  1–0 up**, which is correct play and exactly the predicted failure mode. **That is a data
  point, not a balance failure. Do not tune it before it has been watched.**
- **Does the knock get used?** *You cannot author emergence.* It now has a channel, a
  two-way one, and a correlation you are not told about. Whether anyone reads it is the
  finding.
- ⛔ **Whether a vying game leaves room for character at all**, which BRIEFING §4 calls
  *"the whole wager, and it is untested."* One person has now played it for an evening.
  **That is one data point and it is not an answer.**
