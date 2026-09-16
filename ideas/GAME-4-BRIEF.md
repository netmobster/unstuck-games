# Game #4 — brief

Filed 2026-09-16. **A brief, not a spec.** Goals, tone, objective, and a sketch of the
mechanics as they stand after ideation and the teardown. Nothing below is decided until
Jay's boundaries (method step 4) are in; open questions are marked **DECIDE** with a
recommendation, and the recommendation is only that.

Working title: **THE SLEEPING GOD** (placeholder, not a name).

## The graveyard

- **Tombstone:** Majesty (2000) — [The Bounty File](../teardowns/majesty/REPORT.html)
- **Markers:** Dungeon Keeper (inhabitants with needs and schedules) · Very Small Kingdom
  (a population you know individually) · Deadline Dungeon (time pressure, office absurdity)
  · Gargantua (the sleeping god, the caretaker relationship)

## The organ

**You cannot give an order. You can only make an offer, and the offer can be declined.**

Majesty's players did not call it strategy. They called it *liberating* and *exasperating*.
That pair is the target feeling.

## The transplant, in one paragraph

A manager can't give an order either. You're running the office of a god who is asleep
upstairs and cannot be woken. Twelve staff with appetites instead of stats. Work arrives,
and you can post it, raise the reward, appeal to someone's ego, bribe with pizza — or do it
yourself at midnight. Things go unclaimed while you watch. Somebody quits. The god sleeps on.

## Goals

1. **Twelve specific people.** The ferret proved persistence makes one character. This game
   has to prove it can make twelve, each stupid in a specific, legible, nameable way.
   (Majesty 2's lesson: competent agents are forgettable ones.)
2. **An offer that's a real decision.** Offers you can't take back once posted, rewards
   that only go up, and a payout shared by everyone who helped. Hesitating before you
   post is the whole feeling.
3. **Live, with a clock.** The studio's first game with time pressure, and the first where
   the actors can say no to your face. Not an absence game.
4. **An escape hatch with a price.** Majesty's fatal flaw was having no override. Ours is
   "do it yourself": always possible, never free.
5. **The story is the payoff.** Like every Unstuck game, it pays off in what happened, not
   a score: a sentence at the end, a record of who did what, and why.
6. **Show the working.** The perception maths (value through greed, danger through a
   personal delusion) are plain numbers, and the eye can show them after the fact.
7. **Every no has a readable reason.** Majesty players never minded heroes refusing; they
   minded not knowing why (the 5,000 gold Witch King nobody would touch). When someone
   declines a task, you can always find out why, even when you can't change it.
8. **No single safe strategy.** Removing control tends to push players into one safe,
   pre-committed plan (the Loop Hero critique). Variety has to be the safer bet.

## Tone

- **Office comedy, not office satire.** Warm, specific, a bit pathetic. *The Office*'s
  affection, not *Office Space*'s contempt. Nobody is a villain; everybody has a reason.
- **Mythic and mundane at once.** The god's needs are treated with enormous seriousness by
  people who also want to leave at five.
- **Characters are funny because of their arithmetic,** not because of jokes written for
  them. The rogue who demolished his own guild for a bounty is the model. Nobody wrote
  that; the numbers did.
- **Readable at a glance, deep on inspection.** Same register as Ferret Bowling's
  front/back card: a sentence up front, the maths behind the eye.

## Objective (what the player is trying to do)

**Keep the god's office running until the end of the day, without the god finding out
anything went wrong,** using only offers, and your own two hands as the last resort.

Losing is allowed and should be funny. The day always ends, and the record of it is the
reward.

## Mechanics sketch (not a spec)

What exists in ideation and the teardown. Everything here is a candidate.

- **Tasks** appear on a board over the day: the god's needs (a prayer to answer, a miracle
  due at noon), office maintenance, and fires.
- **Posting a task** attaches a reward. It **can't be moved or withdrawn**, and a
  withdrawn reward is spent anyway. Rewards can be **raised, never lowered.**
- **Each staffer prices the task** through their own greed, their estimate of themselves,
  and their estimate of how hard the task is. Twelve people, twelve different readings of
  the same offer.
- **A priority ladder** under every staffer: react to a crisis, then check the board, then
  their own habits (coffee, gossip, hiding), and at the bottom, **wander.** Somebody idle by
  the kitchen means your offer wasn't good enough.
- **Two pockets** (lifted from Majesty's taxed vs untaxed gold): work people admit to and
  work they don't. What exactly this means in an office is open.
- **Do it yourself:** any task, at a time cost and a resentment cost that shows up later.
- **Parties form by proximity,** not by an interface: people who like each other end up on
  the same task.
- **Staff have appetites rather than stats,** and habits that decay, lifted from Ferret
  Bowling.
- **Generation + dice:** the twelve, their quirks and their lines are pre-generated
  records; the runtime only rolls against them. No AI in the running game.

## The staffer: people with things pulling on them

Proposed, not decided. Added 2026-09-16 after reading how SEREN builds its NPCs.

**Majesty gave each hero one price.** Greed against danger, and the answer falls out.
Memorable, but thin: nobody wants anything except gold.

**SEREN gives each character several pulls that disagree** (`want`, `voice`, `tell`, and
a `knows` list where every fact carries a visibility). Guz wants the sheep home, is loyal
to Noke, and has come to like the party. Who he is on a given day is whichever pull wins,
and the ones that lose still show: *the sentence he did not finish*. But in SEREN a model
decides all of that live, and nothing is enforced by code.

**This game takes both halves.** Majesty's arithmetic decides; SEREN's record explains. And
per the studio rule, the records are generated before play, and only dice and the ledger
run live.

### The record

```yaml
name:      Brenda Fairweather
role:      Accounts, third floor, eleven years
voice:     "Short sentences. Calls everyone 'love' except people she has decided about."
tell:      "Straightens the stapler before answering anything."

# The pulls. Each is a number the dice read, plus a line the player can eventually read.
want:      { weight: 3, line: "The corner desk by the window. Carol's desk." }
greed:     2          # how much a reward moves her, 0-5 (Majesty's greed)
nerve:     0.6        # how brave she thinks she is, against how hard she thinks it is
fear:      { weight: 4, line: "The basement. Nobody knows why." }
loyal_to:  { who: "the god", weight: 2, line: "Covered for him before anyone else did." }
grudge:    { who: "derek-pike", weight: 3, line: "He took credit for the Harrow ledger." }
habit:     { what: "long lunch", when: "12:30", weight: 2 }

# What is true about her, and how much of it the player has learned.
knows:
  - fact: "The basement fear is about a prayer she answered wrong in year two."
    visibility: true       # the world's truth; the player has not earned it
  - fact: "She won't take tasks Derek posts."
    visibility: suspected  # the player has a theory, from watching
  - fact: "She's just lazy after lunch."
    visibility: false      # what the player currently believes, wrongly
```

### How a decision reads the pulls

When a task is posted, every staffer scores it: the reward times their greed, minus the
danger as their nerve sees it, plus or minus each pull that the task touches (the place,
who posted it, who else is on it, what time it is). Highest score takes it; below a floor,
they wander. The same seeded dice as Ferret Bowling break close calls.

**The refusal is the strongest pull that said no.** It is written down as a fact, with a
visibility, the moment it happens. That is the readable-refusal goal made concrete: you
can always find out why Brenda turned it down, but at first you might only *suspect* it
was Derek, or wrongly believe she's lazy after lunch, until watching turns a suspicion
into something known.

### What persists

- **An interactions log per staffer, only ever added to.** What you asked, what they did,
  what they noticed. The office that remembers who quit.
- **Pulls drift.** A grudge fades if it's never fed, like Lucy's habits; a want that's
  granted is replaced by the next one.
- **Secrets are earned, not handed out.** A staffer gets a deeper secret only when play
  gives them one, the way SEREN creates a secrets file "only when one earns it".
- **Some staff have an `appears_when`.** The auditor, the god's mother, the rival
  department: people who arrive when a condition is met and escalate each time.

## DECIDE — Jay's boundaries

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | **What is a run?** | One day, survived and replayed · A continuing office that remembers who quit | **Continuing office**, one day at a time. The hoard proved persistence is the hook, and "remembers who quit" is the twelve-character version of it. |
| 2 | **Who are you?** | The god's PA · Middle manager · The last caretaker | **The PA.** Closest to the god, least authority, most to lose. |
| 3 | **What does an offer cost?** | Money · Favours · Pizza/perks · A mix | **One currency plus perks.** One number to price with, perks as the funny exceptions. |
| 4 | **Keep "can't move, can't withdraw"?** | Keep both · Keep one · Drop both | **Keep both.** The teardown says that's what makes an offer a decision. |
| 5 | **What does "do it yourself" cost?** | Time only · Time + resentment · Time + the god stirs | **Time + resentment.** Doing someone's job for them has social consequences. |
| 6 | **Can the god wake?** | Never · Yes, and that's the failure · Yes, and it's funny, not a failure | **Yes, and that's the day's worst ending**, never a game over. |
| 7 | **How long is a day?** | 3 min · 10 min · 20 min | **~10 minutes.** Long enough for twelve people to show who they are, short enough to replay. |
| 8 | **Fixed twelve or generated?** | The same twelve every time · Generated per office | **Generated per office, persistent within it.** Your Brenda is not my Brenda. |
| 9 | **How dark can it go?** | Cosy · Office-comedy bite · Genuinely bleak | **Office-comedy bite**, like Ferret Bowling's "adorable and weird, not chaos". |
| 10 | **Platform first?** | Desktop browser · Mobile first | **Desktop browser.** A board of twelve people needs room; mobile after. |
| 11 | **How many pulls per person?** | Majesty's price only · Price plus two pulls · Price plus a full record (want, fear, loyalty, grudge, habit) | **Full record, but only three pulls active on any one person.** Enough to disagree with themselves, few enough to learn. |

## Not in this game

Burned with the body, from the teardown: the fantasy setting, the RTS frame, guilds and
temples, a campaign, difficulty that demands control you were denied, a day that ends just
when the office gets interesting, and characters smoothed into competence.
