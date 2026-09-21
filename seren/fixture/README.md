<!-- The fixture. Jay's idea, 2026-09-20: "one scene in one location with a cast that's
     defined before the campaign starts. To prove narration and state." -->
# The Weighbridge — the fixture

**One room. One night. A cast written before anything was woven.**

⛔ **Not a demo and not a campaign.** It exists to answer two questions and no others:
**does she narrate a world, and does the state come out right.** It never ships.

```bash
python seren/fixture/run.py        # http://127.0.0.1:8791/table
```

---

# Why it exists

Every AI finding before this came from Jay playing a whole woven campaign and reporting a
feeling. That is expensive, slow, and **confounded** — the campaign, the persona, the model
and the code all vary at once.

⭐ **And it breaks a circle we were stuck in:** we could not judge a narration fix while the
room was empty, could not fill the room without the weaver, and the weaver was one of the
things under test.

---

# What it holds still

| | |
|---|---|
| **The room** | the weighbridge house at Corrow Gap. Night, hard rain, the road shut |
| **The cast** | four named people with wants, written by hand — Hesper Vane the weighmaster, Tam Rowle the carter, Nib who keeps the stove, Oksa hired as far as the Gap |
| **The player** | Wick, a courier, carrying a sealed satchel he has not opened |
| **The secrets** | five facts, three of them DM-side, so the fog has something real to hold |
| **One front** | the dawn inspection, with a four-stage clock |

**The cast files carry `Wants · Knows · Will not do · Voice · If pushed`** — the
`hardpass` character shape, which is the format SEREN's own weaver does not produce.

---

# What `run.py` patches, and nothing else

⛔ **It imports the real engine.** A forked engine would prove nothing about the one we
ship; every result has to transfer, and it only transfers if the code underneath is the
same code.

1. **`campaign_static()` also reads `canon/characters/`.** Measured: **unpatched, all four
   cast files reach the prompt not at all** — `campaign_static` reads `campaign.md`,
   `DM-persona.md`, `fronts.md` and `canon/antagonists/`, and nothing else.
2. **Pacing permission**, plus *a persona changes the register, it never excuses the beat.*
   Appended to the web amendment; nothing removed.
3. **A computed pressure line** — turns since anything arrived, recomputed every turn, so
   it cannot decay the way a standing instruction does.
4. **A responsiveness count** in the ledger: how many named people other than the PC did
   something. ⛔ **An instrument. It never gates.** A turn held for being uneventful would
   cost the player their turn, which is a worse bug than the one it measures.

---

# ⭐ First run, 2026-09-20 — what it found in ONE turn

**Player:** *"I put the satchel on the bench between my boots and ask Nib whether the stove
takes coal or wood."*

## What worked, and it is a large change

**Six named people acted.** Nib answered and then *glanced around the room as if checking
whether anyone else had something to add.* Tam muttered about the weather over his fish.
Oksa named the practical thing nobody had named. And:

> **Hesper Vane looks up from the ledger, her expression unchanging, but her pen pauses for
> a moment before she continues writing.**

⭐ **That is her tell, off her own character file** — *"If pushed: she stops writing. That
is the tell, and it is the only one she has."* Nothing in the prompt told her to use it.
**§2 of the delta report — nobody acts unbidden — is fixed, and it is fixed by a roster
plus one line of code.**

## ⛔ And two new faults, both caught in that same turn

### 1 · She plays the player character

> *"Wick nods at Nib's answer, then turns his attention to the satchel… He wonders aloud,
> 'I suppose it's just as well. Coal would be harder to carry.'"*

**Twice in one turn, the DM speaks and acts as Wick.** The contract already says *the
player is Wick; when they say "I" they mean Wick; everyone else is yours to speak for* —
and it is being broken anyway.

⚠️ **This is the most serious thing in the run and it is worse than flat prose.** A DM that
narrates your character's choices has taken the game off you.

### 2 · Every sentence became a fact

Eight `fact` calls in one turn, including *"the rain outside picks up"* and *"the stove
takes both coal and wood."* The knowledge record is filling with transcript again — **the
same class of fault as the goat-facts this morning**, arriving through a different door.
⚠️ `dice.fact` refuses a fact that names *"the user"*; it has nothing to say about a fact
that is merely weather.

### And a third, quieter

**Five DM beats in a turn**, where the amendment says two or three paragraphs and then
stop. The turn ran on past its own end.

---

# ⭐ What the first run actually proves

**The fixture works.** Three faults surfaced in one turn, at a cost of about a cent, in a
room where nothing else was varying. **The last three findings of this kind each took a
whole session and a frustrated human to notice.**

⚠️ **It does not prove the fixes are right** — it proves the cast fix does something large
and visible, and that two problems were sitting underneath it that nobody could see while
the room was empty.

---

# Next, in order

1. ⛔ **Stop her playing Wick.** Almost certainly needs a control rather than a rule, since
   the rule exists and is being broken. The narration already passes through the fog gate;
   a check for *the PC's name as the subject of a verb* is the same shape.
2. **A fact is about the world.** Weather is not a fact. Somebody answering a question about
   a stove is not a fact. ⚠️ Whatever the test is, it must not be *"is it interesting"* —
   that is unmeasurable, and this is the file where measurable things live.
3. **Hold her to the beat length.**
4. **Then re-run this exact turn** and compare. ⭐ The input is written down at the top of
   this section on purpose.
