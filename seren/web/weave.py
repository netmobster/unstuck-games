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


def weave(picks: dict, dials: dict, cards: dict, tier: str = "paid") -> dict:
    """One call. Returns the campaign object and what it cost."""
    was, llm.MAX_TOKENS = llm.MAX_TOKENS, GEN_TOKENS
    try:
        reply = llm.converse(system=SYSTEM,
                             messages=[{"role": "user", "content": [{"text": brief(picks, dials, cards)}]}],
                             tools=None, tier=tier, spent=0.0, temperature=0.8)
    finally:
        llm.MAX_TOKENS = was
    text = llm.text_of(reply["content"]).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("the weaver returned no json")
    return {"campaign": json.loads(text[start:end + 1]), "spent": reply["spent"]}


def mend(campaign: dict, problems: list[str], picks: dict, dials: dict, cards: dict,
         tier: str = "paid") -> dict:
    """One fix pass. The audit's complaints go back to the weaver before anything is refused.

    Cheaper than a re-roll and kinder to the player, who has already dealt a hand they like.
    """
    said = "\n".join("- " + p for p in problems)
    was, llm.MAX_TOKENS = llm.MAX_TOKENS, GEN_TOKENS
    try:
        reply = llm.converse(
            system=SYSTEM,
            messages=[{"role": "user", "content": [{"text": brief(picks, dials, cards)}]},
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
    return {"campaign": json.loads(text[start:end + 1]), "spent": reply["spent"]}


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
    (out / "campaign.md").write_text(
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
""", encoding="utf-8", newline=nl)

    fronts = camp.get("fronts") or []
    body = (nl + nl).join(
        f"""## {f.get('name','')}
**Impulse:** {f.get('impulse','')}
**Wants from:** {f.get('wants_from','')}
**Doom:** {f.get('doom','')}

""" + nl.join(f"{i+1}. {step}" for i, step in enumerate(f.get("clock") or []))
        for f in fronts)
    (out / "fronts.md").write_text("# Fronts" + nl + nl + body + nl, encoding="utf-8", newline=nl)

    a = camp.get("antagonist") or {}
    slug = slugify(a.get("name"), "antagonist")
    (out / "canon" / "antagonists" / f"{slug}.md").write_text(
        f"""---
name: "{a.get('name','')}"
slug: "{slug}"
tier: antagonist
axis: {a.get('axis','')}
posture: {a.get('posture','')}
---

**Grudge.** {a.get('grudge','')}

**Escalation.**
""" + nl.join(f"- {step}" for step in (a.get("escalation") or [])) + nl,
        encoding="utf-8", newline=nl)

    with (out / "state" / "facts.jsonl").open("w", encoding="utf-8", newline=nl) as fh:
        for i, f in enumerate(camp.get("facts") or [], start=1):
            fh.write(json.dumps({"id": "f%03d" % i, "s": 0, "op": "establish",
                                 "fact": f.get("fact", ""),
                                 "visibility": f.get("visibility", "true"),
                                 "why": f.get("why", ""), "src": "module"},
                                ensure_ascii=False) + nl)

    present = ", ".join(slugify(c.get("name"), "companion") for c in comps)
    (out / "state" / "scene.md").write_text(
        f"""---
where:    "{camp.get('where','')}"
present:  [pc{', ' + present if present else ''}]
also_present: []
round:    null
initiative: []
foes:     {{}}
---

# Scene — session 1, unopened
""", encoding="utf-8", newline=nl)

    # The provenance the brief asks for: the same hand, one dial moved, is a re-weave.
    (out / "hand.json").write_text(json.dumps(
        {"picks": picks, "dials": dials, "seed": seed,
         "cards": {k: (v if isinstance(v, list) else (v or {}).get("name"))
                   for k, v in cards.items()}}, indent=1, ensure_ascii=False),
        encoding="utf-8", newline=nl)
    return out
