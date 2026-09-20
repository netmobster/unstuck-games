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
