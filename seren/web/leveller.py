"""The ladder: fit a character to a campaign's level, one level at a time, down or up.

Jay, 26 Nov 2026: the build stays in D&D Beyond; Seren steps it to the campaign's level visually, one
rung at a time, and nothing goes (or comes) without the player choosing it. The rules are read from
SEREN's library (`library/2024/core.md`, all twelve classes; `library/srd-5.2/` for spells, subclasses,
items and feats), never recalled. What the library doesn't cover (a non-SRD subclass, a homebrew item)
is marked unsupported and goes to the chat, where Claude makes a ruling (`apply_rulings`).

**Stateless.** `ladder(sheet, target, decisions, rulings)` recomputes every rung from the sheet each
time, so the app can step back up by dropping a decision. `build()` is the gate from
`SEREN/docs/devolve.md` section 2: it refuses until every rung is decided and every item has a fate.

The sheet (`seren-sheet/1`) comes from `ddb.from_ddb()`, or from Claude reading a PDF in the chat.
"""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path

FORMAT = "seren-sheet/1"
HIT_DIE = {"Barbarian": 12, "Fighter": 10, "Paladin": 10, "Ranger": 10, "Bard": 8, "Cleric": 8, "Druid": 8,
           "Monk": 8, "Rogue": 8, "Warlock": 8, "Sorcerer": 6, "Wizard": 6}
CASTS = {"Bard": "cha", "Cleric": "wis", "Druid": "wis", "Paladin": "cha", "Ranger": "wis", "Sorcerer": "cha",
         "Warlock": "cha", "Wizard": "int"}
TIER_EDGES = (4, 10, 16)          # the last level of tiers 1, 2 and 3: crossing one is when items are reconsidered


def library() -> Path:
    here = os.environ.get("SEREN_LIBRARY")
    if here:
        return Path(here)
    return Path(__file__).resolve().parents[3] / "SEREN" / "library"


# ── the rules, read from the library ──────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def classes() -> dict:
    """{Class: {level: {pb, features, cantrips, prepared, slots: [n1..n9], pact: (count, level) or None}}}"""
    text = (library() / "2024" / "core.md").read_text(encoding="utf-8")
    out, name, head = {}, None, None
    for line in text.splitlines():
        m = re.match(r"^## ([A-Z][a-z]+)$", line)
        if m and m.group(1) in HIT_DIE:
            name, head = m.group(1), None
            out[name] = {}
            continue
        if not name or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells[0] == "Level":
            head = cells
            continue
        if head is None or not cells[0].isdigit():
            continue
        row = dict(zip(head, cells))
        num = lambda v: int(v) if v and v.lstrip("+").isdigit() else 0
        slots = [num(row.get(str(i))) for i in range(1, 10)]
        pact = (num(row["Spell Slots"]), num(row["Slot Level"])) if "Spell Slots" in row else None
        feats = [f.strip() for f in row.get("Class Features", "").split(",") if f.strip() and f.strip() != "—"]
        out[name][int(cells[0])] = {"pb": num(row["PB"]), "features": feats, "cantrips": num(row.get("Cantrips")),
                                    "prepared": num(row.get("Prepared")), "slots": slots, "pact": pact}
    return out


def _front(path: Path) -> dict:
    t = path.read_text(encoding="utf-8")
    m = re.search(r"^---\n(.*?)\n---", t, re.S | re.M)
    out = {}
    for line in (m.group(1) if m else "").splitlines():
        k, _, v = line.partition(":")
        out[k.strip()] = v.strip().strip('"')
    return out


@lru_cache(maxsize=1)
def srd() -> dict:
    """The SRD names Seren can check against: spells (with level and classes), subclasses, items, feats."""
    base = library() / "srd-5.2" / "articles"
    spells = {}
    for p in (base / "spells").glob("*.md"):
        f = _front(p)
        if f.get("name"):
            cl = [c.strip() for c in f.get("classes", "").strip("[]").split(",") if c.strip()]
            spells[f["name"].lower()] = {"name": f["name"], "level": int(f.get("level") or 0), "classes": cl}
    names = lambda d: {_front(p).get("name", p.stem).lower() for p in (base / d).glob("*.md")} if (base / d).is_dir() else set()
    return {"spells": spells, "subclasses": names("subclasses"), "items": names("magic-items"), "feats": names("feats")}


def known(kind: str, name: str) -> bool:
    n = (name or "").lower().split(" (")[0].strip()
    s = srd()
    if kind == "spell":
        return n in s["spells"]
    return n in s[{"subclass": "subclasses", "item": "items", "feat": "feats"}[kind]]


# ── numbers at a level ─────────────────────────────────────────────────────────────────────
def mod(score: int) -> int:
    return (int(score) - 10) // 2


def row(cls: str, level: int) -> dict:
    return classes()[cls][max(1, min(20, level))]


def top_slot(cls: str, level: int) -> int:
    r = row(cls, level)
    if r["pact"]:
        return r["pact"][1]
    return max([i + 1 for i, n in enumerate(r["slots"]) if n] or [0])


def hp_at(sheet: dict, level: int) -> int:
    """The sheet's own HP at its own level; the class average anywhere else (die + CON, then die/2+1+CON)."""
    if level == sheet["level"] and sheet.get("hp"):
        return int(sheet["hp"])
    die, con = HIT_DIE[sheet["cls"]], mod(sheet["abilities"]["con"])
    return die + con + (die // 2 + 1 + con) * (level - 1)


def numbers(sheet: dict, level: int) -> dict:
    r, cls = row(sheet["cls"], level), sheet["cls"]
    ab = CASTS.get(cls)
    out = {"level": level, "pb": r["pb"], "hp": hp_at(sheet, level), "slots": r["slots"], "pact": r["pact"],
           "cantrips": r["cantrips"], "prepared": r["prepared"]}
    if ab:
        m = mod(sheet["abilities"][ab])
        out.update(dc=8 + r["pb"] + m, attack=r["pb"] + m, ability=ab)
    return out


# ── rulings from the chat ──────────────────────────────────────────────────────────────────
def apply_rulings(sheet: dict, rulings: list[dict]) -> dict:
    """A ruling swaps one thing for another: {kind: class|subclass|spell|item|feat, from, to, why}."""
    s = json.loads(json.dumps(sheet))
    for r in rulings or []:
        kind, a, b = r.get("kind"), (r.get("from") or "").lower(), r.get("to")
        if kind == "class" and b in HIT_DIE:
            s["cls"] = b
        elif kind == "subclass":
            s["subclass"] = b
        elif kind == "spell":
            for sp in s["spells"]:
                if sp["name"].lower() == a:
                    if b:
                        sp["name"] = b
                        info = srd()["spells"].get(b.lower())
                        if info:
                            sp["level"] = info["level"]
                    else:
                        sp["ruled_out"] = True
        elif kind == "item":
            for it in s["items"]:
                if it["name"].lower() == a:
                    it["ruled"] = b or "handed back"
        elif kind == "feat":
            for f in s["feats"]:
                if f["name"].lower() == a:
                    f["name"] = b or f["name"]
    s["spells"] = [sp for sp in s["spells"] if not sp.get("ruled_out")]
    return s


def unsupported(sheet: dict) -> list[dict]:
    """What the library can't check, for a chat ruling. Never blocks: the ladder still runs."""
    out = []
    if sheet["cls"] not in HIT_DIE:
        out.append({"kind": "class", "name": sheet["cls"], "why": "not one of the twelve 2024 classes"})
    if sheet.get("subclass") and not known("subclass", sheet["subclass"]):
        out.append({"kind": "subclass", "name": sheet["subclass"], "why": "not in the SRD, so its features can't be checked"})
    for sp in sheet["spells"]:
        if not known("spell", sp["name"]):
            out.append({"kind": "spell", "name": sp["name"], "why": "not in the SRD spell list"})
    for it in sheet["items"]:
        if it.get("magic") and not known("item", it["name"]) and not it.get("ruled"):
            out.append({"kind": "item", "name": it["name"], "why": "not in the SRD magic items"})
    for f in sheet["feats"]:
        if f.get("level") and not known("feat", f["name"]):
            out.append({"kind": "feat", "name": f["name"], "why": "not in the SRD feats"})
    seen, uniq = set(), []
    for u in out:
        k = (u["kind"], u["name"].lower())
        if k not in seen:
            seen.add(k)
            uniq.append(u)
    return uniq


# ── the ladder ─────────────────────────────────────────────────────────────────────────────
def _class_spells(spells):   # the ones the class table's counts govern
    return [s for s in spells if s["source"] == "class" and not s.get("always")]


def _features_at(sheet: dict, level: int) -> list[str]:
    own = [f["name"] for f in sheet.get("features", []) if f.get("level") == level]
    return own or row(sheet["cls"], level)["features"]


def _recommend_drop(pool: list[dict], n: int) -> list[str]:
    """Seren's pick when going down: the highest-level spells first, the last-learned among equals."""
    ranked = sorted(enumerate(pool), key=lambda p: (-p[1]["level"], -p[0]))
    return [s["name"] for _, s in ranked[:n]]


def _recommend_add(options: list[dict], n: int) -> list[str]:
    ranked = sorted(options, key=lambda s: (-s["level"], s["name"]))
    return [s["name"] for s in ranked[:n]]


def _item_fate(it: dict) -> str:
    if it.get("ruled"):
        return it["ruled"]
    if not it.get("magic"):
        return "kept"
    rarity = (it.get("rarity") or "").lower()
    if rarity in ("common", "uncommon") and not it.get("attuned"):
        return "kept"
    return "handed back"


def ladder(sheet: dict, target: int, decisions: dict | None = None, rulings: list | None = None) -> dict:
    """Every rung between the sheet's level and the target, and the first one still to decide.

    decisions: {"<from level>": {"drop": [...], "drop_cantrips": [...], "add": [...], "add_cantrips": [...],
                                 "drop_feat": name, "items": {name: fate}}}
    """
    decisions = decisions or {}
    s = apply_rulings(sheet, rulings or [])
    if s["cls"] not in HIT_DIE:
        return {"ok": False, "error": f"{s['cls']} isn't one of the twelve 2024 classes yet: ask for a ruling in the chat",
                "unsupported": unsupported(s), "sheet": s}
    target = max(1, min(20, int(target)))
    start, level = s["level"], s["level"]
    down = target < start
    spells = [dict(x) for x in s["spells"]]
    feats = [dict(f) for f in s["feats"]]
    items = {it["name"]: it for it in s["items"]}
    fates = {}
    rungs, current = [], None
    tier_rung = None
    if down:
        crossed = [lv for lv in range(start - 1, target - 1, -1) if lv in TIER_EDGES]
        # one items step, at the last tier crossed (the one nearest the campaign), else on the last rung
        tier_rung = (crossed[-1] + 1) if crossed else target + 1
    while level != target:
        to = level - 1 if down else level + 1
        d = decisions.get(str(level), {})
        n_to, top = numbers(s, to), top_slot(s["cls"], to)
        rung = {"from": level, "to": to, "direction": "down" if down else "up", "numbers": n_to,
                "features": _features_at(s, level if down else to), "choices": [], "done": True}
        if down:
            forced = [x["name"] for x in spells if x["source"] == "class" and x["level"] > top]
            spells = [x for x in spells if x["name"] not in forced or x["source"] != "class"]
            # a feat taken at this level goes with it, and its spells with it
            lost_feats = [f for f in feats if f.get("level") == level]
            for f in lost_feats:
                feats.remove(f)
                fid = f.get("id")
                spells = [x for x in spells if not (fid and x.get("from_feat") == fid)
                          and not (x.get("from_feat_name") and x["from_feat_name"] == f["name"])]
            rung["forced"] = forced
            rung["lost_feats"] = [f["name"] for f in lost_feats]
            pool = [x for x in _class_spells(spells) if x["level"] > 0]
            need = max(0, len(pool) - n_to["prepared"]) if n_to["prepared"] else 0
            if need:
                pick = [n for n in d.get("drop", []) if any(p["name"] == n for p in pool)][:need]
                rung["choices"].append({"kind": "drop", "need": need, "picked": pick,
                                        "options": [{"name": p["name"], "level": p["level"]} for p in pool],
                                        "recommended": _recommend_drop(pool, need)})
                if len(pick) < need:
                    rung["done"] = False
                spells = [x for x in spells if not (x["name"] in pick and x in pool)]
            cpool = [x for x in _class_spells(spells) if x["level"] == 0]
            cneed = max(0, len(cpool) - n_to["cantrips"]) if n_to["cantrips"] else 0
            if cneed:
                pick = [n for n in d.get("drop_cantrips", []) if any(p["name"] == n for p in cpool)][:cneed]
                rung["choices"].append({"kind": "drop_cantrips", "need": cneed, "picked": pick,
                                        "options": [{"name": p["name"], "level": 0} for p in cpool],
                                        "recommended": [p["name"] for p in cpool[-cneed:]]})
                if len(pick) < cneed:
                    rung["done"] = False
                spells = [x for x in spells if not (x["name"] in pick and x in cpool)]
            if level == tier_rung:
                given = d.get("items", {})
                opts = []
                for name, it in items.items():
                    rec = _item_fate(it)
                    fate = given.get(name, None)
                    opts.append({"name": name, "magic": bool(it.get("magic")), "rarity": it.get("rarity"),
                                 "attuned": bool(it.get("attuned")), "recommended": rec, "picked": fate,
                                 "supported": (not it.get("magic")) or known("item", name) or bool(it.get("ruled"))})
                    fates[name] = fate or rec
                decided = all(o["picked"] is not None or not o["magic"] for o in opts)
                rung["choices"].append({"kind": "items", "need": sum(1 for o in opts if o["magic"]), "options": opts})
                if not decided:
                    rung["done"] = False
        else:
            # up: what the next level adds, chosen from the SRD
            pool = _class_spells(spells)
            have = {x["name"].lower() for x in spells}
            add_n = max(0, n_to["prepared"] - len([x for x in pool if x["level"] > 0]))
            if add_n:
                opts = [v for v in srd()["spells"].values() if s["cls"] in v["classes"] and 0 < v["level"] <= top
                        and v["name"].lower() not in have]
                pick = [n for n in d.get("add", []) if any(o["name"] == n for o in opts)][:add_n]
                rung["choices"].append({"kind": "add", "need": add_n, "picked": pick,
                                        "options": sorted(({"name": o["name"], "level": o["level"]} for o in opts),
                                                          key=lambda o: (-o["level"], o["name"]))[:40],
                                        "recommended": _recommend_add(opts, add_n)})
                if len(pick) < add_n:
                    rung["done"] = False
                for n in pick:
                    spells.append({"name": n, "level": srd()["spells"][n.lower()]["level"], "source": "class"})
            cadd = max(0, n_to["cantrips"] - len([x for x in pool if x["level"] == 0]))
            if cadd:
                opts = [v for v in srd()["spells"].values() if s["cls"] in v["classes"] and v["level"] == 0
                        and v["name"].lower() not in have]
                pick = [n for n in d.get("add_cantrips", []) if any(o["name"] == n for o in opts)][:cadd]
                rung["choices"].append({"kind": "add_cantrips", "need": cadd, "picked": pick,
                                        "options": [{"name": o["name"], "level": 0} for o in sorted(opts, key=lambda o: o["name"])],
                                        "recommended": [o["name"] for o in sorted(opts, key=lambda o: o["name"])[:cadd]]})
                if len(pick) < cadd:
                    rung["done"] = False
                for n in pick:
                    spells.append({"name": n, "level": 0, "source": "class"})
            if to == 3 and not s.get("subclass"):
                subs = sorted(x.title() for x in srd()["subclasses"])
                pick = d.get("subclass")
                rung["choices"].append({"kind": "subclass", "need": 1, "picked": [pick] if pick else [],
                                        "options": [{"name": x} for x in subs], "recommended": subs[:1]})
                if not pick:
                    rung["done"] = False
                else:
                    s["subclass"] = pick
        rung["spells_after"] = [x["name"] for x in spells]
        rungs.append(rung)
        if current is None and not rung["done"]:
            current = len(rungs) - 1
        level = to
    if not down:
        fates = {name: "kept" for name in items}
    final = numbers(s, target)
    return {"ok": True, "name": s["name"], "cls": s["cls"], "subclass": s.get("subclass"), "from": start,
            "start": numbers(s, start), "start_spells": [x["name"] for x in s["spells"]],
            "target": target, "rungs": rungs, "current": current, "complete": current is None,
            "final": final, "spells": spells, "feats": [f["name"] for f in feats], "items": fates,
            "unsupported": unsupported(s), "rulings": rulings or []}


# ── the gate, and the build file ───────────────────────────────────────────────────────────
def build(sheet: dict, target: int, decisions: dict, rulings: list | None = None, campaign: str = "") -> dict:
    """devolve.md section 2: refuse unless every rung is decided and every item has a recorded fate."""
    lad = ladder(sheet, target, decisions, rulings)
    if not lad["ok"]:
        return {"ok": False, "refused": [lad["error"]]}
    missing = []
    for r in lad["rungs"]:
        for c in r["choices"]:
            if c["kind"] == "items":
                missing += [f"no decision for {o['name']}" for o in c["options"] if o["magic"] and o["picked"] is None]
            elif len(c.get("picked") or []) < c["need"]:
                missing.append(f"level {r['from']} to {r['to']}: {c['need'] - len(c.get('picked') or [])} {c['kind'].replace('_', ' ')} still to choose")
    if missing:
        return {"ok": False, "refused": missing}
    f, s = lad["final"], apply_rulings(sheet, rulings or [])
    import datetime
    today = datetime.date.today().isoformat()
    lines = ["---", f"pc: {slug(s['name'])}", f"master: \"{s.get('source', {}).get('url', 'a D&D Beyond sheet')}\"",
             f"level: {target}", f"class: \"{s['cls']} {target}\"", f"subclass: \"{s.get('subclass') or ''}\"",
             f"species: \"{s.get('species', '')}\"", f"campaign: \"{campaign}\"", f"built: {today}",
             f"proficiency_bonus: {f['pb']}", "abilities: {" + ", ".join(f"{k}: {v}" for k, v in s["abilities"].items()) + "}",
             f"hp: {{max: {f['hp']}, hit_die: d{HIT_DIE[s['cls']]}}}"]
    if f.get("dc"):
        lines += [f"spell_save_dc: {f['dc']}", f"spell_attack_bonus: {f['attack']}"]
    slots = f["slots"]
    if f.get("pact"):
        lines.append(f"pact_slots: {{count: {f['pact'][0]}, level: {f['pact'][1]}}}")
    elif any(slots):
        lines.append("spell_slots: {" + ", ".join(f"{i + 1}: {n}" for i, n in enumerate(slots) if n) + "}")
    lines.append("spells:")
    lines += [f"  - {{name: \"{x['name']}\", level: {x['level']}, source: {x['source']}}}" for x in lad["spells"]]
    lines.append("feats: [" + ", ".join(f"\"{n}\"" for n in lad["feats"]) + "]")
    lines += ["equipment_pass:", f"  performed: {today}", "  confirmed_by: player", "  items:"]
    for name, fate in lad["items"].items():
        lines.append(f"    - {{from: \"{name}\", to: {('null' if fate == 'handed back' else json.dumps(name if fate == 'kept' else fate))}, why: \"{fate}\"}}")
    if lad["rulings"]:
        lines.append("rulings:")
        lines += [f"  - {{kind: {r.get('kind')}, from: \"{r.get('from')}\", to: \"{r.get('to')}\", why: {json.dumps(r.get('why', ''))}}}"
                  for r in lad["rulings"]]
    lines += ["---", "", f"# {s['name']}: {s['cls']} {target}" + (f", {s['subclass']}" if s.get("subclass") else ""), "",
              f"Fitted from level {lad['from']} to level {target}" + (f" for {campaign}" if campaign else "") +
              ", one level at a time, every choice the player's.", ""]
    for r in lad["rungs"]:
        bits = []
        if r.get("forced"):
            bits.append("out of reach: " + ", ".join(r["forced"]))
        if r.get("lost_feats"):
            bits.append("feat: " + ", ".join(r["lost_feats"]))
        for c in r["choices"]:
            if c["kind"] != "items" and c.get("picked"):
                bits.append(c["kind"].replace("_", " ") + ": " + ", ".join(c["picked"]))
        lines.append(f"- **{r['from']} → {r['to']}** " + ("; ".join(bits) or "nothing to choose"))
    card = {"id": "own:" + slug(s["name"]), "name": s["name"], "title": f"{s.get('species', '')} {s['cls']} {target}".strip(),
            "tagline": f"Brought from D&D Beyond, fitted to level {target}", "level": target, "own": True}
    return {"ok": True, "markdown": "\n".join(lines) + "\n", "card": card, "final": f}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (name or "character").lower()).strip("-") or "character"
