# Seren MCP MVP — plan

*Written 25 Nov 2026 (CC-164, continued), at Jay's ask. A plan, not a build: nothing here runs
until Jay approves it. Decisions it rests on are in `../DECISIONS.md` (25 Nov entries).*

## What it's for

**Milestone one, inside Claude:** choose a campaign, get dealt, tune the dials, and the book is put
in your hands. The smallest MCP server that carries that, and nothing more.

**The player's path (Jay):**

1. Install the Seren MCP and sign up or log in, in either order.
2. In chat, Claude calls one tool, and the Seren app opens full screen, MINDER-style.
3. In the app: the shelf of three campaigns → choose one → the deal (cards face down on the
   campaign's own backs, flipped one at a time; locked ones in chains, hidden ones sealed) → the
   dials → the book.
4. The book is handed to the chat. Milestone one ends here; play is the next milestone.

## Ground rules

- **From scratch.** The old `seren/mcp` folder is gone (backed up to
  `PROJECTS/_BACKUPS/seren-mcp-old-2026-11-25/`: a venv, staged copies and compiled leftovers, no
  source). No code is copied from anywhere; MINDER is the pattern we follow, not code we lift.
- **One engine (A1).** The server is Python, in the Seren codebase, and calls Seren's own modules
  (`weave.py`, `audit.py`, `corpus.py`) directly. The MCP is a thin layer over them.
- **No AI until the book (K1).** The shelf, the deal and the dials are code. The book is the weave,
  as today, with its audit and one fix pass. Only its inputs change.
- **The weave moves to Claude on Bedrock** (Jay, 25 Nov). Today it's Nova (`seren/web/llm.py:41-42`,
  `SEREN_MODEL_PAID`). It's one env var, plus model access in the Bedrock console.
- **Secrets stay on our server (K2, A7).** The deal happens on the server, so a hidden card never
  reaches the browser or the player's Claude. The book returned to the app is the player's view only.

## The pattern we follow (MINDER, read 25 Nov)

From `platform/services/mcp-connector/v2` on origin/main (Node; we follow the shape, in Python):

| MINDER does | Seren does |
|---|---|
| The app is a tool: `show_minder` opens the card | `open_seren` opens the Seren app |
| One shell HTML resource, `text/html;profile=mcp-app` | One app resource, same MIME type |
| URI carries a content hash, plus a catch-all template for cached old URIs | Same, so a redeploy never breaks a connected Claude |
| Tools the card calls are hidden from the model (`visibility: ["app"]`) | `seren_deal` and `seren_weave` are app-only |
| `availableDisplayModes: ["inline","fullscreen"]`, `requestDisplayMode` | Opens and asks for fullscreen |
| `callServerTool` from the card; `structuredContent` back | Same |
| Streamable HTTP, stateless, OAuth (Auth0) | Streamable HTTP, stateless; auth is open question 1 |
| Each card's tool named after it, because Claude picks tools by name | `open_seren`, not a generic "show app" |

**Python is ready for this:** the official `mcp` SDK 2.2 has MCP Apps built in (`mcp.server.apps`:
`Apps()`, `@apps.tool(resource_uri=..., visibility=...)`, `add_html_resource`, the
`text/html;profile=mcp-app` MIME type, and `client_supports_apps(ctx)` for clients without apps).
*Checked in the old venv before it went.* The browser side uses the MCP Apps client library
(`@modelcontextprotocol/ext-apps`), as MINDER does.

## The three tools

| Tool | Who sees it | What it does | AI? |
|---|---|---|---|
| **`open_seren`** | Claude (model-visible) | Opens the app full screen. Returns the shelf: each campaign's summary card (title, header art, key info, description, starting level, tags for what's locked and how much chaos its dials allow). Plain-text fallback for clients without apps. | No |
| **`seren_deal`** | The app only | For the chosen campaign: deals each slot from that campaign's decks with seeded randomness, applies locked and hidden modes, keeps the hand on the server. Returns the cards the player may see (face values for dealt and locked; only "sealed" for hidden). Re-deal is the same call. | No |
| **`seren_weave`** | The app only | Takes the hand id and the dials (checked against the campaign's dial ranges). Runs the weave on Claude via Bedrock with the published template + hand + dials, audits it, one fix pass, then the Doorkeeper. Stores the campaign; returns the book (player-facing only). | **Yes, the one step** |

**Read-only and write tools are split, per Anthropic's guidance** (Jay, 25 Nov: "that's why the
imprint trimmed server is that way"). Each tool gets a type and its hints, the way the vault server's
`src/tool-types.js` does it:

| Tool | Type | Hints |
|---|---|---|
| `open_seren` | fetch, **read-only** | `readOnlyHint: true`, `openWorldHint: false` |
| `seren_deal` | create, additive | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false` |
| `seren_weave` | create, additive | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false` |

**No destructive tool in the MVP.** A re-deal makes a new hand rather than overwriting one, and
discarding a campaign stays in the web shelf for now. No tool both reads and writes.

Flipping a card is the app's own animation; it needs no call. Handing the book to the chat uses
the app's `updateModelContext` / `sendMessage`, with the player-facing book only.

## The work, in order

Each step ends in something Jay can see.

1. **The campaign format, all three in it.** A published campaign as data: its summary card fields,
   each slot's mode (dealt / locked / hidden), each slot's deck, its dial ranges. All three originals
   get their summary cards in it; **blood-and-ink is the one selectable**, fully decked (Jay's edit).
   *Not MCP, but everything after needs it.*
2. **Hello, fullscreen.** The server with `open_seren` only, opening a placeholder app full screen.
   Proves the pipe: install, tool call, app, fullscreen. Tested locally with an in-memory client and
   in Claude Code first (as MINDER's tests do).
3. **The shelf.** The first screen of the app: the campaign chooser, a summary card for each of the
   three (title, header art, key info, description, starting level, the locked and chaos tags).
   blood-and-ink can be chosen; quire and tallage are shown but not yet selectable. ("Shelf" is the
   web table's name for it, `seren/web/static/shelf.html`.)
4. **The deal.** `seren_deal`, and the app's deal: face down, flip, chains, seals. Card backs for
   blood-and-ink.
5. **The dials.** The five Loom dials in the app, limited by the campaign's ranges (K4).
6. **The book.** `seren_weave` on Claude via Bedrock, with the audit, the fix pass and the Doorkeeper;
   the book shown in the app and handed to the chat.
7. **The book is saved and downloadable, so red team can review it. The MVP stops here** (Jay:
   "we stop at 7"). Every woven book is kept on the server, and the app offers a download.

**Alongside, whenever the first claude.ai test is due:** the allowlist (Jay and Andy; M3) and the
deploy beside the Seren web server (M4), with a PowerShell deploy that dry-runs by default, pins a
worktree and health-checks (the pattern from `SA CC WORK/deploy-minder-prod.ps1`). Real sign-up
comes after the MVP.

## Jay's picks (25 Nov)

M1 three tools, yes, split read-only from write · M2 the steps, edited as above · M3 an allowlist
for the MVP, yes · M4 beside the Seren web server, yes · M5 test locally first, claude.ai at deploy,
yes. Page: https://claude.ai/artifact/LaVjcgKbuuLD8Lb4HoyZkF

## Still open (after the MVP)

1. **Real sign-up: whose is it?**
   - **selfActual's Auth0**, the way the vault MCP does it: it exists and works with claude.ai, and
     it's our own system first. But every Seren player becomes a selfActual account, it touches SA
     infrastructure (Brad), and the registration proxy lives on the old "prime" server.
   - **Seren's own accounts**: Seren already has Google log-in (`seren/web/auth.py`), but it isn't an
     OAuth server, and making it one is real work.
   - **For milestone one only:** no sign-up; an allowlist for Jay (and Andy) on a private URL, with
     real auth before anyone else plays. Fastest, and doesn't block the magic moment.
2. **Where it runs:** the same box as the Seren web server, under the Seren domain at `/mcp`.
3. **Testing before deploy:** claude.ai needs a public HTTPS URL to connect. Steps 2–6 can be
   tested in Claude Code and with the in-memory client locally; the first test in claude.ai needs
   the deploy (or a tunnel).

## Not in the MVP

Play, the Director, the libraries, the chronicle, dealing from scratch, multiplayer. Any rework of
how the weave writes (only its inputs and model change). The full MCP plan, which comes last.

## Notes

- The guard plugin's hook matches every `mcp__` tool, so Seren's tools will pass through it. It has
  no Seren rules and needs none for the MVP.
- Reference: MINDER's files, all under `platform/services/mcp-connector/v2/` on origin/main (the
  local checkout is stale): `src/tools/apps.js` (resource 362-382, tool `_meta` 400-477, shell
  bridge 89-266), `src/index.js` (transport 167-200, auth 120-180), `src/minder/card.html`,
  `src/tools/minder.js` (card-only tools 354-390), `test/minder.test.mjs`.
