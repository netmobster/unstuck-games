<!-- From Jay's first browser session on a woven campaign, 2026-09-19, 23:15. -->
# What the first play showed

**Dues in Duskfall**, woven at the Loom, played in the browser. It worked — the campaign
built, the table opened, the dice were pressed, the ledger wrote itself. **It is not Seren.**

Jay: *"nominally better, but not Seren."* Four faults, in the order they matter.

---

## 1 · She reads the ledger out loud

> *"Eldrin attempts to sneak to the narrow staircase but fails the stealth check with a roll
> of 9 (total 12 against a DC of 15). He is noticed by someone in the room."*

That is the Record, spoken. Three things wrong with one sentence:

- **The DC is in the narration.** ROLL-MECHANIC is explicit: the player never sees the DC
  before the roll, and afterwards it belongs in the Record and the insert — not in her
  mouth. ⚠️ **And the fog gate did not hold it**, though `TABLE_TALK` bans exactly this
  vocabulary. That is a gate that is not gating; find out why before anything else.
- **The verdict is restated.** The insert already said DID NOT, in the two words the table
  uses. She repeated it in worse ones.
- **"Noticed by someone in the room"** — who? The contract now says *somebody reacts, by
  name*. Nobody did.

**What it should have been:** the barman's hand stops on the glass. Lira, who told him not
to, does not look up. Somebody on the stair says a name that is not his.

## 2 · The persona became a character

The campaign was told by **the Coroner** — a voice, a way of narrating, *cause then effect
then the body*. She put him in the room:

> *"The Coroner, a figure of clinical detachment, lays out the details of a recent,
> suspicious death."*

The persona is **how the story is told, not somebody at the table.** DM-persona.md now
travels with a woven campaign (shipped tonight) and needs one line that says so, plainly:
you are this voice; you are not a person in the fiction.

## 3 · Answers are encyclopedia entries

> *"The room has two exits: one leading to the main hall and another to a narrow staircase."*
> *"The floor is made of polished stone, with a few cracks and stains visible."*

Correct, useless, and nobody's voice. No smell, no sound, nobody in the way, nothing that
costs anything to look at. The anti-mirror rules went in tonight and these turns came
before them; the next session is the test of whether they were enough.

## 4 · The same failed action, twice, unchanged

Two stealth attempts at the same staircase, two failures, the same sentence. A table
escalates: the second attempt is harder, or somebody is now watching, or the door is
locked behind him. **Nothing moved** — the third owed thing from the contract, unpaid.

---

## Done overnight

**The gate was worse than it looked, in two places.**

1. **Table talk.** `DC\s*\d+` caught "DC 15" and missed "a DC of 15", and nothing at all
   covered "stealth check", "a roll of 9" or "total 12". The whole sentence quoted above
   walked through a gate that found nothing it recognised. Widened: the word DC alone, any
   named check, any spoken roll or total, and a restated verdict. Checked against honest
   prose — *"Lira checks the door"* and *"check the hinges before the lock"* still pass.
2. ⭐ **Hidden facts were not in the material the gate compares against.** `dm_side` was
   fronts, ideas, rulings and the antagonist files — **not `facts.jsonl`**. So a fact
   tagged `true` or `false` could be narrated straight at the player and nothing objected.
   The first woven campaign duly did it: *"the true killer is not a resident of the orchard
   counties"* is a `false` fact, read out as though established. Hidden facts are DM-side
   by definition and are now in dm_side, where the gate can see them.

**Cost, measured rather than guessed.** Jay: eleven cents felt ten times the spec. Measured
on the prompt: 8,000 tokens a leg on a woven campaign, 26,000 on sheep-crazy, and every leg
paid full price for a prefix that never changes. The contract, the formats and the campaign
now sit above a Bedrock **cache point**: 7,488 tokens read back at a tenth of the price
instead of re-sent. Three turns on a woven campaign came to **two-thirds of a cent**, which
is about **20¢ for thirty turns** — inside the 30–70¢ the spec asked for. Sheep-crazy is
still dear because its campaign.md alone is 51,000 characters.

## What is still open, in order

1. **Play a session on the new contract.** Three of the four faults above are what the
   anti-mirror rules were written against, and those rules landed *after* these turns were
   played. The next session is the test, and it is Jay's to run.
2. **One line in the persona file**: this is a voice, not a person in the room.
3. **Then the model.** Nova Pro is the ceiling we are hitting. The prompt carries a lot, but
   "not Seren" is partly a model that writes flat prose and reaches for the ledger when it
   has nothing to say. The Anthropic use-case form is one env var away from answering that,
   and it is Jay's to file.

## What already worked, and should not be lost

- The hand → weave → audit → table chain, end to end, for about a cent.
- The dice: asked, pressed, rolled server-side, written before narrated, `e001` and `e002`
  in the Record with their inputs and targets.
- The fog on facts: four of seven secrets invisible at the table.
- The chips, written for the scene by a small model that saw only what the player saw.
