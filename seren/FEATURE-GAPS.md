<!-- Written 2026-09-20. The argument half; the record half is FEATURE-INVENTORY.md. -->
# Feature gaps — and what tier of machinery should close each

**Companion to [`FEATURE-INVENTORY.md`](FEATURE-INVENTORY.md)**, which describes both
systems and argues nothing. This file is the argument.

⚠️ **A gap is not a mandate.** Jay: *"Doesn't mean we KEEP Seren CC stuff but identifying
gap."* Several rows below end in **leave it out**.

---

# The four tiers

| tier | what it means | when it is right |
|---|---|---|
| **MATH** | code decides, code writes, no model involved | the answer is checkable and a wrong one breaks trust |
| **MATH → AI** | code decides *what happened*; the model writes *what it was like* | the outcome must be consistent, the telling must not be mechanical |
| **MINI-AI** | a small cheap model, given a narrow job and a small context | a judgement call that is cheap to get slightly wrong |
| **FULL AI** | the DM model, in the turn loop | it is the voice, or it needs the whole scene to decide |
| **NONE** | do not build it | CC needed it because a human was in the loop, or it solves a problem the web port does not have |

⭐ **The governing rule, from [`AI-FIXES.md`](AI-FIXES.md):** *code decides what happened,
the model says what it was like.* **Deterministic where a wrong answer breaks trust, and
nowhere else.**

---

# ⛔ Three assets that shipped and are not wired to anything

**Found while writing the inventory. These are not gaps — they are things already paid for
and not plugged in**, which makes them the cheapest work available.

| asset | state |
|---|---|
| **42 role templates** — `content/npcs/tables/roles/`, `Knows · Wants · Found · Voice · Hooks · Escalation` | `corpus.roles()` reads them. Its only caller is `health()`, which **counts** them |
| **`table-agreement.md`** — the player's standing position on lethality, push-back, telegraph density | ships; never opened. **`dm.py`'s docstring documents loading it** |
| **The `library/` manifest machinery** — `state.library()` resolves it | the weaver writes no manifest, so woven campaigns have none |

---

# The gaps, by subsystem

## 1 · The cast — ⭐ **MATH → AI**, and it is the biggest single win

**Gap:** `canon/characters/` does not exist. `present:` is the party. Nobody reacts because
nobody is there.

**MATH:** pick 3–5 roles from the 42, weighted by the world card and the trope, seeded from
the hand so the same hand stages the same village. Pick names from a table. Write the
roster into `present:` and a `charactermap.md`.

**AI (once, at weave time):** turn each `Knows/Wants/Voice` template into *this* person —
a name, one appetite, one thing they will not do. The weaver is already making one call;
this rides along in it.

**FULL AI (at play):** nothing. She is handed people and writes them.

> ⭐ **Why this ordering:** the role file already carries the craft — *"Talks while doing
> something else and rarely stops moving. Answers the question before the one you asked."*
> A cheap model handed that paragraph and a name produces a character. A cheap model handed
> nothing produces a display panel.

## 2 · The persona — ⭐ **MATH → AI**

**Gap:** we emit a style label. CC loads identity · seven dials · **moves** · a prediction.

**MATH:** the dials come off the Loom's five sliders and the persona card. They are
numbers; they are already dealt. **The auditor refuses a persona with fewer than three
moves in `when X → do Y` shape** — build-time, never touches a turn.

**AI (at weave time):** identity and the moves, written for this campaign's trouble.

⛔ **Leave out:** the prediction (Part 4) and "when this persona is wrong" (Part 5). Those
are instruments for a human studying whether a persona works, and there is no human in the
web loop to read them. **Revisit if we ever run persona A/Bs.**

## 3 · Front clocks — ⭐ **MATH**, entirely

**Gap:** nothing ticks. Three fronts per campaign, all decoration.

**MATH:** a tick is a condition test against the ledger and the scene, run server-side after
every turn. No model. The result is handed down as *"the village clock reached 3"*.

**MATH → AI:** the model writes what that looks like — the reeve, the notice, the nail.

> **This is the single clearest MATH row in the document, and it is the literal answer to
> "where did the world go."**

## 4 · Interruption — **MATH** (the trigger) **→ AI** (the event)

**MATH:** a counter — turns since anything arrived. At three, append a computed line to the
volatile layer. ⚠️ **Recomputed every turn, so it cannot decay the way a standing
instruction does.**

**AI:** what arrives, and who is mid-sentence when it does.

⛔ **Never a gate.** No refusing a turn for being uneventful.

## 5 · NPC interactions log — ⭐ **MATH → MINI-AI**

**Gap:** no record of what happened with a person, so consistency lives or dies inside six
turns of context.

**MATH:** at close, group the session's facts and ledger lines by person. That is a
`group_by`, not a judgement.

**MINI-AI:** Nova Lite writes the one line per person per session. **Narrow job, small
context, cheap to get slightly wrong** — and if it is wrong the record still names the
right facts underneath it.

⭐ **This is CC's memory answer** — `canon/characters/guz.md` says *"Promoted from
`state/facts.jsonl` at close."* **Not a bigger context window: a world that writes itself
down.**

## 6 · `charactermap.md` — **MATH**

Links and one line of role, nothing else. CC calls it *the load-bearing file* because it is
how a long campaign stays inside a context window: read the map, load only the people in
the scene. Pure bookkeeping.

⚠️ **CC's own warning applies to us more than to them:** the moment anything writes
personality into it, the property is gone.

## 7 · The chronicle — **FULL AI**, at close only

**Gap:** a session ends and there is nothing to read.

**FULL AI**, and justified: it is prose about the whole session, it is the payoff, and it
happens **once**, not per turn — so the cost argument against the big model does not apply.
⭐ **And it is the one place the fog gate is not fighting her**, because by then the player
has earned it.

**Lift from Elsewhere's session close** rather than writing a second one.

## 8 · Memory window — **MATH**

Trim on turn boundaries, not message counts. ⛔ A slice that severs a tool result from its
call is a correctness bug, not a tuning choice.

**Then stop enlarging it.** Rows 5, 6 and 7 are the real fix: durable state read back, not
a longer conversation.

## 9 · Antagonist `appears_when` / escalation — **MATH → AI**

**MATH:** the condition test and the ladder position — the same machinery as the clocks.
**AI:** how they arrive.

⚠️ CC's hard-won rule applies: *a thing that fires at no named moment fires never.* If we
port the antagonist we port the trigger, or we are shipping six nemeses who never show up.

## 10 · Session-start reconciliation — ⭐ **MATH**, and it may be the highest-value row here

CC calls session start *the most important thing in the system*: before anything is
narrated, count the ledgers independently and check them against what the DM believes.

⭐ **The web port has never had it, and CC's own playtest found a real failure with it.**
Cheap: two counts and a comparison.

## 11 · `devolve` — ⛔ **NONE, for now**

A master sheet devolved to level N with a refusal gate is excellent, and **it solves a
problem the web port does not have**: nobody is importing an eleventh-level character into
a web campaign today. The weaver writes a provisional level-1 sheet and says so.

**Revisit when import is a feature.** ⚠️ When it is, port the *refusal*, not just the
derivation — the refusal is the part that carries the integrity.

## 12 · `rulings.md` — **MATH**, trivial

The `ruling` tool already writes to the ledger. A rulings file is a filtered view of it,
read back into the prompt so a call made in session 1 is still made in session 4.

## 13 · Locations — **MATH → AI**, low priority

One file per place, hung off the roster. ⚠️ **Wait until a campaign has been played across
two locations**, or we will author a schema against zero evidence — which is exactly how
CC got a ruling type it had to retroactively invalidate.

## 14 · The table agreement — **MATH**, five minutes

It ships, the docstring claims it loads, and it does not. Add it to `corpus.rules()` and
the static layer. ⚠️ Per CC, **it outranks the persona**, so it goes after the contract and
before the campaign.

## 15 · The library manifest — **MATH → AI**

The weaver should write one. Cheap, and it is what makes `state.library()` do anything.

## 16 · Reconstruction from the ledger — ⛔ **NONE**

CC can rebuild current state from `ledger.jsonl` alone. The web port reads `party.md` and
`scene.md`, which are written by code that cannot do arithmetic wrong.

**It would be a validator, not a feature.** Worth having the day a state file is corrupted
and not before.

## 17 · `ideas.md` / `queue.md` — ⛔ **NONE**

Both exist because a human operator was in the loop and needed somewhere to put things.
**The web port has no such human.** The queue's real function — *what is pending* — is
already `session.json`.

---

# Sequencing

**Cheapest-first, and it happens to also be biggest-effect-first:**

1. **Table agreement into the prompt** — MATH, five minutes, a file we already ship
2. **The cast** — MATH → AI. Roles → named locals → `present:` → `campaign_static()`.
   Auditor refuses an empty room
3. **Persona v2** — MATH → AI. Auditor refuses a label
4. **Clocks tick** — MATH. The world moves without her
5. **Turn-boundary trimming** — MATH, correctness
6. **Session-start reconciliation** — MATH
7. **Promotion at close** — MATH → MINI-AI. The memory answer
8. **The chronicle** — FULL AI, once per session
9. **Interruption pressure + the responsiveness instrument** — MATH
10. ⚠️ **Then the model A/B**, and not before

⛔ **Deliberately not built:** devolve · ledger reconstruction · ideas/queue · persona
prediction and wrong-for · locations until two have been played.

---

# ⭐ The one-paragraph version

**Three assets are already paid for and unplugged; four gaps are pure arithmetic the
model should never have been asked to hold; two want a cheap model doing a narrow job; one
wants the expensive model exactly once per session. Almost nothing here needs a better
narrator.** What needs a better narrator is §§3 and 5 of the delta report — detail that
does not serve the plot, and answering the content of a joke — and those are worth buying
**after** the world exists, not instead of building it.
