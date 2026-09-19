<!-- Brief, 2026-09-19. Not built. -->
# The campaign builder

**The front door, not a content tool.** Today SEREN can only be played by someone who
already has a campaign folder — which is Jay, and nobody else. The builder is how a
stranger sits down: a few screens, a minute, and they are at the table with a world that
is theirs. It also clears the launch blocker on its own, because everything it makes is
ours.

Two paths through one wizard, the way an installer has them:

| | screens | who it is for |
|---|---|---|
| **Express** | 3 | somebody who wants to play now |
| **Custom** | 7–8 | somebody who has opinions, and the DM-to-be |

Same output either way. Custom exposes what Express infers.

---

## What it is not

**Not "generate me a campaign."** The player picks the things they will feel — who is
beside them, what kind of trouble, how silly it is allowed to get — and the builder does
the rest. Picking is the fun part; rolling is the part that saves them an hour.

**Not prose.** SEREN's structure carries the narrative: Seren writes the sentences at the
table. A campaign is a premise, some people who want things, pressures that move whether
or not the party acts, and secrets with a visibility on each. That is a skeleton, and a
skeleton is exactly the sort of thing that survives being assembled from tables.

---

## Express — three screens

1. **Who is beside you?** Three companion pairs, drawn from the role tables, each shown as
   one line of what they are like rather than a stat block. *"Korth, who does not talk, and
   Grumble, who will not stop."*
2. **What kind of trouble?** Four cards: a theft, a disappearance, an arrival, a debt. Each
   one is a front shape, not a plot.
3. **The dials.** Four sliders, described below. Defaults are sane; moving none of them is
   a valid answer.

Then: *"Give me a minute."* — and the folder is written.

## Custom — the same three, plus

4. **Your character.** Express rolls one from the SRD classes; Custom lets you build, or
   paste a sheet and let the importer read it.
5. **The antagonist.** Their **axis** — the one thing the corpus already models: do they
   want the party *destroyed* (vendetta), *stopped* (obstruction), *used*, or *replaced*?
   The axis picks the escalation ladder, not the personality.
6. **How many fronts?** Two to four. The corpus's own rule, and the ceiling is on purpose.
7. **Where.** A named place, or leave it and the builder invents one. **Never a real
   setting's place names** — that is the boundary `campaign.md` is written around.
8. **Session length.** One session, or a short arc. This sets the clocks, not the content.
9. **Who is telling it.** The DM persona. SEREN's own rule is that *the persona is
   derivable from the campaign*, so the builder derives one and shows it as the default —
   Express just names it on the summary (*"told by: the Registrar"*), Custom offers the
   twelve and lets you audition a line. The live instance is written to `DM-persona.md` in
   `dm/persona-format.md` v2's shape.

---

## The dials, and what each one actually changes

A dial that only changes adjectives is decoration. Each of these changes a number or a
table.

| Dial | Low | High | What moves |
|---|---|---|---|
| **Absurdity** | grim | a sheep with opinions | Which antagonist postures and role tables are drawn from; whether the premise is allowed a talking animal, a clerical error, a god with a day job |
| **Stakes** | personal | epic | The scale of every front — your debt, the vale, or the world. Sets what the impending doom actually *is* |
| **Danger** | bruises | deaths | Starting DCs, antagonist level relative to the party, and whether `exit` on an antagonist is *killed* or *escapes* |
| **People ↔ places** | conversation | corridors | Whether pressure is a *person who wants something* or a *place that is in the way*. At the places end, fronts attach to locations and the scene carries zones |
| **Length** | one session | a season | Clock lengths, and nothing else |

**Four became five.** *Romp versus slow burn* was doing two jobs: length and stakes. They
come apart — a single session can be about the end of the world, and a season can be about
an orchard. Express shows absurdity, stakes and danger, and rolls the other two.

**The dials are inputs to the roll, not the roll.** Absurdity at maximum does not pick the
sheep; it makes the sheep *possible* and then the dice decide.

---

## Inferred, rolled, and asked

- **Asked:** companion, trouble shape, dials. In Custom: character, axis, fronts, place, length.
- **Inferred:** party level from the character, DCs from level and danger, number of secrets
  from fronts, clock lengths from the romp dial, which role tables are in scope from absurdity.
- **Rolled:** everything else — names, the specific role behind each front, which secret
  belongs to whom, what the antagonist's grudge is (from `grudge_seed`), who in the village
  is lying.

---

## What it writes

The builder's output is a campaign folder in SEREN's own formats. Nothing new to read, and
the engine does not learn a new shape:

| File | From |
|---|---|
| `campaign.md` | premise, place, level, the boundary note |
| `fronts.md` | 2–4 agendas with clocks, and **at least one front that wants something another front controls** |
| `canon/antagonists/*.md` | drawn from the templates, `grudge` filled from `grudge_seed`, `attaches_to` resolved against the actual party |
| `builds/*.md` | the player's character and companions |
| `state/party.md`, `state/scene.md` | opening state |
| `state/facts.jsonl` | the secrets, each with its **visibility** — this is the one that must be right |
| `library-manifest.md` | resolved against `library/srd-5.2/` |

---

## The corpus is half the work already

This is the part worth knowing before costing it. `/srv/seren` already holds **42 role
templates** across town, world and hostile, and **6 antagonist templates** carrying exactly
the fields a generator needs: `axis`, `escalation` by tier, `attaches_to`, `fallback` for
when what it attaches to is absent, and `grudge_seed` — a one-line prompt for the grudge,
left deliberately unfilled *at campaign creation*.

Somebody already designed these to be assembled. The generator is closer to a consumer of
existing tables than a new content pipeline. What is missing is breadth: six antagonists is
enough to prove it and not enough to ship, and the same "a dozen of each" logic Jay
described applies — postures, tropes, opening scenes.

---

## ⚠️ The one real risk: the fog

Every generated secret carries a visibility (`true` / `known` / `suspected` / `false`). Get
one wrong — mark a secret `known` that should be `true` — and Seren tells the player in
session one, and the campaign is spoiled before it starts. This is not a leak the fog gate
can catch, because the gate enforces *what the player may see*, and a wrongly-tagged fact
has been declared visible.

**So the builder needs its own check:** a generated campaign is dealt out, the secrets are
audited against their fronts (a front's own secret is never `known` at open), and the whole
thing is refused rather than shipped half-right. Cheap to write, and it has to exist before
the first stranger plays.

---

## Two systems, not one

**Generate, then play.** They are separate passes with separate AI, and the handoff between
them is a folder on disk:

```
the wizard's answers
      │
      ▼
 GENERATOR  ──one pass, its own model, its own prompt──►  a campaign MODULE
      │                                                         │
      ▼                                                         ▼
  the fog audit  (refuse, or pass)                    the table instantiates a LIVE copy
                                                                │
                                                                ▼
                                                        SEREN plays it, turn by turn
```

Why it matters that these are two:

- **The generator is not at the table.** It can take twenty seconds, use a bigger model, and
  be told to think — none of which is acceptable mid-turn. It never speaks to the player.
- **The audit sits in the gap.** A campaign is checked *after* it is written and *before*
  anyone plays it, which is the only place that check can live.
- **Nothing generated is live.** The output is inert until instantiated, so a bad roll costs
  a regenerate, not a spoiled session.

**SEREN already draws this line.** Its own tree separates `campaigns/modules/<slug>/` — the
worked thing, templates, never played — from `LIVE/<campaign>/`, which is one party's
instance with state in it. The generator writes a module. The table makes it live.

---

## The library that falls out of it

Because a module is inert and reusable, **every good generated campaign is publishable.**
That is a content library nobody has to write:

- A player rolls something that sings, finishes it, and marks it **shareable**.
- It is stripped back to the module (state, ledger and session logs are the player's, not
  the campaign's) and offered to the next person as a named starter.
- Each carries its provenance — the seed, the picks, the dials — so *"the same one, but
  crueller"* is a re-roll with one dial moved, not a request to a human.

**The first shop window is therefore free.** Roll a hundred, play the best six, publish
those, and the front page has a shelf on it before we have written an adventure. The
importer eventually feeds the same shelf from the other end.

⚠️ **One rule attaches to this and it is not optional:** a published module carries no
player's state and no player's name. The moment somebody's session log is in a shared
folder, we have shipped a stranger's private play to the public.

---

## Where a campaign lives

**A folder, not rows.** The property SEREN trades on is a campaign you can read with your
eyes and a ledger you can audit line by line; putting the state in a database costs exactly
that. So the generator writes the same folder it always writes, under an account:

```
/srv/seren/
  dm/  docs/  npcs/  library/      the shared corpus, read-only, every campaign sees it
  players/<account-id>/<slug>/     one folder per campaign, in SEREN's formats
```

The database is only the **index**: account, which campaigns exist, when each was last
played, spend to date. It never holds game state, and an account id is opaque — the email
never appears in a path.

**The auth is already specified, for another game.** Deadline Dungeon's TRD calls for an
email magic link over SES with an HMAC-signed HttpOnly cookie and per-account folders.
SEREN wants precisely that, so it gets built once and both use it (the library rule).
Elsewhere's gate is the starting point; what is missing is the SES send and the token table.

Three things arrive with accounts, none of which block the builder:

1. **The spend cap moves to the account.** Per-session is fine behind one password and
   useless when a stranger can open twenty sessions.
2. **Live session state has to be written down.** The server holds it in memory today, so a
   restart drops an in-flight roll — for everybody.
3. **One writer per campaign.** Two tabs would both append to the ledger. A lock per
   folder, and the second tab gets told why.

---

## ⚠️ What the DM can actually reach

Worth stating plainly, because "the corpus is on disk" and "the corpus is in the prompt"
are not the same thing. The system prompt is four layers: the contract, the state formats,
*this campaign* (its `campaign.md`, persona, fronts and its own `canon/antagonists/`), and
where things stand. **The 42 global role templates are not in it.** They are the builder's
raw material; the builder draws from them and writes the chosen people into the campaign's
own canon, and from then on the DM knows them.

That leaves a gap at the table: a player walks into a tavern nobody scripted and Seren
invents the barman from nothing instead of drawing one. The fix is a small tool — **`cast`**,
which pulls a role template on demand and writes the result to canon so the barman exists
afterwards and is the same barman next week. Add it to the build list.

---

## The importer, and why it is the same build

An importer ends up writing **the same folder**. The difference is only where the skeleton
comes from: the wizard's answers, or somebody's PDF. Build the writer once, and the two are
a front end each.

That also makes the order obvious. The generator is the front door and needs no permission
from anybody; the importer is for the DM who already has something. **Generator first.**

---

## Licensed adventures: what the delve found

- **The SRD is not the problem.** SRD 5.1 and 5.2 are CC BY 4.0 — rules, monsters, spells.
  We already serve 5.2 and credit it. No adventure comes with them.
- **Basic Fantasy RPG** is the one real open corpus: the game and a shelf of modules
  (Morgansfort and the rest) under **CC BY-SA 4.0**. Commercial use is fine with credit.
  ⚠️ The **share-alike** is the catch: a campaign folder derived from one would have to
  carry the same licence. Fine for a showcase campaign, awkward as a product foundation.
- **Individual CC BY adventures exist** — itch.io's CC-BY filters, and the SRD 5.1 CC-BY
  jam produced a pile — but they are one-at-a-time finds. Each needs its licence read on
  its own page, and most are one-shots of a few pages.
- **What nobody is giving away** is a 3.5-era published module. Those are Wizards', from the
  2000s, and copyright runs for decades. Out of the question, and not worth the search.

**Reading of it:** there is no single great adventure sitting in the open waiting to be
lifted. And an adventure would need converting anyway, because SEREN wants fronts,
antagonists and tagged facts, not scene-by-scene prose. So the licence delve does not
change the order: build the generator, and if we want a marquee import later, BFRPG under
CC BY-SA is the honest candidate.

---

## Open questions for Jay

1. **Does Express ask for a character at all**, or hand you a pregen and let you change it
   later? (Fastest door versus the thing people actually enjoy.)
2. **Is the generated campaign editable after the fact** — an admin screen over the folder —
   or regenerate-and-discard?
3. **Where do the tables get their dozen of each from?** Written by us, generated offline
   and edited, or grown from what play throws up.
4. **Does the builder ship with one hand-made campaign** as the shop window, so the first
   thing a stranger sees is not a wizard?

Sources for the licence section:
[Basic Fantasy](https://basicfantasy.org/downloads.html) ·
[BFRPG licensing thread](https://basicfantasy.org/forums/viewtopic.php?t=5101) ·
[SRD 5.1 CC-BY jam](https://itch.io/jam/srd-cc-by) ·
[itch.io CC BY physical games](https://itch.io/physical-games/assets-cc4-by/genre-rpg) ·
[WotC's Creative Commons move](https://techcrunch.com/2023/01/19/dungeons-dragons-creative-commons/)
