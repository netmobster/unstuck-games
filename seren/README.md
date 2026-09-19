# SEREN, on the web

SEREN is Jay's AI dungeon master. It has been played at a terminal, against a campaign
folder you can read with your eyes. This is the port: the same campaign folder, the same
rules, served as a table you can sit at in a browser.

**The engine holds the two things instructions cannot be trusted with.** The dice are code
(`dice.py`), and the fog is code (`fog.py`). Everything else — the world, the voice, the
judgement — is the model's, and none of it can write a number or lift a secret.

## Run it

```bash
cd seren/web
SEREN_CONTENT_DIR=/path/to/seren-content SEREN_CAMPAIGN=sheep-crazy python server.py
```

Then open <http://127.0.0.1:8790>.

| variable | what it does |
|---|---|
| `SEREN_CONTENT_DIR` | where the corpus and campaigns live (default `/srv/seren`). **Never the repo** — LIVE content does not ship |
| `SEREN_CAMPAIGN` | which campaign folder under `campaigns/` to play |
| `SEREN_PC` | which build under `builds/` is the player's (defaults to `seren`) |
| `SEREN_PASSWORD` | the door. Unset means no door |
| `SEREN_TIER` | `free` or `paid` — which model, and which spend cap |
| `SEREN_AI` | `mock` runs the whole loop without Bedrock |
| `AWS_REGION` | Bedrock region |

Content layout is SEREN's own, unchanged: `dm/DM.md`, `docs/`, `npcs/`, `library/srd-5.2/`,
`campaigns/<slug>/{campaign.md,builds,state,sessions,canon,library-manifest.md}`.

## The table

`static/table.html` is CD's design, wired here to the engine. The page is a book: the
written sessions are its earlier pages, this session is the page being written, and the
slips down the right are the sheet, who is present, and the ribboned reference tabs.

The **turn** is: you say what you do → Seren narrates, or asks for a check → **you** press
the dice. The tray shows the inputs and never the DC; it spins until the server answers,
and renders the numbers it is given. It has no random number generator in it. That is the
whole contract, and it is written up in [ROLL-MECHANIC.md](ROLL-MECHANIC.md).

Every roll produces exactly one ledger line, one Record row and one stream insert, sharing
an id. If the Record and the narration disagree, the Record is right.

## What the player may see

`state.py:player_view` is the only way out. It sends the scene's allow-listed keys, the
party's own state, the facts marked `known` or `suspected`, and a **count** of the ones
that are not. `fog.py` checks everything the DM says before it reaches the page, and holds
the whole message rather than editing it — a redacted sentence is a puzzle with the answer
printed underneath.

## Closing

The button in the rail asks twice, then: the server writes the reconciliation (rolls,
ledger lines, facts — arithmetic the DM never touches), the DM writes the narrative log
through the fog gate, and this session's facts are promoted to `canon/session-NN-facts.md`
with a Source line. The next session opens on what the log says.

## Not done yet

- **No original campaign.** The only campaign that exists is built on a bought adventure,
  so this cannot be shown publicly until one is derived. That blocks launch, not play.
- **Not deployed.** No vhost, no unit, no subdomain, no cert.
- **Notes are per-browser** (`localStorage`), by design — Seren never reads that slip.
- **Prose quality is the model tier's.** On Nova the DM is serviceable and occasionally
  flat. Model swapping is a config line once the Anthropic use-case form is through.
