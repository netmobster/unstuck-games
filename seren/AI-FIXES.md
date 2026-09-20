<!-- The running list of AI-quality fixes for the SEREN web port. Opened 2026-09-20. -->
# AI fixes — the standing list

**What this file is.** Every fix aimed at the *quality of what the DM says*, in one place,
with its evidence and its status. Separate from the feature work, because the feature work
has a shelf and a login and this does not.

**The companion documents:**
- [`DELTA-CC-VS-WEB.md`](DELTA-CC-VS-WEB.md) — *why* the two systems read differently.
  Nine sections. Read §§8–9 first if you only read two.
- [`FEATURE-INVENTORY.md`](FEATURE-INVENTORY.md) — every feature of both systems.
- [`FEATURE-GAPS.md`](FEATURE-GAPS.md) — the gap per feature, and what tier of machinery
  should close it.
- [`FIRST-PLAY.md`](FIRST-PLAY.md) — the original four faults from the first browser
  session, 2026-09-19, and what happened to each.

---

# The governing idea, settled 2026-09-20

> ### Code decides what happened. The model says what it was like.
>
> **Deterministic where a wrong answer breaks trust** — the dice, the verdict, the fog,
> the record. **Nowhere else.** A DM that fudges a roll has betrayed the player; a DM that
> writes a flat paragraph has given them a worse evening, and those must not get the same
> machinery.

⭐ **Jay, 2026-09-20:** *"We don't need deterministic. Like IMPRINT, Seren is designed to
exist in the mess. Rolling is deterministic, narrative is not."* · *"It's why rolling is in
python… we can likely math a lot, and present the 'work' to an AI to interpret vs having AI
do all the lifting."*

**Build-time refusals guarantee the materials. Play-time additions hand her something to
say. Neither tells her how to say it.** Nothing new gates a turn.

---

# ⛔ Done, and it made things worse

⚠️ **Kept here on purpose.** Between 2026-09-19 and 2026-09-20 the controls got tighter and
the prose got flatter, and those two facts are causally connected: **reciting the record is
the one output that cannot trip any gate we have built.** Every prohibition added made it
more attractive.

| fix | shipped | effect |
|---|---|---|
| Widened `TABLE_TALK` — bare "DC", named checks, spoken rolls and totals | 2026-09-20 | correct, and necessary |
| Hidden facts into `dm_side` | 2026-09-20 | correct — a `false` fact had been narrated as established |
| `src: player` facts out of `dm_side`, refused at the write | 2026-09-20 | **fixed a regression the previous row caused** |
| Persona travels with a woven campaign, "a voice, not a person" | 2026-09-19 | fixed fault 2 |
| Anti-mirror rules in `AMENDMENT` — never hand the action back, three things every beat owes | 2026-09-19 | **written, well placed, and ignored.** See below |

⭐ **The anti-mirror rules are the evidence that prompt-only fixes have a ceiling.** They
are the last thing in the prompt, they forbid restating the player's action *by name and by
example*, and the DM restated Jay's action anyway — twice, in the same session.

---

# Open, in build order

## 1 ⛔ The cast — the room is empty

`state/scene.md` carries `present: [<the party>]` and nothing else. The contract's rule
*"somebody reacts, by name"* has nobody to name.

⭐ **The scaffolding already shipped and is not wired to anything.** `corpus.roles()`
returns **42 role templates** — `hostile/` (10), `town/` (20), `world/` (12) — each with
**Knows · Wants · Found · Voice · Hooks · Escalation**. Its only caller is `health()`,
which counts them for a status endpoint.

> *Voice, from `town/tavern-owner.md`:* **"Talks while doing something else and rarely
> stops moving. Answers the question before the one you asked. Uses your name more than
> necessary."**

**Fix:** the weaver stages 3–5 named locals from the role tables into
`canon/characters/`, writes them into `present:`, and `campaign_static()` reads them.
**The auditor refuses a campaign whose opening room contains nobody but the party.**

## 2 ⛔ The persona is a label, not a person

What we emit, in full: a name, `**Told like:**` and `**Which means:**`. What CC SEREN
loads is `persona-format.md` **v2** — identity, seven dials, **moves**, a prediction, and
when it is wrong.

**The moves are the narrative engine** — *"when a scene starts to settle, something
arrives; somebody should be mid-sentence when it does"* is §1 of the delta report, written
down, in a file we do not produce.

**Fix:** weaver emits v2. **The auditor refuses a persona carrying fewer than three moves
in `when X → do Y` shape.**

## 3 ⛔ Nothing ticks a front clock

Every campaign carries three fronts. `audit.py:70` refuses a front without a clock of at
least two stages. **No code in `seren/web/` advances one.** The model is asked to remember,
and the model remembers six player turns.

**So the fronts are decoration.** This is the literal answer to *"where did the world go"*.

**Fix:** clocks tick in code, on conditions tested against the ledger and the scene. The
model is handed *"the village clock reached 3 — the reeve posts the notice"* and writes the
reeve, the paper and the nail.

## 4 ⚠️ Memory is about six player turns, and it cuts mid-turn

`messages[-24:]`, where one player turn is four messages — the player's text, the tool
calls, the tool results, the narration — and six if a roll splits it.

⛔ **And the slice can sever a tool result from its call**, leaving a conversation that
opens on an answer to an invisible question.

**Fix:** trim on turn boundaries. Then stop enlarging the window and write the world down
instead — see 5.

## 5 ⭐ Promotion: the world writes itself down

CC SEREN's answer to memory was not a bigger context. `canon/characters/guz.md` carries the
header *"Promoted from `state/facts.jsonl` at close"* — facts accumulate during a session
and are promoted into per-person files, which are read back next session. Permanent, cheap,
outside the window.

**Fix:** session close promotes facts about a person into that person's file. Plus the
**chronicle** — the session as a story, lifted from Elsewhere's session close.

## 6 ⚠️ No pacing permission

Every rule in the contract is a prohibition, so the model has correctly concluded that
saying everything immediately is safest. Nothing anywhere permits a turn to leave something
unresolved. CC SEREN: *"You do not notice […] It notices."*

**Fix:** one line of permission. ⛔ Not a gate — there is no reliable test for "resolved
everything", and a turn held for being badly written costs the player their turn.

## 7 ⚠️ A persona must not excuse the beat

DM.md says a persona may not override the *constraints*. It says nothing about a persona
being unable to skip the three things every beat owes — and **"no affect, never uses a
simile" was read as exactly that permission.**

## 8 · The responsiveness instrument

Count, per turn, how many named entities other than the PC **do something**. The server
knows the roster and already reads every word she writes.

⛔ **Never a gate.** An instrument, in the ledger, the way Squint's deviation profile
measures a temperament without governing it — and, at zero for three turns, the trigger for
the interruption pressure line.

## 9 · Campaign sameness

Two woven campaigns produced near-identical openings and near-identical player characters.
**Unknown whether the Loom's hand reaches the weaver's prompt at all, or reaches it and is
ignored** — different bugs, different fixes. Not yet investigated.

---

# The model question

**Status 2026-09-20:** Bedrock use-case form submitted by Jay at ~14:30. Until it lands,
`us.amazon.nova-pro-v1:0` is the only model available; every Claude model answers *"Model
use case details have not been submitted for this account."*

⚠️ **Do not run the A/B until items 1–3 are shipped.** Running it now measures the empty
room, and a capable model would improvise around five missing structures and be credited
for all of them — after which the project has a silent dependence on one model's
initiative. *(Red team, 2026-09-20: "expensive model = real DM" is the seductive fake fix.)*

⭐ **What settles the model question already:** same model, same morning, two campaigns —
The Fabulist read as narrative, The Machine read as a ledger. One variable, and it was ours.
