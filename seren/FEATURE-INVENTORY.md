<!-- Written 2026-09-20 at Jay's instruction: "document each feature in one file." -->
# Feature inventory — SEREN (Claude Code) and SEREN (web)

**What this is.** Every feature of both systems, described, with where it lives. ⛔ **This
file makes no judgements and proposes nothing** — the gap analysis and the recommendations
are in [`FEATURE-GAPS.md`](FEATURE-GAPS.md), deliberately separated so this one can be
read as a record rather than an argument.

⚠️ **Documenting a CC feature is not a proposal to port it.** Jay, 2026-09-20: *"Doesn't
mean we KEEP Seren CC stuff but identifying gap."*

**The two systems.**

| | |
|---|---|
| **CC SEREN** | `PROJECTS/SEREN/`. A Claude Code session is the DM. The model reads markdown, calls Python scripts, and writes files. One player, one operator, no server |
| **web SEREN** | `PROJECTS/UNSTUCK/seren/`. A Python stdlib HTTP server. Bedrock is the DM, reached through a tool-calling loop. Multi-account, behind a password and Google sign-in |

**Verified by reading both trees on 2026-09-20.** Where a claim is about the web port it
names a file and usually a line.

---

# 1 · The turn loop

**CC** — `docs/architecture.md` §4. The player says something; the DM narrates, calls for a
roll when the success state could change, runs `scripts/gate.py` to roll and log in one
operation, narrates the result it was handed, and writes state changes to the files. The
loop is the session; there is no server holding it.

**Web** — `web/dm.py` `_continue()`. Same shape, made mechanical: Bedrock Converse with a
tool config (`roll` · `fact` · `state` · `ruling`), results appended and handed back. ⭐
**The roll is the one asymmetry:** when the model calls `roll`, the loop **stops**, the
player is shown that a roll was asked for, and it resumes only when they press the dice
(`server.py /api/roll`). One roll at a time, enforced by the loop rather than requested.

**Prompt assembly** — `dm.py system_prompt()`. Four layers, split across a Bedrock cache
point: **static** (the contract · state formats · this campaign) and **volatile** (where
things stand · the web amendment). 7,488 cached tokens read back at a tenth of the price.

---

# 2 · Dice, and the roll gate

**CC** — `scripts/gate.py`. *The roll and the ledger line are one operation. An unlogged
roll is an unrolled roll.* Refuses an entry arriving with `roll`, `total`, `pass` or `hit`
already filled, and refuses a d20 with nothing to beat.

**Web** — `web/dice.py`, the same rules as code rather than a script the DM chooses to
call. `roll()` refuses the same four forbidden fields, refuses a d20 without `dc` or `vs`,
computes the verdict from the arithmetic, handles advantage by recording the dropped die.
The model **cannot** roll: there is no shell.

**Both carry:** the DC is derived from the object, the stat block or the rules, and where
it came from is written in `note`.

---

# 3 · Fog of war

**CC** — `architecture.md` §3 and `DM.md` §3. Four visibilities. `scripts/table.py`
strips DM-side fields before rendering the player's panel, then re-scans the rendered page
and deletes it if anything got through. ⚠️ Ledger entry `e013` records the structural
failure: *the panel was gated and the chat was not, and chat is where every word of this
went.*

**Web** — `web/fog.py`, run on the narration itself. Three checks: `BANNED_FIELDS` (keys
like `clock:`, `secret:`, `truth:`), `BANNED_PATTERNS` + `TABLE_TALK` (clock bars, a bare
"DC", any named skill check, a spoken roll or total, a restated verdict, the word "NPC"),
and a **phrase-lift** check against `dm_side` — the concatenated fronts, antagonist files,
rulings and **hidden facts**. On a leak the **whole message is held**, never redacted: *a
redacted sentence is a puzzle with the answer printed underneath.*

**`state.dm_side()`** excludes facts whose `src` is `player` — a thing the player watched
themselves do is not DM-side knowledge.

---

# 4 · The ledger

**CC** — `docs/state-formats.md` §2. `ledger.jsonl`, append-only. A declared shape per
type, roll types and state-event types, and **reconstruction** — the current state is
derivable from the ledger alone.

**Web** — `web/dice.py` writes the same file; `note()` adds lines with no die under them
(a ruling, a cast, a state change). ⬜ **Reconstruction is not implemented** — the web port
reads `party.md` and `scene.md` as the current state and treats the ledger as the record.

---

# 5 · The knowledge record

**CC** — `state-formats.md` §5. `facts.jsonl`, four visibilities (`true` · `known` ·
`suspected` · `false`), three closed operations (`establish` · `flip` · `believe`).
⚠️ §5.5 is titled *"It has no consumer yet."*

**Web** — `web/dice.py fact()`, the same closed vocabulary, plus two refusals added
2026-09-20: a fact may not name *"the user"* or *"the player"*, and a `src: player` fact
may not be tagged `true` or `false`. **It has consumers:** `dm_side()` (the fog gate) and
`fact_beat()` (a CODEX line shown to the player for `known`/`suspected` facts only).

---

# 6 · Party and scene state

**CC** — `state-formats.md` §3–4. `party.md` is the persistent side (HP, slots,
conditions, concentration, hit dice, XP); `scene.md` is the transient side (where, who is
present, round, initiative, foes, zones as free text).

**Web** — same two files, same shapes. `web/state.py apply_state()` is the write path:
**the DM says the change, never the resulting number.** The server reads the current value,
does the arithmetic, clamps it, and writes. Ops: `hp` · `condition` · `where` · `present` ·
`round` and others. A refusal returns to the model as a tool result.

---

# 7 · Fronts and clocks

**CC** — `architecture.md` §6. A campaign is fronts with clocks, not a script. Each front
wants something, has an impulse, and advances on a named condition.
`session-ceremonies.md` §4 settles *when* a clock may tick.

**Web** — `fronts.md` is written by the weaver and read into `campaign_static()`.
`web/audit.py` refuses a campaign whose front has no clock of at least two stages, and
requires an **interlock** — at least one front must want something only another front
holds. ⛔ **Nothing advances a clock.** No code in `seren/web/` ticks one; the DM is asked
to, in the contract.

---

# 8 · Antagonists

**CC** — `npcs/antagonists/` templates, activated at campaign start
(`campaign-start.md` §5b) with an `appears_when:` condition and an `escalation:` ladder.
`DM.md` §6 checks appearance conditions at every beat completion. ⚠️ *"A thing that fires
at no named moment fires never"* — the rule was added after six nemeses shipped with no
first-appearance trigger.

**Web** — `weave.py` writes **one** antagonist into `canon/antagonists/<slug>.md`.
`audit.py` requires a name and a grudge. ⬜ No `appears_when`, no escalation ladder, no
appearance check.

---

# 9 · NPCs — the container system

**CC** — `docs/npc-containers.md`, four parts:

1. **The container** — one file per person: `Knows` · `Wants` · `Found` · `Voice` ·
   `Hooks` · `Escalation`.
2. ⭐ **The interactions log** — `<slug>-interactions.md`, created lazily, appended, never
   rewritten. **One entry per session per NPC.** *"The container says who Hal is and stays
   stable. The log says what happened and only grows."*
3. ⭐ **`charactermap.md`** — called *the load-bearing file*. Residents and Currently
   present, **links and one line of role, nothing else ever.** *"This is what keeps a long
   campaign inside a context window: the DM reads the map, then loads only the containers
   for people actually in the scene."*
4. **Role templates** — `npcs/tables/roles/<role>.md`. *"A role is generation scaffolding,
   not a character. It biases what the AI invents so that the fifteenth villager doesn't
   sound like the first."* **Lean, 20–30 lines.**

**Web** — ⭐ **the role templates shipped**: `content/npcs/tables/roles/` carries **42** —
`hostile/` 10, `town/` 20, `world/` 12 — complete with `Voice` sections. `corpus.roles()`
reads them. ⛔ **Its only caller is `corpus.health()`, which counts them for a status
endpoint.** No containers, no interactions log, no charactermap. `canon/characters/` does
not exist.

---

# 10 · Locations

**CC** — `canon/locations/<place>.md`, and the NPC tree hangs off the place.

**Web** — ⬜ none. `scene.md` carries a `where:` string.

---

# 11 · The DM persona

**CC** — `dm/persona-format.md` **v2**: Part 1 identity · Part 2 the seven dials (roll
frequency, failure texture, clock pressure, humour source, silence tolerance, canon
generation, callback appetite), with a **floor of three set rows** and a rule that an unset
row must state *which kind* of unset · Part 3 **moves — "the teeth"** · Part 4 a
**prediction** · Part 5 when this persona is wrong. Five written personas in `dm/personas/`.
The Registrar was played 2026-08-27 and **scored 2.5 of 3 on its prediction**.

**Web** — `weave.py` writes a name, `**Told like:**`, `**Which means:**`, and a paragraph
saying it is a voice rather than a person in the room. ⬜ No dials, no moves, no
prediction. 6 of Jay's 11 campaigns have no persona file at all (woven before it shipped).

---

# 12 · The table agreement

**CC** — `dm/table-agreement.md`. The player's standing position on content, push-back,
lethality and telegraph density. ⭐ **It amends the contract and outranks the persona.**

**Web** — ⛔ **it ships and is never read.** `content/dm/table-agreement.md` exists;
`corpus.rules()` returns only `dm` and `state_formats`; nothing anywhere opens it.

⚠️ **And `dm.py`'s own module docstring says otherwise:**

```
1  the contract      dm/DM.md, then table-agreement.md     (never changes)
…
Order matters, and so does precedence: DM.md outranks the table agreement, which
outranks the persona.
```

**The file documents a load that does not happen.** The player's standing position on
lethality, push-back and telegraph density has never reached the DM.

---

# 13 · Character building — `devolve`

**CC** — `docs/devolve.md`. `devolve(master, level)` derives a campaign build from a master
sheet, with **a refusal**: it detects inherited higher-level material by proof rather than
inspection and refuses to emit a build carrying it. The import path uses the same gate.
Consultation mode for the parts that cannot be derived.

**Web** — ⬜ none. `weave.py` writes a provisional level-1 sheet marked *"Stats are
provisional: standard array, and honest about it."* `state.sheet()` reads `builds/<pc>.md`.

---

# 14 · The library

**CC** — `library/srd-5.2/`, `2024/`, homebrew feats and items, plus
`library-manifest.md` per campaign: **a manifest, not a copy** — which rules this party
actually plays under.

**Web** — the same library ships in `content/library/`. `state.library()` resolves the
manifest's rows. ⚠️ The weaver does not write a manifest, so woven campaigns have none.

---

# 15 · The Table — the player-facing panel

**CC** — `docs/table-spec.md`, `scripts/render_table.py`, `table.html` per campaign. A
rendered page showing the numbers, gated by `table.py`.

**Web** — `static/table.html`, live. `player_view()` feeds it; it shows the Record, the
codex, the sheet, the party, quests and the dice tray. ⭐ **The roll insert shows the
inputs and never the DC**, per `ROLL-MECHANIC.md`. Plus music, house rules, and AI-written
suggestion chips (`chips.py`, Nova Lite, reading only the player's own stream).

---

# 16 · Session ceremonies

**CC** — `docs/session-ceremonies.md`. **Session start, four steps**, called *the most
important thing in the system*: an independent reconciliation of the ledgers before
anything is narrated. **Session close, six steps**: validate first, then write the session
log, promote facts into canon, tick clocks, and rebrief.

**Web** — `web/close.py` runs a close: counts rolls and facts, writes a session log.
⬜ No session-start reconciliation. ⬜ No promotion into canon. ⬜ No rebrief.

---

# 17 · Campaign creation

**CC** — `docs/campaign-start.md`, nine steps: create the folder · **session zero →
`DM-persona.md`** · author the fronts · devolve the party · signature feats · activate the
antagonists · the starting location · the t=0 manifest · hand off to the DM. A human is in
every step.

**Web** — **the Loom** (`static/loom.html`): a dealt hand of cards — origin, build, trope,
world, companions, DM persona, plus five dials. Then **one** Bedrock call
(`weave.py weave()`) writes the whole campaign, then `audit.py` refuses or accepts, with
**one mend pass** if it refuses. ⭐ **The auditor is code, never a model** — a model's
opinion can advise where code can refuse.

---

# 18 · Validation

**CC** — `scripts/gate.py check` (both ledgers) · `preflight.py` (42 checks) ·
`verify.py` (the tracked tree) · `checksite.py` (the website) · `live.py` · `library.py` ·
`persona.py`.

**Web** — `web/audit.py`, **build-time only**: fact count, visibilities, at most one
`known` at t=0, at least one `true`, front interlock, impulses, clocks, antagonist name and
grudge, an opening, premise length, nobody called Seren, no borrowed setting. Plus
`tools/py39-check.py` — the box runs Python 3.9 and the laptop 3.14.

---

# 19 · Rulings, ideas, queue

**CC** — `rulings.md` (calls made, so they stay made) · `ideas.md` · `state/queue.md`.

**Web** — the `ruling` tool writes a line into the ledger. ⬜ No `rulings.md`, no
`ideas.md`, no queue.

---

# 20 · Memory

**CC** — a Claude Code session: the whole conversation, plus every file the DM chooses to
open, plus the canon files that accrete during play.

**Web** — `messages[-24:]` in `server.py`, where one player turn is four messages and six
if a roll splits it, so **about six player turns**. ⛔ The slice can sever a tool result
from its call. Durable state is whatever reached a file: the two ledgers, `party.md`,
`scene.md`.

---

# 21 · What the web port has that CC does not

| | |
|---|---|
| **Accounts** | Google OAuth, sqlite, folder adoption (`accounts.py`, `auth.py`) |
| **Multi-user** | sessions keyed by account and browser; two people, two tables, one process |
| **The shelf** | campaign list with summaries, archive, and discard-to-`.trash` (`shelf.py`) |
| **The Loom** | a dealt hand → one AI call → an audited campaign, in about a cent |
| **The auditor** | build-time refusal of a campaign, in code |
| **Prompt caching** | a Bedrock cache point; ~20¢ per thirty turns on Nova |
| **Suggestion chips** | a small model reading only what the player can see |
| **The password door, the fog gate on chat** | the leak surface CC's ledger `e013` identified and CC never closed |
| **Session resume** | `session.json`; a refresh costs nothing |
