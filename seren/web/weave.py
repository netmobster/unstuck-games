"""The weaver: the Loom's hand, written up as a campaign.

One pass, its own model, its own prompt, and never at the table. It is handed what the
player dealt — seven cards and five dials — and returns the connective tissue: who these
people are, what they want from each other, and what is true that nobody knows yet.

**It is not allowed to invent the picks.** The hand was dealt in front of the player and it
stands; the weaver writes the world those cards imply. That split — dice choose, model
writes — is the studio's own mechanic, and it is why two players who deal the same hand get
recognisably the same campaign rather than two unrelated ones.

The output is a MODULE: inert, unplayed, with no ledger and no state. `audit.py` reads it
before anybody sits down, and only then is it instantiated as somebody's live campaign.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

import files
import llm

# A skeleton is longer than a turn of play, and the table's cap would truncate it mid-fact.
GEN_TOKENS = int(os.environ.get("SEREN_GEN_TOKENS", "4000"))

SCHEMA = """Return ONE json object and nothing else:

{
  "title": "three or four words. no colon, no subtitle",
  "premise": "two sentences: what is happening, and why it will not wait",
  "where": "the opening scene's place and time of day, one line",
  "pc": {"name": "", "class": "an SRD class", "why_here": "one line, out of the origin"},
  "companions": [{"name": "the card's name", "does": "", "friction": ""}],
  "fronts": [
    {"name": "", "impulse": "to <verb> ...",
     "wants_from": "the NAME of another front in this list, and what it holds",
     "clock": ["portent 1", "portent 2", "portent 3"],
     "doom": "what happens if nobody stops it"}
  ],
  "antagonist": {"name": "", "axis": "destroyed|stopped|used|replaced", "posture": "the card",
                 "grudge": "one line, about this party, and they are right about one thing",
                 "escalation": ["2 — ", "3 — ", "4+ — "]},
  "facts": [{"fact": "", "visibility": "true|known|suspected|false", "why": "one line"}],
  "opening": "the first ten seconds, present tense, no preamble"
}"""

RULES = """How to write it:

- EXACTLY THREE FRONTS, and at least one of them must want something it can only get from
  ANOTHER FRONT — never "the party". A front that only points at the party is pressure; a
  front that wants what another front holds is a world. Worked example, three fronts:
      "The Assay Office" wants_from: "the party" — they are hiding an unlicensed casting
      "Corrin's people" wants_from: "The Assay Office — the ledger of who was assayed"
      "The orchard families" wants_from: "Corrin's people — the debt they are owed"
  Two of those three point somewhere other than the party. Do that.
- EXACTLY SEVEN FACTS. Visibility is the load-bearing field:
    true      = so, and nobody at the table knows it. MOST OF YOURS ARE THIS.
    known     = the party established it in play. At the opening, at most one.
    suspected = they have reason to think it, and may be wrong.
    false     = they believe it and it is not so.
  A front's own secret is NEVER `known` at the opening. Getting this wrong spoils the
  campaign before it starts.
- NO BORROWED SETTING. No Faerûn, Cormyr, Waterdeep, Greyhawk, Barovia, or any name from a
  published adventure. Invent the places.
- NOBODY IS PURE. Say in the grudge what the antagonist is right about.
- NOBODY IS CALLED SEREN. That is the dungeon master's name, not a character's. Do not use
  it for the player, a companion, an antagonist, a place or a family.
- The opening is a SCENE: one concrete image, somebody present, something already moving.
- Use the cards you were dealt. All of them. Do not swap one out for a better idea."""

SYSTEM = ("You build campaign skeletons for an AI dungeon master. Structure, never prose — "
          "the DM writes the sentences at the table. Be concrete: a named person with a want "
          "beats an atmosphere every time.\n\n" + RULES + "\n\n" + SCHEMA)


def brief(picks: dict, dials: dict, cards: dict) -> str:
    """The hand, as the weaver sees it. `cards` carries each card's own words."""
    def one(cat: str) -> str:
        c = cards.get(cat) or {}
        bits = [c.get("name", ""), c.get("line", ""), c.get("changes", "")]
        return " — ".join(b for b in bits if b)

    comps = "; ".join(f"{c.get('name','')} ({c.get('line','')}, but {c.get('changes','')})"
                      for c in (cards.get("companions") or []))
    tuning = "\n".join(f"  {k}: {v}" for k, v in (dials or {}).items())
    return f"""The hand, already dealt. Every card below is in the campaign.

TROPE — the spine, and everything should serve it: {one('trope')}
WHO THE PLAYER IS — use this name and class for pc: {one('pc') or 'yours to write'}
ORIGIN — the player's: {one('origin')}
WORLD: {one('world')}
TROUBLE: {one('trouble')}
ANTAGONIST — Seren played this one herself: {one('posture')}
COMPANIONS: {comps}
TOLD BY: {one('persona')}

The stakes, as the player set them (0 is the left-hand word, 100 the right):
{tuning}

The dials never choose a card. They tell you HOW to write what was dealt: how absurd the
world may be, how big the trouble is allowed to get, how dangerous, whether pressure comes
from people or from places, and how long the clocks run."""


PUBLISHED = """

THE PUBLISHED CAMPAIGN. This story is fixed: write the skeleton INSIDE it. Same place, same victim,
same premise; do not invent a different one. The dealt cards choose which version of it this is.
- "title" must be exactly: {title}
- The premise and the opening must agree with what the player is told below.
- The antagonist, the fronts and the true facts come from "what is actually true" for this hand.
  Those are secrets: write them as `true` (or `false` for what the town wrongly believes), never `known`.
- Keep the house rules.
- "premise", "where", "opening", the pc's "why_here" and any fact marked `known` or `suspected` are
  what the PLAYER sees. They never name who did it.

{story}"""


def full_brief(picks: dict, dials: dict, cards: dict) -> str:
    """The hand, plus the published campaign's own story when the hand was dealt from one."""
    import published
    slug = str(picks.get("campaign") or "")
    told = published.story(slug, cards) if slug else None
    if not told:
        return brief(picks, dials, cards)
    return brief(picks, dials, cards) + PUBLISHED.format(
        title=told.get("title") or "", story=json.dumps(told, ensure_ascii=False, indent=1))


def _keep_title(camp: dict, picks: dict) -> None:
    """A published campaign keeps its own name, whatever the model wrote."""
    import published
    slug = str(picks.get("campaign") or "")
    told = published.story(slug, {}) if slug else None
    if told and told.get("title"):
        camp["title"] = told["title"]


def secret_names(picks: dict, cards: dict) -> list[str]:
    """The names a published campaign keeps secret for this hand: each truth's culprit."""
    import published
    slug = str(picks.get("campaign") or "")
    told = published.story(slug, cards) if slug else None
    names = []
    for entry in ((told or {}).get("truths_for_this_hand") or {}).values():
        name = str((entry or {}).get("culprit") or "").split(",")[0].strip()
        if len(name) > 3:
            names.append(name)
    return names


def player_leaks(camp: dict, picks: dict, cards: dict, book_text: str = "") -> list[str]:
    """Problems in the auditor's voice when a secret name reaches what the player sees."""
    seen = " ".join([str(camp.get(k) or "") for k in ("premise", "where", "opening")]
                    + [str((camp.get("pc") or {}).get("why_here") or "")]
                    + [str(f.get("fact") or "") for f in camp.get("facts") or []
                       if str(f.get("visibility", "")).lower() in ("known", "suspected")]).lower()
    out = []
    for name in secret_names(picks, cards):
        if name.lower() in seen:
            out.append(f"the player-facing premise, opening or a known/suspected fact names {name!r}, who is a secret. Remove the name")
        if book_text and name.lower() in book_text.lower():
            out.append(f"the book names {name!r}, who is a secret")
    return out


def mocking() -> bool:
    return os.environ.get("SEREN_AI", "").lower() in ("mock", "local")


def _mock_campaign(picks: dict, cards: dict) -> dict:
    """A canned skeleton built from the dealt cards, for local runs with SEREN_AI=mock.

    It is not a story. It puts the real card names where the weaver would, and passes the
    real auditor, so the whole flow (deal, dials, book, table) can be clicked through with
    no model and no spend."""
    def name(slot, fallback):
        return str((cards.get(slot) or {}).get("name") or fallback)
    comps = cards.get("companions") or []
    trope, world, trouble = name("trope", "A debt"), name("world", "a small town"), name("trouble", "a death")
    origin, posture = name("origin", "a stranger"), name("posture", "the one in charge")
    title = picks.get("campaign_title") or f"{trope} at the Mill"
    return {
        "title": title,
        "premise": (f"{trouble}, in {world}, and nobody wants it asked about. You came because of "
                    f"the {origin.lower()}, and somebody at this wake would rather you went home."),
        "where": f"{world}, the hour before dark",
        "pc": {"name": name("pc", "Wren Cole"),
               "class": str((cards.get("pc") or {}).get("changes", "Rogue")).split(".")[0],
               "why_here": f"The {origin.lower()}: someone here owes you."},
        "companions": [{"name": str(c.get("name", "")), "does": str(c.get("line", "")),
                        "friction": str(c.get("changes", ""))} for c in comps],
        "fronts": [
            {"name": "The Parish Clerk", "impulse": "to keep the register closed",
             "wants_from": "The Millers' Guild — the ledger page they tore out",
             "clock": ["the register goes missing", "a witness leaves town", "the page is burned"],
             "doom": "nobody can ever prove what happened"},
            {"name": "The Millers' Guild", "impulse": "to settle the debt quietly",
             "wants_from": "The Parish Clerk — the burial record",
             "clock": ["a debt is called in", "a lease is cancelled", "a family is turned out"],
             "doom": "the orchard changes hands for nothing"},
            {"name": posture, "impulse": "to be thanked for keeping order",
             "wants_from": "the party — their silence",
             "clock": ["a warning", "a fine", "an arrest"],
             "doom": "the wrong person hangs"},
        ],
        "antagonist": {"name": posture, "axis": "stopped", "posture": posture,
                       "grudge": "You are strangers stirring up grief, and they are right that it will hurt people.",
                       "escalation": ["2 — a polite warning", "3 — doors close", "4+ — the law moves"]},
        "facts": [
            {"fact": "The ledger page was torn out after the death, not before.", "visibility": "true", "why": "the clock"},
            {"fact": "Two families owed the same debt.", "visibility": "true", "why": "the motive"},
            {"fact": "The clerk can't read the old hand.", "visibility": "true", "why": "a weakness"},
            {"fact": "The death was not an accident.", "visibility": "suspected", "why": "the hook"},
            {"fact": "The guild paid for the funeral.", "visibility": "true", "why": "a thread"},
            {"fact": "The dog knows the way to the mill race.", "visibility": "true", "why": "a companion's use"},
            {"fact": "The town believes the debt died with the debtor.", "visibility": "false", "why": "the lie"},
        ],
        "opening": ("Rain on the lychgate. A stranger in a good coat stands under it with an umbrella that isn't theirs, "
                    "and holds out a hand for your papers before you've said a word."),
    }


def weave(picks: dict, dials: dict, cards: dict, tier: str = "paid") -> dict:
    """One call. Returns the campaign object and what it cost."""
    if mocking():
        import mock_book
        import published
        camp = _mock_campaign(picks, cards)
        slug = str(picks.get("campaign") or "")
        shelf = next((c for c in published.listing() if c.get("slug") == slug), None)
        camp["briefing"] = mock_book.briefing(camp, cards, shelf, slug)
        return {"campaign": camp, "spent": 0.0}
    was, llm.MAX_TOKENS = llm.MAX_TOKENS, GEN_TOKENS
    try:
        reply = llm.converse(system=SYSTEM,
                             messages=[{"role": "user", "content": [{"text": full_brief(picks, dials, cards)}]}],
                             tools=None, tier=tier, spent=0.0, temperature=0.8)
    finally:
        llm.MAX_TOKENS = was
    text = llm.text_of(reply["content"]).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("the weaver returned no json")
    camp_out = json.loads(text[start:end + 1])
    _keep_title(camp_out, picks)
    return {"campaign": camp_out, "spent": reply["spent"]}


BOOK_TOKENS = int(os.environ.get("SEREN_BOOK_TOKENS", "3500"))

BOOK_SYSTEM = """You write the player's book for a one-shot tabletop campaign: what a dungeon master
hands the player before the first scene. It is the one thing in the campaign written for the player.

Second person, present tense, addressed to the player. Player-side only: what their character knows
or has heard. A suspicion is written as a suspicion, in the character's own terms, never as the
answer. The antagonist appears only by public reputation: what people say. Everything you write is
true from the first scene, and every place and person you name becomes somewhere the player can go
and someone they can find, so write them as places to go, not scenery. Invent places freely; never
use a published setting. Nobody is called Seren. About 900 to 1,400 words.

Markdown, in exactly this order and with exactly these headings:

# <title> — your book
Three or four sentences: who you are and what is happening tonight. Then where you are standing.
---
## You
Name, class and a line of who they are. Bullets: where they came from, who took them in, what they
suspect about themselves. Use the origin and the character card's own words as lived experience.
### What you can do, in plain words
A two-column table (| | |), four to six rows: what this class can do at this level, in plain words.
---
## Your people
A short paragraph for each companion, as the character knows them: the card's visible half only.
---
## <the world's name>, and how it works
The rules everyone here knows: money, law, families, institutions. The world card as lived experience.
---
## Who's who
A table, | who | what people say |, every person the premise names, public reputation only.
---
## Places you know
"Go anywhere. These are the places you already know your way around." Then a table,
| place | what is there |, five to eight places.
---
## Tonight
The hook and the first scene's situation, ending with the opening as a > quote.
---
## How this table plays
Bullets: who tells it and how; dice only when the outcome is uncertain; what the stakes and danger
dials mean here, in plain words; death as the danger dial sets it; and last, "Everything in this
book is true. The rest is there to find."

Return the markdown and nothing else."""


def _player_side(camp: dict, cards: dict, shelf: dict | None, dials: dict) -> dict:
    """What the book writer may see. No fronts, no grudges, no true or false facts: it can't leak
    what it was never told."""
    a = camp.get("antagonist") or {}
    return {
        "title": camp.get("title"), "premise": camp.get("premise"), "where": camp.get("where"),
        "opening": camp.get("opening"), "pc": camp.get("pc"), "companions": camp.get("companions"),
        "antagonist": {"kind": a.get("posture"), "note": "public reputation only; the book never names them"},
        "what_the_player_suspects": [f.get("fact") for f in camp.get("facts") or []
                                     if str(f.get("visibility", "")).lower() == "suspected"],
        "what_the_player_knows": [f.get("fact") for f in camp.get("facts") or []
                                  if str(f.get("visibility", "")).lower() == "known"],
        "cards": {k: ({"name": v.get("name"), "line": v.get("line"), "changes": v.get("changes"),
                       "at_this_table": v.get("as")} if isinstance(v, dict) else
                      [{"name": c.get("name"), "line": c.get("line"), "at_this_table": c.get("as")} for c in v])
                  for k, v in cards.items() if k != "posture"},
        "the_campaign": {k: (shelf or {}).get(k) for k in ("title", "tagline", "description", "key_info", "level", "length")}
                        if shelf else None,
        "dials": dials,
    }


def leaks(book: str, camp: dict) -> list[str]:
    """Secrets that reached the book verbatim. It can't see a paraphrase; the writer never saw them."""
    text = book.lower()
    found = []
    for f in camp.get("facts") or []:
        fact = str(f.get("fact") or "")
        if str(f.get("visibility", "")).lower() in ("true", "false") and len(fact) > 24 and fact.lower() in text:
            found.append(fact)
    a = camp.get("antagonist") or {}
    for key in ("grudge",):
        line = str(a.get(key) or "")
        if len(line) > 24 and line.lower() in text:
            found.append(line)
    return found


def book(camp: dict, picks: dict, dials: dict, cards: dict, tier: str = "paid") -> dict:
    """The player's book (SEREN docs/weave-from-hand.md 4b), written once the auditor has passed the
    skeleton. Returns {"book": markdown, "spent": cost}. Fake AI keeps the canned one."""
    import published
    slug = str(picks.get("campaign") or "")
    shelf = next((c for c in published.listing() if c.get("slug") == slug), None) if slug else None
    if mocking():
        import mock_book
        return {"book": camp.get("briefing") or mock_book.briefing(camp, cards, shelf, slug), "spent": 0.0}
    was, llm.MAX_TOKENS = llm.MAX_TOKENS, BOOK_TOKENS
    try:
        ask = ("Write the book from this. It is everything the player may know.\n\n"
               + json.dumps(_player_side(camp, cards, shelf, dials), ensure_ascii=False, indent=1))
        reply = llm.converse(system=BOOK_SYSTEM, messages=[{"role": "user", "content": [{"text": ask}]}],
                             tools=None, tier=tier, spent=0.0, temperature=0.7)
    finally:
        llm.MAX_TOKENS = was
    text = llm.text_of(reply["content"]).strip()
    if text.startswith("```"):
        text = text.strip("`").partition("\n")[2].rsplit("```", 1)[0].strip()
    if leaks(text, camp) or player_leaks({}, picks, cards, text):
        # Never hand over a book that names a secret. The skeleton's own premise and opening stand in.
        text = f"# {camp.get('title', '')} — your book\n\n{camp.get('premise', '')}\n\n## Tonight\n\n> {camp.get('opening', '')}\n"
    return {"book": text, "spent": reply["spent"]}


def mend(campaign: dict, problems: list[str], picks: dict, dials: dict, cards: dict,
         tier: str = "paid") -> dict:
    """One fix pass. The audit's complaints go back to the weaver before anything is refused.

    Cheaper than a re-roll and kinder to the player, who has already dealt a hand they like.
    """
    if mocking():
        return {"campaign": campaign, "spent": 0.0}
    said = "\n".join("- " + p for p in problems)
    was, llm.MAX_TOKENS = llm.MAX_TOKENS, GEN_TOKENS
    try:
        reply = llm.converse(
            system=SYSTEM,
            messages=[{"role": "user", "content": [{"text": full_brief(picks, dials, cards)}]},
                      {"role": "assistant", "content": [{"text": json.dumps(campaign, ensure_ascii=False)}]},
                      {"role": "user", "content": [{"text":
                          "The auditor refused this. Fix exactly these and change nothing "
                          f"else — same cards, same people, same premise:\n{said}\n\n"
                          "Return the whole json object again."}]}],
            tools=None, tier=tier, spent=0.0, temperature=0.4)
    finally:
        llm.MAX_TOKENS = was
    text = llm.text_of(reply["content"]).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0:
        return {"campaign": campaign, "spent": reply["spent"]}
    camp_out = json.loads(text[start:end + 1])
    _keep_title(camp_out, picks)
    return {"campaign": camp_out, "spent": reply["spent"]}


# ── writing it down ──────────────────────────────────────────────────────────

def slugify(text: str, fallback: str = "a-campaign") -> str:
    out = re.sub(r"[^a-z0-9]+", "-", str(text or "").lower()).strip("-")
    return out[:48] or fallback


def write_module(out: Path, camp: dict, picks: dict, dials: dict, cards: dict, seed=None) -> Path:
    """A module folder in SEREN's formats. No ledger, no session: inert until instantiated."""
    out.mkdir(parents=True, exist_ok=True)
    (out / "state").mkdir(exist_ok=True)
    (out / "canon" / "antagonists").mkdir(parents=True, exist_ok=True)
    nl = chr(10)

    hand = " · ".join(str((cards.get(c) or {}).get("name", "")) for c in
                      ("trope", "origin", "world", "trouble", "posture") if cards.get(c))
    comps = camp.get("companions") or []
    if camp.get("briefing"):
        # The book: the one file written for the player (SEREN docs/weave-from-hand.md §4b).
        files.write(out / "briefing.md", str(camp["briefing"]))
    files.write(out / "campaign.md",
        f"""<!-- Woven from a hand at the Loom. A module: inert until somebody plays it. -->
# {camp.get('title', 'Untitled')}

{camp.get('premise', '')}

**The hand:** {hand} · told by {(cards.get('persona') or {}).get('name', '')}
**The stakes:** {', '.join(f'{k} {v}' for k, v in (dials or {}).items())}

## The player
{(camp.get('pc') or {}).get('name', '')} — {(camp.get('pc') or {}).get('class', '')}.
{(camp.get('pc') or {}).get('why_here', '')}

## At the table
""" + nl.join(f"- **{c.get('name','')}** — {c.get('does','')}, but {c.get('friction','')}" for c in comps)
        + f"""

## The opening
{camp.get('opening', '')}
""")

    # The persona was dealt at the Loom and then thrown away: campaign_static() reads
    # DM-persona.md, and a woven campaign had none — so she narrated in nobody's voice.
    voice = cards.get("persona") or {}
    files.write(out / "DM-persona.md", f"""# {voice.get('name', 'The Registrar')}

**Told like:** {voice.get('line', 'a clerk reading out a form')}
**Which means:** {voice.get('changes', 'Short sentences, nouns, no adverbs')}

**This is a voice, not a person.** You narrate *like* this; you are not standing in the
room. Nobody in the world can see you, speak to you, or refer to you. If the campaign needs
a coroner, a registrar or a publican in the fiction, that is a different person with their
own name — and they are not you.

It changes how a thing is said and never what is true.
""")

    fronts = camp.get("fronts") or []
    body = (nl + nl).join(
        f"""## {f.get('name','')}
**Impulse:** {f.get('impulse','')}
**Wants from:** {f.get('wants_from','')}
**Doom:** {f.get('doom','')}

""" + nl.join(f"{i+1}. {step}" for i, step in enumerate(f.get("clock") or []))
        for f in fronts)
    files.write(out / "fronts.md", "# Fronts" + nl + nl + body + nl)

    a = camp.get("antagonist") or {}
    slug = slugify(a.get("name"), "antagonist")
    files.write(out / "canon" / "antagonists" / f"{slug}.md",
        f"""---
name: "{a.get('name','')}"
slug: "{slug}"
tier: antagonist
axis: {a.get('axis','')}
posture: {a.get('posture','')}
---

**Grudge.** {a.get('grudge','')}

**Escalation.**
""" + nl.join(f"- {step}" for step in (a.get("escalation") or [])) + nl)

    with (out / "state" / "facts.jsonl").open("w", encoding="utf-8", newline=nl) as fh:
        for i, f in enumerate(camp.get("facts") or [], start=1):
            fh.write(json.dumps({"id": "f%03d" % i, "s": 0, "op": "establish",
                                 "fact": f.get("fact", ""),
                                 "visibility": f.get("visibility", "true"),
                                 "why": f.get("why", ""), "src": "module"},
                                ensure_ascii=False) + nl)

    # ── the people, so the table has somebody at it ──────────────────────────
    pc = camp.get("pc") or {}
    pc_slug = slugify(pc.get("name"), "you")
    who = [(pc_slug, 10, {"1": 2})] + [(slugify(c.get("name"), "companion"), 9, {}) for c in comps]
    party = ["<!-- Woven. Stats are provisional: level 1, standard array, and honest about it. -->",
             "---", "round_synced: null", "xp:", "  current: 0", "  next:    300", ""]
    for slug, hp, slots in who:
        party += [f"{slug}:",
                  f"  hp:            {{current: {hp}, max: {hp}, temp: 0}}",
                  "  conditions:    []",
                  "  concentration: {spell: null, since_round: null}",
                  f"  slots:         {{{', '.join(f'{k}: {v}' for k, v in slots.items())}}}",
                  "  uses:          {}",
                  "  exhaustion:    0",
                  "  hit_dice:      {remaining: 1, die: d8}", ""]
    party += ["---", "", "# Party — as woven, before anybody has played a turn"]
    files.write(out / "state" / "party.md", nl.join(party) + nl)

    (out / "builds").mkdir(exist_ok=True)
    files.write(out / "builds" / f"{pc_slug}.md", f"""<!-- Woven with the campaign. Provisional: a real sheet comes from a build or an import. -->
---
pc:      {pc_slug}
level:   1
class:   "{pc.get('class', 'Fighter')}"
proficiency_bonus: 2

abilities: {{str: 13, dex: 14, con: 14, int: 10, wis: 12, cha: 8}}
ac: 13
hp:      {{max: 10, hit_die: d8}}
spell_save_dc: 12
spell_slots: {{1: 2}}

spells:
  prepared:
    - "as your class allows"
---

# {pc.get('name', 'You')}

{pc.get('why_here', '')}
""")

    present = ", ".join(slugify(c.get("name"), "companion") for c in comps)
    files.write(out / "state" / "scene.md",
        f"""---
where:    "{camp.get('where','')}"
present:  [{pc_slug}{", " + present if present else ""}]
also_present: []
round:    null
initiative: []
foes:     {{}}
---

# Scene — session 1, unopened
""")

    # The provenance the brief asks for: the same hand, one dial moved, is a re-weave.
    files.write(out / "hand.json", json.dumps(
        {"picks": picks, "dials": dials, "seed": seed,
         "cards": {k: (v if isinstance(v, list) else (v or {}).get("name"))
                   for k, v in cards.items()}}, indent=1, ensure_ascii=False))
    return out
