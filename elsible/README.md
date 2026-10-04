# Elsible

> ***You were dealt a life, and then...***

Storytelling with an AI narrator, on the Seren engine. At the reader's table you're dealt a life:
five cards a slot, never locked. Then she plays her card face down: open the door, or turn it and
let the doorkeeper judge you. Your cards go into an envelope; behind the door they're woven into a
real person's life and checked until it's true; and you step into an ordinary morning of it. What's
moving underneath is the narrator's to know and yours to find out.

**Live:** elsible.unstuck-games.com (the home page) and `/play/` (the parlor). Everything else is
built and tested locally; pushes happen when Jay asks for them.

| | |
|---|---|
| the design | [`docs/elsible.md`](docs/elsible.md) |
| every decision, dated | [`DECISIONS.md`](DECISIONS.md) · ideas, filed: [`IDEAS.md`](IDEAS.md) |
| the site | [`site/`](site/): the home page (`index.html`) and the parlor (`play/index.html`, built) |
| the parlor | [`prototype/parlor.template.html`](prototype/parlor.template.html), built with `python elsible/prototype/build.py --publish` |
| the door | [`door/`](door/): the doorkeeper, the weave and the audit, the reveal. See its README to play the first part |
| the deck | [`decks/story/deck.json`](decks/story/deck.json) (v4) · [`decks/story/packs/`](decks/story/packs/) (business) · the card list: [`docs/briefs/elsible-cards.md`](docs/briefs/elsible-cards.md) |
| briefs for Claude Design | [`docs/briefs/`](docs/briefs/) (the system and the deal; the parlor has since replaced their flow) |
| the engine pieces | [`engine/`](engine/), for play, which comes after the door |

## Try the deal from the command line

```powershell
python elsible\engine\deal.py story --offer
python elsible\engine\deal.py story --play
python elsible\engine\deal.py story --play --not storm --pack business
python elsible\engine\deal.py story --check
```

## `engine/`: copies of Seren's, with Elsible's changes

Copied from the SEREN repo on 3 Oct 2026 (where they were built, branch `seren/story-deck`).
**Two copies now exist; changes here don't reach Seren, and the other way round.**

| file | what Elsible added or changed |
|---|---|
| `deal.py` | new: the dealer (five a slot, play it out for me, the dealer's complication, packs) |
| `bond.py` | new: bonds (word, arrow, lock; the number never shown) and tension (only rises, tops out once) |
| `gate.py` | three ledger types: `bond`, `tension`, `bond_lock` |
| `render_table.py` | the Bonds tab on the live table; bond rows kept off the Record tab |
| `live.py` | watches `state/bonds.md`; **fixes** the live table rendering as mojibake (it now sends `charset=utf-8`) |
| `table.py` | unchanged; `render_table.py` imports it |
| `hand.py` | reads story hands. **Scaffold and RUN-ME still assume Seren's repo layout** (`dm/DM.md`, `labs/playtest/`); Elsible's own weave-and-play setup is next |

Needs Python with PyYAML (`python -m pip install pyyaml`).
