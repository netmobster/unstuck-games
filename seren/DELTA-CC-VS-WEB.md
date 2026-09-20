<!-- Written 2026-09-20 at Jay's instruction, before the persona rebuild, so it informs it. -->
# Why CC SEREN reads like a table and the web port reads like a receipt

**The question Jay asked:** *"run a delta analysis against seren web vs the seren CC
campaigns NARRATIVE and RESPONSES and see how they differ, because it seems like a lot
more than just a model issue."*

**The short answer: he is right, and the difference is structural rather than literary.**
Five of the six differences below can be fixed without changing the model. One cannot.

**Sources.** CC side: `SEREN/labs/playtest-runs/2026-08-27/playtest-B.md` (verbatim player
turns, faithful-but-condensed DM turns — its own fidelity statement says which is which)
and `SEREN/labs/playtest-runs/2026-08-30-PLAYTEST-B.log`. Web side: three transcripts Jay
pasted on 2026-09-20 and an A/B turn run against `echoes-of-exile` the same afternoon.

---

## The two texts, side by side

**CC SEREN, opening a scene:**

> *"—so what I'll do, and I want everyone to hear that I am being generous here, is I'll
> put it down as eleven and not eleven-and-interest, because I don't believe Pell is a
> thief, I believe Pell is a coward, and there's a real difference in how you write
> those—"*
>
> The trowel stops. […] It's a sheep.

**Web SEREN, opening a scene:**

> As dusk falls, Aric stands at the warren's edge, the unsettling hum of the delve echoing
> in the air. The Machine, aglow with numbered observations, stands nearby, its cold,
> procedural voice breaking the silence.

Both are competent sentences. Only one of them has somebody in it who wants something.

---

# The six differences

## 1 ⭐ Interruption is a structural feature, and the web port has none

The CC log **counts interruptions as events** — `⬛ INTERRUPTION #1 — Grumble,
mid-sentence.` `⬛ INTERRUPTION #2 — a carter picks the sheep up mid-word.` The scene
opens on a man already talking and cuts him off. Somebody is mid-sentence when the thing
arrives.

**The web port never interrupts.** Every turn is: the player acts, the action completes,
the DM describes the completed action, the turn ends. Nothing arrives. Nothing cuts across.

⭐ **This is not a prose skill. It is a move**, and it is written down in The Registrar's
persona: *"When a scene starts to settle, something arrives. Somebody should be
mid-sentence when it does."* We ship no moves at all — see §6.

## 2 ⛔ Named agents who act unbidden

Count the people who do something nobody asked them to in one CC scene: Grumble objects
and then files paperwork instead of relitigating · a carter picks the sheep up to be
helpful and ruins the conversation · the same carter then volunteers intelligence for free
· Shinebright takes offence at a diminutive.

In the web transcripts, across every turn Jay pasted, **the number of characters who act
without being addressed is zero.**

**The cause is upstream of the model.** `state/scene.md` for the campaign he was playing:

```
present: [lira-the-fence, grend-the-quartermaster]
```

That is the party. There is nobody else in the room. The contract's rule *"somebody
reacts, by name"* has nobody to name, so the DM reached for the only other object on
stage — the Machine's display — which is how the persona ended up as a character again.

> ### A world with no cast cannot produce a reaction, however good the narrator is.

## 3 ⭐ Specificity that does not serve the plot

CC SEREN: *"I've been carting nineteen year and I've never once seen a man buy a drink
over a sheep."* · *"I am forty-one years old and I hold a chair in Applied Transmutation
at the college at Sarrowmere."* · *"eleven and not eleven-and-interest."*

None of that is load-bearing. The carter's nineteen years do not advance anything. They
make him a person.

Web SEREN's details are **all** functional: *"intricate maps of the delve's tunnels,
highlighting areas of interest and danger"* · *"the Delve Guardians' patrols and the
energy pulses."* Every noun is there because the plot needs it, which is exactly why none
of them land.

## 4 ⭐ Withholding, on purpose

> **You do not notice** […] **It notices.** […] the specific, narrow horror of a body
> deciding to be calm when the thing inside it has not agreed to that.

CC SEREN splits what happened from what the player perceived, and says so. Web SEREN
**resolves every turn completely** and then tells the player how to feel about it — *"With
this newfound knowledge, Aric feels a sense of urgency to act before the situation
worsens."*

⚠️ **Note the irony.** We built an entire fog system so the DM *cannot* say what the player
has not earned — and the DM volunteers everything it is permitted to say, immediately. The
gate governs secrets. Nothing governs pacing.

## 5 ⭐ Answering the content, not the intent

The player says *"little one"* as a kindness. CC SEREN has Shinebright object to being
called little, at length, with his job title. The player plays for laughs; the DM answers
the joke as though it were a statement.

This is **verbatim a Registrar move**: *"When the player plays for laughs, answer the
content of the joke as though it were a statement. 'Can I ride him?' → Shinebright is
appalled, at length, with reasons. Do not play along and do not rebuke."*

Web SEREN reads intent and affirms it. Jay wrote *"disappear into the night cackling all
the way"* — a joke — and got *"Aric has disappeared into the night, cackling all the
way."* The joke handed back, flat, as a minute.

## 6 ⛔ The actual root cause: we ship a style label where a persona should be

This is the finding the other five rest on. Jay got there first:
*"I think you made personas mechanistic instead of PERSONAS."*

**What CC SEREN loads** (`dm/persona-format.md` v2 — identity, seven dials, moves, a
prediction, and when it is wrong):

> **A DM who thinks the situation is genuinely serious and is not going to be the one to
> break first.** The Registrar takes minutes on a catastrophe. He is not amused, not
> unkind, and not going anywhere. He would like the record to show what happened, in
> order, **and he will wait while you decide.**
>
> *Dials:* failure texture **hard** · clock pressure **constant within a session** ·
> humour source **situation only — everyone is entirely sincere about an absurd situation,
> and the sincerity IS the comedy** · silence tolerance **lets it sit** …
>
> *Moves:* when a scene starts to settle, something arrives · when the player plays for
> laughs, answer the content · when an NPC is humiliated by circumstance, play their
> dignity as real dignity · when the player reaches the choice, **stop interrupting**…

**What the web weaver emits, in full:**

```
# The Machine
**Told like:** procedurally, and it is unsettling
**Which means:** Numbered observations, no affect — never uses a simile
```

⛔ **That is not a person. It is two adjectives and a prohibition** — and in this
particular case the prohibition is *against having a voice*. "No affect, never uses a
simile" instructs the model to write precisely the transcript Jay complained about. The
Machine was obeying us.

> ### The moves are the narrative engine. We ship none of them.
>
> Every one of §§1–5 is a move The Registrar carries and the web DM does not. The contract
> says *"the contract constrains, the persona empowers"* — we built the constraining half
> twice over and never built the empowering half at all.

---

# So how much of this is the model?

**Honestly assessed, because the answer changes the budget:**

| | |
|---|---|
| §1 interruption | **not the model.** A move. Fixable in the persona |
| §2 no cast | **not the model.** `scene.md` is empty of people. Fixable in the weaver |
| §3 unfunctional detail | **partly.** A move can ask for it; a better model does it unprompted |
| §4 withholding | **not the model.** No pacing rule exists anywhere |
| §5 answer the content | **partly.** It is a move, and it is also a thing bigger models simply do |
| §6 no persona | **not the model.** It is my weaver |

⭐ **Nova is not innocent and it is also not the explanation.** Jay's own evidence settles
it: the same model, the same morning, on a campaign told by The Fabulist, produced
*"three to six sentences, narrative, dumber than SEREN but not this."* Same model, two
outcomes, one variable — which persona the Loom dealt.

⚠️ **What a better model would buy us** is §3 and §5 for free, and more texture everywhere.
**What it would not fix** is an empty room. A campaign with nobody in it reads like a
receipt whatever writes it, and that bug is ours.

---

# What to do, in order

1. **Rebuild the persona generator to `persona-format.md` v2** — identity, dials, and
   above all **moves**. Three to five moves, each in the *"when X, do Y"* shape, each
   naming a concrete example. This is §6 and it carries §§1, 3, 5.
2. **Stage the opening scene.** The weaver furnishes fronts, an antagonist and two
   companions and puts nobody in the room. `present:` should carry two or three named
   locals with an appetite each. This is §2, and it is the one nothing else can work
   around.
3. **A pacing rule.** Nothing in the contract says a turn may leave something unresolved.
   §4 needs one line of permission, because everything else in that document is a
   prohibition and the model has correctly concluded that saying everything is safest.
4. **One contract line: a persona changes the register; it never excuses the beat.**
   DM.md already says a persona may not override the *constraints*. It says nothing about
   a persona not being allowed to skip the three things every beat owes — and "no affect"
   read as exactly that permission.
5. **Then re-run the A/B** on a real model, with all of the above in place, and find out
   what is left. ⚠️ **Not before** — running it now would measure the empty room.

---

⭐ **The one-line version, for the phone:** *the web port inherited SEREN's whole
integrity apparatus and none of its craft apparatus, because the craft lived in the
persona file and I replaced the persona file with a label.*

---

# 7 · The six as runtime invariants

**Added 2026-09-20 after the red team read §§1–6.** Their sequencing point and mine agree
— restore the five model-independent differences first, then compare models on the sixth,
*"only then does he know what he is buying."* ⛔ **A better model run today would paper
over five missing things and be credited for all of them**, and the project would acquire
a silent dependence on one model's initiative. That is the failure mode to avoid, and it
is worth more than the time it costs.

Their other contribution is a distinction this document needed and did not have:

> ### World persistence ≠ world responsiveness.
>
> SEREN can remember perfectly that you spilled the drink and still fail utterly at being
> a world in which spilling the drink **does something.**

Everything we ported is persistence. Every one of §§1–5 is responsiveness.

## ⭐ So: which of these can be code?

The red team asked for **runtime invariants rather than prompt patches**, which is this
project's own rule — *an instruction is not a control* — applied to craft for the first
time. **It does not apply evenly, and pretending it does would be the more comfortable
answer.**

| | can it be enforced? | how |
|---|---|---|
| **§2 no cast** | ⭐ **yes, fully** | the weaver must emit ≥3 named locals in `present:` with an appetite each; **the auditor refuses a campaign without them.** Same shape as the checks that already refuse a campaign with no antagonist grudge |
| **§6 persona is a label** | ⭐ **yes, fully** | the auditor parses `DM-persona.md` and **refuses a persona carrying fewer than three moves in `when X → do Y` shape.** A style label cannot pass |
| **§1 no interruption** | ⚠️ **yes, as pressure** | the server counts turns since anything arrived. At three, it appends a computed line to the volatile layer: *nothing has arrived in three turns; something arrives now.* **Not a standing instruction that decays — a fact recomputed every turn** |
| **§4 no pacing** | ⚠️ **partly** | a turn that resolves everything cannot be detected reliably. But *permission* to leave something unresolved can be stated once, and its absence is why the model resolves everything |
| **§3 unfunctional detail** | ⛔ **no** | this is craft. A move can ask for it; only a better model does it unasked |
| **§5 answer the content** | ⛔ **no** | same. It is a Registrar move and it is also a thing capable models simply do |

**Three of six become real controls. Two are prompt craft. One is half each.** ⚠️ Anyone
claiming all six can be made deterministic is selling something.

## ⭐ And one instrument, which is neither

Responsiveness has a countable proxy: **how many named entities other than the player
character do something in a turn.** The server knows the roster — `present:` — and it
reads every word the DM writes, because the fog gate already does.

So it can count, per turn, and keep the number. ⛔ **Not as a gate.** Holding a turn for
being boring costs the player their turn and would be a worse bug than the one it fixes.
**As an instrument**, in the ledger, the way Squint's deviation profile measures a
temperament without governing it — and, at zero for three turns running, as the trigger
for the §1 pressure line.

> **A world with a responsiveness of zero for three turns is asleep, and the server is the
> only thing in this architecture that can notice.**

## What this changes about the order of work

1. **Persona v2 in the weaver** + **the auditor refusing label-personas** — §6
2. **A staged opening scene** + **the auditor refusing an empty room** — §2
3. **The cast file the DM reads every turn** — §2 and Jay's consistency concern are the
   same bug: nothing anywhere records how a character speaks
4. **Turn-boundary trimming** — the memory window cuts conversations in half at `[-24:]`,
   which is about six player turns and can sever a tool result from its call
5. **The responsiveness counter**, then **the interruption pressure line** it triggers
6. **One line of pacing permission** in the contract
7. ⚠️ **Then, and only then, the model A/B** — with a note recording what it was allowed
   to be credited for

---

# 8 · ⛔ Correcting §7 — determinism has a scope, and narrative is outside it

**Jay, 2026-09-20, reading §7:** *"We don't need deterministic. Like IMPRINT, Seren is
designed to exist in the mess. Rolling is deterministic, narrative is not."*

**He is right and §7's framing was wrong.** It asked *"which of the six can be code"* and
by asking it accepted that making them code was the goal. It is not. This project's
determinism doctrine has a deliberately narrow scope:

> ### Deterministic where a wrong answer breaks trust. Nowhere else.
>
> The dice, the verdict, the fog, the record. A DM that fudges a roll has betrayed the
> player. **A DM that writes a flat paragraph has given them a worse evening**, and those
> are not the same failure and must not get the same machinery.

⭐ **And this explains the thing that had not been explained.** The prose got *flatter* as
the controls got tighter — the fog gate widened, hidden facts entered `dm_side`, the fact
tool grew refusals — and across the same period the narration drifted further toward
reciting the record. **That is not a coincidence and it is not the model being lazy.**
Restating what the panel already showed is the single output that cannot trip any gate we
have ever built. Every prohibition added made it more attractive. **We optimised her
toward silence and then complained she was quiet.**

## The distinction that actually holds: *when*, not *whether*

| | |
|---|---|
| **Before play — guarantee the materials** | A campaign whose room is empty, a persona with no moves: **refuse those at build time.** Deterministic, checkable, and it never touches a turn. The auditor already works exactly this way |
| **During play — hand her materials, never police the prose** | The cast file, the chronicle of last session, the computed line that says nothing has arrived in three turns. ⭐ **These are things given, not rules imposed** — she cannot violate a fact she has been handed |
| **The two existing gates stay exactly as they are** | The dice and the fog. Those are trust, they are narrow, and they were never the problem |

⛔ **So: nothing new gates a turn.** The responsiveness count stays an instrument and never
becomes a threshold. There is no check for boring, no refusal for flat, no minimum
paragraph. A turn held for being badly written costs the player their turn and teaches the
model to write less.

> **Build-time refusals make the world worth narrating. Play-time additions give her
> something to say. Neither one tells her how to say it.**

---

# 9 · ⭐ The architecture, stated properly: code computes, the model interprets

**Jay, 2026-09-20:** *"It's why rolling is in python? And things in code is probably MORE
relevant with web… we can likely math a lot, and present the 'work' to an AI to interpret
vs having AI do all the lifting."*

**This is the house method and it was already written down** — *pre-generate the records
with AI, select with math and seeds at runtime* — and it had been applied to the dice and
to nothing else.

> ### Code decides what happened. The model says what it was like.

⭐ **And it matters MORE on the web, not less.** In Claude Code the narrator was strong
enough to improvise the world *and* the voice. On a cheap model the code has to carry the
world, and the model only supplies the voice — which is the half it is actually good at.
**Every structural thing we make the model responsible for is a thing a cheap model will
drop, and we will then blame the model for dropping.**

## ⛔ The proof, found while writing this: nothing ticks a front clock

Every woven campaign carries three fronts. The auditor **refuses a front without a clock
of at least two stages** (`audit.py:70`). The contract tells the DM a beat should move
one. And there is **no code anywhere in `seren/web/` that advances a clock.** Searched for
it; it does not exist.

The clocks are advanced when the model remembers to advance them, and the model remembers
six player turns.

> **So the fronts are decoration. Three agendas with progress bars that nothing moves.**
>
> That is not a prose problem, a persona problem or a model problem. **That is the answer
> to "where did the world go" — it was never wound up.**

## What belongs on which side

| the model should not be deciding | because code can, and code does not forget |
|---|---|
| whether a front advanced | a clock tick is a condition test against the ledger and the scene |
| who is in the room | a roster, weighted and seeded, the way every other Unstuck game picks |
| whether something interrupts this turn | a counter: turns since anything arrived |
| who reacts, and how hard | relationship state × what they want × what just happened |
| what the player fails to notice | the fog already computes the `true`/`false` half; this is the same machinery pointed at perception |

⭐ **In every row, the model still writes the sentence.** It is handed *"the village clock
reached 3 — the reeve posts the notice"* and it writes the reeve, the paper, the nail, and
who stops to read it. **It is not asked to remember that a clock exists.**

⚠️ **This also fixes the memory ceiling without enlarging the window.** A world that
computes its own state does not need the narrator to hold it — which is the whole reason
the dice went into Python in the first place, generalised to everything that is not voice.
