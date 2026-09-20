"""The auditor: the one gate between a written campaign and a played one.

**It is code, and that is the point.** A model's opinion can advise; it cannot refuse. The
failures this catches are the ones nothing downstream can: a secret tagged `known` has been
*declared visible*, so the fog gate will happily tell the player about it in session one,
and the campaign is spoiled before it starts.

Everything here is checkable without asking anybody: how many facts, whether each carries a
real visibility, whether any front wants what another front holds, whether somebody else's
setting walked in. Complaints go back to the weaver once (`weave.mend`); if they survive
that, the campaign is refused and the player deals again.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

VISIBILITIES = ("true", "known", "suspected", "false")

# One hit is enough to look by hand. Not exhaustive, and does not need to be.
BORROWED = (
    "faerûn", "faerun", "waterdeep", "cormyr", "neverwinter", "baldur's gate", "icewind",
    "forgotten realms", "greyhawk", "eberron", "ravenloft", "strahd", "barovia",
    "dragonlance", "krynn", "mordenkainen", "elminster", "drizzt", "sigil", "athas",
    "greenest", "phandalin", "candlekeep",
)

WANT_A_FRONT = re.compile(r"\*\*Wants from:\*\* (.+)$", re.M)
FRONT_NAME = re.compile(r"^## (.+)$", re.M)


def check(camp: dict) -> list[str]:
    """Audit the campaign object, before it is ever written to disk. Empty list means pass."""
    problems: list[str] = []

    facts = camp.get("facts") or []
    if len(facts) < 6:
        problems.append(f"only {len(facts)} facts — seven were asked for, and six is the floor")
    for i, f in enumerate(facts, start=1):
        vis = str(f.get("visibility") or "").lower()
        if vis not in VISIBILITIES:
            problems.append(f"fact {i} has visibility {f.get('visibility')!r}; it must be one of "
                            + ", ".join(VISIBILITIES))
        if not str(f.get("fact") or "").strip():
            problems.append(f"fact {i} is empty")
    known = [f for f in facts if str(f.get("visibility") or "").lower() == "known"]
    if len(known) > 1:
        problems.append(f"{len(known)} facts start `known`, but the party has played nothing yet. "
                        "Set all but at most one to `true`, `suspected` or `false`")
    if facts and not any(str(f.get("visibility") or "").lower() == "true" for f in facts):
        problems.append("no `true` facts: nothing is secret, so there is nothing to find out")

    fronts = camp.get("fronts") or []
    if len(fronts) < 2:
        problems.append(f"{len(fronts)} fronts — write three, and make them want things from each other")
    names = [str(f.get("name") or "").strip() for f in fronts if f.get("name")]
    interlocks = [f for f in fronts
                  if any(n and n.lower()[:12] in str(f.get("wants_from") or "").lower()
                         for n in names if n.lower() != str(f.get("name") or "").lower())]
    if fronts and not interlocks:
        problems.append("every front points at the party; at least one must want something "
                        "another front holds — name that front in `wants_from`")
    for f in fronts:
        if not str(f.get("impulse") or "").strip():
            problems.append(f"front {f.get('name', '?')!r} has no impulse")
        if len(f.get("clock") or []) < 2:
            problems.append(f"front {f.get('name', '?')!r} has no clock to run")

    a = camp.get("antagonist") or {}
    if not str(a.get("name") or "").strip():
        problems.append("the antagonist has no name")
    if not str(a.get("grudge") or "").strip():
        problems.append("the antagonist has no grudge, so nothing they do is about this party")

    if not str(camp.get("opening") or "").strip():
        problems.append("there is no opening scene; the table has nothing to open on")
    if len(str(camp.get("premise") or "").split()) < 12:
        problems.append("the premise is a phrase, not a premise")

    whole = json.dumps(camp, ensure_ascii=False).lower()
    for word in BORROWED:
        if word in whole:
            problems.append(f"borrowed setting name: {word!r} — invent the places")
    return problems


def check_folder(folder: Path) -> list[str]:
    """The same audit against a module already on disk, for anything not written by us."""
    problems: list[str] = []
    facts_file = folder / "state" / "facts.jsonl"
    facts = []
    if facts_file.is_file():
        for line in facts_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    facts.append(json.loads(line))
                except ValueError:
                    problems.append("a line in facts.jsonl is not json")
    fronts_text = (folder / "fronts.md").read_text(encoding="utf-8") if (folder / "fronts.md").is_file() else ""
    camp = {
        "facts": facts,
        "fronts": [{"name": n, "wants_from": w, "impulse": "read from disk", "clock": ["", ""]}
                   for n, w in zip(FRONT_NAME.findall(fronts_text), WANT_A_FRONT.findall(fronts_text))],
        "antagonist": {"name": "read from disk", "grudge": "read from disk"},
        "opening": "read from disk",
        "premise": (folder / "campaign.md").read_text(encoding="utf-8")[:400] if (folder / "campaign.md").is_file() else "",
    }
    return problems + check(camp)
