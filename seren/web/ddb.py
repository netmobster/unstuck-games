"""Read a D&D Beyond character into a `seren-sheet/1` (leveller.py).

Two ways in, as Jay set them on 26 Nov:
  * a URL (or id) of a character whose owner made it **Public**: fetched from D&D Beyond's character
    service. A private character answers 403 even to its owner's browser without their sign-in token,
    and Seren never asks for that token.
  * anything else: the player attaches D&D Beyond's PDF in the Claude chat, Claude reads it and passes
    a sheet in this same shape (`seren_character` takes `sheet=`). That is the start of the interview
    idea in IDEAS.md.

The character service is unofficial and undocumented. It answered for public characters on 26 Nov.
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

ENDPOINT = "https://character-service.dndbeyond.com/character/v5/character/{id}"
STATS = {1: "str", 2: "dex", 3: "con", 4: "int", 5: "wis", 6: "cha"}
NAMES = {"str": "strength", "dex": "dexterity", "con": "constitution", "int": "intelligence", "wis": "wisdom", "cha": "charisma"}


class NotPublic(RuntimeError):
    """The character exists but D&D Beyond won't share it without the owner's sign-in."""


def character_id(text: str) -> str | None:
    m = re.search(r"(?:characters/|^)(\d{5,12})(?:\D|$)", (text or "").strip())
    return m.group(1) if m else None


def fetch(url_or_id: str, timeout: float = 20.0) -> dict:
    cid = character_id(url_or_id)
    if not cid:
        raise ValueError("that doesn't look like a D&D Beyond character link (dndbeyond.com/characters/<number>)")
    req = urllib.request.Request(ENDPOINT.format(id=cid), headers={"User-Agent": "Seren (Unstuck Games)", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise NotPublic("D&D Beyond won't share this character. Set it to Public (Home > Privacy on the sheet), "
                            "or attach its PDF export in the chat.") from None
        if exc.code == 404:
            raise ValueError("D&D Beyond has no character with that number") from None
        raise
    if not body.get("success"):
        raise NotPublic("D&D Beyond refused: " + str((body.get("data") or {}).get("serverMessage") or "no reason given"))
    sheet = from_ddb(body["data"])
    sheet["source"] = {"kind": "ddb", "id": cid, "url": f"https://www.dndbeyond.com/characters/{cid}"}
    return sheet


def _abilities(d: dict) -> dict:
    base = {STATS[s["id"]]: s["value"] for s in d.get("stats", []) if s.get("value") is not None}
    bonus = {STATS[s["id"]]: s["value"] or 0 for s in d.get("bonusStats", [])}
    over = {STATS[s["id"]]: s["value"] for s in d.get("overrideStats", []) if s.get("value")}
    adds = {k: 0 for k in STATS.values()}
    for group in (d.get("modifiers") or {}).values():
        for m in group or []:
            if m.get("type") == "bonus":
                for k, long in NAMES.items():
                    if m.get("subType") == f"{long}-score":
                        adds[k] += int(m.get("value") or 0)
    return {k: over.get(k) or (base.get(k, 10) + bonus.get(k, 0) + adds[k]) for k in STATS.values()}


def from_ddb(d: dict) -> dict:
    cls = max(d["classes"], key=lambda c: c["level"])          # the main class; multiclass is a ruling for now
    level = sum(c["level"] for c in d["classes"])
    ab = _abilities(d)
    con = (ab["con"] - 10) // 2
    hp = d.get("overrideHitPoints") or (d.get("baseHitPoints", 0) + con * level + (d.get("bonusHitPoints") or 0))

    # class features carry their level; a feat points at the class feature (an ASI) that granted it
    features, feature_level = [], {}
    for c in d["classes"]:
        for f in c.get("classFeatures", []):
            fd = f["definition"]
            feature_level[fd["id"]] = fd.get("requiredLevel")
            if fd.get("requiredLevel"):
                features.append({"name": re.sub(r"^\d+: ", "", fd["name"]), "level": fd["requiredLevel"]})
    feats = []
    for f in d.get("feats", []):
        fd = f["definition"]
        feats.append({"name": fd["name"], "id": fd["id"], "level": feature_level.get(f.get("componentId"))})

    spells = []
    for cs in d.get("classSpells", []):
        for s in cs.get("spells", []):
            sd = s["definition"]
            if sd["level"] == 0 or s.get("prepared") or s.get("alwaysPrepared"):
                spells.append({"name": sd["name"], "level": sd["level"], "source": "class", "always": bool(s.get("alwaysPrepared"))})
    for src, group in (d.get("spells") or {}).items():
        for s in group or []:
            sd = s["definition"]
            entry = {"name": sd["name"], "level": sd["level"], "source": {"class": "subclass", "race": "species"}.get(src, src),
                     "always": True}
            if src == "feat":
                entry["from_feat"] = s.get("componentId")
            spells.append(entry)
    seen, uniq = set(), []
    for s in spells:                                           # D&D Beyond lists a spell once per way to cast it
        k = (s["name"], s["source"])
        if k not in seen:
            seen.add(k)
            uniq.append(s)

    items, counts = [], {}
    for i in d.get("inventory", []):
        idf = i["definition"]
        counts[idf["name"]] = counts.get(idf["name"], 0) + int(i.get("quantity") or 1)
        if counts[idf["name"]] == int(i.get("quantity") or 1):
            items.append({"name": idf["name"], "magic": bool(idf.get("magic")), "rarity": idf.get("rarity"),
                          "kind": idf.get("filterType"), "attuned": bool(i.get("isAttuned"))})
    for it in items:
        it["count"] = counts[it["name"]]
    for c in d.get("customItems") or []:
        items.append({"name": c.get("name"), "magic": True, "rarity": "custom", "kind": "custom", "attuned": False, "count": 1})

    return {"format": "seren-sheet/1", "name": d["name"], "species": (d.get("race") or {}).get("fullName", ""),
            "cls": cls["definition"]["name"], "subclass": (cls.get("subclassDefinition") or {}).get("name"),
            "level": level, "multiclass": len(d["classes"]) > 1, "abilities": ab, "hp": hp,
            "spells": uniq, "feats": feats, "features": features, "items": items}
