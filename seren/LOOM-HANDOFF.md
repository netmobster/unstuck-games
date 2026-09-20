# THE LOOM · a hand against Seren

Handoff for the campaign-creation layer of SEREN. One flat file, `seren/loom.html`, no dependencies beyond two Google Fonts. This document is the reasoning, the mechanics as the UI encodes them, the state model, the hooks a real backend needs, and what is still open.

Companion documents: `seren/CAMPAIGN-BUILDER.md` (the brief — tropes, origins, worlds, troubles, postures, companions, personas, dials, architecture), `seren/ROLL-MECHANIC.md` (the table's roll), `seren/table.html` (the table itself).

---

## 1. The one idea

The brief asked for a campaign builder. Red team asked for it to feel like choosing, not configuring. The card-game metaphor turned out to solve something deeper than tone:

**The deal is part of the generator.**

Seren deals five of the twelve cards in each category. The player never sees the other seven. So the space of campaigns a player can *reach* is different every sitting, before they have made a single choice. The underlying 12×12×12×12×12×66 space is untouched; what changes is which slice of it is on the table.

Consequences the design leans on:

- **Randomness is experienced, not hidden.** The player watches the deal. They feel the RNG rather than trusting a progress bar.
- **"Reroll one thing" is a native move**, not a control bolted onto a generator. In a card game you ask for another deal. Every reroll surface in the UI is phrased that way.
- **The player builds from a weird hand.** Five tropes they did not choose is a creative constraint. Twelve is a menu.
- **The builder is the first tiny game.** Seren already has a move of her own (the antagonist). The session has an opponent before the campaign exists.
- **Nobody needs to know the generator is enormous.** The brief warned against the 16-million boast. The hand of five makes the boast unnecessary.

Everything else in this file is in service of that.

---

## 2. What the player sees, in order

### 2.1 Two doors
Full-screen, before anything else. Two cards, tilted, like an offer.

- **Express · A quick hand.** "She deals companions and trouble. She plays the rest herself."
- **Custom · The full game.** "Seven deals. You lead with the trope; she counters with the antagonist."
- Under both, a ghost line: *"Or: let her play it out, and I'll just watch"* — the Roll Everything path, available before a door is chosen.

Same output either way. Express asks two things and infers five; Custom asks six and Seren plays one.

### 2.2 The table
Three bands, top to bottom. Seren's side, the table, your side. That is the whole layout; the player is sitting across from her.

**Seren's side (top)**
- Her voice: one italic line that changes with the state of play (§4.3).
- Her three offers: *Deal these again* · *I don't like any of these. New hand.* · *Play it out for me*.
- Her counter: a face-down card slot for the antagonist. Empty until the trouble is named.
- The five dials, styled as "the stakes". Off to the right, quiet. Moving none is valid.

**The table (middle)**
- Seven slot-cards in a row, one per category, in the brief's order: trope · origin · world · trouble · antagonist · companions · told by. Empty ones are outlines. Filled ones are real cards. The antagonist slot reads "her play" until she plays it.
- The sentence, live, under the slots. Filled parts in bone, unfilled parts in the felt's dark blue (§4.4).
- **Play your loom**, disabled until complete, reading "*n* of *N* laid" until then.

**Your hand (bottom)**
- Five cards fanned. The category is whatever the player is currently deciding; the header says which and how many of twelve she held back.
- Click a card: it opens (§2.3). Hover lifts it.
- Taken cards go gilt.

### 2.3 Opening a card
A modal, one card at a time. It is the only place the full text of a card lives:

- kicker: category and the category's hint ("the spine · the sentence the parts add up to")
- position: "3 / 12" — a quiet reminder there are twelve
- name, then the card's line at 24px italic
- **What it changes** (or **The friction** for companions) — the brief's third column, verbatim
- personas only: a sample line in that voice, so the player can audition it
- two actions: **Put it back** · **Play it**. If already taken, the second reads **Take it back**.

Click outside or Escape also puts it back.

### 2.4 Seren's move
When the player names the trouble, Seren plays a card **face down** into her counter slot. Her line changes to "I have played. Turn it over when you are ready."

- Tap to flip. The card shows an antagonist posture.
- **Take it** — it goes into the antagonist slot.
- **Make her play another** — she draws a different posture, face down again.

This is the only slot the player does not choose from a hand. It is hers. Custom's "antagonist axis" (destroyed / stopped / used / replaced) is a separate question from posture and is not on this table yet (§7).

### 2.5 Play your loom
A dark beat. The finished sentence in full (Express's inferred slots are rolled now, so the sentence is complete), a line saying what happens next — weaver, auditor, then Seren sits down — and a way back. This is the handoff point. Nothing beyond it is built here.

---

## 3. The mechanics, exactly as the file encodes them

### 3.1 The deal
- `HAND_SIZE = 5`. One constant. Red team may want 4 or 6; the prototype's tweak ran 3–12.
- `dealAll()` samples `HAND_SIZE` distinct ids per category without replacement, all seven categories at once, at first load and on **New hand**.
- Hands persist across reloads (§5). Closing the tab does not redeal.

### 3.2 Picking
- Single-pick categories toggle: play the same card again and it comes back off the table.
- Companions take two. A third pick pushes the oldest out (a queue, not a refusal). Re-picking a taken companion removes it.
- After a slot fills, the hand advances to the **next unfilled asked slot**, in the brief's order, wrapping. The antagonist slot is skipped in that walk — the player's hand never shows postures.

### 3.3 Reroll one thing
Clicking a filled slot-card on the table (labelled "↻ deal again"):
- redeals that category's hand (five fresh of twelve),
- draws one from the new hand that is not the current pick,
- for companions, draws two,
- for the antagonist, makes Seren play a new face-down card and clears the slot.

So a reroll is not "pick another from the five you saw"; it is a new deal *and* a draw. The player still gets to see the new hand if they walk back to that slot.

### 3.4 Deal these again
Redeals only the current category's hand. Picks are untouched. This is the cheap move.

### 3.5 New hand
Redeals all seven, clears every pick, clears Seren's card. Back to the first asked slot.

### 3.6 Play it out for me (Roll Everything)
Trope first, then the rest **rolled to fit it**:
- each trope carries a `pulls` map — the origins, troubles and postures the brief's "what it pulls" column names,
- for each of those three categories, 75% of the time the roll is from the pulled set, 25% from the full twelve,
- world, persona, companions are rolled flat (the brief's trope table does not name them).

Seren's card is set to the rolled posture and shown face up. If no door was chosen, the roll implies Custom.

The 75/25 is a guess. It is the knob that decides whether Roll Everything "reads like somebody wrote it" (the brief's phrase) or surprises. See §7.

### 3.7 Express inference
Express asks companions and trouble. The other five slots read "Seren infers" / "Seren plays it" and are locked. They are **rolled flat at Play**, not before, so the sentence stays honest about what is decided until the last moment. Seren's counter still plays when the trouble is named, and the player may take it or send it back; if they never do, posture is rolled at Play like the rest.

### 3.8 The sentence
Seven parts in fixed order, each a fragment from the chosen card's `frag` field:

> *[trope frag]*, *[origin frag]*, in *[world frag]*, facing *[trouble frag]*, with *[c1]* and *[c2]* in tow, against *[posture frag]* — told by *[persona frag]*.

Unfilled parts have an explicit blank phrase that differs by door ("Somebody," in Custom; "Somebody (Seren decides)," in Express). The sentence never has holes; it has honest placeholders.

The `frag` fields are mine, not the brief's. They are the one piece of copy in the file that is not verbatim from `CAMPAIGN-BUILDER.md`, and they should be read by whoever owns Seren's voice.

### 3.9 The dials
Five ranges, 0–100, defaults 35 / 40 / 45 / 50 / 30 (absurdity, stakes, danger, people↔places, length). Each range's `title` carries the brief's "what moves" line. The UI does nothing with the values beyond persisting them; they are inputs to the generator, not the deal. Per the brief, they must never pick a card — absurdity at max makes the sheep *possible*.

### 3.10 Completion
Complete when every **asked** slot is filled. Express: trouble and two companions. Custom: all seven, including the antagonist (which means the player has taken one of Seren's plays). Play is disabled until then and shows the count.

---

## 4. Vocabulary and voice

### 4.1 Words the UI uses
- **deal / hand / play / take / turn over** — never "generate", "select", "submit", "configure", "options".
- "She held the rest" — the seven unseen cards are acknowledged, never listed.
- The antagonist is "her counter" and "her play". The player does not "choose an antagonist"; they accept or refuse one.
- The final button is **Play your loom**. Not "Generate", not "Start".

### 4.2 Words it avoids
Progress bars, step counters ("3 of 7") except on the Play button, tabs, dropdowns, "AI", "prompt", "settings", "save".

### 4.3 Seren's lines (state → line)
| State | She says |
|---|---|
| any slot, nothing special | *[the category's question]* Five things, dealt. |
| deciding trouble, none named | Name the trouble and I will show you who is behind it. |
| she has played, face down | I have played. Turn it over when you are ready. |
| face up, not yet taken | That is who you are up against. Take it, or make me play again. |
| complete | That is a game. Shall we? |

Seven lines total. She is terse on purpose; the cards carry the prose.

### 4.4 Visual grammar
- **Ground**: midnight felt `#0f1728`, a warm gilt pool at the bottom edge and a cool one at the top — a lit table in a dark room.
- **Cards**: two-tone navy `#1a2540 → #111a2e`, hairline edge, heavy drop shadow. Taken = solid gilt `#c9a44a` with felt-dark text.
- **Type**: Cinzel Decorative for the four labels that name the ritual (SEREN, YOUR HAND, kickers, the Play button). IM Fell English for everything the player reads. Work Sans for tiny functional labels. No other faces.
- **Motion**: cards deal in from below with a slight rotation, 70ms apart. Seren's card flips on a Y-axis. Hover lifts a hand card 30px and straightens it. Nothing loops.
- The fan: `rotate((i − 2) × 5°)`, `translateY(|i − 2| × 8px)`, negative margins so they overlap. Hand size other than 5 recentres automatically.

---

## 5. State and persistence

One object, one key: `localStorage['seren.loom.v1']`.

```
door      'express' | 'custom' | null
browse    category id currently in hand
picks     { trope, origin, world, trouble, posture, persona: id|null, companions: id[] }
dials     { absurdity, stakes, danger, people, length: 0–100 }
hands     { [category]: id[] }          the five dealt, per category
hers      posture id Seren has played, or null
flipped   whether her card is face up
open      { cat, id } | null            the modal
set       whether the Play beat is showing
```

Saved on every render. Loaded on start; a fresh visitor gets a fresh deal. There is no "start over" on the page itself — **New hand** is the in-fiction equivalent and clears everything but the door and dials. Clearing the door is a reload with storage cleared; a real build should give the player a way back to the doors.

---

## 6. Hooks for the real thing

The file is a front end with no back. What a real build replaces:

1. **The deal.** `sample()` is `Math.random`. A server-side seeded deal (per account, per sitting) makes the hand reproducible and lets a published module carry its provenance — "the same one, but crueller" is the same seed with one dial moved. The brief wants that.
2. **The data.** `DATA` is inlined from `loom/loom-data.js`, which is the brief's tables typed in. Real cards come from the corpus: 42 role templates, 6 antagonist templates with `axis`, escalation ladder, `attaches_to`, `grudge_seed`. The card fields the UI needs are `name`, `line`, `changes`, `frag`, and for tropes `pulls`, for personas `sample`.
3. **Play your loom → the weaver.** The payload is `picks` (with Express's inferred slots filled), `dials`, `door`, and the seed. That is the wizard's-answers half of the brief's handoff: wizard → GENERATOR → module → fog audit → LIVE → table. None of that is here.
4. **Seren's counter** is a flat random posture today. It should be the generator's opinion: given trope + trouble + dials (absurdity gates which postures are in scope), which postures fit. The face-down beat survives either way.
5. **Persona derivation.** The brief says the persona is derivable from the campaign and shown as the default. Here it is just another hand. A real build deals the persona hand *with the derived one marked*, or plays it as Seren's second counter.

---

## 7. Open questions

For Jay and red team. Ordered roughly by how much they change the build.

1. **Hand size.** Five is a guess with good hand-feel. Four is tighter and more "dealt"; six starts to look like a menu again. Also: does hand size vary by category? Twelve companions with two to pick might want six.
2. **Does the player ever see the other seven?** Currently no, never, and the design argues for that. The counter-argument is the completionist who wants to know what a Registrar is. A "she shows you the deck, once" affordance that costs something in-fiction is possible.
3. **Reroll semantics.** Currently reroll = new deal + a draw from it (§3.3). Alternative: reroll = new deal, *player* picks from it. The second is more agency, one more tap. Which is "the important one" the brief means?
4. **Seren's antagonist play — how much is she allowed to know?** If the counter is generator-informed (§6.4), she is effectively choosing the villain that fits. Good campaigns, less surprise. Flat random is more of a game. Somewhere between: she plays from the pulled set 75% of the time, like Roll Everything.
5. **The antagonist axis** (destroyed / stopped / used / replaced) is in Custom per the brief and is not on this table. Options: a second face-down card from Seren; a fold-out on the posture card after taking it; leave it to the generator entirely.
6. **The Custom-only slots the brief lists** — your character (build or import a sheet), how many fronts (2–4), where (a named place), session length — are not cards. Length is a dial already. Fronts could be a dial. Character and place are inputs of a different kind and need their own moment; probably after Play, before the weaver.
7. **Express: does it ask for a character at all?** (The brief's open question.) The dealer model suggests: no, she plays a pregen face down and you can turn it over.
8. **The 75/25 pull ratio** in Roll Everything and the pull map itself. The map is my reading of the trope table's third column. The brief's own example — street rat, orchard counties, scribe and dog, protective magistrate — is a Taken-in trope pulling a Parent posture, which the map produces about 37% of the time. Is that the right rate for the combinations "that sing"?
9. **Persona default.** Derived-and-marked (the brief) vs. dealt like everything else (this build). See §6.5.
10. **Two companions, or a companion pair as one card?** The brief's Express describes "three companion pairs … each shown as one line". This build deals twelve individuals and takes two. Pairs-as-cards would be 66 cards and a hand of three; the friction lines would need rewriting for the pair.
11. **What "New hand" costs.** Free today. A game would make it cost something — a dial nudged toward danger, or a limit per sitting — so that a hand is a commitment. Probably wrong for a front door; worth saying out loud.
12. **Mobile.** The fan and the three-band table are desktop. A phone version is a different table: probably one band at a time, swiping between her side, the table and your hand.
13. **The `frag` copy** (§3.8) needs a voice pass. The brief's sample sentence has a different rhythm from what the fixed template produces.
14. **Where the shelf goes.** The brief's "campaigns nobody wrote" — published modules as named starters — is a third door: *"Or play one somebody already dealt."* Not built; the doors screen has room for it.

---

## 8. What is verbatim and what is mine

**Verbatim from the brief:** every card name, line, "what it changes"/friction, the category questions and hints, the dial poles and "what moves", the trope table's pulls (as a structured map).

**Mine:** the `frag` fragments that assemble the sentence, the persona sample lines (twelve short auditions in each voice), Seren's seven lines, the door copy, the hand-size constant, the 75/25 ratio, the reroll semantics, the fixed sentence template.

---

## 9. Files

- `seren/loom.html` — the thing. One file, ~44 KB, two web fonts. Open it.
- `loom/loom-data.js` — the same card data as a standalone module, for the DC prototype.
- `The Loom Directions.dc.html` — the four-metaphor exploration this was chosen from (desk, thread, dealer, bench). Kept for the record.
- `seren/CAMPAIGN-BUILDER.md` — the brief.
