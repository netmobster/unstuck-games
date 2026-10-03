<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. Published for review only; no licence granted. See LICENSE.txt -->

# Elsible

> ## *You were dealt a life, and then...*

**The design, locked 2 Oct 2026 and corrected 3 Oct** (back to the Loom's feel). Written to be read cold. Decisions and their reasons are
in [`../DECISIONS.md`](../DECISIONS.md); this file is what they add up to. An Unstuck Games
title on the Seren engine.

---

## 1 · What it is

Storytelling with an AI narrator, for people who want to co-author a story or live a fantasy.
Not D&D, not an AI companion.

**Everyone else asks what story you want. Elsible deals you a life.** Cards are dealt, you pick
who you are, where, and who is around you, and the dealer plays one card back at you. Then the
weave turns that random hand into a life with a person in it, the auditor makes it true, and you
step into an ordinary day of it. What is moving underneath is the narrator's to know and yours to
find out.

The shape is isekai: you wake up inside a story you did not choose, in a role you did not pick,
inside a plot you do not know. The target feeling is **"OH. That's what those things meant."**

## 2 · Principles

1. You are dealt a life, not a story.
2. The undercurrent is latent, not mandatory.
3. The player controls action; the world controls consequence.
4. The engine remembers what is true.
5. The player sees evidence, not the hidden machinery.
6. The player can derail the story.
7. The deal and the weave are part of the fun.
8. The same engine can support multiple genres.
9. The first test is whether a fresh story is fun to play.
10. The name can wait. *(It waited; it is Elsible.)*
11. The story starts in the middle of a life.
12. The world grows where you look.

## 3 · Who knows what

**Everything in Elsible is split between what the player knows and what the narrator knows.**

| | the player | the narrator |
|---|---|---|
| the hand (the cards picked, and the dealer's complication) | ✓ | ✓ |
| the reveal: the life, the person, the people around them, the first morning | ✓ | ✓ |
| that something is moving underneath ("and then...") | ✓ told so | ✓ |
| the undercurrent, the secret, what happens if nobody intervenes | evidence only | ✓ the weave wrote them |
| the hidden weave folder | never | ✓ |

## 4 · Authority

> **You can attempt anything. You cannot dictate what it causes. The player acts; the world answers.**

- **The player's:** their character, what they say, what they attempt, what they choose.
- **The world's:** established facts, other characters, physical and social constraints,
  consequences.
- The engine never refuses an action because it conflicts with the undercurrent. An impossible
  action is resolved against reality, never narrated into existence. *(Seren's rule already: the
  model interprets, the server computes; a refused change did not happen.)*
- **The one sanctioned exception is impulse** (§8): a mood may start something, and the player
  can strike it before the world answers.

## 5 · Content

**PG-13, roughly teen Harlequin, product-wide.** Attraction, chemistry, longing, jealousy,
kissing, romantic tension and implied intimacy. Nothing explicit; sexual situations fade to
black. It lives in the narrator's contract, not in the player's table agreement, because it is
the product's line, not the player's preference. The design question it sets: *can tension carry
romance without explicit content?*

**Who may play** is a separate question, parked until there is a public surface.

## 6 · The deal

On the web, in the Loom (prototype local first).

*Corrected 3 Oct: the Loom's feel, Elsible's own deck.*

1. **Five cards a slot, never locked.** Pick one (two for the Circle), redeal any slot, deal a
   whole new hand, or **"play it out for me"**: a complete random hand at once. You never know
   what will be presented, and you are never committed.
2. **The hand writes itself as a sentence** while you pick, the way the Loom's does.
3. **The dealer plays a complication back at you**: the Pressure card, with **"make her play
   another"**. That is the deal's tension beat. You pick everything else.
4. **Then the weave** (§9). Nothing hidden is dealt: the weave invents what is underneath.

| you pick | the dealer plays | the weave writes, hidden |
|---|---|---|
| Role · World · the Other · the Circle (two) · Told by · Modifier (optional) | Pressure | the undercurrent · the secret · what happens if nobody intervenes |

**The core deck is generic and deliberately incomplete.** People, not job titles; broad settings;
it does not try to cover every path. **Packs come later**: romance, thriller, horror, business
(where the investor, the raise and the audit now live).

**The Other is always fictional.** Real people never sit in that seat, the designer's own
playtests included.

**Dials:** absurdity, stakes, cost (what losing takes), crowd, length.

## 7 · The undercurrent

*Internal engine word only. Players never see it; they see "and then...". **The weave writes it**
from the random hand (3 Oct): the 14 undercurrents in the deck are its reference material, never
dealt.*

What is moving beneath the life: tensions, relationships, secrets, pressures, possible
directions. It can strengthen, weaken, transform or become irrelevant as the player acts. **It is
a Seren front**, which has been "agendas, never plot" since August:

| the undercurrent | in Seren |
|---|---|
| what is moving | a front: `wants` · `doing` · `clock` |
| what happens if nobody intervenes | `if full:` |
| what happens if somebody does | `if resolved:` |
| what someone is hiding | DM-side facts: `true` / `suspected` |
| the evidence you notice | **signals**: things the narrator can surface, in any order or never |
| "OH, that's what it meant" | a fact flipping from suspected to known |

**The clock runs; the engine never steers.** The player may arrive at "if nobody intervenes",
change it, or walk away from it. This is not CYOA: nothing is a branch authored in advance.

## 8 · The engine

| mechanic | what it is | who decides |
|---|---|---|
| **facts at native resolution** | facts keep the strength they were said with; "suspected" never quietly becomes "true" | engine |
| **bonds** | a word, a direction and a lock on the table (*warming ↑ · something they haven't told you*); the number stays DM-side | engine |
| **tension** | rises, cannot be reset; when it tops out **the world acts** (the Other moves) and the point of no return arrives | world |
| **impulse** | at a charged moment one of the player's moods can start something, a line or a move; the player can say **"not me"** before the world answers, and it is struck | the player can veto |
| **the ding** | messages from the Other between scenes, written at close and shown at open | world |
| **draft here, send there** | compose with a confidant (an optional Circle card); only what you send reaches the Other | player |

Rules and dice where Seren already has them; **dice only at knife-edge moments**.

## 9 · The weave

**The weave is the magic.** Random cards go in; a life comes out that makes sense and is true.
*Jay, playing the Loom on 3 Oct: "that's a world you're stepping INTO."*

**The weaver writes, the auditor reads it and may send it back, then it is dealt out as yours.**
The auditor is what lets truly random cards make sense: it checks the weave against every card,
resolves contradictions, and sends it back to be mended. Both steps happen in view.

It makes two things:

1. **The reveal, for the player.** Elsible's "your loom is woven":
   - the hand, as its sentence;
   - the weaver and the auditor at work (and the auditor's note when it sent something back);
   - **a title**;
   - **a real person**: a name, a past, what they want, the people around them with history
     between you, never a stock type ("a lonely housewife");
   - **one line into the first morning**;
   - drama hinted, never a plot; the last words are **"and then..."**.
2. **The hidden folder, for the narrator:** the undercurrent (as a front), the secret, what
   happens if nobody intervenes, the signals, the cast it needs, the starting place. The world
   grows from there where the player looks.

**The first scene is an ordinary day in the life.** The undercurrent is not yet visible.

Dealer and weaver may know everything; the player-and-table session receives only the surface.
The weave never runs in the session that plays.

## 10 · Delivery, for now

| web | Claude Code |
|---|---|
| the deal (the Loom), the dealer's card, the reveal (prototyped with Claude) | the full weave, play, the live table |

Play stays in a native LLM environment for the foreseeable future. Mobile, app stores and
replacing the native player are deliberately not being solved yet. **The web reveal's model is
decided when it goes live**; it is prototyped locally with Claude first.

## 11 · Test 1

Deal → weave → play, all the way through. Then one question: **was that fun?**

- The tester is Jay, who has read every card. Knowing a card's type does not spoil how a hand
  combines, and the weave makes the undercurrent specific (a person, a secret, a date).
- **A guess log:** whether and when the player guessed what was moving underneath.
- The original six-week roleplay is the benchmark for what compelling looks like, never the
  answer to reproduce. A Rina-shaped hand is not dealt on purpose.

## 12 · Parked

Packs (romance, thriller, horror, business; the core deck first) · who may play · mobile and app stores · the web model · the AI Grimoire
idea (writers build a world, readers play inside it).

## Vocabulary

| player-facing | internal |
|---|---|
| the hand · the cards · the dealer's card · the reveal · "and then..." | undercurrent · front · signals · if full / if resolved · the hidden folder |

*The words "Storybound" and "undercurrent" both turned out to be crowded (red team, 2 Oct); the
first is retired, the second stays inside the engine.*
