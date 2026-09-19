"""Mark the generator's homework. Twice, on purpose.

**The audit is code.** Fact count, visibility sanity, whether any front wants something
another front controls, borrowed setting names — all checkable, so none of it is left to a
model's opinion. This is the fog audit the brief says has to exist before a stranger plays.

**The review is a second model**, told it is a hostile reviewer and given no stake in the
thing it is reading. It answers the question code cannot: would anybody want to play this.

    python score.py --dir ../content/generated

A campaign that fails the audit is REFUSED — no score, no publishing. Taste is advisory;
the audit is not.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "web"))

import llm  # noqa: E402

# Names that mean somebody else's setting walked in. Not exhaustive; it does not need to be,
# because one hit is enough to look at it by hand.
BORROWED = [
    "faerûn", "faerun", "waterdeep", "cormyr", "neverwinter", "baldur's gate", "icewind",
    "forgotten realms", "greyhawk", "eberron", "ravenloft", "strahd", "barovia", "dragonlance",
    "krynn", "mordenkainen", "elminster", "drizzt", "tasha", "sigil", "athas", "greenest",
]

RUBRIC = """You are reviewing a generated campaign skeleton for an AI dungeon master. You did
not write it and you gain nothing by being kind. Score each 1–5, where 3 is "fine, would
run it", 5 is "I would cancel plans", 1 is "delete it".

1. spine      — does the trope actually run through it, or is it a pile of parts?
2. wanting    — do the fronts want things from EACH OTHER, or do they all point at the party?
3. people     — is the antagonist a person with a reason, or a role with a label?
4. opening    — would the first ten seconds make somebody type something?
5. surprise   — is there one thing here you have not seen a hundred times?
6. honesty    — are the secrets real secrets, tagged so the player learns them by playing?

Then: `verdict` — "publish", "keep", or "bin". And `fix` — the ONE change that would move
it up most, in one sentence. And `worst` — quote the weakest line in it.

Return one json object: {"spine":n,"wanting":n,"people":n,"opening":n,"surprise":n,
"honesty":n,"verdict":"","fix":"","worst":""}"""


def audit(folder: Path) -> list[str]:
    """What code can check. Each string is a reason to refuse."""
    problems = []
    campaign = (folder / "campaign.md").read_text(encoding="utf-8") if (folder / "campaign.md").is_file() else ""
    fronts_text = (folder / "fronts.md").read_text(encoding="utf-8") if (folder / "fronts.md").is_file() else ""
    facts = []
    fact_file = folder / "state" / "facts.jsonl"
    if fact_file.is_file():
        for line in fact_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    facts.append(json.loads(line))
                except ValueError:
                    problems.append("a fact line is not json")

    if len(facts) < 6:
        problems.append(f"only {len(facts)} facts — the brief asks for six to eight")
    for f in facts:
        vis = f.get("visibility")
        if vis not in ("true", "known", "suspected", "false"):
            problems.append(f"fact {f.get('id')} has visibility {vis!r}")
    known = [f for f in facts if f.get("visibility") == "known"]
    if len(known) > 1:
        problems.append(f"{len(known)} facts start `known` — the party has played nothing yet")
    if facts and not any(f.get("visibility") == "true" for f in facts):
        problems.append("no `true` facts: nothing is secret, so there is nothing to find out")

    names = re.findall(r"^## (.+)$", fronts_text, re.M)
    if len(names) < 2:
        problems.append(f"{len(names)} fronts — two or three, and they have to interlock")
    wants = re.findall(r"\*\*Wants from:\*\* (.+)$", fronts_text, re.M)
    interlocks = [w for w in wants if any(n.lower()[:14] in w.lower() for n in names)]
    if not interlocks:
        problems.append("every front points at the party; none wants what another front holds")

    whole = (campaign + fronts_text).lower()
    for word in BORROWED:
        if word in whole:
            problems.append(f"borrowed setting name: {word!r}")
    if len(campaign.split()) < 80:
        problems.append("the campaign file is thinner than a premise")
    return problems


def review(folder: Path, tier: str = "paid") -> dict:
    """The second opinion. A different prompt, a fresh context, no stake in the answer."""
    parts = []
    for rel in ("campaign.md", "fronts.md"):
        path = folder / rel
        if path.is_file():
            parts.append(f"# {rel}\n{path.read_text(encoding='utf-8')[:3000]}")
    facts = folder / "state" / "facts.jsonl"
    if facts.is_file():
        parts.append("# facts\n" + facts.read_text(encoding="utf-8")[:2000])
    picks = folder / "picks.json"
    if picks.is_file():
        parts.append("# what it was rolled from\n" + picks.read_text(encoding="utf-8"))

    reply = llm.converse(system=RUBRIC, messages=[{"role": "user", "content": [{"text": "\n\n".join(parts)}]}],
                         tools=None, tier=tier, spent=0.0, temperature=0.2)
    text = llm.text_of(reply["content"])
    start, end = text.find("{"), text.rfind("}")
    if start < 0:
        return {"error": "no json", "raw": text[:200]}
    out = json.loads(text[start:end + 1])
    out["spent"] = reply["spent"]
    return out


AXES = ("spine", "wanting", "people", "opening", "surprise", "honesty")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="../content/generated")
    ap.add_argument("--tier", default="paid")
    args = ap.parse_args()

    root = Path(args.dir).resolve()
    folders = sorted(p for p in root.iterdir() if p.is_dir())
    rows = []
    for folder in folders:
        problems = audit(folder)
        got = {}
        if not problems:
            try:
                got = review(folder, args.tier)
            except Exception as exc:
                got = {"error": f"{type(exc).__name__}: {exc}"}
        total = sum(int(got.get(a, 0) or 0) for a in AXES) if got and "error" not in got else 0
        rows.append({"folder": folder.name, "problems": problems, "review": got, "total": total})

    rows.sort(key=lambda r: (-r["total"], r["folder"]))
    print(f"{'campaign':34} {'audit':>6}  {'spine wanting people opening surprise honesty':>46}  total  verdict")
    for r in rows:
        if r["problems"]:
            print(f"{r['folder'][:34]:34} {'REFUSED':>6}  {r['problems'][0][:46]:46}")
            for extra in r["problems"][1:]:
                print(f"{'':34} {'':>6}  {extra[:46]:46}")
            continue
        g = r["review"]
        if "error" in g:
            print(f"{r['folder'][:34]:34} {'ok':>6}  review failed: {g['error'][:40]}")
            continue
        scores = "  ".join(f"{int(g.get(a, 0) or 0):^7}" for a in AXES)
        print(f"{r['folder'][:34]:34} {'ok':>6}  {scores}  {r['total']:>5}  {g.get('verdict','')}")

    passed = [r for r in rows if not r["problems"] and "error" not in r["review"]]
    print(f"\n{len(passed)} of {len(rows)} passed the audit."
          f"  publish: {sum(1 for r in passed if r['review'].get('verdict') == 'publish')}"
          f"  keep: {sum(1 for r in passed if r['review'].get('verdict') == 'keep')}"
          f"  bin: {sum(1 for r in passed if r['review'].get('verdict') == 'bin')}")
    for r in passed[:3]:
        print(f"\n{r['folder']}  ({r['total']}/30)\n  fix:   {r['review'].get('fix','')}"
              f"\n  worst: {r['review'].get('worst','')}")
    (root / "scores.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    print(f"\nfull marks written to {root / 'scores.json'}")


if __name__ == "__main__":
    main()
