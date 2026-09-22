<!-- Written 2026-09-22 for red-team review. Decision filed in IDEAS.md (PR #122). -->
# SEREN on MCP — PRD / TRD

**Status:** draft for red team · **Owner:** Jay · **Written:** 2026-09-22
**Companions:** [`MCP-SERVER.md`](MCP-SERVER.md) (the server spec) · [`REDTEAM-BRIEF.md`](REDTEAM-BRIEF.md) (read this first if you are reviewing)

---

# Part 1 — PRD

## The one-sentence change

> **Players stop playing SEREN on our website against our model, and start playing it in
> their own Claude (or any MCP client) against our rules engine.**

The website stays. It keeps everything that is not a session: the Loom (campaign
creation), hero creation, the shelf, the account, the marketplace. **Only session play and
the table move into chat**, and they arrive through one command: `/seren`.

## Why

### 1 · SEREN web is a custom chatbot, and custom chatbots have a known failure mode

To run SEREN on the web we had to build a chatbot: a model, a prompt, a context window,
a trim policy, a tool loop. Hosted chatbots built that way are known for two things:
**short answers and forgetting.** That is exactly what the web build does.

Measured, not felt (see `../DELTA-CC-VS-WEB.md`, `../fixture/README.md`):

| fault on web | cause |
|---|---|
| She forgets what happened three scenes ago | `dm.trim()` keeps a fixed number of turns; the rest is gone |
| She can't look anything up | the web tools are `roll · fact · state · ruling`, **all writes, no reads** |
| Flat, short, one-beat prose | Nova Pro. Every Claude model on Bedrock is blocked pending a use-case form (submitted 20 Sep, no answer) |
| She plays the PC, leaves the room, logs weather as a fact | a weak model with no way to check the record before writing |

> ⭐ **Making a chatbot good at long-form, long-memory play is someone else's full-time
> job**: Anthropic's, specifically. It is not ours. Moving to MCP stops us competing with
> the host on the thing the host is best at.

### 2 · The CC version already proves it

SEREN in Claude Code, with file reads, a strong model and a rendered table, is the version
Jay actually enjoyed playing. MCP is how that version reaches people who are not running
Claude Code.

### 3 · The cost model flips in our favour

| | web today | MCP |
|---|---|---|
| Who pays for play tokens | **us**, every turn | **the player's own plan** |
| Our per-turn cost | Bedrock inference | a few tool calls on a small box |
| What we charge for | unclear | **campaign creation** (the Loom) and publishing to the marketplace |

### 4 · The moat gets deeper as the models get better *(red team, T)*

If Claude gets dramatically better at narration, improvisation and memory, SEREN is worth
**more**, not less. A brilliant storyteller with no record gives you *"cool story, bro"*;
SEREN is what adds *"…but your wizard died three sessions ago."*

> ⭐ **The moat is not a better DM AI. It's a persistent game reality that an ever more
> capable AI has to operate inside.**

Tested by the cross-model matrix: the stronger the host, the more of the remaining
failures should be ones the record catches.

## Who it is for

1. **People who already pay for Claude** and want a solo tabletop game that remembers,
   keeps honest dice and does not cheat on hidden information.
2. **People on other MCP clients**, second. The table must work somewhere a sidebar
   artifact does not exist, so it also opens in a browser tab.

## What the player does

1. Signs in on the website with Google. Picks a starter campaign, or makes one (paid).
2. Adds the SEREN connector to Claude once (the website walks them through it).
3. In any chat: types `/seren`. SEREN lists their shelf; they pick a campaign.
4. The chat becomes the table. The DM narrates, asks for rolls, records costs.
5. The table (sheet, HP, dice log, what the party knows) sits beside the chat as an
   inline view, or opens in a browser tab.
6. They stop whenever they like. SEREN saves at session close; the next `/seren` picks up
   where they left it.

## Scope

### In the chat (via MCP)

- `/seren`: list, pick and resume a campaign
- Session play: the DM's tools (roll, fact, state, ruling) **plus reads** (see TRD)
- The table view
- Session close: reconcile, chronicle, save

### On the website

- Sign-in, account, plan *(built)*
- **The Loom: campaign creation. Paid.** *(built)*
- **Hero creation**: build a PC outside a campaign and bring it to any campaign *(new)*
- The shelf: archive, discard, what's in progress *(built)*
- **The marketplace** *(new, see below)*
- Chronicles to read back

### ⛔ Out of scope for v1

- Multiplayer (one player, one PC, one DM)
- Voice
- Running our own model for play in any form
- A SEREN mobile app

## Free and paid

| | Free | Paid |
|---|---|---|
| Play any campaign on your shelf in your own Claude | ✅ | ✅ |
| The three starter campaigns | ✅ | ✅ |
| Heroes: make and keep | 1 | unlimited |
| **The Loom: create a campaign** | ❌ | ✅ (N a month, number TBD) |
| Marketplace: take free listings | ✅ | ✅ |
| Marketplace: publish | ❌ | ✅ |

⚠️ **Free play is only free for us because the model is theirs.** A person whose Claude
plan does not allow custom connectors cannot play at all.

⚠️ **"Free" is a semantic trap** *(red team, 5)*. A normal person reads "Free SEREN" as "I
can play", not "I can play if I already pay for a compatible AI product and can set up
MCP." **The requirement goes on the landing page, before sign-up**, and the wording is
tested in the cold-user funnel test.

## ⛔ The three starter campaigns: a launch blocker

**A free tier with nothing to play is not a free tier.** We need three campaigns that ship
on day one, owned outright, and today we have **zero** we can ship:

| candidate | status |
|---|---|
| `sheep-crazy` | ⛔ can't ship: built on material we don't own outright |
| `content/generated/01–10` | Loom output. Unreviewed, uneven quality (see `../GENERATOR-TEST.md`) |
| The Weighbridge (`../fixture/`) | original and hand-written, but **one room, one night, a test harness**; its README says it never ships |

**Proposal:** three hand-finished campaigns in three different tones, for example a
one-night mystery (grow the Weighbridge cast into a real campaign), a travelling
adventure, and a heist. Generate each with the Loom first, then edit by hand. **This
doubles as a test of the Loom, the thing we are charging for.**

**A starter is accepted when:** it plays three sessions in the MCP build without a named
fixture fault (playing the PC, contradicting the state, fact spam), and every file that
uses SRD material carries the SRD 5.2 / CC-BY-4.0 attribution.

## The marketplace: campaigns and heroes

> ⛔ **Launches separately, after MCP play, with its own threat model** *(red team, 4)*.
> Stranger-authored content loaded into a player's Claude is an injection path into
> that player's other connectors (mail, drive, calendar). That is a different and far
> worse system than "the DM leaked its own dungeon's secret". **MCP play ships with the
> marketplace switched off.**

**What is listed:** campaigns (a module folder: campaign, cast, fronts, canon) and heroes
(a PC sheet plus a short history).

**The v1 shape, deliberately small:**

- A listing is a **snapshot** of a module or a hero, never a live link to someone's save.
  Taking one copies it to your shelf. The author's play state never travels.
- **Free listings only in v1.** Paid listings mean payouts, tax and refunds: a v2
  decision, not a launch dependency.
- Publishing is a paid feature (as much spam control as revenue).
- Every listing passes the checks a starter does: licence (no non-SRD rules text, no
  third-party IP), content, and structure (does it load and play).
- Reporting and takedown from day one.

⚠️ **Open: heroes crossing campaigns.** A level-9 hero in a level-1 campaign breaks it.
v1 answer: a hero enters at the campaign's starting level, keeping its story and dropping
its numbers. Red team should push on this.

## Success measures

- A player finishes a first session in the MCP build and comes back for a second
- **Zero** fog leaks in the table view (the table check refuses to render a leak)
- Play costs us under 1¢ a session in infrastructure
- Paid conversion driven by the Loom, measured after launch

---

# Part 2 — TRD

## Architecture

```
  ┌───────────────────────┐        ┌─────────────────────────────────────┐
  │  Player's Claude      │  MCP   │  seren-mcp  (new process, EC2)      │
  │  (any MCP client)     │◄──────►│  prompt:    /seren                  │
  │  their model = the DM │  HTTP  │  tools:     reads + writes          │
  └──────────┬────────────┘ +OAuth │  resource:  the table view          │
             │                     └──────────────┬──────────────────────┘
             │ table link                         │ imports, unchanged
             ▼                                    ▼
  ┌───────────────────────┐        ┌─────────────────────────────────────┐
  │  Browser tab          │◄───────│  SEREN engine  (seren/web/*.py)     │
  │  /table/<token>       │        │  dice · state · fog · close · shelf │
  └───────────────────────┘        │  accounts.db · content/players/...  │
                                   └──────────────▲──────────────────────┘
  ┌───────────────────────┐                       │
  │  Website (existing)   │───────────────────────┘
  │  Loom · heroes · shelf · account · marketplace
  └───────────────────────┘
```

**One engine, two front doors.** The MCP server imports the same Python modules the web
server uses. Nothing is forked. A campaign made on the website is playable over MCP
because it is the same folder on the same disk.

## What ports and what is thrown out

| piece | fate |
|---|---|
| `dice.py`: rolls, ledger, player-source refusals | ✅ ports as-is |
| `state.py`: `apply_state`, `StateRefused`, `Campaign` | ✅ ports as-is |
| `fog.py`: fact visibility, `player_facts` | ✅ ports; the **read** tools filter through it |
| `close.py`: reconcile, promote, chronicle | ✅ ports; the chronicle is written by **their** model and arrives in the handback |
| `shelf.py`, `accounts.py`, `auth.py` | ✅ ports as-is |
| `weave.py`: the Loom | stays on the website (paid) |
| `dm.py`: system prompt, `trim()`, tool loop | ⛔ **thrown out.** The host owns the loop and the context |
| `llm.py`: Bedrock client | ⛔ not used for play. Kept for the Loom |
| `fog.check()` on narration | ⛔ **lost.** See below |
| The DM contract (`rules.dm`), the state formats | ✅ become the `/seren` prompt text |
| The CC table (`SEREN/scripts/render_table.py` + `table.py check`) | ✅ becomes the table view; the check still runs |

## ⛔ The cost we are choosing to pay: the narration fog gate

On web, every narration passes through `fog.check()` before the player sees it. **Over
MCP, narration goes straight from their model to their screen. We never see it.**

What we keep:

1. **Secrets are kept apart, not kept safe.** The read tools return player-visible facts
   only. DM-side secrets come from one separate tool, `seren_secrets`, which the prompt
   tells the DM to use for its own reasoning.
   ⛔ **Once `seren_secrets` has been called, the only thing between a secret and the
   player is the host model's instruction-following. That is a trust boundary, not a
   security boundary**, and nothing in these docs should describe it as one. Measured
   by the secrets matrix in [`REDTEAM-FINDINGS.md`](REDTEAM-FINDINGS.md).
2. **The table is still checked.** We render the table view and run `table.py check`
   before serving it. A leak there is still impossible.
3. **The ledger is still honest.** The server rolls the dice; the model can't supply an
   outcome.

CC SEREN never had a narration gate either (ledger e013), and it is still the version
that plays best. **Recorded as an accepted risk, not an oversight.**

## ⭐ The handback: getting the story back out of the chat

Tool results carry a request (`seren_asks`), and the model answers it with `seren_sync`:
the narration verbatim, what the player typed, new people and places, decisions, open
threads. At session end, **the chronicler is built into `seren_close`**: one call sends
everything local plus the chronicle. Full spec in [`MCP-SERVER.md`](MCP-SERVER.md).

What it buys back:

- **The fog gate returns as detection.** We can't stop a leak before the player reads it,
  but `fog.check` on synced narration tells us it happened.
- **The fixture instruments run in production**, including prose against state.
- **Memory outlives the chat**, and NPCs invented in play become canon.

It works best where the client keeps files: **CC (exact) > Cowork > chat (the model's
recall).** Chat is the floor we design for.

⚠️ New obligation: we now store what players type. That needs a line at sign-up, a
retention period, and a delete button.

## Identity and auth

- **One identity: the Google `sub`.** The website already keys accounts on it
  (`accounts.py`). The MCP server uses the same one.
- The MCP server is an **OAuth 2.1 protected resource**. On connect, the client is sent
  to our authorization server, which is Google sign-in, and gets a token bound to the
  account slug. Same shape as the SelfActual MCP connector we already run.
- Every tool call resolves `token → account → campaign folder`. **No tool takes an
  account as an argument.** You can only touch your own shelf.

## Where the model runs

| job | model |
|---|---|
| Session play (narration, tool calls) | **the player's**, over MCP |
| Session close: the chronicle | **the player's**: their model writes it from its own context and sends it inside the full handback on `seren_close` |
| The Loom (campaign creation) | ours (Bedrock), paid, website only |

Nothing in play calls Bedrock. **The Claude-on-Bedrock block stops mattering for play**
and matters only for the Loom.

## Runtime

- **Python.** The engine is Python and must not be forked.
- ⚠️ **The box runs Python 3.9. The official MCP Python SDK needs 3.10 or newer** (checked
  today: `mcp` 2.2.0, `requires_python >=3.10`). Plan: install Python 3.12 alongside 3.9
  and run `seren-mcp` under it as its own systemd unit. The engine is 3.9-safe code
  (`tools/py39-check.py`) and runs unchanged on 3.12.
- Transport: **Streamable HTTP**, behind nginx.
- Same disk as the web server: `/srv/seren/content/players/...`. **One writer per
  campaign at a time** (a file lock), because a player can have the website and a chat
  open at once.

Full spec: [`MCP-SERVER.md`](MCP-SERVER.md).

## Phasing

Gates reworked after the first red-team pass ([`REDTEAM-FINDINGS.md`](REDTEAM-FINDINGS.md)).
⚠️ **Jay's own play is no longer the gate for anything past phase 0.** He already knows
how SEREN thinks.

| phase | ships | gate |
|---|---|---|
| **0 · Local** | the MCP server over stdio against a local content dir; Jay plays the Weighbridge in Claude Desktop | Jay plays a session and prefers it to web |
| **1 · Remote, Jay only** | Streamable HTTP + OAuth on staging; table view by link | **cross-model matrix** run and published · **secrets matrix** run and its result documented as a trust boundary · **lock torture test** passes · dice A/B started |
| **2 · Starters** | three starter campaigns finished and playable | each passes the starter acceptance above |
| **3 · Open** | public connector, website onboarding, free tier. **Marketplace off** | **cold-user funnel test** (screen recording, no help) · **stranger playtest** (no coaching) · "free" wording tested |
| **4 · Heroes** | hero creation | heroes-across-campaigns rule survives the stranger playtest |
| **5 · Marketplace** | free listings; publishing for paid | **its own threat model and review**, injection into other connectors first; licence and content checks in place |

## Open questions

1. **Which Claude plans let a user add a custom remote MCP connector**, and does
   `/seren` appear as a prompt in each client? *This decides the size of the free tier.*
2. Do clients render an inline MCP UI view for the table, or is a browser link the only
   dependable path? Build the link first; inline is a bonus.
3. The Loom allowance for paid: how many campaigns a month.
4. Heroes across campaigns (see PRD).
5. Does web play stay as a fallback for people with no MCP client?
   **Recommendation: retire web play at phase 3.** One front door for play.
