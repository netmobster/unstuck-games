<!-- Written 2026-09-20. The proposal half. The observation half is ANATOMY-OF-A-TURN.md. -->
# A non-code architecture for the web table

**Downstream of [`ANATOMY-OF-A-TURN.md`](ANATOMY-OF-A-TURN.md), on purpose.** That document
asked what CC SEREN was *doing*. This one asks what the web port would have to become to do
the same things. ⛔ **No code, no function names, no file layouts.** If a proposal here can
only be expressed as a code change, it has not been understood yet.

---

# 0 · The finding this rests on

> **The port has every noun and almost none of the verbs.**
>
> **Nouns:** NPC · Fact · Front · Secret · Roll · Interaction · Location · Canon. All
> present, all faithful, one of them better than the original.
>
> **Verbs:** notice · interpret · infer · react · propagate · choose · withhold · escalate
> · surprise · callback · offer. **Almost none.**

⚠️ **And the reason is not carelessness.** The nouns were specified in careful documents
over months. **The verbs were never written down anywhere** — they were emergent from a
capable model plus the state plus two years of Jay talking to it. A port copies what is
written down, so the port copied the nouns.

---

# 1 · ⛔ The thing not to build

**Not a pipeline.** Not `DM_TURN()` running seven steps every turn.

The evidence is against it. A turn where the player reaches for a rule and a turn where the
player says something strange are **not the same procedure with different inputs**; they
are different procedures that happen to share some operations. Building one pipeline would
average them, and an averaged turn is exactly the flat paragraph we already produce.

> ### The unit of design is not the turn. It is the **verb**, and the **shape** that
> composes a few of them.

---

# 2 · The verbs

**Eleven, taken from the behaviour rather than invented.** Each one says who should do it —
**math** (code, deterministic), **small** (a cheap model on a narrow job), or **voice** (the
narrator).

| verb | what it is | who |
|---|---|---|
| **NOTICE** | what kind of move was that? A rule reach, a person addressed, a place entered, a joke, a provocation, nothing relevant | **small** |
| **INTERPRET** | what did it *mean* socially — was it kindness, a test, a boast, a concession | **small** |
| **RETRIEVE** | who is affected, what do they each know, what do they each want | **math** (roster + facts + wants) |
| **ADJUDICATE** | do the rules decide this, and what do they actually say — **fetched, never recalled** | **math** for the lookup, **voice** for the call |
| **PROPAGATE** | what does this change — clocks, standing, position, what somebody now believes | **math** |
| **CHOOSE** | of everything that could react, which one is most consequential | **small** |
| **WITHHOLD** | what is earned, what is merely adjacent, and what is being kept back **on purpose** | **math** decides eligibility; **voice** decides pacing |
| **ESCALATE** | the same thing failing twice is not the same thing twice | **math** |
| **SURPRISE** | something arrives that nobody asked for | **math** triggers, **voice** supplies |
| **CALLBACK** | a thing said earlier, counted, returned later — *"that's twice"* | **math** stores, **voice** spends |
| **VOICE** | say it, in these people's registers | **voice** |

⭐ **Ten of the eleven are not writing.** The port currently asks the narrator to do all
eleven inside one call, unassisted, with six turns of memory.

---

# 3 · Turn shapes

**Different player moves compose different verbs.** These are read off the transcripts, not
designed. ⚠️ **The list is certainly incomplete** — it is what two sessions showed.

### Shape A · Mechanical
*The player reaches for something the rules decide.*
**NOTICE → ADJUDICATE → PROPAGATE → VOICE**
No invention. The tension is whether the rule is fetched or remembered. *(The wand at DC 21;
the willing/unwilling asymmetry.)*

### Shape B · Social
*The player addresses a person.*
**NOTICE → INTERPRET → RETRIEVE → CHOOSE → VOICE**
⭐ **The step that carries it is INTERPRET**, and it is the one that must answer the
*content* rather than the intent. *("Little one." "Big boi. That's twice.")*

### Shape C · Chaos
*The player does something nobody planned for.*
**NOTICE → RETRIEVE → PROPAGATE → CHOOSE → VOICE**
⛔ **And explicitly no step that steers back toward the plot.** The shimmy, the cackling
exit, the stomp code. *What it touches is what changes; nothing herds it home.*

### Shape D · Quiet
*The player does nothing the plot cares about.*
**ESCALATE → SURPRISE → VOICE**
⭐ **The turn the web port cannot currently produce at all**, because nothing advances
without her. *(The carter arriving. Wen gone in the night.)*

### Shape E · Discovery
*The player moves somewhere or looks at something.*
**RETRIEVE → WITHHOLD → VOICE**
The boots outside the kennel. The carved list. **Description carries the plot instead of
stating it, and WITHHOLD is what stops it being a briefing.**

### Shape F · Correction
*Nothing to do with the player at all.*
**AUDIT → re-ADJUDICATE → VOICE**
⚠️ **Fires off the DM's own last output.** The Tessa reversal. **The web port has no
analogue of this whatsoever**, and it produced the best moment in either session.

---

# 4 · The three things that would change most

## 4.1 ⭐ Put people in the room, with appetites

Nothing else on this page works without it. **RETRIEVE, CHOOSE, SURPRISE and most of
INTERPRET all have nothing to operate on** when `present:` lists only the party.

Not deep characters — the role templates already on disk carry `Knows · Wants · Voice` and
that is enough. **The carter needed a career and a suspicion. That is two facts.**

## 4.2 ⭐ Let the world move without her

A clock that only ticks when the narrator remembers it exists is not a clock, and the
narrator remembers six turns. **PROPAGATE and ESCALATE belong to the server**, which does
not forget.

> **Shape D is the whole difference between a world and a set.** A set is only there when
> you look at it.

## 4.3 ⭐ Give her one job per call instead of eleven

Not a committee meeting — **a briefing.** By the time she writes, she should already have
been handed: *who is here and what they want · what just changed · what is earned and what
is not · what the rules say, quoted · which of these is the most consequential thing to
answer.*

⛔ **Then she writes, and only writes.** That is the job a cheap model is good at and the
job it is currently not being allowed to do.

---

# 5 · What a turn would look like, told as a story

**The player types:** *"I drop to one knee and shimmy like a lemur."*

- **NOTICE:** not a rule reach, not a question. A provocation in a room with people in it.
  **Shape C.**
- **RETRIEVE:** Lira the Fence, Grend the Quartermaster, and two locals — a tavern-owner who
  wants one quiet night, a carter who wants his cart back on the road.
- **PROPAGATE:** nothing mechanical. But the tavern-owner's *one quiet night* just got less
  likely, and that is a standing change.
- **CHOOSE:** of four people, the tavern-owner is the one whose want this actually crosses.
- **WITHHOLD:** the carter knows something about the delve. **Not this turn. He has no
  reason to say it to somebody doing that.**
- **VOICE:** the tavern-owner puts a glass down without finishing the wipe. Grend does not
  look up, which is its own comment. The carter decides something and says nothing.

**No new mechanism is required for that.** Every input existed: a roster, four wants, one
comparison, one thing held back.

⚠️ **And compare what actually shipped:** *"Aric has disappeared into the night, cackling
all the way. The current party members present are now Lira the Fence and Grend the
Quartermaster."* **That is the same turn with steps 2 through 5 missing.**

---

# 6 · What this says about the model

**Sharper than "buy a better one".**

| verb | does a better model help? |
|---|---|
| RETRIEVE · PROPAGATE · ESCALATE · CALLBACK | ⛔ **no.** These are memory and arithmetic. A better model forgets more expensively |
| NOTICE · INTERPRET · CHOOSE | ⚠️ **somewhat** — and a *small* model does them well enough, because each is one narrow question |
| WITHHOLD · SURPRISE | **partly.** The trigger is math; the taste is not |
| ADJUDICATE | **no for the lookup, yes for the call** |
| VOICE | ⭐ **yes, enormously, and this is the only row where that is true** |

> ### One row of eleven is a narrator problem. We have been treating all eleven as one.

⛔ **And the trap the red team named stands:** a capable model dropped into the current
architecture would improvise around the ten missing verbs and be credited for all of them.
The system would then be silently dependent on one model's initiative — **and would get
quietly worse the next time anything changed underneath it.**

---

# 7 · ⚠️ What this document is not sure about

**Stated because a proposal with no uncertainty in it is a sales document.**

- **Six shapes is what two sessions showed.** Combat produced **zero** turns across both
  sessions — no initiative was ever rolled. **There is certainly a shape here we have not
  seen**, and it is the one with the most rules in it.
- **NOTICE may not be reliable.** Classifying a move into a shape is itself a judgement, and
  a wrong classification answers the wrong question convincingly. ⚠️ **The failure mode is
  worse than no classifier**, and it needs testing before it is trusted.
- **CHOOSE is the subtlest verb here and the least evidenced.** *"Which reaction is most
  consequential"* may be irreducibly a taste question.
- **The verbs are inferred from a transcript, not observed directly.** Nobody watched the CC
  DM think. This is archaeology, and the account is a reconstruction that fits the
  artefacts — not a specification anybody wrote.
- ⛔ **And CC SEREN was not reliable.** Six to eight wobbles in twenty beats: a rider who
  dismounted and then never dismounted, a horse that did not exist, a subtraction a front
  forbade, and **two rolls narrated and never written.** *Every one of those is a memory
  failure.* Reproducing its judgement without reproducing its forgetfulness is the actual
  brief, and it is a better brief than "make it like CC was."

---

# 8 · The order this implies

⚠️ **Different from the order in [`FEATURE-GAPS.md`](FEATURE-GAPS.md)**, which was derived
from the code. This one is derived from the behaviour, and where they disagree this is the
one that was asked for.

1. **People in the room with appetites** — unblocks five verbs at once
2. **The world moves on its own** — clocks tick in the server; Shape D becomes possible
3. **The briefing** — hand her the answers instead of asking her to hold the questions
4. **CALLBACK's ledger** — cheap, and it is what "that's twice" is made of
5. **The self-audit** — Shape F, the one with no analogue
6. **Then the narrator**, measured against the fixture, with a written note of what it was
   allowed to be credited for

⭐ **Jay's fixture is the instrument for every line of this**, and it should be built
first: one scene, one location, a cast defined before anything is woven. **Each shape above
is a test you can run in it.**
