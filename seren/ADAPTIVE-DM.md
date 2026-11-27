# A DM who knows you

**Spec draft, 27 Nov 2026.** Jay's picks are in `DECISIONS.md` (27 Nov, "A DM who knows you"), and the report
is https://claude.ai/artifact/9BYt1GAh9p3KbTJVsG3YDZ. **Status: spec only.** It's built after the Director
and player accounts, because it needs both.

## What it is
Seren keeps a profile of how the player plays, and the DM adapts what it deals. The player sees the
profile as the fortune teller's read of them and corrects it out loud, every time they come back. It
isn't a different product: it's the difference between a module and a DM who has played with you before.

## The two layers

| Layer | Holds | Lifetime | Lives |
|---|---|---|---|
| **Mood** | Tonight's appetite: dread or daft, fight or talk, fast or slow | Dies when the book closes | The campaign's state on Seren's server |
| **Style** | How they play over time: the pillars they favour (fight, explore, talk), tolerance for dread and cruelty, what they ignore | **Halves every three campaigns unless re-confirmed** | A Seren container in the player's selfActual vault |

**The rot, as code.** Every style claim has a weight and the campaign it was last confirmed in:
`weight = confirmed_weight × 0.5 ^ (campaigns_since_confirmed / 3)`. A claim below a floor (start at 0.2) is
dropped and no longer said aloud. A "yes" at the door resets `campaigns_since_confirmed` to 0.

## What fills it (behaviour, never chat)
The profile reads the campaign's **structured log** at close, the same state the Director runs on:
- encounters fought first, talked down or avoided (logged attack rolls and Persuasion, Deception and Intimidation checks)
- doors, rooms and objects searched (logged Investigation and Perception checks)
- side quests taken, finished, left
- mischief engaged with or ignored (the narrator's engagement flag)
- dials moved away from a campaign's defaults at the deal, and cards picked from each fan
- turns spent per scene type, and rests taken
- which companions they keep close

A model summarises that log once, at book close, into **at most three new style claims**, each with its
evidence ("fought first in 2 of 9 encounters"). Claims are short, in play-style words, never about the person.

## The door: where the correction happens (Jay's change)
On entering the fortune teller's room, **before anything is dealt**, she speaks to the player:
1. **What happened last session:** three moments from the last campaign's log, like Imprint's moments.
   ("You left the goose alone. You talked the troll out of his chains. You never opened the cellar.")
2. **What she believes:** three style claims, the strongest by weight. ("You talk first and stab second.")
3. **What she knows:** three things from the profile that have held for a long time, the ones confirmed most.

The player answers each, in the app, with one tap: **yes** (re-confirmed, so the rot resets), **no** (the
claim is dropped), or **not tonight** (it's kept, but this campaign's mood overrides it). That's the whole
correction mechanism. **Then the player sits down** and the deal begins.

A first-time player has no profile. She reads the dials they set instead, and says so.

## Existing selfActual users (Jay's change)
If the player is already a selfActual user, she offers once, at the door, to **read their SA profile**:
- **Opt-in only.** The player can decline, and declining is remembered.
- **Only the sections the player allows,** and never anything silo-gated, personal or health-related. Work
  style and temperament may cross; private life doesn't.
- **Twisted, not copied.** A model turns what crossed into play-style claims ("decides fast, hates
  ambiguity" becomes "kicks the door rather than listening at it"). Nothing from SA is stored verbatim.
- **Shown before it's kept.** The twisted claims appear as her read, with the yes / no / not-tonight
  taps, and only the yeses are written to the Seren container.
- It reads through Seren's scoped partner token and only with the player's consent. Seren never reads
  SA's profile on its own.

## What the Director does with it
- **Draw weights.** Mischief and side quests are drawn from the persona-tagged deck, with style × mood as
  a multiplier on each card's weight. The variety rules, the 7-turn floor and the heat ceiling still apply.
- **The stretch.** One draw in five ignores the profile, on purpose, and the chronicle says so at the end.
- **The deal.** The fortune teller's "player preferences" cards come from style; the rest stay random.
- **The persona.** She recommends a DM persona from style. The player's choice is final.

## Where it lands
- **Vault:** a Seren container (feature data kept together), each claim carrying its evidence and
  provenance (which campaign, when, confirmed or not), **written once at book close**, never in real time.
  The player can read and delete it from their vault.
- **The chronicle:** a last page, "How you played": the read this campaign, what changed, and the stretch cards.

## Lines it never crosses
- **It's never tuned for time in the app,** return visits or spend. It makes the story better, or it's off.
- **It never touches dice,** DCs or outcomes. It only weights what the Director draws.
- **Nothing crosses between hats without consent:** nothing from SA comes in, and nothing from Seren goes out to SA,
  unless the player asks.
- **Everything it believes is visible,** in words, and one tap from wrong. No scores and no bars.

## Needs first
- Player accounts in Seren (also needed by URGENT, in IDEAS).
- The Director, with the narrator flags from the mischief feasibility pass (`DM-MISCHIEF.md`).
- The vault design principles reconciled. Jay's copy and Brad's disagree on the count, so read both before
  this touches pods.

## Open
- Which SA profile sections may cross, by name.
- Whether the three "last session" moments come from the chronicle or from their own pass over the log.
- Multiplayer (1.6): four profiles at one table (spotlight balancing).
