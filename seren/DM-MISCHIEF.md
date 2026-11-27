# DM Mischief

**The deck of small, strange things a real DM does to a table, for Seren to do to you.** A goose
with a grudge. A roll that means nothing. A merchant whose pickles you come to depend on. 118 of
them, collected from real tables and retold, scored one by one. 38 ship in Seren 1.5.

## A few from the deck
- **The Roll That Means Nothing:** she asks for a d20, nods gravely, writes something down, and
  moves on. Not a word.
- **How Much Do You Weigh?:** out of nowhere, she asks exactly how much your character weighs.
  Writes it down. Moves on.
- **The Goose Has a Grudge:** one goose follows you through town and honks at the worst moments.
- **The Unexplained Cow:** a cow is standing in the road. No spell or interrogation will ever
  say why.
- **The Wand Keeps Receipts** (Jay's own, #118): a cursed wand makes one enemy a day vanish. You
  come to rely on it. A year later, she rolls to see how many come back.

## How it runs
- **The Director picks, in code.** Seeded dice read the campaign's log and its villains' clocks.
  No model decides when mischief happens, so it can't be talked into it or out of it.
- **The narrator tells it without knowing why.** She gets *what* to do, never the reason. A
  mystery stays a mystery to the storyteller too.
- **One question before anything fires:** an outside judge asks "does this add to what's
  happening, or distract from it?" It can only say no.
- **A seven-turn floor:** nothing fires within seven turns of the last surprise, whatever the
  judge says. Randomness that entertains, not randomness that has you chasing side quests.
- **A ceiling on chaos:** about three threads at once, never more than six. At the ceiling it
  merges or revives an old thread, and never opens a new one.
- **Never two of a kind** (27 Nov): one live trick per category at a time, and never the same
  category twice in a row. A callback (the goose coming back) is the same thread, not a new one.
  No goose, pickle merchant and talking rat all at once.
- **Long cons wait in the cold pile:** the wand's receipts sit quietly until their date comes,
  and only count when they fire.
- **Every trick is scored:** funny, story, solo fit and cost, 1 to 3 each. Agents score all of
  them, Jay vetoes, and the best ship.
- **Each campaign has allow and block lists:** creators decide which tricks can ever reach their
  table. Cruel is off by default.

## Why it's a roleplaying tool, not random encounters

A random encounter table interrupts the story. **Mischief is part of it.**

1. **It makes the world feel watched.** A DM who asks your weight and says nothing has told you
   something is coming. The tension is the content.
2. **It rewards paying attention.** The goose comes back. The pickle merchant comes back. The
   wand's bill comes due. Callbacks are what make a table feel like it remembers you.
3. **It's character, not noise.** Each DM persona carries its own list: the Jester's mischief
   isn't the Rulemaker's. You learn who's telling the story by what they get up to.
4. **It's fair.** Dice the model can't fudge, a log you can read, a judge that can only veto,
   and a floor that keeps it rare. Mischief never quietly changes an outcome.
5. **It pays off at the end.** The chronicle lists what was dealt and never drawn ("roads not
   taken") and what was still waiting in the cold pile. You find out what the DM had planned.

**In one line:** random encounters fill time. Mischief makes you look over your shoulder, and
then tells you, at the end, what was behind you.

## What the Director needs (from the feasibility pass, 27 Nov)
All 42 approved tricks can run: 31 as written, 11 adapted, none dropped
(SEREN-AI `libraries/mischief/feasibility-pass-2.json`, each with its trigger, state and narrator line).
What building it takes:
- **Triggers are structured state, never the player's words.** The Director can't read chat, so
  "when the player says X" becomes a logged action: a check, a flag, a scene tag, a counter.
- **The dice log says what a roll was for:** the check's type and its target ("Perception, the
  door"). Without that, The Archway, The Goose, The Trap Is the Handle and The Orb can never fire.
- **New flags the narrator sets through a tool:** `dug_ground`, `spared_monster`, `gave_gift`,
  `collateral_damage`, `wish_kind` (greedy or creative), `big_payday`, `wild_item_triggered`,
  `followed_npc` / `confronted_npc`, and a `festival` scene tag.
- **The server holds every secret.** A trick that hides something across scenes (the town is the
  mimic, the shifty NPC is kind, the orb is fake) gives the narrator one line at a time, and the
  reveal only on its trigger. The narrator is never told the why early.
- **Mischief runs beside the main plot, never rewrites it.** What's in the Mead is its own thread,
  not the campaign's clue; the Mystery Box's time skip stops every villain clock one tick short.
- **Campaign settings, in each campaign's lists:** `romance_ok` (the Smitten Innkeeper), the time
  skip opt-in (the Mystery Box, and its dead ally), and cruel's off switch. `campaign_check` checks them
  once they exist.
- **Side quests add their own** (feasibility pass on the 37 kept, 27 Nov, SEREN-AI
  `libraries/sidequests/feasibility-pass-2.json`): `drank`, `boss_slain`, `duel_outcome`, `gave_credit`,
  `main_raid`, a search or tracking flag, `board_read`, and terrain tags (coastal, winter) to gate quests
  that only fit there. **Never required:** two quests (the Rat Cult's tithe, the Sad Pond) were the only way
  through the main plot as written, and are now shortcuts instead.
- **Cruel ones keep a way out:** Zombies on the Night Shift fires only when the server can name a
  safe place the party can reach.

*Filed, not decided:* URGENT mischief, a rare trick that blows up (IDEAS.md, 27 Nov). It waits
for player accounts.

## Where it stands
- **Done:** the first pass, 118 tricks plus 97 side quests, with Jay's yes/no/later picks.
  Engine settings decided (25 Nov). The library lives in the private SEREN-AI repo.
- **Done 27 Nov, pass 2:** two blind scorers, then Jay's cut: **38 ship, 4 cruel ship off by
  default, 4 table-only held for multiplayer (1.6)** (`libraries/mischief/pass-2.json`). After Jay's
  trims, Table Theatre, Traps and Fate have 2 each.
- **Seren 1.5:** the Director with villains' clocks, a scored subset of mischief and side quests,
  two DM personas with their own lists (SAI-1015, SAI-1016).
- **Filed:** a "confess your worst DM crime" page that feeds the deck, with consent and credit.

*Summary written 27 Nov 2026 from DECISIONS.md (25 Nov, the engine settings and the version cut),
IDEAS.md and the mischief pass.*
