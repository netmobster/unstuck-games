"""The phase-0 checks from MCP-SERVER.md §Tests, against a fresh stage. No model involved.

    python seren/mcp/check.py

Each check prints PASS or FAIL and one line of why. Exit 1 if any failed.
Deliberately short: these are the properties the spec promises, not a test suite.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import stage  # noqa: E402

ROOT = stage.stage(Path(tempfile.mkdtemp(prefix="seren-mcp-")) / "content")
os.environ["SEREN_CONTENT_DIR"] = str(ROOT)
os.environ["SEREN_PC"] = "wick"

import play        # noqa: E402
import tableview   # noqa: E402

FAILED = []


def check(name: str, ok: bool, why: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  — {why}" if why else ""))
    if not ok:
        FAILED.append(name)


def secrets_of(t: play.Table) -> list[str]:
    return [f["fact"] for f in t.secrets()["hidden_facts"]]


print("seren-mcp phase-0 checks")
t = play.Table(account="tester", holder="check:a")
t.open(stage.SLUG)
hidden = secrets_of(t)
check("fixture has DM-side facts to protect", len(hidden) >= 3, f"{len(hidden)} hidden")

# 1 · isolation
try:
    play.Table(account="tester", holder="check:x").open("../intruder/" + stage.SLUG)
    check("isolation: path traversal refused", False, "opened another shelf")
except play.Refused:
    check("isolation: path traversal refused", True)
try:
    play.Table(account="nobody", holder="check:y").open(stage.SLUG)
    check("isolation: another account's slug", False, "opened it")
except play.Refused as exc:
    check("isolation: another account's slug", "no campaign" in str(exc))

# 2 · fog: no read returns a DM-side fact; secrets returns all of them
blob = json.dumps([t.look(w) for w in ("scene", "party", "sheet", "facts", "ledger", "present", "fronts")]
                  + [t.search(q) for q in ("satchel", "inspection", "ledger", "Hesper", "dawn")]
                  + [t.briefing()], ensure_ascii=False)
leaked = [h for h in hidden if h and h[:40] in blob]
check("fog: reads and briefing carry no hidden fact", not leaked, "; ".join(x[:50] for x in leaked))
check("fog: seren_secrets returns them", len(hidden) >= 3)
found = json.dumps(t.search("garrison runner boots shut"), ensure_ascii=False).lower()
check("fog: search does not return a cast member's private Knows", "garrison" not in found,
      "cast Knows sections carry secrets in their own words")

# 3 · refusal is a result, and it asks for the narration
r = t.change({"op": "move", "where": "x"})
check("refusal: a bad move comes back refused, not raised", "refused" in r and "this_did_not_happen" in r)
ask = t.asks()
check("refusal: it asks what was narrated", bool(ask) and "narration" in ask["send"])

# 4 · the handback catches prose against state
t.refused_move = "the old mill across the ridge"
flags = t.sync({"narration": ["Wick walks out into the rain and across the ridge to the old mill."]})["flags"]
check("handback: prose against state is flagged", any("prose against state" in f for f in flags), str(flags))

# 5 · the handback catches a lifted secret
flags = t.sync({"narration": [f"Hesper looks up. '{hidden[0]}'"]})["flags"]
check("handback: a secret narrated verbatim is flagged", any("leak" in f for f in flags), str(flags)[:120])

# 6 · the facts-in-a-row brake
t.facts_in_a_row = 0
refused = None
for i in range(4):
    try:
        t.fact({"op": "establish", "fact": f"The stove at the Gap has iron fitting number {i}.",
                "visibility": "known", "src": "play"})
    except play.Refused as exc:
        refused = i
check("facts: the fourth in a row is refused", refused == 3, f"refused at {refused}")

# 7 · the lock: a second session is told, a takeover wins, the loser is told
other = play.Table(account="tester", holder="check:b")
try:
    other.open(stage.SLUG)
    check("lock: second session refused", False)
except play.Refused as exc:
    check("lock: second session refused, and told why", "open elsewhere" in str(exc))
other.open(stage.SLUG, takeover=True)
try:
    t.roll({"dice": "1d20", "t": "check", "dc": 10, "note": "test"})
    check("lock: the session taken over is told", False, "wrote anyway")
except play.Refused as exc:
    check("lock: the session taken over is told", "taken over" in str(exc))
t = other

# 8 · dice: the server rolls, the model cannot supply an outcome
out = t.roll({"dice": "1d20", "t": "check", "dc": 12, "note": "check.py", "who": "wick", "skill": "insight"})
check("dice: server rolls and judges", "pass" in out["rolled"])
try:
    t.roll({"dice": "1d20", "t": "check", "dc": 12, "note": "x", "total": 20})
    check("dice: supplied outcome refused", False)
except play.Refused:
    check("dice: supplied outcome refused", True)

# 9 · the table renders and passes its own leak check
page, leaks = tableview.render(t.campaign.root)
check("table: renders clean", page is not None, f"{len(leaks)} leaks" if leaks else f"{len(page)//1024} KB")

# 10 · close: a leaking chronicle is sent back; a clean one closes
try:
    t.close({"chronicle": f"It rained. {hidden[0]}", "summary": "x"})
    check("close: leaking chronicle sent back", False)
except play.Refused:
    check("close: leaking chronicle sent back", True)
res = t.close({"chronicle": "The rain did not stop, and nobody at the Gap slept.",
               "summary": "A night at the weighbridge.", "threads": ["the satchel is still sealed"]})
written = [p for p in res["written"] if (ROOT / "players" / "tester" / stage.SLUG / p).is_file()]
check("close: log, chronicle and canon written", len(written) >= 2, ", ".join(written))

# 11 · rules lookup
r = tableview.rules_lookup("grappled")
check("rules: SRD lookup finds an article", bool(r["results"]), r["results"][0]["article"] if r["results"] else "")

print(f"\n{'ALL PASS' if not FAILED else str(len(FAILED)) + ' FAILED'}  (stage: {ROOT})")
sys.exit(1 if FAILED else 0)
