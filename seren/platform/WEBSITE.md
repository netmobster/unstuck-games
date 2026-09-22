<!-- Written 2026-09-22 (Jay: "spec how the website changes with free signup, marketplace"). -->
# The website after the MCP move

**Status:** draft · **Companions:** [`PRD-TRD.md`](PRD-TRD.md) · [`MCP-SERVER.md`](MCP-SERVER.md) · [`MARKETPLACE-IDEAS.md`](MARKETPLACE-IDEAS.md)

> **The website stops being where you play, and becomes where you get ready to play:**
> sign up, connect your Claude, pick or make a campaign, build a hero, browse what other
> people made. Then you go to your chat and type `/seren`.

---

## What's there today (checked 2026-09-22, `web/server.py`)

| route | page | fate |
|---|---|---|
| `/`, `/home` | home: *"You brought one character. I have everyone else."* | **rewritten**: landing + the honest requirement |
| `/gate` | password gate (`SEREN_PASSWORD`) | **removed at phase 3**: free sign-up replaces it |
| `/auth/google…` | Google sign-in | kept, becomes the only door |
| `/account` | name, plan, API key | **extended**: connector status, your data |
| `/shelf` | your campaigns | **extended**: "Play in Claude" on every card |
| `/loom` | campaign creation | kept, **paid only** |
| `/play`, `/table` | the web table | **retired at phase 3**. Its URL becomes the read-only table viewer the MCP links to |
| `/chat` | older chat page | removed |
| `/contract` | the DM contract | kept: it's the best explanation of what SEREN promises |

## New pages

| route | page | phase |
|---|---|---|
| `/connect` | **connect your Claude**: the walkthrough | 3 |
| `/heroes` | build and keep heroes | 4 |
| `/market` | the marketplace: browse, take, publish | 5, off until then |
| `/t/<token>` | the table, read-only, signed and short-lived (what `seren_table` links to) | 1 |
| `/you/data` | what we store (the handback), download, delete | 3 |

---

## 1 · Free sign-up

**The flow:** landing → *Start free* → Google → your shelf, with the three starters already
on it → *Connect Claude*.

- **No password gate.** The gate exists because web play costs us money per turn; MCP play
  doesn't.
- **An account is created on first sign-in**, `plan = free` (the column exists:
  `accounts.plan TEXT NOT NULL DEFAULT 'free'`). The starters are copied onto the shelf
  then, so the shelf is never empty.
- **Rate limit sign-ups** per IP. Nothing else stops abuse, and a free account costs us
  storage and table renders.

### ⛔ The honest requirement, on the landing page, before sign-up *(red team #5)*

Say it in the hero, not the footer:

> **Free to play in your own Claude.** SEREN runs inside Claude (Pro or higher)
> *[exact plans: open question #1]*. We hold the dice and the world; your Claude tells the
> story.

A person without a compatible plan finds out **before** they sign up, not after they've
built a hero. Test the exact wording in the cold-user funnel test.

---

## 2 · `/connect` — the page the launch depends on

**Red team #1: this is probably the launch-killer.** Everything on this page exists to cut
steps.

- **Detects nothing it can't know.** It asks: *Which do you use?* Claude on the web ·
  Claude Desktop · Claude Code · another MCP app.
- **One screen per client**, each with: the exact URL to paste (one copy button), a
  screenshot per step, the permission dialog they'll see and what to click.
- **Claude Code gets one command** to paste (`claude mcp add …`). Shortest path, and the
  best surface for the handback.
- **The page knows when it worked.** The first authenticated MCP call from this account
  flips `connected_at`, and the page (polling) turns green: *Connected. Go to any chat and
  type `/seren`.* No "did it work?" guessing.
- **If it didn't:** the three failure causes we can see (never authorised, token
  expired, wrong plan), each with its fix.

**Measured, per the red-team finding:** time and step count from landing to first
meaningful action, and where people drop. Logged per step from day one.

---

## 3 · The shelf

Each campaign card gains:

- **Play in Claude**: copies `/seren <slug>` and says *paste this into any Claude chat*.
- **Last time**: the three-line summary from the last `seren_close`, and the open threads.
- **Chronicles**: read each session's chronicle. The first thing most players will want
  to share, so it gets a share link (chronicle only, never state).
- **Open elsewhere**: shown when the campaign's lock is held, with *take over*.

---

## 4 · The Loom (paid)

Unchanged in what it does. What changes:

- **Free accounts see it and can't run it.** They see what it would make (the three
  starters were made with it) and the price.
- ⚠️ **It still runs on our model (Bedrock).** Claude on Bedrock is blocked for us, so
  the paid feature runs on Nova Pro today. **Don't sell it until the Bedrock form clears
  or the Loom moves to the Anthropic API.** Flagged in the brief.
- A woven campaign lands on the shelf with *Play in Claude* on it.

---

## 5 · Heroes (`/heroes`, phase 4)

- Build a hero outside any campaign: species, class, background, and a short history.
  The same sheet format as `builds/<pc>.md`.
- **Bring a hero into a campaign** from the shelf. **The v1 rule:** the hero keeps their
  story and enters at the campaign's starting level. Their numbers don't travel; their
  history does.
- Free: one hero. Paid: unlimited.

---

## 6 · The marketplace (`/market`, phase 5)

⛔ **Off at launch. Its own threat model first** (red team #4: stranger-authored content
loaded into a player's Claude is an injection path into that player's other connectors).

What it will be, in outline. The full list of what can be sold is in
[`MARKETPLACE-IDEAS.md`](MARKETPLACE-IDEAS.md).

- **Browse** by kind (campaign, hero, antagonist, NPC…), tone and level.
- **Take**: copies a snapshot onto your shelf or into a campaign. Never a live link.
- **Publish** (paid): from your shelf or `/heroes`, through the checks: licence, content,
  structure, and the **injection scan** (below).
- **Report**, and takedown.
- **v1 is free listings only.** Paid listings (payouts, tax, refunds) are a later
  decision.

### The injection scan, the one check that doesn't exist yet

Every text field of a listing is scanned for instructions aimed at a model rather than
prose aimed at a player: tool names, "ignore previous", role claims, URLs, anything
addressing "Claude" or "the assistant". **A hit blocks publishing and goes to a human.**
It won't catch everything; the threat model decides whether it's enough.

---

## 7 · Account and your data (`/you/data`)

The handback means **we now store what players type** (red team, 2b). So:

- **Say so at sign-up**, in one line.
- **Retention**: the verbatim stream is kept N days (open: 90?), then only the chronicle
  and the facts remain.
- **Download everything** (the campaign folder, zipped).
- **Delete**: a campaign, or the account and everything under it. Real deletion, not a
  flag.

---

## API additions

| method | path | does |
|---|---|---|
| GET | `/api/connect/status` | `{connected_at, last_call, client}` — what `/connect` polls |
| POST | `/api/shelf/take-starter` | copies a starter onto the shelf (idempotent) |
| GET | `/api/campaign/:slug/chronicles` | the chronicles, player-visible |
| POST | `/api/campaign/:slug/takeover` | takes the lock |
| GET/POST | `/api/heroes` | list, create |
| POST | `/api/heroes/:id/bring` | brings a hero into a campaign |
| GET | `/api/you/export` | the zip |
| POST | `/api/you/delete` | deletes, with a confirm token |
| — | `/api/market/*` | phase 5, specified with the threat model |

**Data model additions:** `accounts.connected_at`, `accounts.last_mcp_call`; a `heroes`
table (id, account, sheet path, created); later `listings`, `takes`, `reports`.

---

## Open questions

1. Exact Claude plans that allow custom connectors (decides the landing-page line).
2. Billing provider for paid, and the price.
3. Handback retention period.
4. Does the web table survive as a read-only viewer only, or does anything interactive
   stay? (The dice A/B's `player` mode needs a ROLL button, so something interactive
   probably does.)
