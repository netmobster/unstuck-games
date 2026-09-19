"""Roll a campaign, then ask a model to make it a campaign.

Two halves, deliberately. **The dice pick the parts** — trope first, then everything else
weighted to fit it — and the model only writes the connective tissue: who these people are,
what they want from each other, and what is true that nobody knows yet. That is the studio
mechanic (generation and dice), pointed at a campaign instead of a ferret.

    python generate.py --n 10 --out ../content/generated

Nothing here touches a live campaign. The output is a module: inert until somebody plays it.
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "web"))

import llm  # noqa: E402  (the web server's Bedrock client, reused)

# A skeleton is longer than a turn of play, and the table's cap was truncating the json
# mid-fact — which the audit then read as "not enough facts". The cap is the table's, not
# the generator's.
llm.MAX_TOKENS = int(__import__("os").environ.get("SEREN_GEN_TOKENS", "4000"))
import tables  # noqa: E402

SCHEMA = """Return ONE json object, no prose around it:

{
  "title": "three or four words, no colon",
  "premise": "two sentences. what is happening, and why it will not wait",
  "where": "the opening scene's place and time of day, one line",
  "pc": {"name": "", "class": "an SRD class", "why_here": "one line, from the origin"},
  "companions": [{"name": "", "does": "", "friction": ""}],
  "fronts": [
    {"name": "", "impulse": "to <verb> ...", "wants_from": "another front's name, or the party",
     "clock": ["portent 1", "portent 2", "portent 3"], "doom": "what happens if nobody stops it"}
  ],
  "antagonist": {"name": "", "axis": "", "posture": "", "grudge": "one line, party-relative",
                 "escalation": ["2 — ", "3 — ", "4+ — "]},
  "facts": [{"fact": "", "visibility": "true|known|suspected|false", "why": "one line"}],
  "opening": "what the player sees in the first ten seconds. Present tense, no preamble"
}"""

RULES = """How to write it:

- EXACTLY THREE FRONTS. Name them, and make at least one `wants_from` hold the NAME OF
  ANOTHER FRONT in this list — not "the party". A front that only points at the party is
  pressure; a front that wants what another front holds is a world. Example: if the fronts
  are "The Assay Office" and "Corrin's people", then Corrin's `wants_from` reads
  "The Assay Office — the ledger they keep".
- EXACTLY SEVEN FACTS, numbered in your head before you write them. Visibility is the
  load-bearing field:
    true      = so, and the party has no idea. MOST OF YOUR SECRETS ARE THIS.
    known     = the party has established it in play. At session zero, almost nothing is.
    suspected = they have a reason to think it, and might be wrong.
    false     = they believe it and it is not so.
  A front's own secret is NEVER `known` at the opening. Getting this wrong spoils the
  campaign before it starts.
- NO REAL SETTING. No Faerûn, no Cormyr, no Waterdeep, no Forgotten Realms names, no names
  from any published adventure. Invent the places.
- NOBODY IS PURE. The antagonist is right about one thing. Say which in their grudge.
- The opening is a SCENE, not a summary: one concrete image, someone present, something
  already in motion."""


def roll(rng: random.Random) -> dict:
    """The picks. Trope first; everything else is drawn to fit it."""
    trope = rng.choice(tables.TROPES)
    return {
        "trope": trope,
        "origin": rng.choice(tables.ORIGINS),
        "world": rng.choice(tables.WORLDS),
        "trouble": rng.choice(tables.TROUBLES),
        "posture": rng.choice(tables.POSTURES),
        "axis": rng.choice(tables.AXES),
        "companions": rng.sample(tables.COMPANIONS, 2),
        "persona": rng.choice(tables.PERSONAS),
        "dials": {k: rng.choice(v) for k, v in tables.DIALS.items()},
    }


def brief(picks: dict) -> str:
    """The rolled parts, as the model sees them."""
    t, o, w, tr, p = picks["trope"], picks["origin"], picks["world"], picks["trouble"], picks["posture"]
    comps = "; ".join(f"{c[0]} ({c[1]}, but {c[2]})" for c in picks["companions"])
    dials = ", ".join(f"{k}: {v}" for k, v in picks["dials"].items())
    return f"""The parts, already rolled. Use ALL of them; do not swap any out.

TROPE (the spine — everything should serve this): {t[0]} — {t[1]}. It pulls: {t[2]}
ORIGIN (the player's): {o[0]} — {o[1]}. It gives the campaign: {o[2]}
WORLD: {w[0]} — {w[1]}
TROUBLE: {tr[0]} — {tr[1]}
ANTAGONIST: wants the party {picks['axis']}, posture {p[0]} — "{p[1]}" ({p[2]})
COMPANIONS: {comps}
TOLD BY: {picks['persona'][0]}, {picks['persona'][1]} ({picks['persona'][2]})
DIALS: {dials}"""


def generate(picks: dict, tier: str = "paid") -> dict:
    system = ("You build campaign skeletons for an AI dungeon master. Structure, never prose: "
              "the DM writes the sentences at the table. Be concrete and specific — a named "
              "person with a want beats an atmosphere every time.\n\n" + RULES + "\n\n" + SCHEMA)
    reply = llm.converse(system=system, messages=[{"role": "user", "content": [{"text": brief(picks)}]}],
                         tools=None, tier=tier, spent=0.0)
    text = llm.text_of(reply["content"]).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no json in the reply")
    return {"campaign": json.loads(text[start:end + 1]), "spent": reply["spent"]}


def write_module(out: Path, picks: dict, camp: dict) -> None:
    """A module folder, in SEREN's formats. Inert: no ledger, no session, no live state."""
    out.mkdir(parents=True, exist_ok=True)
    (out / "state").mkdir(exist_ok=True)
    (out / "canon" / "antagonists").mkdir(parents=True, exist_ok=True)

    picks_line = " · ".join([picks["trope"][0], picks["origin"][0], picks["world"][0],
                             picks["trouble"][0], picks["posture"][0]])
    (out / "campaign.md").write_text(
        f"""<!-- Generated {picks_line}. A module: inert until instantiated. -->
# {camp.get('title', 'Untitled')}

{camp.get('premise', '')}

**Rolled from:** {picks_line} · told by {picks['persona'][0]}
**Dials:** {', '.join(f'{k} {v}' for k, v in picks['dials'].items())}

## The player
{camp.get('pc', {}).get('name', '')} — {camp.get('pc', {}).get('class', '')}.
{camp.get('pc', {}).get('why_here', '')}

## At the table
""" + "\n".join(f"- **{c.get('name','')}** — {c.get('does','')}, but {c.get('friction','')}"
                for c in camp.get("companions", [])) + f"""

## The opening
{camp.get('opening', '')}
""", encoding="utf-8", newline="\n")

    fronts = camp.get("fronts", [])
    (out / "fronts.md").write_text("# Fronts\n\n" + "\n\n".join(
        f"""## {f.get('name','')}
**Impulse:** {f.get('impulse','')}
**Wants from:** {f.get('wants_from','')}
**Doom:** {f.get('doom','')}

""" + "\n".join(f"{i+1}. {p}" for i, p in enumerate(f.get("clock", []))) for f in fronts
    ) + "\n", encoding="utf-8", newline="\n")

    a = camp.get("antagonist", {})
    slug = str(a.get("name", "antagonist")).lower().replace(" ", "-")[:40] or "antagonist"
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
""" + "\n".join(f"- {step}" for step in a.get("escalation", [])) + "\n",
        encoding="utf-8", newline="\n")

    with (out / "state" / "facts.jsonl").open("w", encoding="utf-8", newline="\n") as fh:
        for i, f in enumerate(camp.get("facts", []), start=1):
            fh.write(json.dumps({"id": "f%03d" % i, "s": 0, "op": "establish",
                                 "fact": f.get("fact", ""), "visibility": f.get("visibility", "true"),
                                 "why": f.get("why", ""), "src": "module"}, ensure_ascii=False) + "\n")

    (out / "state" / "scene.md").write_text(
        f"""---
where:    "{camp.get('where','')}"
present:  [pc]
also_present: []
round:    null
initiative: []
foes:     {{}}
---

# Scene — session 1, unopened
""", encoding="utf-8", newline="\n")

    (out / "picks.json").write_text(json.dumps({
        "trope": picks["trope"][0], "origin": picks["origin"][0], "world": picks["world"][0],
        "trouble": picks["trouble"][0], "posture": picks["posture"][0], "axis": picks["axis"],
        "companions": [c[0] for c in picks["companions"]], "persona": picks["persona"][0],
        "dials": picks["dials"],
    }, indent=1), encoding="utf-8", newline="\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--out", default="../content/generated")
    ap.add_argument("--tier", default="paid")
    args = ap.parse_args()

    out_root = Path(args.out).resolve()
    rng = random.Random(args.seed)
    spent = 0.0
    for i in range(1, args.n + 1):
        picks = roll(rng)
        try:
            got = generate(picks, args.tier)
        except Exception as exc:           # one bad roll should not stop the batch
            print(f"{i:2}. FAILED  {type(exc).__name__}: {exc}")
            continue
        camp = got["campaign"]
        spent = got["spent"]
        slug = f"{i:02d}-" + "".join(ch if ch.isalnum() else "-" for ch in str(camp.get("title", "untitled")).lower())[:40].strip("-")
        write_module(out_root / slug, picks, camp)
        print(f"{i:2}. {camp.get('title','?'):32} {picks['trope'][0]:24} {picks['world'][0]:28} "
              f"{len(camp.get('fronts',[]))} fronts, {len(camp.get('facts',[]))} facts")
    print(f"\nwritten to {out_root}   spend this run: ${spent:.2f}")


if __name__ == "__main__":
    main()
