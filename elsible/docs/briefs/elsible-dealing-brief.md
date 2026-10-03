<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. Published for review only; no licence granted. See LICENSE.txt -->

# Elsible — the dealing system

> **⚠ The cards in this brief are superseded.** Deck v4 (3 Oct, afternoon) is normal life first, with the
> researched tropes face up and dealt first: [`elsible-cards.md`](elsible-cards.md) is the card data. The deal
> mechanics below still hold, plus one new slot: **The story** (the trope), picked first.

**For Claude Design, 3 Oct 2026.** A **system** brief: how the deal works, how it differs from
Seren's Loom, and every card. **Nothing here is design.** The card tables below are generated from
`decks/story/deck.json` (v3) and `decks/story/packs/business.json`, so they match what
the prototype deals. Companion: [`elsible-system-brief.md`](elsible-system-brief.md).

---

## 1 · The reference: Seren's Loom

seren.unstuck-games.com/loom. What it does, and what Elsible keeps:

- **"I deal five, you take one. Seven times."** Seven categories: trope (12),
  origin (10), world (11), trouble (11),
  antagonist posture (10), companions (12, pick two),
  told by (12). Five dials.
- **"Then I play one card back — your antagonist — and if you don't like it, make me play
  another."** Seren's one counter-card is the tension beat of the deal.
- **Never locked:** *Deal them again* (this slot), *I don't like any of these. New hand.*, and
  **Play it out for me**: one click, a whole hand, a story sentence appears.
- **The hand writes itself as a sentence** while you pick: *"An impostor who was pretending until
  it mattered, made for a purpose, in the ash plain, facing a heist, with the fence and a scribe in
  tow, against somebody who believes in you — told by the Old Soldier."*
- **Tune** (five dials that never pick a card), then **Build**: the weaver writes, the auditor reads
  it and may send it back, it is dealt out as yours. *"Seren has not read your hand — only the
  campaign it became."*

**Why it works (Jay):** the dealing is interesting because you never know what will be presented,
and you are never locked in. The weave is the magic: it turns very real, random options into a
story, and the auditor resolves conflicts so truly random things make sense and are true.

## 2 · Elsible's deal

| | |
|---|---|
| cards per slot | **5** (the Circle: five dealt, pick two) |
| slots the player picks | **Who You Are**, **Where**, **The Other**, **The Circle**, **Told By**, **The Burn** (the last is optional) |
| the dealer plays | **And now**: a complication, once the life is set · *make her play another* (repeatable; refused cards are remembered) |
| never dealt | the undercurrent and the secret: **the weave's reference material** (§5) |
| controls | deal them again (this slot) · new hand · **play it out for me** · pick a slot to change it · add a pack |
| dials | Absurdity, Stakes, Cost, Crowd, Length — shape the weave, never pick a card |
| then | **weave my life** → weaver, auditor, dealt out → the reveal |

**The hand as a sentence** (the prototype's template; wording is yours):

> *[Who you are] in [where], with [the Other] at the centre, [circle] and [circle] around you;
> [the burn]; and now [the dealer's complication] — told by [the voice].*

Unfilled slots read as placeholders: *someone · somewhere · someone at the centre · nobody yet
around you · and then... · a voice not yet chosen*.

**Leanings ("pulls").** Some cards lean toward others: *the one who stayed* pulls *the small town*
and *the old friend*. The dealer's complication leans toward what your hand makes likely. A pull
raises the odds, never decides.

## 3 · What changed from the Loom, and why

| the Loom | Elsible | why |
|---|---|---|
| trope (the spine, picked) | **gone from the deal.** The weave decides what is moving underneath | a story you picked is not a life you were dealt; the turn has to be found in play |
| origin (backstory) | **Who you are**: a life already in motion | Rina's six-week roleplay worked because she had a job and a life the story grew inside |
| world ("who can arrest you?") | **Where**: the social rules, who is watching | relationships need a room; the rules of the room are the pressure |
| trouble (picked) | **And now: the dealer plays it** | the complication is the tension beat, so the dealer owns it |
| antagonist posture (the dealer plays it) | **The Other** (picked): who is at the centre, how they treat you | not always a villain; love, rival, mark. Always fictional |
| companions | **The circle**: people with history between you | a confidant, a rival, a sibling, the whole room |
| told by | **Told by**: the same twelve voices | the narrator's voice transfers unchanged |
| — | **The burn** (optional): how it burns | readers stack tropes; one modifier, not a combinatorial deck |
| antagonist and fronts written by the weaver | **the hidden half**: undercurrent, secret, what happens if nobody intervenes, signals | same principle as the Loom: the weave owns what is underneath |
| deck: fantasy adventure | deck: generic core + packs | romance, thriller, horror, business ride on top; the core does not try to cover every path |

## 4 · The cards (core deck v3: 79 to deal, 21 reference)

"In play" is what the card changes once the story is running. Every card is a starter to
play-test, not canon.

### Who you are (13) · *Who are you here?*
| id | card | line | in play |
|---|---|---|---|
| `stayed` | **The one who stayed** | Everyone else left. You kept the lights on | You know every story here, and you are in most of them |
| `returner` | **The one who came back** | You left. Now you are here again | Everyone remembers a version of you · old debts are live |
| `arrival` | **The new arrival** | You just got here, and everyone already has a version of you | You learn names before you learn loyalties · first impressions stick |
| `heir` | **The heir** | It is yours, and you did not want it | Every choice is also about the family · the past is in the furniture |
| `second` | **The second child** | Not the heir. Never the heir | You notice what the favourite misses · nobody expects much of you |
| `understudy` | **The understudy** | You learned someone else's life by heart, and tonight it is yours | You know the lines; you don't know the people |
| `keeper` | **The keeper of confidences** | People tell you things. You have never told anyone | Every confidence is leverage you swore not to use |
| `runaway` | **The runaway** | You left something unfinished and a name behind | Someone is still looking · you answer to a borrowed name |
| `wokeup` | **The one who woke up elsewhere** | You opened your eyes in someone else's life | Everyone expects you to know them · some memories are not yours |
| `caretaker` | **The caretaker** | Someone depends on you completely | Your time is never yours · leaving is not simple |
| `gift` | **The one with the gift** | You can do something nobody else here can | It is wanted, and so are you |
| `ruined` | **The ruined name** | You were someone once. The papers said otherwise | People recognise you before they know you |
| `fixer` | **The fixer** | People call you when it has already gone wrong | You arrive mid-crisis · you know where the bodies are |

### Where (12) · *Where is this life?*
| id | card | line | in play |
|---|---|---|---|
| `town` | **The small town** | You cannot buy milk without being asked about it | No anonymity · gossip moves faster than you |
| `estate` | **The great house** | A family, its house, and everyone who serves it | Upstairs and downstairs never quite meet · every door is someone's |
| `court` | **The court** | Who stands near the chair is the whole game | Seating is a statement · favour can be withdrawn by noon |
| `festival` | **The festival** | Ten days, a thousand strangers, nobody's real name | Masks are normal · nothing here is supposed to follow you home |
| `ship` | **The crossing** | Weeks at sea, and nowhere else to go | Everyone you meet today, you will meet again tomorrow |
| `city` | **The city at night** | A city that never asks your name | Anonymity cuts both ways · help and harm are one street apart |
| `academy` | **The academy** | Old rules, older rivalries, and a ranking on the wall | Everyone is ranked, and everyone watches the ranking |
| `otherworld` | **The other world** | A world that is not yours, that seems to know you | Nothing works the way you expect · some things work better |
| `frontier` | **The frontier town** | Help is days away, always | People are who they say they are, until they are not |
| `island` | **The island** | Small, beautiful, and everyone came here for a reason | The ferry runs twice a week · there is no leaving tonight |
| `after` | **After the war** | Everyone present did something in it | The past is everywhere and nobody says it |
| `hotel` | **The grand hotel** | Everyone is passing through. Some for years | Staff see everything · guests forget that |

### The Other (12) · *Who is at the centre?* — always fictional
| id | card | line | in play |
|---|---|---|---|
| `doesntknow` | **The one who does not know** | They have no idea what you are to them | Deflects praise · every disclosure is unprompted |
| `tests` | **The one who tests you** | “Show me who you are” | The bond moves only on honest answers |
| `leverage` | **The one with the leverage** | They know your secret | They start ahead of you in tension |
| `decided` | **The one who already decided** | Sure about you, one way or the other | Changing their mind takes a locked beat |
| `believer` | **The one who believes in you** | “You will come round. I can wait” | Patience is their pressure |
| `left` | **The one who left** | They had a reason, and never said it | The bond starts low and the wound is a fact |
| `power` | **The one with power over you** | Your fate is partly in their hands | Every kindness is also a move |
| `samething` | **The one who wants the same thing** | Only one of you gets it | Helping them costs you · the scoreboard is shared |
| `saved` | **The one who saved your life** | You owe them, and they have never asked | Gratitude and suspicion feel the same |
| `warned` | **The one everyone warned you about** | Their reputation arrives first | Every kindness looks like a trick |
| `needs` | **The one who needs you** | They cannot do this alone, and they hate that | Helping them costs you something each time |
| `remembers` | **The one who remembers you differently** | They knew you before, and you don't remember it | Every memory they share is a test you might fail |

### The circle (12, pick two) · *Who is around you?*
| id | card | line | in play |
|---|---|---|---|
| `saw` | **The friend who saw it first** | Called it, months ago | Their warning comes true once |
| `rival` | **The rival** | Wants the same person | Their bond rises when yours stalls |
| `room` | **The whole room** | Everyone is watching | Reputation as a public bond |
| `rule` | **The one with the rule** | “Two unanswered messages, then stop” | A rule you will break, and the circle notices |
| `committee` | **The committee in your head** | Your moods, all voting | They argue out loud · one may act on impulse |
| `confidant` | **The confidant** | Someone you tell everything, drafts included | Draft with them, send to the Other · they keep the facts straight |
| `vouched` | **The one who vouched for you** | You are here because they said so | Whatever you do lands on their name too |
| `ex` | **The ex** | Still around, still kind, still a problem | A history the Other will hear about |
| `child` | **The child** | Small, honest, and always listening | Says the true thing in front of everyone |
| `oldfriend` | **The old friend** | Knew you before all this | Remembers who you were, and says so |
| `animal` | **The animal** | It follows you everywhere | It knows before people do · it cannot tell you |
| `sibling` | **The sibling** | Shares your history and your blame | Takes your side, until they don't |

### Told by (12) · *Who is telling it?* — shared with Seren
| id | card | line | in play |
|---|---|---|---|
| `registrar` | **The Registrar** | a clerk reading out a form | Short sentences, nouns, no adverbs · never raises its voice |
| `chronicler` | **The Chronicler** | somebody writing it down after | Past tense, the long view, names dates · never hurries |
| `publican` | **The Publican** | the person behind the bar who saw it | Gossip first, geography second · never keeps a confidence |
| `coroner` | **The Coroner** | cause, then effect, then the body | Clinical detail, no flinching · never comments on the morality |
| `fabulist` | **The Fabulist** | a tall story that happens to be true | Exaggerated scale, then a flat correction · never admits what it made up |
| `preacher` | **The Preacher** | a sermon with you in it | Cadence, repetition, second person · never lets a sin pass unnamed |
| `archivist` | **The Archivist** | with footnotes you did not ask for | Cross-references its own facts · never guesses |
| `gambler` | **The Gambler** | in odds and tells | Names what is at stake before each scene · never says a thing is certain |
| `qm` | **The Quartermaster** | in inventory | Counts everything, values everything · never describes weather |
| `child` | **The Child** | plainly, and misses the point beautifully | Short, literal, unafraid · never explains a metaphor |
| `machine` | **The Machine** | procedurally, and it is unsettling | Numbered observations, no affect · never uses a simile |
| `soldier` | **The Old Soldier** | like somebody who has seen this before | Understatement, practical detail · never dramatises a death |

### The burn (6, optional) · *How does it burn?*
| id | card | line | in play |
|---|---|---|---|
| `slowburn` | **Slow burn** | Not yet. Not yet | Tension rises slower · the point of no return stays locked longer |
| `hurt` | **Hurt and comfort** | Somebody is carrying a wound | A hidden injury, a tending scene, and a telling |
| `oneway` | **Only one way out** | Snowed in, locked down, stuck | Nobody can leave the scene · proximity is forced |
| `lying` | **Everyone is lying a little** | Nobody here tells the whole truth | Every fact starts as suspected |
| `errors` | **A comedy of errors** | Things go wrong in the funniest possible order | Misunderstandings compound before they resolve |
| `clock` | **A clock you can hear** | The time left is always in view | Every scene costs a tick |

### And now — the dealer's complication (12)
| id | card | line | in play |
|---|---|---|---|
| `deadline` | **The deadline** | Something closes on a date | The days are counted out loud |
| `wedding` | **The wedding** | Everyone you know, in one place, for a week | The room watches · reputation is a bond |
| `scandal` | **The scandal** | It is already out, and it is getting bigger | The clock runs on the gossip, not on you |
| `inheritance` | **The inheritance** | The will is read on Friday | Everyone wants something from the dead, and from you |
| `storm` | **The storm** | Nobody leaves until it passes | Proximity is forced · tempers and candles run low |
| `visitor` | **The visitor** | Someone arrived who knows the truth about you | They haven't said it yet |
| `vote` | **The vote** | Everyone here will choose, and soon | Every conversation is also a campaign |
| `debt` | **The debt** | Someone is owed, and they are collecting | A social clock instead of a violent one |
| `vanished` | **The disappearance** | Someone is gone, and you were the last to see them | Everyone has a theory, including about you |
| `letter` | **The letter** | It arrived for the wrong person, and you read it | Now you know something you shouldn't |
| `contest` | **The contest** | There is a table of results, and it is public | Every week is a ranking |
| `funeral` | **The funeral** | Everyone in black, saying what they shouldn't | Old grudges are aired · nobody can walk out |

## 5 · The weave's reference material (never dealt)

The weaver picks the best fit for the hand and makes it specific to this life; the auditor checks
nothing visible gives it away.

### Undercurrents (13) — what is moving underneath
| id | undercurrent | signals the narrator can surface | if nobody intervenes | if somebody does |
|---|---|---|---|---|
| `fileon` | **The file on them** — You were looking into them. You kept looking | the record has a gap, and the gap is interesting · someone who knew them before talks too warmly, or too carefully · you catch yourself looking for reasons to keep looking · they mention something you only know because you were looking | they find out you were looking, from someone else / you close the file, and know more than you can ever admit | you tell them what you were doing before anyone else can |
| `enemies` | **Keep your enemies close** — You need the person you came to beat | they defend something you care about when you're not there to see it · the grudge turns out to have a second side · your own side asks you to do something that would hurt them · you're relieved when they win something small | you meet across the table at the decisive moment, still enemies, and it hurts / your side wins, and you're the one who has to tell them | you choose them over your own side, and pay for it in public |
| `fake` | **Pretend until it is not** — An arrangement, with rules | a rule of the arrangement gets broken and nobody mentions it · someone outside the arrangement believes it completely · a gesture that wasn't for show · the end date gets mentioned, and nobody laughs | the arrangement ends on schedule, and only one of you meant it / it's exposed as fake in front of the people it was for | the arrangement is ended early, honestly, and what's left is real or nothing |
| `second` | **The one that got away, back** — Same town, same wound | the old wound gets named, lightly, by someone else · they still do the small thing they used to do · the reason they left was not the reason you were told · an old friend chooses a side | the same mistake, made again, in the same place / they leave again, and this time you watch it happen | the real reason is said out loud, and you decide what it changes |
| `friends` | **Friends, for now** — The best thing in your life, and you might break it | someone else wants them, and says so · a joke between you that lands differently this time · a friend asks a question you answer too fast · you notice where they sit when they come into a room | someone else gets there first, and the friendship survives, worse / it's said by accident, at the worst time, and can't be taken back | one of you says it deliberately, and the friendship becomes whatever comes next |
| `contract` | **A marriage of convenience** — The contract says separate lives | a kindness the contract didn't ask for · someone asks how long it's meant to last · the terms get broken in a small way, and it feels like a gift · leaving becomes possible | the contract runs out and both of you sign the end / partners in everything except the one thing | someone stays when the contract says they're free to go, and says why |
| `forbidden` | **Not allowed** — There is a rule, and it has teeth | the rule gets enforced on somebody else, and it's brutal · a meeting that nobody was supposed to see · someone who could report it chooses not to, for now · the barrier turns out to have a price | it's discovered, by the worst possible person / one of you gives it up quietly to protect the other | it goes public on purpose, and the rule has to answer |
| `betrayal` | **The knife you handed them** — You trusted them first | trust built where everyone can see it · a small lie, explained away well · something of yours ends up where it shouldn't be · someone else warns you, and you don't believe them | the betrayal lands, and you're the last to know / you find out, and they never learn that you did | it's caught before it lands, and you decide what they're owed |
| `impostor` | **The impostor becomes real** — You were pretending until it mattered | someone uses a name that isn't quite yours · a detail from the life you claimed doesn't fit · they start loving the person under the mask · someone from the real past arrives | the mask comes off in public, not by your choice / the mask becomes the person, and the old one is gone | you take the mask off yourself, to the one person who matters |
| `longcon` | **The long con** — You are here to take something | the plan needs one more favour than planned · the mark does something kind that makes it harder · a partner in the plan gets impatient · you start to mean what you say to them | the score lands, and you lose the mark / the con collapses and takes both of you down | you choose: the score or the mark, out loud, to one of them |
| `mole` | **The mole** — Inside, with two loyalties | both sides ask for proof in the same week · the people you report on start to trust you · a message from your handler arrives at a bad moment · someone else is also lying, and you can tell | you're caught, by the side you came to love / you stay inside both sides until it costs someone you care about | you burn one side yourself, and choose which |
| `rise` | **Rise and fall** — You want it, and you will get it | you get something you wanted, and it costs more than you priced · an old friend stops calling · the people above you start treating you as one of them · you hear yourself say something the old you would hate | you reach the top, and there's nobody there you like / you fall, in public, and find out who stayed | you walk away from it, or refuse it, before it finishes you |
| `family` | **Found family** — You collected these people and cannot spend them | a rescue nobody asked for · someone from your old life wants you back · a meal that becomes a tradition · one of them is in trouble and doesn't tell you | the group scatters, and nobody chose it / one of them is lost, and the rest hold | you choose them over blood or the old life, out loud |

### Secrets (8) — who is hiding what
| id | card | line | in play |
|---|---|---|---|
| `notwho` | **Not who they said** | The name is borrowed | The reveal is the midpoint |
| `promised` | **Already promised** | There is someone else | Turns any story forbidden |
| `both` | **Playing both sides** | Someone close reports back | A circle bond is the one that burns |
| `didit` | **They did it** | The thing everyone is looking for, they did | Every kindness from them is also cover |
| `started` | **You started it** | The trouble began with you, and nobody knows | Discovery is the point of no return |
| `blood` | **The family tie** | You are related, and nobody has said so | Every resemblance is a clue |
| `dying` | **Not much time** | Someone here is running out of it | Every scene with them might be the last |
| `nothing` | **Nothing** | Nobody is hiding anything | The player is the one expected to break |

## 6 · Packs

**Built: business** (merged with *add the business pack* in the prototype, `--pack business` on
`engine/deal.py`):

| slot | cards |
|---|---|
| role | **The investor** (You decide who gets money, and everyone knows it), **The founder** (You built it, and it is starting to own you) |
| world | **The startup** (Twelve people, one runway, no walls), **The firm** (The hours are long and the floors are numbered) |
| pressure | **The audit** (Someone is checking the story), **The raise** (The money comes with people attached), **The merger** (Two houses, one name at the end) |
| undercurrent | **The pitch got personal** (It was business, until it was not) |
| secret | **Conflict of interest** (If you fall for them, you cannot back them) |

**Upcoming or potential** (none written yet; examples to show the shape a pack takes):

| pack | who you are | where | the Other | and now (dealer) | the hidden half leans to |
|---|---|---|---|---|---|
| **romance** | the matchmaker who never matched · the bridesmaid again | the summer house · the wedding season | the one who got away · the arranged one | the engagement party · the proposal that was not for you | second chance · forbidden · fake |
| **thriller / mystery** | the witness · the one with the alibi | the locked house · the archive | the detective · the one who knows what you did | the body · the deadline to confess | the mole · betrayal · they did it |
| **horror** | the night shift · the new tenant | the old house · the camp off season | the one who keeps smiling · the child who isn't | the sound in the walls · the guest who won't leave | not much time · the family tie |
| **isekai / fantasy** | the villainess (as written) · the summoned hero who wasn't | the novel you read · the academy of magic | the prince with a route · the side character who noticed | the plot's first event · the deadline the book set | the impostor · you started it |
| **historical** | the governess · the clerk in the war office | the ration years · the season in town | the officer · the patron | the telegram · the ball | forbidden · the family tie |

**Potential mechanics** (ideas, not decisions): pack selection before the deal; a pack's own
dealer cards; a keepsake slot (an object that belongs to two people, after Fiasco); rare cards;
writers publishing their own packs.

## 7 · The weave and audit contract (what the prototype sends)

**The weaver** receives the hand (every card, with its line and what it changes in play), the dials,
the narrator's voice, and the reference lists. It returns:

```json
{{"title": "two to five words",
 "you": {{"name": "first name", "past": "one sentence", "want": "one sentence"}},
 "life": ["who you are and what your days are made of", "where you are, who is watching, the complication pressing in"],
 "people": [{{"name": "", "who": "the Other / a circle card", "with_you": "one line of history"}}],
 "first_morning": "one sentence, present tense",
 "hidden": {{"undercurrent_id": "", "undercurrent": "", "secret_id": "", "secret": "", "if_nobody_intervenes": "", "signals": ["", "", ""]}}}}
```

**The auditor** receives the hand and the weave, and checks: every card honoured (both circle
cards, the voice, the complication); nothing visible gives away the hidden half; names and facts
consistent; a real person, not a type; the Other described by how they treat you, never as a love
interest; PG-13. It returns `{{"ok", "problems", "mended"}}`; a mended weave replaces the first,
and the reveal says so.

**Failure is a state, not a crash:** a weave that comes back broken shows *it did not weave* and
offers *weave it again* (the live Loom hit exactly this on 3 Oct: a JSON error on the first try,
fine on the second).
