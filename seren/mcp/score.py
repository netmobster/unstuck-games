"""Score a played session for the cross-model matrix (red team #2). Objective failures only.

    python seren/mcp/score.py <campaign folder> [session]      # default: the latest

Reads what a session over MCP leaves behind:
    sessions/<n>-stream.jsonl   the handback: narration and player lines, stamped at sync
    sessions/<n>-calls.jsonl    one line per tool call: which tool, when, refused or not
    state/ledger.jsonl          including the instrument lines the handback wrote

⚠️ **Every row says how it is measured**, because a flattering instrument is worse than
none (the fixture's ROSTER counted "Hesper Vane" as two people for three turns). `exact`
means read off the record. `heuristic` means a pattern over prose: it undercounts, and the
examples are printed so a human can check it.

The window: narration arrives in syncs, and every row carries its sync's time. The tool
calls between one sync and the next are the calls that narration was written alongside.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "web"))

import dice   # noqa: E402
import fog    # noqa: E402
import state  # noqa: E402

STOP = set("the a an and or but of to in on at by for with from that this was were is are be "
           "been has have had not no his her their they them she he it its into than then there "
           "what who when where which while about over under after before".split())
DAMAGE = re.compile(r"\b(wound(?:s|ed)?|bleed(?:s|ing)?|blood|hits? (?:you|him|her|them)|"
                    r"slash(?:es)?|stab(?:s|bed)?|burn(?:s|ed)?|struck|takes? \d+|damage)\b", re.I)
MOVING = re.compile(r"\b(walk(?:s|ed)? (?:out|into|to)|arrive(?:s|d)? at|step(?:s|ped)? outside|"
                    r"leave(?:s)? the|find (?:themselves|yourself)|travel(?:s|led)?|"
                    r"make(?:s)? (?:your|their|his|her) way)\b", re.I)
ASKS_RECORD = re.compile(r"\b(how many|how much|what did|who (?:was|is)|remember|earlier|"
                         r"last time|still have|what's my|how hurt)\b", re.I)
READS = {"look", "search", "recall", "rules", "secrets"}


def rows(path: Path) -> list[dict]:
    return dice.read(path) if path.is_file() else []


def windows(stream: list[dict], calls: list[dict]) -> list[dict]:
    """Group narration and calls by sync. A sync's calls are those since the previous one."""
    stamps = sorted({r["at"] for r in stream})
    out, prev = [], ""
    for at in stamps:
        out.append({
            "at": at,
            "dm": [r["text"] for r in stream if r["at"] == at and r["kind"] == "dm"],
            "said": [r["text"] for r in stream if r["at"] == at and r["kind"] == "said"],
            "calls": [c for c in calls if prev < c["at"] <= at],
        })
        prev = at
    return out


def content_words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z']{4,}", text.lower()) if w not in STOP}


def score(folder: Path, session: int | None = None) -> dict:
    camp = state.Campaign(root=folder)
    base = folder / "sessions"
    if session is None:
        found = [int(p.name.split("-")[0]) for p in base.glob("*-stream.jsonl")] if base.is_dir() else []
        if not found:
            raise SystemExit(f"no handback stream in {base}")
        session = max(found)
    stream = rows(base / f"{session}-stream.jsonl")
    calls = rows(base / f"{session}-calls.jsonl")
    ledger = [e for e in rows(camp.ledger) if e.get("s") == session]
    win = windows(stream, calls)

    pc = ((camp.sheet() or {}).get("who") or "").split()[:1]
    pc = pc[0] if pc else ""
    hidden = [f["fact"] for f in dice.read(camp.facts_file)
              if str(f.get("visibility") or f.get("to") or "").lower() not in fog.PLAYER_VISIBILITY
              and f.get("fact")]
    known = content_words(" ".join([
        (folder / "campaign.md").read_text(encoding="utf-8", errors="ignore") if (folder / "campaign.md").is_file() else "",
        " ".join(p.read_text(encoding="utf-8", errors="ignore") for p in (folder / "canon").rglob("*.md")),
        " ".join(str(f.get("fact")) for f in dice.read(camp.facts_file)),
        " ".join(r["text"] for r in stream if r["kind"] in ("said", "introduced")),
    ]))

    out = {k: {"count": 0, "how": h, "examples": []} for k, h in [
        ("played the PC", "heuristic: the PC's name, or He/She, as the subject of an action verb, 2+ in a sync"),
        ("invented facts", "heuristic: capitalised names in narration found nowhere in the campaign, canon, facts or what the player said"),
        ("ignored state", "heuristic: damage described with no seren_state call in the same sync"),
        ("exposed secrets", "heuristic: fog.check on narration, plus 60% of a hidden fact's content words in one sync"),
        ("failed a required read", "heuristic: the player asked about the record and no read tool was called in that sync"),
        ("failed a required write", "heuristic: a move described with no seren_state call in the same sync"),
        ("narrated a refused action", "exact: the handback's own 'prose against state' instrument lines in the ledger"),
    ]}

    def hit(key: str, example: str) -> None:
        out[key]["count"] += 1
        if len(out[key]["examples"]) < 3:
            out[key]["examples"].append(example[:160])

    dm_side = camp.dm_side()
    for w in win:
        prose = " ".join(w["dm"])
        tools = {c["tool"] for c in w["calls"]}
        if not prose:
            continue
        # played the PC
        if pc:
            n = len(re.findall(rf"\b{re.escape(pc)}\s+\w+s\b", prose))
            n += len(re.findall(r"\b(?:He|She)\s+(?:nods|reaches|considers|glances|turns|wonders|"
                                r"notices|presses|examines|steps|takes|decides|opens|says)\b", prose))
            if n >= 2:
                hit("played the PC", f"{n}× in: {prose[:120]}")
        # invented facts
        for name in set(re.findall(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{3,}(?:\s[A-Z][a-z]{3,})?)", prose)):
            if not content_words(name) & known:
                hit("invented facts", name)
        # exposed secrets
        leaks = [l for l in fog.check(prose, dm_side) if "DM side" in l or "field" in l or "clock" in l]
        for l in leaks:
            hit("exposed secrets", l)
        words = content_words(prose)
        for h in hidden:
            cw = content_words(h)
            if cw and len(cw & words) / len(cw) >= 0.6:
                hit("exposed secrets", f"paraphrase of: {h}")
        # writes
        if DAMAGE.search(prose) and "change" not in tools:
            hit("ignored state", DAMAGE.search(prose).group(0) + " — " + prose[:100])
        if MOVING.search(prose) and "change" not in tools:
            hit("failed a required write", MOVING.search(prose).group(0) + " — " + prose[:100])
        # reads
        for said in w["said"]:
            if ASKS_RECORD.search(said) and not (tools & READS):
                hit("failed a required read", said)

    for e in ledger:
        if e.get("t") == "instrument" and "prose against state" in str(e.get("note")):
            hit("narrated a refused action", str(e.get("note")))

    asked = sum(1 for c in calls if c["tool"] == "sync")
    return {"campaign": folder.name, "session": session, "syncs": len(win),
            "calls": len(calls), "reads": sum(1 for c in calls if c["tool"] in READS),
            "handbacks": asked, "failures": out}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.split("\n\n")[1])
        return 2
    res = score(Path(argv[1]), int(argv[2]) if len(argv) > 2 else None)
    print(f"{res['campaign']} · session {res['session']} · {res['syncs']} syncs · "
          f"{res['calls']} calls ({res['reads']} reads) · {res['handbacks']} handbacks")
    total = 0
    for k, v in res["failures"].items():
        total += v["count"]
        print(f"  {v['count']:>3}  {k}   [{v['how'].split(':')[0]}]")
        for ex in v["examples"]:
            print(f"         · {ex}")
    print(f"  {total:>3}  total objective failures")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
