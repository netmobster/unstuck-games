"""Bring your own character: the store behind the ladder, shared by the MCP tools and the web routes.

A brought sheet is kept at `<local>/characters/<key>.json`, the chat's rulings on it beside it
(`<key>.rulings.json`), and a build that passed the gate at `<local>/builds/`. One engine
(leveller.py), two front doors.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import ddb
import leveller

LOCAL = Path(os.environ.get("SEREN_LOCAL") or Path(__file__).resolve().parents[1] / ".local")
CHARS = LOCAL / "characters"
BUILDS = LOCAL / "builds"


def key_of(text: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", (text or "").lower())[:64]


def sheet(key: str) -> dict | None:
    try:
        return json.loads((CHARS / f"{key_of(key)}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def rulings(key: str) -> list[dict]:
    try:
        return json.loads((CHARS / f"{key_of(key)}.rulings.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def bring(url: str = "", given: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        if url:
            s = ddb.fetch(url)
            key = s["source"]["id"]
        elif given:
            s = dict(given)
            s.setdefault("format", leveller.FORMAT)
            for k in ("spells", "feats", "items", "features"):
                s.setdefault(k, [])
            s["source"] = s.get("source") or {"kind": "chat"}
            key = "chat-" + leveller.slug(s.get("name", ""))
        else:
            return {"ok": False, "error": "pass a D&D Beyond link, or a sheet read from the chat"}
    except ddb.NotPublic as exc:
        return {"ok": False, "error": str(exc), "private": True}
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    CHARS.mkdir(parents=True, exist_ok=True)
    (CHARS / f"{key_of(key)}.json").write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"ok": True, "key": key_of(key), "name": s.get("name"), "cls": s.get("cls"), "subclass": s.get("subclass"),
            "level": s.get("level"), "species": s.get("species"), "unsupported": leveller.unsupported(s)}


def level(key: str, target: int, decisions: dict | None = None) -> dict[str, Any]:
    s = sheet(key)
    if not s:
        return {"ok": False, "error": "that character hasn't been brought to the table yet"}
    out = leveller.ladder(s, target, decisions or {}, rulings(key))
    out["key"] = key_of(key)
    out.pop("sheet", None)
    return out


def rule(key: str, kind: str, name: str, to: str = "", why: str = "") -> dict[str, Any]:
    if kind not in ("class", "subclass", "spell", "item", "feat"):
        return {"ok": False, "error": "kind is one of class, subclass, spell, item, feat"}
    if not sheet(key):
        return {"ok": False, "error": "no character with that key at the table"}
    rs = [r for r in rulings(key) if not (r["kind"] == kind and r["from"].lower() == (name or "").lower())]
    rs.append({"kind": kind, "from": name, "to": to, "why": why})
    (CHARS / f"{key_of(key)}.rulings.json").write_text(json.dumps(rs, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"ok": True, "rulings": rs, "note": "The table picks this up on its next look."}


def save(key: str, target: int, decisions: dict, campaign: str = "", name: str = "") -> dict[str, Any]:
    s = sheet(key)
    if not s:
        return {"ok": False, "refused": ["that character hasn't been brought to the table yet"]}
    out = leveller.build(s, target, decisions, rulings(key), campaign, name)
    if out["ok"]:
        BUILDS.mkdir(parents=True, exist_ok=True)
        file = f"{leveller.slug(out['card']['name'])}-{key_of(campaign) or 'table'}-{int(target)}.md"
        (BUILDS / file).write_text(out["markdown"], encoding="utf-8")
        out["file"] = file
    return out
