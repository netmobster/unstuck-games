# Before the first ad runs

Filed 2026-09-16.

Right now nothing we ship earns money, and most licences we rely on are generous to
things that don't. **The day God Mode goes live that stops being true**, because an ad is
commercial use, and several of the terms below change at exactly that line.

This file exists so that day is a checklist and not a scramble. It is not legal advice;
it is the register of what we are actually using and what each thing requires of us.

**The rule:** nothing ships in a build that earns money until its row here says CLEAR.

---

## The register

| Asset | Where | Licence | Status | What we owe |
|---|---|---|---|---|
| `155115__jzazvurek__ferret.wav` — Lucy's voice | Ferret Bowling | **CC BY 4.0** ([source](https://freesound.org/people/J.Zazvurek/sounds/155115/)) | **CLEAR, once credited** | A visible credit to **J. Zazvurek**. Commercial use is allowed; attribution is not optional. |
| `Forest Pulse.mp3` — the Loom's table music | SEREN | **Suno, paid commercial plan** — made by Jay (assumed, same provenance as the other two; correct this line if not) | CLEAR | Nothing required. |
| `Nocturnal Drift.mp3` — house ambience | Ferret Bowling | **Suno, paid commercial plan** — made by Jay | CLEAR | Nothing required. Credit it to the studio like any other asset we made. |
| `orbis/audio/*.mp3` — ambience and the two SFX beds | Orbis | **Suno, paid commercial plan** — made by Jay | CLEAR | Nothing. Confirmed by Jay 2026-09-16: these are his own generations, not the tombstone's audio. |
| Alfa Slab One · Archivo · Caveat | every page | SIL Open Font Licence | CLEAR | Nothing. OFL permits commercial embedding and web use. |
| CD's artwork (`ferret-bowling/assets/cd/`, sprites, homepage) | Ferret Bowling | commissioned, ours | CLEAR | Nothing, but get the arrangement in writing before money is involved. |
| AWS Bedrock output (Elsewhere's narrator) | Elsewhere | AWS customer agreement | CLEAR | Nothing. Output belongs to the customer; no attribution required. |
| SRD 5.2 articles (`library/srd-5.2/`) — the rules the Table's LIBRARY serves | SEREN | **CC BY 4.0** (SRD 5.2, Wizards of the Coast) | **CLEAR, once credited** | “This work includes material from the System Reference Document 5.2 by Wizards of the Coast LLC, available under CC BY 4.0.” The LIBRARY panel already carries the short form; the full notice goes in CREDITS before a paid build. |
| Game names, characters, all written copy | everywhere | ours | CLEAR | Nothing. |

---

## Nothing blocks us

As of 2026-09-17 there are two obligations on the whole register: **credit
J. Zazvurek for the ferret**, and **credit Wizards of the Coast for SRD 5.2** if SEREN
ships. Everything else is ours, or is licensed in a way that asks nothing of us.

The SRD is the one to watch, because it is the only third-party asset that is *content
the game reads out* rather than decoration — and because CC BY 4.0 requires the notice to
travel with the work, not sit in a repo. SEREN's own rule already holds: the LIBRARY panel
states the licence on the slip where the rules are read.

That is a better position than most studios are in at this stage, and it is worth not
losing. All the audio is Jay's own Suno work on a paid commercial plan, which is the
reason this register is short — assets made in-house have no terms to breach.

**The failure mode this file guards against** is not malice, it is drift: a placeholder
borrowed in week one that nobody re-examines in month six. The rule at the bottom of this
file exists because that is how every studio that gets caught gets caught.

*A previous version of this file wrongly listed the Orbis audio as the tombstone's own
soundtrack. It is not, and never was. The claim came from misreading a note about the
port rather than from asking. Left recorded here because a register that quietly edits
its own history is worth less than one that does not.*

---

## What "credited" means here

One place, not scattered: a **CREDITS** entry reachable from every game and from the
studio site, listing each third-party asset, its author, its licence, and a link. CC BY
wants the author named and the licence identified; it does not want it buried in a repo.

For Ferret Bowling specifically, before ads:

- **Sound: "Ferret" by J. Zazvurek — CC BY 4.0**, linked to the Freesound page.

That is the entire list. Music is ours.

---

## Recurring check

Add a row here whenever an asset enters the repo from outside — not later, when the
question is expensive. The test is one question: **if this game earned a dollar
tomorrow, would every row still say CLEAR?**

Related: [GOD-MODE.md](GOD-MODE.md) (what "the first ad" means), [METHOD.md](METHOD.md)
(the tombstone rule this protects).
