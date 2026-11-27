"""Checks for the ladder: bring your own character, fitted to a campaign's level (Jay, 26 Nov).

    .venv/Scripts/python test_ladder.py

No network: Ser'en's sheet is a fixture read from her public D&D Beyond JSON on 26 Nov; Fingolfan is
the chat path (a sheet typed in from his private D&D Beyond page, read tab by tab in Chrome).
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ["SEREN_LOCAL"] = tempfile.mkdtemp(prefix="seren-ladder-")
sys.path.insert(0, str(HERE.parent / "web"))

import leveller  # noqa: E402

FAILS: list[str] = []


def check(ok: bool, what: str) -> None:
    print(("ok   " if ok else "FAIL ") + what)
    if not ok:
        FAILS.append(what)


def fixture(name: str) -> dict:
    return json.loads((HERE / "fixtures" / name).read_text(encoding="utf-8"))


def take_picks(sheet: dict, target: int, rulings=None) -> tuple[dict, dict]:
    """Walk the ladder taking Seren's pick on every rung, as the app's button does."""
    decisions: dict = {}
    for _ in range(40):
        lad = leveller.ladder(sheet, target, decisions, rulings)
        if lad["complete"]:
            return lad, decisions
        r = lad["rungs"][lad["current"]]
        d = decisions.setdefault(str(r["from"]), {})
        for c in r["choices"]:
            if c["kind"] == "items":
                d["items"] = {o["name"]: o["recommended"] for o in c["options"] if o["magic"]}
            elif c["kind"] == "subclass":
                d["subclass"] = c["recommended"][0]
            else:
                d[c["kind"]] = list(c["recommended"])
    raise AssertionError("the ladder never completed")


def main() -> int:
    # the rules, read from the library
    cl = leveller.classes()
    check(len(cl) == 12 and all(len(v) == 20 for v in cl.values()), "all twelve classes, levels 1-20, read from core.md")
    check(leveller.row("Warlock", 5)["pact"] == (2, 3), "warlock pact slots read from their own columns")

    # Ser'en, 11 down to Blood and Ink's 3, on Seren's picks: the 29 Aug devolve's numbers
    seren = fixture("seren-ddb-sheet.json")
    lad, dec = take_picks(seren, 3)
    f = lad["final"]
    check((f["pb"], f["hp"], f["dc"], f["attack"]) == (2, 27, 14, 6), f"Ser'en at 3: PB +2, HP 27, DC 14, +6 (got {f['pb']}, {f['hp']}, {f.get('dc')}, {f.get('attack')})")
    check(f["slots"][:2] == [4, 2] and not any(f["slots"][2:]), "Ser'en at 3: four 1st and two 2nd-level slots")
    prepared = [s for s in lad["spells"] if s["source"] == "class" and s["level"] > 0]
    cantrips = [s for s in lad["spells"] if s["source"] == "class" and s["level"] == 0]
    check(len(prepared) == 6 and len(cantrips) == 2, f"six prepared, two class cantrips (got {len(prepared)}, {len(cantrips)})")
    names = {s["name"] for s in lad["spells"]}
    check("Bless" not in names and "Misty Step" not in names and "Fey Touched" not in lad["feats"],
          "Fey Touched goes below level 4, and Bless and Misty Step with it")
    check("Light" in names and "Speak with Animals" in names, "species and subclass spells stay")
    items_rung = [r for r in lad["rungs"] if any(c["kind"] == "items" for c in r["choices"])]
    check([r["from"] for r in items_rung] == [5], "one items step, at the last tier crossed (5 to 4)")
    check(any(u["kind"] == "subclass" and u["name"] == "Circle of the Stars" for u in lad["unsupported"]),
          "Circle of the Stars is marked unsupported, for a chat ruling")

    # the gate (devolve.md section 2)
    refused = leveller.build(seren, 3, {}, [], "blood-and-ink")
    check(not refused["ok"] and any("still to choose" in m for m in refused["refused"]), "the gate refuses an undecided ladder")
    partial = json.loads(json.dumps(dec))
    partial["5"]["items"].pop("Pearl of Power")
    refused = leveller.build(seren, 3, partial, [], "blood-and-ink")
    check(not refused["ok"] and "no decision for Pearl of Power" in refused["refused"], "the gate names an item with no fate")
    ok = leveller.build(seren, 3, dec, [], "blood-and-ink")
    check(ok["ok"] and "equipment_pass:" in ok["markdown"] and "Pearl of Power" in ok["markdown"], "a decided ladder writes a build with its equipment pass")
    check(ok["card"]["name"] == "Ser'en" and ok["card"]["own"], "the build hands back a who-you-play card")

    # Fingolfan, the chat path: Sorcerer 12 to Quire's 5, with the 8 Oct ruling (Wild Magic is not SRD)
    fin = fixture("fingolfan-chat-sheet.json")
    rulings = [{"kind": "subclass", "from": "Wild Magic Sorcery", "to": "Draconic Sorcery", "why": "Wild Magic isn't in the SRD"}]
    lad, dec = take_picks(fin, 5, rulings)
    f = lad["final"]
    check(lad["subclass"] == "Draconic Sorcery", "the chat's ruling swaps the subclass")
    check(f["pb"] == 3 and f["slots"][:3] == [4, 3, 2] and f["dc"] == 16, f"Fingolfan at 5: PB +3, slots 4/3/2, DC 16 (got {f['pb']}, {f['slots'][:3]}, {f.get('dc')})")
    check("Conjuration Adept" in lad["feats"] and "Inspiring Leader" not in lad["feats"], "feats taken at 8 and 12 go; the one at 4 stays")
    check(not any(s["level"] > 3 for s in lad["spells"] if s["source"] == "class"), "no class spell above his new highest slot")
    built = leveller.build(fin, 5, dec, rulings, "quire")
    check(built["ok"] and "Draconic Sorcery" in built["markdown"] and "rulings:" in built["markdown"], "the build records the ruling")

    # up: a fresh level 1 wizard climbs to 3
    wiz = {"name": "Ada", "species": "Human", "cls": "Wizard", "subclass": None, "level": 1,
           "abilities": {"str": 8, "dex": 14, "con": 13, "int": 16, "wis": 12, "cha": 10}, "hp": 7,
           "spells": [{"name": "Fire Bolt", "level": 0, "source": "class"}, {"name": "Light", "level": 0, "source": "class"},
                      {"name": "Mage Hand", "level": 0, "source": "class"}, {"name": "Magic Missile", "level": 1, "source": "class"},
                      {"name": "Shield", "level": 1, "source": "class"}, {"name": "Sleep", "level": 1, "source": "class"},
                      {"name": "Detect Magic", "level": 1, "source": "class"}],
           "feats": [], "items": [{"name": "Quarterstaff", "magic": False}]}
    lad = leveller.ladder(wiz, 3)
    kinds = [c["kind"] for r in lad["rungs"] for c in r["choices"]]
    check(lad["rungs"][0]["direction"] == "up" and "add" in kinds and "subclass" in kinds, "going up offers new spells and a subclass at 3")
    lad, _ = take_picks(wiz, 3)
    check(lad["final"]["slots"][:2] == [4, 2] and lad["subclass"], "Ada reaches 3 with 2nd-level slots and a subclass")

    # the MCP tools, end to end (no network: the sheet comes in by the chat path)
    sys.path.insert(0, str(HERE))
    os.environ.setdefault("SEREN_AI", "mock")
    import server as seren_server
    from mcp import Client
    from mcp.client import advertise
    from mcp.server.apps import APP_MIME_TYPE, EXTENSION_ID
    dump = lambda m: m.model_dump(by_alias=True, exclude_none=True)

    async def tools():
        async with Client(seren_server.server, extensions=[advertise(EXTENSION_ID, {"mimeTypes": [APP_MIME_TYPE]})]) as client:
            names = [t["name"] for t in dump(await client.list_tools())["tools"]]
            check({"seren_character", "seren_level", "seren_ruling", "seren_save_build"} <= set(names), "four ladder tools")
            r = dump(await client.call_tool("seren_character", {"sheet": fin})).get("structuredContent") or {}
            check(r["ok"] and r["key"] == "chat-fingolfan", "a sheet from the chat is brought to the table")
            await client.call_tool("seren_ruling", {"key": r["key"], "kind": "subclass", "name": "Wild Magic Sorcery",
                                                    "to": "Draconic Sorcery", "why": "not in the SRD"})
            lv = dump(await client.call_tool("seren_level", {"key": r["key"], "target": 5})).get("structuredContent") or {}
            check(lv["subclass"] == "Draconic Sorcery", "the table's ladder picks up the chat's ruling")
            sv = dump(await client.call_tool("seren_save_build", {"key": r["key"], "target": 5, "decisions": {}})).get("structuredContent") or {}
            check(not sv["ok"] and sv["refused"], "save_build refuses an undecided ladder")
    asyncio.run(tools())

    print()
    print("all passed" if not FAILS else f"{len(FAILS)} failed")
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
