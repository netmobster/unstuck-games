<!-- Ideas file, 2026-09-22. Jay: "what can go in marketplace besides campaigns like
     antagonists and heroes and champions and dedicated NPCs like cult leaders with a
     backstory players can load (one day buy) into their campaign ad hoc." -->
# What goes in the marketplace

**Status:** ideas, not a spec. Nothing here ships before the marketplace's own threat
model (red team #4). **Companions:** [`WEBSITE.md`](WEBSITE.md) §6 · [`PRD-TRD.md`](PRD-TRD.md)

> ⭐ **The big idea in Jay's note isn't the list, it's "ad hoc".** A campaign is a
> container you play *in*. Most of what's below are **drop-ins**: things you load *into*
> a campaign you're already playing, mid-session, and the DM picks up at the next turn.
> A cult leader with a backstory, dropped into your campaign on a Tuesday because the
> story wants one.

---

## The one contract every drop-in follows

A drop-in only works if it can enter a campaign it has never seen. So every one declares
the same six things, whatever it is:

| field | what | why |
|---|---|---|
| **what** | the kind (below) and a one-line pitch | browsing |
| **fits** | level range, tone, setting assumptions ("needs a town", "any wilderness") | so it's never dropped where it breaks |
| **enters** | two or three hooks: how it arrives in someone else's story | the DM needs a door, not a biography |
| **public** | what the party can learn by meeting it | goes into canon as player-visible |
| **private** | what it wants, knows and hides; its clock or escalation | goes **DM-side automatically**, into the fog |
| **exits** | how it ends: defeated, bargained with, left behind | so it doesn't hang around forever |

**Why this shape:** it's the formats we already have, joined up. The cast files'
`Wants · Knows · Will not do · Voice · If pushed` (the fixture), the antagonist files'
`axis · posture · grudge · escalation` (the Loom), and the fog's split between public and
private. ⚠️ **The private half must be marked private in the file.** Today's cast files
keep secrets in `Knows` and the engine doesn't treat them as DM-side; seren-mcp had to
strip them by section name (found 2026-09-22).

**How it loads over MCP:** a new tool, `seren_bring(item)`. The public half lands in
canon, the private half in the DM-side files, and the result hands the DM the `enters`
hooks: *"This arrived. Here are three ways in; pick one when the story allows."* The DM
doesn't have to use it this turn.

---

## The kinds

### People

| kind | what it is | example |
|---|---|---|
| **Antagonist** | a villain with a plan that moves while the party isn't looking: axis, posture, grudge, escalation 2/3/4+ | *The Tithe-Keeper*: collects a debt nobody remembers agreeing to |
| **Dedicated NPC** *(Jay's cult leader)* | a person with a full backstory, voice and secret, who can be friend, foe or both | *Mother Aldous*: runs a soup kitchen and a cult, sincerely, and doesn't see a difference |
| **Hero** | a PC to play: sheet, history, a hook for why they're here | *Wick*-shaped: a courier with a sealed satchel |
| **Champion** | a companion who travels **with** the party. The DM plays them, with their own wants and friction (the Loom's `companions`: name, does, friction) | *Brannoch*: a retired pit fighter who'll carry anything and refuses to lie |
| **Rival** | a recurring equal who wants the same thing the party wants. Not a villain; a race | *The Other Courier*: always one town ahead |
| **Patron** | someone who gives work, pays, and has reasons of their own | *The Widow Fenn*: pays in favours she'll call in later |
| **Cast pack** | the regulars of a place, 4–6 people who know each other (the Weighbridge cast is one) | *The night shift at the lighthouse* |

### Places and things

| kind | what | example |
|---|---|---|
| **Location** | a place with its people, its secret and what's for sale | *The Drowned Chapel*: an inn below the tideline |
| **Faction** | a group with a goal, a clock, and members to meet | *The Honest Ledger*: accountants who audit kings |
| **Item with a history** | a magic or mundane item that carries a story and a previous owner who wants it back | *The Weighmaster's Pen*: whatever it writes, happened |
| **Front** | a threat with a clock that ticks behind the scenes, to bolt onto any campaign | *The Slow Flood*: four stages, every one of them a choice |

### Play

| kind | what | example |
|---|---|---|
| **Side quest** | one evening, self-contained, drops in anywhere with the right `fits` | *The Toll Nobody Pays* |
| **Encounter table** | a d8/d12 table of things that happen on a road, a sea, a city at night | *The Corrow Road after dark* |
| **Mystery** | a set of clues, a truth, and what each witness says (the fog was built for this) | *Who opened the satchel* |
| **Campaign** | the container: everything above, woven | the three starters |

### The table itself

| kind | what | note |
|---|---|---|
| **DM persona** | a narrator voice (the-jester, the-registrar exist in CC SEREN) | changes register, never the beat |
| **Soundscape** | ambient audio for the table (`web/static/audio` exists) | web table only |
| **Card deck** | the Loom's picks and dials, as a themed deck to weave from | feeds campaign creation |

---

## What makes a drop-in sell

Guesses, to be tested:

1. **It has a secret.** A person with no private half is a costume. The fog is SEREN's
   whole difference, and the private half is where it lives.
2. **It moves on its own.** Antagonists and fronts escalate; rivals arrive a town ahead.
   Things that act unbidden are exactly what the web DM couldn't do (delta report §2).
3. **It enters cleanly.** Three good hooks beat a long biography.
4. **It leaves a mark.** What it did becomes canon, so next session remembers.

---

## Money, one day

**v1: free listings only** (payouts, tax, refunds are a later decision). When there is
money:

- **Small prices for drop-ins** ($1–3), more for campaigns. Bundles: *a cast pack plus
  their location plus their front*.
- **Creators get a share.** Publishing is already paid-only, so every creator is a
  customer first.
- **Free play, paid depth:** the free tier plays anything free; paid unlocks creation
  and publishing. Buying a drop-in is a third thing, open to both.

---

## ⛔ The risks this list adds

1. **Every drop-in is stranger-authored text loaded into a player's Claude.** The private
   half goes into `seren_secrets` output, where the model is *told* to read it
   carefully. That's the most dangerous place in the system to put an injection. The
   threat model has to cover drop-ins before campaigns, because drop-ins arrive mid-game
   in a campaign the player already trusts.
2. **Licence.** Named monsters, settings and NPCs from other people's products look like
   homage and are infringement. The licence check needs a list, not a vibe.
3. **Balance.** A level-12 antagonist in a level-2 campaign. `fits` is a declaration; the
   server should refuse a drop-in outside its level range, not trust the DM to notice.

---

## If we built one kind first

**Dedicated NPCs.** They're the smallest thing that shows the whole idea (public half,
private half, hooks, exit), they're what Jay reached for first, and the fixture's cast
files are already most of the format. **Build `seren_bring` for one NPC, first-party,
before any marketplace exists.** It's a feature for players whatever happens to the
marketplace.
