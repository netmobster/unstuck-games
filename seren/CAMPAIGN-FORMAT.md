# Published campaign format — `seren-published/1`

*Step 1 of the MCP MVP (`MCP-MVP-PLAN.md`), written 25 Nov 2026. This file is the format only, with
no campaign content: this repo is public, and the campaigns live in the private `SEREN-AI` repo
under `campaigns/published/<slug>/`, staged to the server's content folder like everything else.*

## What a published campaign is

The fortune teller's table has two doors: deal a campaign from scratch, or **choose a published
one.** A published campaign plays through the same table, the same seven slots and the same five
dials. Its author decides, per slot, whether the card is **locked**, **dealt** or **hidden**, and
writes a small deck for each slot that is dealt. **The dials always stay;** the campaign may only
narrow their range.

Nothing before the book uses AI. The shelf, the deal and the dials are code. The weave writes the
book from the campaign's template plus the cards dealt plus the dials, as it does today.

## Three files per campaign

```
campaigns/published/<slug>/
  card.json      the shelf card       player-facing, always safe to send
  deck.json      the slots and decks  player-facing faces only
  truths.json    what each card means DM-side only, never leaves the server
  template/      the book's source    the campaign's fronts, canon and cast, for the weave
```

**The split is the fog.** `card.json` and `deck.json` are written so that sending all of them to the
browser leaks nothing. `truths.json` is read only by the weave. This is A7's "fails closed": a
field the code doesn't recognise is never sent.

## `card.json` — the shelf card

| field | type | what it is |
|---|---|---|
| `format` | `"seren-published/1"` | |
| `slug` | string | folder name |
| `title` | string | |
| `tagline` | string | one line under the title |
| `description` | string | a paragraph, player-safe: the premise as the player would hear it |
| `level` | int | starting level |
| `players` | int | 1 for now |
| `length` | string | in play terms ("one night", "three nights") |
| `key_info` | list of strings | 3–5 short facts for the card |
| `tags.locked` | list of strings | the names of the locked cards, shown in chains |
| `tags.chaos` | string | a plain label for how far the dials may go ("grim to wry") |
| `header_art` | path or null | null until the art is made |
| `art_brief` | string | what the header art should show (for generating it) |
| `card_back` | path or null | this campaign's own card back |
| `back_brief` | string | what the card back should show |
| `selectable` | bool | false shows it on the shelf but it can't be chosen yet |
| `status` | string | "ready" or "coming soon" |

## `deck.json` — slots, modes, decks, dials

The seven slots are the Loom's: `trope`, `origin`, `world`, `trouble`, `posture` (the antagonist,
"her card"), `companions` (pick two), `persona` ("told by").

**An eighth, optional: `pc`, who you play** (26 Nov). About five characters per campaign, each a
face like any other card (`name` the character, `changes` leads with the class). Dealt as a hand like
the rest. Picks don't have to fit each other: the weaver makes any hand work.

**Every dealt slot is a hand:** the table deals up to three (four for companions) from the slot's deck,
and the player picks. `posture` is her card: dealt face down, turned over, and she can be made to play
another. `hidden` slots never reach the browser; the server adds them at weave time.

```json
"slots": {
  "trope":      { "mode": "locked", "card": { ...face } },
  "origin":     { "mode": "dealt",  "deck": [ { ...face }, ... ] },
  "companions": { "mode": "dealt",  "pick": 2, "deck": [ ... ] },
  "posture":    { "mode": "hidden", "deck": [ ... ] }
}
```

- **locked:** one card, dealt face up in chains. The player can't change it.
- **dealt:** the server deals one (or `pick`) at random from the deck, face down on the campaign's
  card back, and the player flips them. Re-deal is allowed, as at the Loom.
- **hidden:** dealt like `dealt`, but the face is never sent. The player sees a sealed card. The
  seal breaks when the story reveals it; the chronicle breaks any still sealed at the end.
  **Use sparingly** (Jay: the player should usually know who wants them dead).

**A card's face** is what the player may see:

| field | what it is |
|---|---|
| `id` | the Loom's card id where it is a Loom card (`parent`, `debt`, `scribe`), so the weave knows it |
| `name`, `line`, `changes` | as on the Loom |
| `as` | how this card lands in this campaign, player-safe: one sentence |

**Anything that would spoil goes in `truths.json`, never on the face.** For a mystery, the usual
pattern is a *dealt, shown* antagonist whose face is its manner ("someone here is protecting their
own") and whose truth is who did it. That keeps the antagonist visible and the culprit secret
without a hidden slot.

```json
"dials": {
  "ranges":   { "absurdity": [0, 40], "stakes": [0, 50], "danger": [0, 70], "people": [0, 60], "length": [0, 30] },
  "defaults": { "absurdity": 20, "stakes": 30, "danger": 60, "people": 20, "length": 0 }
}
```

The five dials and their scale (0–100) are the Loom's: absurdity, stakes, danger, people ("trouble
is a person ↔ a place"), length. `ranges` narrows each one; `defaults` must sit inside it.

## `truths.json` — DM-side

Keyed `"<slot>:<card id>"`. Each entry says what that card means in this campaign: who did it, what
the hidden fact is, which front it becomes, what evidence points where. Free-form fields, read by
the weave as part of its brief. Plus a `rules` list for things true whatever is dealt (for example:
a companion who isn't dealt still exists in the world as an ordinary person).

## Checking a campaign

`seren/tools/campaign_check.py <folder>` checks the shape: required fields, the seven slots, valid
modes, deck sizes, a truth for every dealt antagonist and origin, dial ranges and defaults, and that
no truth's text appears on a player-facing face. It is the format's own check, not the Doorkeeper,
which still checks the book after the weave.
