# Deadline Dungeon: A God Who Forgot — PRD / TRD

Version 0.1, 16 September 2026. **Nothing is being built yet.** Part I is what the game is;
Part II is how it would be built, reusing the studio library first.

Sources, in order of authority: Jay's answers (seven rounds of multiple choice, 16 Sep),
CD's turn-1 design work (not the bible), [the game #4 brief](../ideas/GAME-4-BRIEF.md),
[The Bounty File](../teardowns/majesty/REPORT.html). Where they disagree, this document
records what Jay decided.

# Part I — Product (PRD)

## P1. The game in one paragraph

Gargantua is a god who forgot he was a god and opened a managed IT services company in
Tempe, Arizona. He dozes on floor 5. You are the middle manager on floor 1, and twelve
people work downstairs who don't work for you in any sense you can enforce. **You cannot
give an order. You can only make an offer, and an offer can be declined.** Keep the
tickets moving, keep him from fading away or waking up furious, and survive to Friday's
review by head office.

## P2. Graveyard

- **Tombstone:** Majesty (2000). The organ: a priced offer, pledged, that anyone may refuse.
- **Markers:** Dungeon Keeper · Very Small Kingdom · Deadline Dungeon · Gargantua.

## P3. What it has to prove

> **Can twelve simple, persistent, differently motivated systems produce enough
> consequential behaviour that the player believes there are twelve people in the room?**

The playtest success line: *"Fucking Brenda. I KNEW she was going to make Martin do it."*

## P4. Pillars

1. **An offer, never an order.** Offers can be raised, never withdrawn.
2. **Little goblins, not biographies.** People are small fields of competing forces, not
   written lives.
3. **Every no has a reason**, which you can ask about, and might misread.
4. **Two ways to lose the god.** Fading is slow and quiet; anger is fast and loud. Watching
   for one loses him to the other.
5. **Bleak, played deadpan.** A god is dying of meaninglessness in a strip-mall IT firm, and
   everyone treats it as a Tuesday.
6. **The story is the payoff.** The week ends in a memo, not a score screen.

## P5. Structure

| | |
|---|---|
| **A run** | One working week, Monday–Friday |
| **A day** | About **6 real minutes** (a week is about 30) |
| **You** | The middle manager, based on floor 1 |
| **Friday** | Gargantua's review by head office |
| **The ending** | A **memo from head office**: a performance review in dreary corporate language |
| **Early ending** | The week ends at once if he reaches **either extreme**: critical fade, or full fury |
| **Platform** | Desktop browser first, layout built to stack for mobile later |

### What carries over between weeks

- **Gargantua keeps his history:** past reviews, his confidence, how godly he feels.
- **Past review memos stay on the wall.**
- **Some staff return and some turn over.** Whoever quit is gone; new people arrive.
- **Budget:** next week's base is set from the review (see §P8).
- Tasks and the week's mood reset.

## P6. Gargantua

**He is a standing stone with light in its seams.** No face. The only colour in the game
is his: the office is six warm greys, and gold belongs to him alone. No button, warning or
highlight may use it.

### Mood

One scale with a healthy band in the middle and a failure at each end. CD's seven readings
are the visual reference: critical · fading · idle · **content (target)** · pleased ·
irritated · furious. Exact visual encoding for the stone (lean, where the light sits, what
the seams do) is CD's.

- **He fades from boredom and meaninglessness.** The same tickets, nothing that needs a god.
  An office running *too* smoothly is dangerous.
- **He angers from being disrespected.** His requests ignored or refused.
- **A declined request of his is only disrespect if he finds out.**

### Dozing

He is mostly asleep, and **surfaces when something reaches him:** news, noise, a declined
request coming to light. While surfaced he can make requests and notice things.

### Seeing him: the glow and the elevator

- On floor 1, **a glow along the top of the browser** shows his mood colour at all times.
- **Clicking the glow rides the elevator up to floor 5.**
- On floor 5, **a grey glow along the bottom** takes you back down.
- While you're on 5, floor 1 runs without you: nobody posts, nobody shields him.

### On floor 5 you can

- **Sit with him.** Always helps a little; costs your time.
- **Hear his requests** before they reach the board.
- **Choose what he hears.** Good news, bad news, what gets buried.
- **Give him godly work**: something only he can do. Strongest medicine for fading, and
  subject to the djinn (§P9).

## P7. The staff

Twelve per week, drawn at the start of each week (with some returning; §5).

### A person is built from atoms

Majesty's per-person numbers underneath:

- **greed** — how much a reward moves them
- **nerve** — how they misjudge danger

On top, six kinds of atom, **each of which must push the maths** or it isn't in:

| Atom | What it is | Cashes out as |
|---|---|---|
| appetite | what attracts me | raises the value of tasks with that property |
| aversion | what repels me | raises the perceived cost of a category |
| want | what I'm trying to make true (can be today-only) | pull toward tasks that move it, away from ones that block it |
| belief | what I think is true (may be false) | changes how I price a person or task |
| relationship | who changes my calculation | shifts value by who posted it and who's on it |
| habit | what I do when nothing stronger wins | the default at the bottom of the ladder |

Plus a **voice** and a **tell** for presentation. About three atoms are active on a person
at once. Staff appear as **ID badges** (CD's 1c): badge typography, photo pending.

### Deciding

Every staffer scores every open offer: reward through greed, danger through nerve, plus or
minus each atom the task touches (what it is, where, who posted it, who else is on it, the
time of day). Highest score takes it; below a floor they fall to their habit. Close calls
are broken by seeded dice. **A refusal is the strongest force that said no**, recorded as a
fact at the moment it happens.

### Asking why

You can ask someone why they declined. **It costs time, and it changes them**: being asked
is itself a pull, warming some and putting others on the defensive. Their answer is either
the true reason or a belief that is wrong. Each hidden reason carries a visibility: `true`
(the sim's), `suspected`, `known`, `false` (the player believes something wrong).

### Quitting

**Sudden and final.** No warning beyond what a watchful manager might infer. You can't hire
mid-week; you live with eleven.

## P8. Work and money

### Where tasks come from

- **IT tickets from clients** — the dreary stream. Completing them earns income.
- **Gargantua's requests** — declining them risks disrespect.
- **The office itself** — the AC in July, the fridge, a birthday card.
- **Review prep** — builds toward Friday.

### Offers

- Posting an offer pledges budget to it.
- **It can be raised. It can never be withdrawn.**

### Budget

**A weekly base from head office, set by last week's review, plus income from finished
client tickets.** One number to spend.

### Perks

- **Priced from the budget, but they land differently per person** (pizza is worth a lot to
  Keith and nothing to Deborah).
- **Every perk has a side effect** (a day off removes someone from the board; pizza makes
  noise near the god).
- **Perks are subject to the djinn** (§P9).

### Doing it yourself

Always possible. **Costs your time and causes resentment; costs no budget.** Two ways to pay:

- **By day:** you're heads-down and floor 1 drifts.
- **At midnight:** nothing drifts today, and you start tomorrow tired.

## P9. The djinn

**Perks and godly work land as intended about 80% of the time.** When they don't, the twist
is rolled: taken **literally**, given to **the wrong person**, or landing with a **bigger
side effect**. Posting, raising, asking and doing it yourself are exact.

## P10. Endings

- **Friday:** the review, delivered as the head-office memo. It sets next week's base budget
  and goes on the wall.
- **Early:** critical fade or full fury ends the week at once with its own memo, and opens
  **the eye**: a post-mortem showing what moved his mood and when, every decline's real
  forces, and every djinn roll. **The eye appears only after an early ending.**

## P11. Look and voice

- **Identity:** CD's building directory (1b) is the mark; the favicon is the numeral **5**.
  Badges (1c) are how people arrive. Safety notices (1a) are the in-world signage.
- **Type:** IBM Plex Sans for the company and the people, Spectral for the god, Plex Mono for
  the building's machinery.
- **Voice:** the building states impossible things in the register of a fire exit sign and
  never winks. No exclamation marks.
- **The dungeon is structural,** never decorative: floors, a locked stairwell, a boss on
  five, a basement marked DO NOT. **Only floors 1 and 5 are places you go.**

## P12. Accounts

Your office is saved on our server and follows you by **email magic link**. See §T7.

## P13. First playable target

**A whole week, rough:** all five days and the memo, thin content, placeholder art. It
proves the arc and the reset, not the polish.

## P14. Cremated — not in this game

The fantasy setting, the RTS frame, guilds and temples, a campaign, difficulty that demands
control you were denied, a week that ends just as the office gets interesting, characters
smoothed into competence, unexplained refusals, and a single safe strategy.

## P15. Settled — round 8 (17 Sep 2026)

The eight open questions, answered. Numbers are starting values to tune, not laws.

### Gargantua's mood: small drips, rare shocks

Scale runs −100 (dead) to 0 (content) to +100 (furious); either end ends the week.

| Event | Move |
|---|---|
| Boredom drift, when nothing godly or novel has reached him | **−1 per sim minute** |
| A refusal of his that **he finds out about** | **+15**, toward fury |
| Sitting with him | **10** toward content, from whichever side |
| Godly work, landed | **25** toward content, from whichever side |

Direction matters: boredom pushes him **down** toward fading, disrespect pushes him **up**
toward fury, and care pulls from whichever side he is on back toward 0. **It should take a
bad week to lose him, not one bad moment.**

### The workload is his mood

Task volume is driven by how he is. **Bored god → fewer tasks and a drifting office.
Angry god → urgent, noisy work.**

⚠️ **Guard rail:** that loop can spiral — bored means quiet means more bored. There is a
**floor on task supply** (clients keep calling whatever mood he is in), and the office's
own problems (the AC, the fridge) arrive on their own schedule. A dead day must still give
the player something to post.

### Floor 5 costs, out of a ~360-second day

| Action | Cost |
|---|---|
| The elevator ride | **free** |
| Sitting with him | **~45s** (about 12% of the day — a real sacrifice) |
| Choosing what he hears | **~15s** |
| Handing him godly work | **~30s** |

While you are up there, floor 1 runs without you.

### Godly work: old-god work

**Actual divine acts, absurd in an office.** A small weather event over the car park. A
prophecy about Q3. The parking barrier that judges. **Played completely deadpan** — the
staff file the paperwork, nobody says the word "god", and the ticket system logs it as
resolved.

This is the strongest medicine for fading, and it is subject to the djinn (§P9).

### The perk menu: six, plus two weird ones

Priced from the budget, landing differently per person, each with a side effect.

| Perk | Side effect |
|---|---|
| Pizza | Noise near him |
| Early finish | They are gone when the late fire lands |
| A day off | Removes them from tomorrow's board |
| The good parking space | Whoever had it notices |
| Public credit | Costs you with whoever did the work and did not get it |
| "I owe you one" | A debt the staffer can call in, at their timing |
| **The good chair** | Pettiness, escalating, from three other people |
| **Your name on the org chart** | He may notice the chart changed |

### The memo: a letter about Gargantua, not you

Head office reviews **him**. You appear only in the gaps — what he has been like this week,
what they have heard, whether the office looks like it runs. **Assembled from the ledger**
and written offline in corporate voice: no AI while playing.

It is colder and funnier than a report card, and worst when it is kind about him after a
week you know was a disaster.

### Turnover: 8–9 return

Most faces are familiar on Monday, two or three are new, **anyone who quit is gone for
good**, and Gargantua carries his own history.

### The eye: unchanged

**Only after a week ends early.** Normal weeks stay mysterious; asking people is how you
learn them.

## P16. Settled — round 9 (2026-09-19)

Starting values, to tune in play.

### Budget: the tickets are the economy

| | |
|---|---|
| Weekly base from head office | **50** |
| A finished client ticket pays | **15** |
| A typical offer | 15–30 |
| A perk | 20–60 |

Head office gives you almost nothing. **You earn the week by keeping the dreary stream
moving**, which is the trap: every minute spent on the god or on people is a minute not
spent on the thing that pays for pizza. The review still sets the base, so a good Friday
buys a slightly less desperate Monday.

⚠️ Watch in playtest: with the task-supply floor (§P15) this should never reach zero
income, but a bored-god week plus a quiet client week could starve the player of choices.
If it does, raise the floor before raising the base.

### Quitting: per person

**Base threshold 100, moved up or down by the person's atoms** — thin-skinned people walk
at ~70, the unflappable at ~140. Resentment **forgets 10 a day**. A slight is worth
roughly 15–30. Reading who is close is the skill; the threshold itself is never shown.

### Atom tables: 60 per kind

Six kinds × 60 = **~360 atoms**, about three active on a person. A face rarely repeats
inside a month of weeks. Generated offline; grown later where playtests show repeats.

### The subtitle

*A Sleeping God* stays where it is written (CD's files, older docs) until launch copy.
The current subtitle is *A God Who Forgot*.

---

# Part II — Technical (TRD)

## T1. Principles

- **Deterministic sim, no DOM.** Same seed and same player actions produce the same week,
  on any machine. (Library: Orbis, Ferret Bowling.)
- **No AI at runtime.** Text and people are assembled from atom tables generated offline.
  AI in production, dice in deployment.
- **The ledger is truth.** Every decision, refusal, mood change and djinn roll is an
  append-only event. The memo, the eye and "asking why" all read the ledger; none of them
  invent.
- **The server stores; the client simulates.** No inference, no per-turn cost.

## T2. Stack

| Layer | Choice | Lifted from |
|---|---|---|
| Client | Vite + TypeScript, Bun workspace `games/deadline-dungeon` | Ferret Bowling |
| Sim | Pure TS module, seeded RNG streams | `games/lucy-proto/src/rng.ts` (mulberry32) |
| Server | Python stdlib `ThreadingHTTPServer`, JSON on disk, systemd | `elsewhere/web/server.py` |
| Auth | Email magic link via SES, HMAC-signed HttpOnly cookie | `elsewhere/web/gate.py`, `services/contact.py` |
| Hosting | `deadlinedungeon.unstuck-games.com` on the existing EC2 box | `infra/` |

## T3. Time

- A day is **360 real seconds** covering a sim workday, 09:00–17:00 (8 sim hours), so one
  sim minute ≈ 0.75 real seconds. **Tuning value.**
- Floor 5 actions cost sim time: sitting ~45s, choosing his news ~15s, godly work ~30s of
  real time equivalent (§P15). The elevator itself is free.
- The sim advances in fixed **ticks** (proposed: 1 tick = 1 sim minute, 480 per day).
  Rendering interpolates; the sim never reads wall time.
- **Midnight** is a between-days phase, not ticks: doing it yourself at midnight resolves
  instantly and applies a `tired` modifier to the next day.
- Pausing: the sim pauses when the tab is hidden (the day is short; a background tab
  shouldn't lose it).

## T4. RNG streams

Independent streams per week, `hash(seed, week, name)`, so adding a system never changes an
existing one's rolls (the Ferret Bowling voice lesson):

| Stream | Used for |
|---|---|
| `roster` | Drawing the week's staff from atoms |
| `tasks` | Task arrival and properties |
| `staff` | Tie-breaks in decisions |
| `god` | Surfacing, mood noise |
| `djinn` | Whether a perk or godly work twists, and how |
| `text` | Picking phrasing variants |

## T5. Data model

Types below are proposals, TypeScript-flavoured.

### Staff

```ts
type AtomKind = "appetite" | "aversion" | "want" | "belief" | "relationship" | "habit";

type Atom = {
  kind: AtomKind;
  id: string;                 // from the atom table
  line: string;               // what they'd say if asked honestly
  weight: number;             // strength of the pull
  on?: TaskTag[];             // appetite/aversion/want: which task properties it reads
  about?: StaffId | "god";    // belief/relationship target
  truth?: boolean;            // belief: whether it is actually true
  today?: boolean;            // want: expires at end of day
};

type Staff = {
  id: StaffId; name: string; role: string; badgeNo: string;
  voice: string; tell: string;
  greed: number;              // 0..5
  nerve: number;              // ~0.3..2.0, Majesty's self/enemy estimate folded into one
  atoms: Atom[];              // ~3 active
  mood: { warmth: number; resentment: number };  // toward you
  status: "here" | "quit" | "off";
  returnedFromWeek?: number;
};
```

### Tasks, offers, perks

```ts
type TaskSource = "ticket" | "god_request" | "office" | "review_prep";

type Task = {
  id: TaskId; source: TaskSource; title: string;
  tags: TaskTag[];            // e.g. "visible", "late", "server_room", "miracle", "client_angry"
  difficulty: number; minutes: number;
  arrivesAt: Tick; dueAt?: Tick;
  income?: number;            // tickets only
  godly?: boolean;            // only Gargantua can do it
};

type Offer = {
  taskId: TaskId; pledged: number;   // can only increase
  perks: PerkId[]; postedAt: Tick; raises: Tick[];
  takenBy?: StaffId;
};

type Perk = {
  id: PerkId; name: string; price: number;
  valueTo: Partial<Record<AtomId, number>>;   // lands differently per person via atoms
  sideEffect: Effect;
};
```

### Gargantua

```ts
type God = {
  mood: number;               // -100 (dead) .. 0 (content) .. +100 (furious)
  awake: boolean;             // surfaced or dozing
  heard: NewsId[];            // what has reached him
  history: { weeks: number; reviews: ReviewId[]; confidence: number; godliness: number };
};
```

The PRD's seven readings map to bands of `mood`. CD owns how the stone renders each band.

### The ledger

```ts
type LedgerEvent =
  | { t: Tick; type: "offer_posted" | "offer_raised"; taskId; amount }
  | { t: Tick; type: "considered"; staffId; taskId; score; forces: Force[] }
  | { t: Tick; type: "declined"; staffId; taskId; reason: Force; visibility: Visibility }
  | { t: Tick; type: "taken" | "completed"; staffId; taskId }
  | { t: Tick; type: "asked"; staffId; answered: "true" | "belief"; warmthDelta }
  | { t: Tick; type: "quit"; staffId; strongest: Force }
  | { t: Tick; type: "god_mood"; delta; cause }
  | { t: Tick; type: "god_surfaced" | "god_dozed"; cause }
  | { t: Tick; type: "news_told"; newsId; buried: boolean }
  | { t: Tick; type: "djinn"; target: PerkId | TaskId; twisted: boolean; kind?: "literal" | "wrong_person" | "side_effect" }
  | { t: Tick; type: "diy"; taskId; when: "day" | "midnight" }
  | { t: Tick; type: "floor"; to: 1 | 5 };

type Force = { atomId?: string; kind: "reward" | "danger" | AtomKind | "resentment" | "tired"; value: number };
type Visibility = "true" | "suspected" | "known" | "false";
```

## T6. Core algorithms

### Staff decision (per tick, per open offer)

```
score = pledged × greedFactor(greed)
      − difficulty × dangerFactor(nerve)
      + Σ atom.weight × match(atom, task, context)
      + perkValue(perks, atoms)
      − resentment + warmth×k
```

- `context` includes: who posted it, who else is on it, time of day, tired, whether the god
  is awake.
- Highest score above a floor takes the task; ties broken by the `staff` stream.
- On a decline, the **most negative force** is recorded as the reason, with visibility
  `true`. Asking later can move it to `known`, or reveal a `false` belief instead.
- Coupling: taking a task changes `context` for everyone else on the next tick.

### Gargantua's mood

- **Boredom drift:** −1 per sim minute when nothing godly or novel has reached him, stronger
  the smoother and more repetitive the office is. Pushes toward −100 (fading).
- **Task supply reads `god.mood`** (bored → fewer, angry → noisier), with a **floor** so a
  quiet day still offers work. Without the floor the boredom loop is self-reinforcing.
- **Disrespect:** +15 when he *learns* a request of his was declined or ignored; pushes
  toward +100 (fury). Burying news defers it; discovered cover-ups add extra.
- **Care:** sitting with him +10, godly work +25, both pulling toward 0 from either side.
- **Surfacing:** triggered by events that reach him (news told, noise from perks, a
  discovered decline), rolled on the `god` stream.
- **Early end:** `mood ≤ −100` or `mood ≥ +100` ends the week.

### Djinn

For each perk use or godly work: roll `djinn`. At ≈80% it lands as intended. Otherwise roll
the twist kind (literal / wrong person / bigger side effect) and apply it. Always logged.

### Turnover

At week end, for each staffer: whether they return depends on resentment, warmth and
whether they quit. Quitters never return. New staff are drawn from atoms to refill twelve.

## T7. Server and accounts

- **Service:** `deadline-dungeon.service` on the box, port 8780, behind nginx at
  `deadlinedungeon.unstuck-games.com`. Needs a DNS name added to the certificate (wildcard DNS
  already resolves).
- **Magic link:** `POST /api/login {email}` → store a single-use token (15 min) → send via SES
  from `hello@unstuck-games.com` (the instance role already allows `ses:SendEmail`) →
  `GET /login?token=` sets an HMAC-signed HttpOnly cookie (30 days). Rate-limited per IP and
  per email, reusing the contact service's limiter.
- **Saves:** `GET /api/office`, `PUT /api/office`. A save is **seed + action log + last
  snapshot**, not rendered state; the client replays for integrity. Stored as one JSON file
  per account under `/srv/deadline-dungeon/`, written atomically.
- **Privacy:** store the email address and the save, nothing else. A delete-my-office action
  removes both. Add to PRE-ADS.md's register when built.
- **Offline:** the client keeps a local copy and syncs when it can, so a flaky connection
  never loses a day.

## T8. Content pipeline

- **Atom tables** (`content/atoms/*.json`): names, roles, voices, tells, and atoms of each
  kind with lines, weights and task-tag hooks. Generated offline, reviewed by Jay, validated
  by schema.
- **Task tables:** ticket subjects, god requests, office problems, review prep, with tags.
- **Text tables:** phrasing for answers to "why", quit notices, memo sentences, keyed to
  ledger events.
- **Memo:** assembled from the week's ledger by rules (biggest mood swings, who quit, what he
  heard, what twisted) and filled from text tables. Never free-generated at runtime.
- Tables ship as static JSON with the client build.

## T9. Presentation

- **Floor 1:** the offer board, badges, the top glow.
- **Floor 5:** the stone, his requests, news choice, godly work, the bottom glow.
- **Colour rule enforced in tokens:** the office palette has no hue; `--god-*` tokens are the
  only saturated values, driven by `mood`. A lint check fails any other use of the gold.
- **Mobile-ready:** layouts built as stackable columns from the start; mobile styling is a
  later pass, not a rebuild.

## T10. Testing

- **Invariants** (must pass): every week ends (Friday or early), no negative budget, offers
  never decrease, ledger replay reproduces the snapshot exactly, every decline has a reason.
- **One distribution check from day one:** across many simulated weeks, per staffer, how
  often they decline and which force does it; how often the god ends a week early and from
  which side; djinn twist rate. Run it when the sim's behaviour changes, not on every edit.
- Keep runs small by default; they report, they don't gate.

## T11. Open technical questions

1. Tick size and day pacing, pending §P15.6.
2. Whether the server should re-run the sim to validate saves, or trust the client (single
   player; trusting is fine until there's a reason not to).
3. Save conflicts when the same account plays in two tabs: last-write-wins with a warning,
   or a lock.
4. ~~Atom table size~~ — settled: 60 per kind (§P16).
5. Whether magic-link email needs its own SES domain verification and DKIM before sending
   to strangers (sending to verified addresses works today).
