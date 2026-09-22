<!-- Written 2026-09-22 for red-team review. Companion to PRD-TRD.md. -->
# seren-mcp — the server spec

**Status:** draft for red team · **Written:** 2026-09-22
**What it is:** the MCP server that turns a player's own Claude into SEREN's DM. It holds
the dice, the state, the facts and the table. It never writes narration.

---

## The rule this server exists to enforce

> ### The model interprets. The server computes.
>
> The DM decides what happens and says it. **The server decides what that costs**: it rolls
> the dice, does the arithmetic, keeps the record, and refuses a change the rules do not
> allow. That split is what made SEREN trustworthy in CC, and it is the only part of
> SEREN that still runs on our machine.

Corollary: **a refused write is part of the fiction.** When the server refuses a move, the
tool result says, in words, that the move did not happen and must not be narrated. The
fixture showed a DM narrating a teleport the state had refused (`../fixture/README.md`,
second run). Over MCP the DM sees the refusal before it writes the next line.

---

## Lessons from the MCP servers we already run

The SelfActual MCP (`mcp.selfactual.ai/mcp`) taught us these, some of them the hard way:

| lesson | what it means here |
|---|---|
| **Wide lists overflow the response** (300+ tasks) | every list is bounded and paged. `seren_look ledger` returns the last 20, not all of them |
| **A `fields` filter that does not filter is a leak** (SAI-532: list calls returned every body, gated ones included) | DM-side data comes from **one tool only**, `seren_secrets`. No read tool has a mode that includes it. Tested, not assumed |
| **The model reads tool descriptions as instructions** | descriptions are short, say when to call the tool, and never contain campaign content |
| **Few tools, well named, beat many** | 14 tools, all prefixed `seren_` so they are findable among a player's other connectors. *(Phase 0 build: 17 — plus `seren_table_data`, app-only, and `seren_dropins` / `seren_bring` from MARKETPLACE-IDEAS.md. See `../mcp/README.md`.)* |

---

## Shape

| | |
|---|---|
| **Transport** | Streamable HTTP at `/mcp`, behind nginx. stdio for local development (phase 0) |
| **SDK** | official MCP Python SDK (`mcp` 2.x), Python 3.12, its own venv and systemd unit (`seren-mcp`) |
| **Engine** | imports `seren/web/{dice,state,fog,close,shelf,accounts,corpus}.py` unchanged |
| **Auth** | OAuth 2.1 resource server; Google is the identity; tokens map to the account slug |
| **State** | the same disk as the web server. One campaign = one folder. A file lock per campaign |
| **Session** | MCP session → `(account, campaign, session number)`. Stateless between calls apart from that |

---

## Prompts

### `/seren` — the only thing a player has to type

| argument | |
|---|---|
| `campaign` | optional. A slug from the shelf. Omitted: the server returns the shelf and asks |

**Returns one prompt message** containing, in this order:

1. **The contract**: `rules.dm`, the same text that outranks everything on web and in CC.
   Includes *the player is {PC}; when they say "I" they mean {PC}; everyone else is yours*.
2. **How to use the tools**: when to roll, when to write a fact, that a refused state
   change did not happen, when to look something up rather than guess.
3. **This campaign**: the static layer (`campaign_static()`, cast files included; the
   fixture proved the cast files were not reaching the prompt on web).
4. **Where things stand**: the state layer, player-visible only.
5. **The last session's chronicle**, so a new chat resumes with memory.
6. **The table link.**

⚠️ **The prompt is big.** It lands once, at the top of a chat, and the host's context
holds it. That is the point: the web build lost memory because we trimmed; the host does
not have to.

### `/seren-close`

Asks the model to write the chronicle and send the full handback with `seren_close`. Same
as typing "let's stop here", which the contract also recognises.

---

## Tools

### Session

| tool | args | does |
|---|---|---|
| `seren_shelf` | — | the player's campaigns: title, premise, PC, last played. Paged, 20 at a time |
| `seren_open` | `campaign` | makes it current, opens a session, returns the same payload as `/seren`. For clients that don't surface prompts |
| `seren_sync` | the handback (below) | the model tells the server what happened in the chat since the last sync. Called when a tool result asks for it |
| `seren_close` | the **full** handback, chronicle included | the session end, with the chronicler built in. One call: the server saves the handback, runs reconcile and promote, checks the chronicle, and closes the session. See *The handback* |

### Reads — the half the web build never had

| tool | args | returns |
|---|---|---|
| `seren_look` | `what`: `scene` · `party` · `sheet` · `facts` · `ledger` · `present` · `fronts` | current state, **player-visible only**. `fronts` returns each front's name and nothing about its clock |
| `seren_search` | `query` | matches across this campaign's canon, cast and past chronicles, player-visible only, with where each came from |
| `seren_rules` | `query` | SRD 5.2 articles from the library (`corpus`). Rules aren't secret; no filter |
| `seren_secrets` | — | **DM-side only**: hidden facts, front clocks, the antagonist's plan, the beat graph. The description says: *for your reasoning, never to be said aloud until the fiction reveals it* |
| `seren_recall` | `session` | the chronicle of an earlier session |

⭐ **`seren_look` and `seren_search` are the fix for "she forgets" and "she makes things
up".** The web DM could only write to the record; this one can check it before it
speaks.

### Writes — ported from `dm.py`, same schemas

| tool | engine | notes |
|---|---|---|
| `seren_roll` | `dice.roll` | server rolls; ledger line written; the result goes back to the model **and** the table. `note` (where the DC came from) required, as now |
| `seren_fact` | `dice.fact` | `establish` · `flip` · `believe`. Keeps the web refusals: no facts about "the user", no `src: player` in DM-side. **New:** refuses more than 3 facts a turn with *"a fact is about the world, not the session"* |
| `seren_state` | `state.apply_state` | `hp` · `condition` · `slot` · `use` · `move` · `present` · `round`. The change, never the total. **A `StateRefused` is returned as a result, not an error**: *"This did not happen. Narrate that it did not, or do something else."* |
| `seren_ruling` | ledger | a call the rules don't cover, said out loud |

**Every write returns the new state of whatever it touched**, so the model always has the
current number and never has to remember it.

### The table

| tool | returns |
|---|---|
| `seren_table` | a link to the table for this campaign, signed and short-lived (`/table/<token>`), and, where the client supports MCP UI resources, the table as an inline view |

The table is `render_table.py` from CC SEREN: one self-contained HTML file, then
`table.py check` against the live campaign. **If the check finds a leak, the table is not
served**; the tool returns a plain-text notice instead. Refreshes on every write; the
browser tab polls.

---

## ⭐ The handback: the server asks, the chat answers

**The problem it solves.** Over MCP the story lives in the player's chat, and we never see
it. The server only sees the tool calls: dice, state, facts. Everything else stays in the
chat: what the DM narrated, who said what, what the player decided, the NPC the DM made
up on the spot. That is lost when the chat ends, and we can't check any of it.

**The fix: every tool result can carry a request, and the model answers it.**

### 1 · The ask, on any tool result

Every tool result carries an optional `seren_asks` block:

```json
"seren_asks": {
  "why": "3 turns since the last sync",
  "send": ["narration", "introduced", "decisions"],
  "call": "seren_sync"
}
```

The server decides when to ask. Triggers:

| trigger | asks for |
|---|---|
| N turns (or N writes) since the last sync | `narration`, `introduced`, `decisions` |
| a name in a `seren_fact` or `seren_state present` that the server has never seen | `introduced`: who is this |
| a `StateRefused` | `narration`: what did you tell the player happened |
| a `move` accepted | `narration`: how did they get there |
| `seren_close` | everything (below) |

### 2 · The handback, sent with `seren_sync`

| field | what | server does |
|---|---|---|
| `narration` | the DM's narration since the last sync, **verbatim** | stores it in the session stream; runs `fog.check` and the fixture instruments on it (below) |
| `player` | what the player typed, verbatim | stores it next to the narration |
| `introduced` | new people, places, things, one line each | adds them to the campaign's canon as `src: play` |
| `decisions` | what the player chose, one line each | feeds the chronicle and the shelf's "last time" |
| `threads` | open threads, promises, hooks | the next session's resume |
| `dm_notes` | anything the DM is holding privately (a plan, a planted clue) | DM-side, never shown to the player |

Every field is optional on a sync. A partial handback beats none.

### 3 · Session end: the chronicler is part of `seren_close`

`seren_close` takes **the full handback plus the chronicle** in one call:

- everything since the last sync, as above;
- `chronicle`: the session told as a story, written by the player's model from its own
  context, following the chronicle brief (`CHRONICLE_PROMPT`, which `/seren` delivers at
  the start so the model has it at the end);
- `summary`: three lines for the shelf card.

The server then runs, in order: store the handback → `fog.check` the chronicle (it is
read later, outside the table, and a leak there is permanent; a leak sends it back with
the leaked line named) → `reconcile` → `promote` → close the session.

**Why one call:** web did the chronicle as a second model pass on a stream it already
had. Here the only thing that holds the whole session is the player's chat, and a
two-step close is a close that half-happens when the player shuts the tab.

### What it gets back for us

1. ⭐ **The narration gate comes back as an instrument.** We still can't stop a leak before
   the player reads it, but `fog.check` on the synced narration tells us it happened, on
   which turn, and in which campaign. Prevention is gone; detection isn't.
2. ⭐ **The fixture instruments work in production.** PC-as-subject, beats per turn,
   named actors, and **prose against state**: narration that says the party left while
   the recorded `where` did not move. The ask after a `StateRefused` exists for exactly
   that.
3. **Memory survives the chat.** A new chat's `/seren` resumes from the last handback, not
   from whatever the old chat remembered.
4. **The campaign grows.** NPCs the DM invented in play become canon the next session can
   look up, instead of being gone.

### The handback is only as good as what the client holds

*(Jay, 2026-09-22: "best in CC, not as good in Cowork, passable in chat." A presumption
to test in phase 0, not a measurement.)*

| surface | what it can send | handback quality |
|---|---|---|
| **Claude Code** | local files: a `LIVE/` folder like CC SEREN's, the transcript on disk. The handback can be the **files themselves**, not the model's memory of them | **best.** Exact, and survives the model forgetting |
| **Cowork** | local storage, so it can keep files too, but through a looser loop than CC | **good**, somewhere in between |
| **Chat** (claude.ai, Desktop, mobile) | only its context window. The handback is the model recalling the session, and on a long session the early turns may already be compacted away | **passable.** This is why the asks come every few turns rather than only at the end: sync while it still remembers |

**Consequence for the design:** the handback schema is the same on every surface, but a
client with local storage can attach files (`files: [{path, content}]`) and the server
prefers those over recalled text. **Chat is the floor we design for; CC is the ceiling.**
It also suggests a product tier: the best SEREN is in CC, which is where Jay plays it
now.

### The costs

- **Tokens, on their plan.** A verbatim sync repeats the narration. At 3-turn intervals
  that is about a third more output. Tunable: `narration` can be summarised when a session
  gets long.
- **Compliance.** It's still the model deciding to call `seren_sync`. The ask sits in a
  tool result, which models follow far better than a standing instruction, but it's still
  a request, not a control. **Measure:** handbacks received divided by handbacks asked.
- **Honesty.** A handback is the model's own account. "Verbatim" can drift into
  paraphrase. Spot check: our instruments count what's in the record against what the
  narration claims.
- **Privacy.** We now store what the player typed. That needs saying at sign-up, a
  retention period, and a delete button on the shelf.

---

⚠️ **The dice button: two modes, A/B tested** *(red team, 7)*. On web, the player pressed
the dice. "I rolled it" is part of tabletop psychology, so it isn't dropped on an
assumption.

| mode | flow |
|---|---|
| `immediate` | the model calls `seren_roll`, the server rolls at once, the result comes back in the same call |
| `player` | the model calls `seren_roll`; the result says *"waiting for the player to roll"*; the table shows ROLL; the player presses it; the server rolls; the model collects the result with `seren_look ledger` (the tool result tells it to) |

`player` mode costs an extra round trip and needs the table open. Per-campaign setting,
default `immediate` until the A/B says otherwise.

---

## Auth

- Discovery: `/.well-known/oauth-protected-resource` names our authorization server.
- Authorization server: a thin OAuth 2.1 layer over the Google sign-in we already have
  (`auth.py`). PKCE required. Dynamic client registration on, because Claude registers
  itself.
- The token is **audience-bound to this server**, carries the account slug, and lives 1
  hour, with refresh.
- **No tool accepts an account or a path.** A campaign is a slug looked up inside the
  caller's own shelf (`shelf.find`). Path traversal is impossible by construction, and
  tested anyway.
- New Google account at connect time → an account is created with the free plan and the
  three starters on its shelf.

## Limits

| | |
|---|---|
| Writes | 120 a minute per account (a heavy combat turn is about 10) |
| `seren_search` results | 10 |
| Any list | 20 a page |
| Chronicle | 20 KB |
| One `seren_sync` | 64 KB. Handback text is stored as data and never loaded back into anyone else's prompt |
| One campaign | one writer at a time. A second session on the same campaign gets *"this campaign is open elsewhere"* with an offer to take it over |

## Logging

- The ledger stays the record of play. The server adds nothing to it but what the tools
  already write.
- Per-call log: account, tool, campaign, latency, refused or not. **Never the arguments of
  `seren_fact` or the output of `seren_secrets`**, because logs are read by people who
  shouldn't learn the plot.

## Deploy

- New systemd unit `seren-mcp` beside `seren`, same box, Python 3.12 venv.
- nginx: `location /mcp` → the MCP process; `/.well-known/oauth-*` → the same process.
- Env in `/etc/seren.env` (shared): session secret, Google client, **plus** the OAuth
  signing key.
- ⛔ staging → prod is a human action, per the SA Build Safety Protocol.

---

## Tests before phase 1

1. **Isolation:** account A can't list, open, read or write account B's campaign, by slug
   or by guessing.
2. **Fog:** every read tool, called on the Weighbridge, returns none of its three DM-side
   facts. `seren_secrets` returns all three.
3. **Refusal:** `seren_state move` on a single-room fixture is refused, and the result
   text says not to narrate it.
4. **Table:** a planted DM-side fact in the render is caught by `table.py check` and the
   table is not served.
5. **Handback:** a refused `move` produces an ask; the synced narration that describes
   the move anyway is flagged as prose against state. A planted leak in synced narration
   is caught and logged.
6. **Cross-model matrix, secrets matrix, lock torture test:** as specified in
   [`REDTEAM-FINDINGS.md`](REDTEAM-FINDINGS.md) (#2, #3, #8).
7. **Replay:** the two recorded fixture turns, played in Claude Desktop over stdio, with
   the fixture instruments counting PC-as-subject, beats, facts and named actors. Compare
   with the web numbers in `../fixture/README.md`.

## Not in this server

- The Loom, heroes, the marketplace, billing: website.
- Narration: the player's model.
- Any model call of our own.
