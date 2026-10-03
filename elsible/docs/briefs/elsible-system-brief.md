<!-- Copyright (c) 2026 Jeremy Wright. All rights reserved. Published for review only; no licence granted. See LICENSE.txt -->

# Elsible — system brief

> ***You were dealt a life, and then...***

**For Claude Design, 3 Oct 2026.** This is a **system** brief: what Elsible is, how it works, what
the player and the narrator each know, and what screens and states exist. **Nothing here is
design.** Layout, type, motion and look are yours. The companion brief,
[`elsible-dealing-brief.md`](elsible-dealing-brief.md), covers the deal in full, with every card.

Sources of truth, if you need them: [`../elsible.md`](../elsible.md) (the design doc) and
[`../../DECISIONS.md`](../../DECISIONS.md) (every decision, dated, with its reason).

---

## 1 · What it is

Elsible is storytelling with an AI narrator. **You are dealt a life and step into it.** Cards are
dealt; you pick who you are, where, who is at the centre of it and who is around you; the dealer
plays a complication back at you. Then the **weave** turns that random hand into a real person's
life, the **auditor** makes sure it holds together, and you step into an ordinary morning of it.
What is moving underneath that life is the narrator's to know and yours to find out.

- **The shape is isekai:** you wake up inside a story you did not choose, in a role you did not
  pick, inside a plot you do not know.
- **The feeling it is built for:** *"OH. That's what those things meant."*
- **Not** D&D, **not** an AI companion, **not** a choose-your-own-adventure. Nothing is a branch
  written in advance.
- **Audience (a hypothesis, not measured):** people who want to co-author a story or live a
  fantasy. Likely skews to readers of romance, otome and otome-isekai, plus isekai readers of any
  gender. The engine is genre-agnostic; **packs** carry genres.
- **Content: PG-13, roughly teen Harlequin, product-wide.** Attraction, longing, jealousy,
  kissing, tension, implied intimacy. Nothing explicit; sexual situations fade to black.

## 2 · Where it comes from: Seren

Elsible is an Unstuck Games title **built on Seren**, our AI dungeon master. It reuses Seren's
pieces and changes what they are pointed at.

| Seren has | Elsible uses it as |
|---|---|
| **The Loom** (seren.unstuck-games.com/loom): a card table that deals a hand against Seren | **The deal.** Same feel, Elsible's own deck (dealing brief) |
| **The weaver and the auditor**: random cards in, a coherent campaign out, sent back and mended if it does not hold | **The weave.** Random hand in, a real person's life out |
| **"Your loom is woven"**: the hand's sentence, the steps in view, a title, a premise, an opening line | **The reveal.** The life you are stepping into |
| **The engine**: dice, state, a facts ledger with fog of war (true / known / suspected / false), a live table, a session chronicle | **The engine**, plus relationships: bonds and tension |
| **Fronts**: agendas with clocks, "if full" and "if resolved", never plot | **The undercurrent**: what is moving under the life |
| **Play in Claude Code**, with a live table in the browser | **Play**, the same way, for now |

## 3 · The flow

```
DEAL (web)  →  WEAVE + AUDIT (web, the reveal)  →  PLAY (Claude Code + live table)  →  CLOSE (chronicle)
```

1. **Deal.** Five cards per slot; pick, redeal, or "play it out for me". The hand writes itself as
   one sentence while you pick. When your life is set, the dealer plays a complication back at
   you; "make her play another". *(Dealing brief.)*
2. **Weave and audit.** "Weave my life". The weaver writes, the auditor reads it and may send it
   back, then it is dealt out as yours, all three steps in view. The weave also writes the
   **hidden half**, which the player never sees.
3. **The reveal** (§5): the life you are stepping into.
4. **Hand-off.** "Weave it in Claude Code" copies the hand (with the hidden half) to paste into a
   Claude Code session, which builds the full campaign folder.
5. **Play** in a fresh Claude Code session: the narrator runs the life; the live table shows
   where things stand.
6. **Close.** The session ends with a chronicle, so the next session remembers.

## 4 · Who knows what

**Every part of Elsible is split between what the player knows and what the narrator knows.**
Design has to keep the right half off the screen.

| | player | narrator |
|---|---|---|
| the hand: the cards picked, and the dealer's complication | ✓ | ✓ |
| the reveal: the life, the person, the people around them, the first morning | ✓ | ✓ |
| that something is moving underneath ("and then...") | ✓ told so | ✓ |
| **the hidden half**: the undercurrent, the secret, what happens if nobody intervenes, the signals | evidence only, in play | ✓ written by the weave |
| the campaign folder in Claude Code | never | ✓ |
| a bond's number | never: a word, an arrow and a lock | ✓ |

## 5 · The reveal — the magic moment

Jay, playing Seren's Loom: *"this part is the real magical part ... that's a world you're
stepping INTO."* Elsible's version, in order:

1. **A kicker**: weaving → *your life is woven* (or *it did not weave*, or *your life, plainly*).
2. **The hand as one sentence**, large. You see what you put in.
3. **The auditor's note**, when it sent something back: *"The auditor sent it back once and it was
   mended."*
4. **The three steps**, live: *The weaver writes it · The auditor reads it, and may send it back ·
   It is dealt out as yours.*
5. **A title**, two to five words.
6. **The life**, two short paragraphs in second person: who you are and what your days are made of;
   where you are, who is watching, and the complication pressing in.
7. **The person**: a first name, a past, what they want. **A real person, never a stock type**
   ("a lonely housewife").
8. **The people around you**: the Other and two from your circle, each named, each with one line
   of history between you.
9. **One line into the first morning**, present tense.
10. ***and then...*** as the last words.
11. Actions: back to the table · weave it again · weave it in Claude Code.

**The weave writes the hidden half in the same pass**, and the auditor checks that nothing visible
gives it away. It is carried in the hand for Claude Code and never rendered.

## 6 · Play: the engine

What the narrator runs, and what the live table shows. **Built** means in code and tested;
**decided** means locked and not built yet.

| mechanic | what it is | the table shows | status |
|---|---|---|---|
| facts at native resolution | facts keep the strength they were said with; "suspected" never quietly becomes "true" | the Codex: known and suspected only | built (Seren) |
| **bonds** | each person has a value the narrator cannot set by saying so; it moves only with a reason, at most 3 steps at a time | *Ilse · fond ↑ · something she hasn't told you* — a word, an arrow, a lock, **never a number** | **built** |
| **tension** | only rises, never resets; when it tops out **the world acts** and the point of no return arrives | *tension calm / building / charged / at the edge / breaking* | **built** |
| impulse | at a charged moment one of your moods can start something; you can say **"not me"** before the world answers | the impulse, and a way to strike it | decided |
| the ding | messages from the Other between sessions, written at close, shown at open | a message waiting | decided |
| draft here, send there | compose with a confidant (an optional circle card), choose what reaches the Other | two channels | decided |
| dice | only at knife-edge moments | the roll, with its inputs | built (Seren) |

**Authority:** you control your character and what you attempt; the world controls facts, other
people and consequences. *"You can attempt anything. You cannot dictate what it causes."* The one
sanctioned exception is impulse, which you can veto.

## 7 · Screens and states (system list, not layout)

| screen | states to design for |
|---|---|
| **The table (deal)** | slot in focus · five cards dealt · card taken · circle needs two · burn is optional · life complete · new hand · play it out for me · business pack on/off |
| **The dealer's moment** | face down until the life is set · plays a complication · make her play another (repeatable; the refused cards are remembered) |
| **Weaving** | step 1 writing · step 2 auditing · step 3 dealt · failed ("it did not weave", with the error, and weave it again) · Claude unavailable (plain version from the cards, clearly labelled) · first use asks permission to use the viewer's Claude account |
| **The reveal** | §5, plus "the auditor sent it back and it was mended" |
| **Hand-off** | copied (with the warning: it holds the hidden half, paste don't read) · copy blocked (select-to-copy fallback) |
| **The live table (play)** | Now · Party · **Bonds** · Sheet · Record · Codex · Rules · Library · Notes; redraws itself whenever state changes |

**Never locked:** every choice in the deal can be changed until "weave my life". The deal remembers
where you were if you leave and come back.

## 8 · What exists today

| piece | where | status |
|---|---|---|
| the design doc and every decision | `docs/elsible.md`, `DECISIONS.md` | written |
| the deck: core v3 + business pack | `decks/story/deck.json`, `decks/story/packs/business.json` | built |
| the dealer (command line) | `engine/deal.py` (`--offer`, `--play`, `--pick`, `--not`, `--pack`) | built, tested |
| hands into Claude Code | `engine/hand.py` (checks a story hand); Seren's `docs/weave-from-hand.md` | built; the story-mode weave is next |
| bonds and tension | `engine/bond.py`, the Bonds tab in `engine/render_table.py` | built, tested |
| **the working prototype** | https://claude.ai/artifact/5NKixk4f8aNc5BykZM9omr (private) | the full deal, the dealer's card, a real Claude weave + audit reveal. **A sketch, not the design** |
| Seren's Loom, for reference | https://seren.unstuck-games.com/loom | live |

All in `elsible/` in the unstuck-games repo (paths here are relative to it). The engine pieces in `engine/` are copies of Seren's, with Elsible's changes.

## 9 · Not now

Packs beyond business · who may play (age) · mobile and app stores (desktop first) · which model
writes the web reveal (decided at go-live) · writers building worlds for readers to play.

## 10 · Words

| the player sees | internal only |
|---|---|
| the hand · the cards · the dealer · the reveal · your life · *and then...* · bonds as words | undercurrent · front · signals · if full / if resolved · the hidden half · bond values |

*"Undercurrent" and the earlier working name "Storybound" were both crowded (red team, 2 Oct).
"Undercurrent" stays inside the engine; players see "and then...".*
