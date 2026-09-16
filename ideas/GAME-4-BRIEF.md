# Game #4 — brief

Filed 2026-09-16. **A brief, not a spec.** Goals, tone, objective, and a sketch of the
mechanics as they stand after ideation and the teardown. Nothing below is decided until
Jay's boundaries (method step 4) are in; open questions are marked **DECIDE** with a
recommendation, and the recommendation is only that.

Working title: **DEADLINE DUNGEON** (was THE SLEEPING GOD; still a working title).

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

## The staffer: a small field of competing forces

Proposed, not decided. Revised 2026-09-16 with the second red team.

### The experiment

Not *can we write twelve believable characters* (SEREN shows we can), and not *can we
simulate twelve agents* (that's mundane). The experiment is:

> **Can twelve simple, persistent, differently motivated systems produce enough
> consequential behaviour that the player starts believing there are twelve people in
> the room?**

That's harder than Lucy. Lucy is *ferret ↔ world*. The office is *person ↔ task*,
*person ↔ world*, *person ↔ person* and *person ↔ remembered history*, and every decision
changes the field for the next one.

The proof won't be a metric. It'll be a playtester saying: **"Fucking Brenda. I KNEW she
was going to make Martin do it."**

### Where this sits between Majesty and SEREN

- **Majesty builds the decision machinery first**, and the player invents the person from
  repeated behaviour. The same 1,000 gold looks enormous to a Rogue and trivial to a
  Paladin. Expressive, but thin: *the Rogue is pulled by money, the Gnome is pushed by
  danger.*
- **SEREN builds the rich person first**, and a model decides what they do live. That
  supports Ossa Rell's secrets, trigger and escalation ladder, because a model interprets
  it. **A deterministic office can't use that much.** Biography the arithmetic never reads
  is decoration.
- **Game #4 meets in the middle:** give the arithmetic just enough human-shaped structure
  to act on, let deterministic decisions pile up, and let the player build their own model
  of who each person is.

**SEREN needs full living humans. This game needs little goblins.** (Jay.) Small, legible,
persistent, and each one pulling in a few directions at once.

**Appetites, not stats.** `Bravery: 7` describes Brenda. *Wants to be home by five* **pulls**
Brenda. An appetite has a direction, and that's what makes it usable.

### The atoms

Six small kinds of thing. Every one has to cash out as a force on how a task looks to that
person; if it can't, it doesn't go in the record.

| Atom | What it is | How it cashes out |
|---|---|---|
| **appetite** | what attracts me | raises the value of tasks with that property (visible work, overtime pay, the god's own errands) |
| **aversion** | what repels me | raises the perceived cost of a category (miracles, the basement, anything after 4:30) |
| **want** | what I'm trying to make true | pulls toward tasks that move it and away from ones that block it; can be *today only* |
| **belief** | what I think is true (may be wrong) | changes how I price a person or a task, whether or not it's true |
| **relationship** | who changes my calculation | shifts the value of a task depending on who posted it and who else is on it |
| **habit** | what I do when nothing stronger wins | the default at the bottom of the ladder, instead of plain wandering |

Plus Majesty's two per-person numbers underneath everything: **greed** (how much a reward
moves them) and **nerve** (how they misjudge danger).

### Brenda, at 4:37

```yaml
name:   Brenda
voice:  "Short sentences. Calls everyone 'love' except people she has decided about."
tell:   "Checks the clock whenever someone says 'quick thing'."
greed:  2
nerve:  0.8

want:         { line: "Get home by five: her daughter's recital is tonight.", today: true, weight: 5 }
appetite:     { line: "Recognition.", on: "visible work", weight: 2 }
aversion:     { line: "Anything to do with miracles, after Tuesday.", on: "miracle", weight: 3 }
belief:       { line: "Martin got the promotion she was promised.", about: "martin", truth: false }
relationship: { with: "martin", weight: -3 }   # Martin on a task makes it worse
habit:        { what: "tidy the post room", when: "idle" }
```

A task arrives at 4:37: decent reward, easy, twenty minutes, Martin already on it.

- The reward, through her greed: **attractive.**
- The difficulty, through her nerve: **fine.**
- The recital, which only exists today: **a big pull out of the building.**
- Martin on it: **a push away**, powered by a belief that isn't even true.

**All of Brenda is pulling in different directions, and it lands on no.** Not
`greed × reward < difficulty`.

### What the player sees, and what the sim knows

The sim always holds the true reason. The player gets a surface, and builds the rest. The
eye shows the legible part:

```
Brenda declined.
  reward        attractive
  difficulty    acceptable
  time left     bad
  personal      −28
```

The `personal −28` is where SEREN's visibility idea earns its place. Each hidden reason is a
fact tagged `true` (the sim's), `suspected` (the player's theory), `known` (learned in play)
or `false` (the player believes something wrong). Over days:

- You notice she gets twitchy after 4:30. **Suspected:** Brenda hates late work.
- **That's wrong.** She doesn't care about late work. *Today* was the recital.
- Later she mentions the recital. The refusal becomes legible after the fact, and so does
  the pattern you misread.

**Inferring the wrong thing is a feature.** It's the player's model of a person being
incomplete, which is exactly what knowing a real colleague is like.

### Coupling: why twelve isn't twelve Lucys

- **People change each other's maths.** Alice taking a task changes whether Brenda wants it.
  Martin joining pushes Brenda off; for someone else he might be the reason to join.
- **History changes thresholds.** If you did Brenda's job yourself yesterday, resentment
  shifts today's numbers. The interactions log, only ever added to, is what the maths
  reads.
- **Wants move.** A want that's granted is replaced; a today-only want expires; a grudge
  fades if nothing feeds it, like Lucy's habits.
- **Parties aren't formed, they become likely.** People who pull toward each other end up
  on the same task without any party interface, as in Majesty.

### The guardrail we already paid for

Ferret Bowling's portrait said "proud" 77% of the time because one rule quietly won every
tie. Twelve interacting fields make that failure twelve times easier. **One cheap check
belongs in the build from day one:** across many simulated days, how often does each person
decline, and which force is doing it? If Brenda turns down 77% of everything and Martin is
the reason every time, that's not a character, it's a bug wearing a cardigan.

## LOCKED — Jay's answers, 2026-09-16

Decided in four rounds of multiple choice. Where these contradict anything earlier in this
brief (the sleeping god upstairs, "cannot be woken"), **these win.**

### Gargantua, rewritten

**Gargantua is a god who forgot how to be a god and ended up running a dreary IT company in
Arizona.** He is not asleep upstairs. He's in the building, and he's the boss.

- **His mood is pure Tamagotchi / BB-8.** It shows in his shape and his inner and border
  colours, not in meters. **How exactly is CD's call** — design in progress.
- **He can fail in two directions.** The middle manager is keeping him from **dying** and
  from **getting angry**. Healthy is the band between.
- **He fades from boredom and meaninglessness.** Same tickets, nothing that needs a god.
  An office that runs *too* smoothly is dangerous.
- **He gets angry from being disrespected.** His requests ignored, being told no.

### The shape of a run

| | Decision |
|---|---|
| **Run** | **A working week (Mon–Fri), then it resets.** |
| **You are** | **The middle manager.** |
| **Friday** | **Gargantua's review** by head office. |
| **Ending** | **A memo from head office**: a performance review in dreary corporate language. |
| **What carries over** | **The same twelve come back** with memories, grudges and who-quit intact · **past reviews stay on the wall** · **Gargantua carries his own history** (past reviews, confidence, how godly he feels). *Read from "two-4"; confirm.* |

### The work

- **Currency: one budget, plus perks.** A single number to price tasks, with funny exceptions
  (pizza, the good parking space, a day off).
- **Tasks come from four places:** IT tickets from clients · Gargantua's own requests · the
  office itself (the AC in July in Arizona, the fridge, a birthday card) · review prep that
  builds toward Friday.
- **Caring for Gargantua, all four ways:** post it as a task and hope a staffer takes it · do
  it yourself · shield him from news · give him godly work only he can do.

### The staff

- **They can quit mid-week. You can't hire.** You live with eleven until next week.
- **You learn why someone declined by asking them.** They answer, sometimes honestly and
  sometimes with a belief that's wrong. SEREN's `true / known / suspected / false`, delivered
  as conversation instead of a readout.
- **A declined Gargantua request is only disrespect if he finds out.** Which makes shielding
  him from news a real system: cover-ups work until they don't.

### Doing it yourself

**Costs your time, and resentment. Costs no budget.** This is the teardown's escape hatch
(*"you can always complete the task, at a cost, at midnight, while resentment accrues
somewhere"*).

**Proposed, awaiting Jay:** keep *midnight* as both name and joke, with two ways to pay —
do it **during the day** and the office drifts while you're heads-down (nobody posts,
nobody shields Gargantua); do it **at midnight** and nothing drifts today, but you start
tomorrow tired. Resentment accrues either way.

### Still open

- The midnight version above.
- Decisions 1–11 below that the rounds didn't cover directly: how dark (9), platform (10),
  how much goes in a person (11), and whether offers can be withdrawn (4).
- Budget: does it refill daily, weekly, or only from finished tickets?
- What disrespect and boredom actually are, as events, and how far each moves him.
- What the head-office memo is built from.

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
| 11 | **How much goes in a person?** | Majesty's two numbers only · Numbers plus the six atoms · A full SEREN-style biography | **Numbers plus the six atoms, about three active at once.** Enough to disagree with themselves; nothing the arithmetic can't read. |

## Not in this game

Burned with the body, from the teardown: the fantasy setting, the RTS frame, guilds and
temples, a campaign, difficulty that demands control you were denied, a day that ends just
when the office gets interesting, and characters smoothed into competence.
