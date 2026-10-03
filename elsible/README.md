# Elsible

> ***You were dealt a life, and then...***

Storytelling with an AI narrator, on the Seren engine. You're dealt a life (Loom-style: five cards
a slot, never locked, the dealer plays a complication back at you), the weave turns the random
hand into a real person's life, the auditor makes it true, and you step into an ordinary morning
of it. What's moving underneath is the narrator's to know and yours to find out.

**Built locally. Nothing here is pushed or deployed.**

| | |
|---|---|
| the design | [`docs/elsible.md`](docs/elsible.md) |
| every decision, dated | [`DECISIONS.md`](DECISIONS.md) |
| briefs for Claude Design (system, not design) | [`docs/briefs/elsible-system-brief.md`](docs/briefs/elsible-system-brief.md) · [`docs/briefs/elsible-dealing-brief.md`](docs/briefs/elsible-dealing-brief.md) |
| the deck | [`decks/story/deck.json`](decks/story/deck.json) (core v3) · [`decks/story/packs/`](decks/story/packs/) (business) |
| the prototype | [`prototype/`](prototype/): `python elsible/prototype/build.py`, then open `prototype/elsible.html` |
| the engine pieces | [`engine/`](engine/) |

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
