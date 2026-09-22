"""The table, over MCP: CC SEREN's renderer and leak check, vendored in cc_table/.

    render  → cc_table/render_table.build()     one self-contained HTML file
    check   → cc_table/table.check_render()     and if anything leaked, it is deleted

⛔ **A leaked table is never served.** The tool returns a plain notice instead. That is the
CC rule (pieces-table.md: "filter alone is prevention with no proof; check alone is
detection after the fact; build both or neither") and over MCP it is the last fog gate we
still own, because the narration no longer passes through us.

Phase 0 returns a local file path. Phase 1 serves the same file from a signed, short-lived
link, and as an MCP Apps `ui://` resource where the client supports it.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "cc_table"))

import render_table            # noqa: E402  (vendored)
import table as table_gate     # noqa: E402  (vendored)

import play                    # noqa: E402


def _articles() -> Path:
    return play.content_root() / "library" / "srd-5.2" / "articles"


def render(folder: Path) -> tuple[str | None, list]:
    """Render and check. Returns (html, []) or (None, leaks)."""
    arts = _articles()
    page = render_table.build(str(folder), artifact=True,
                              articles_dir=str(arts) if arts.is_dir() else None)
    out = folder / "table.html"
    out.write_text(page, encoding="utf-8")
    leaks = table_gate.check_render(str(out), str(folder))
    if leaks:
        out.unlink()
        return None, leaks
    return page, []


def publish(t: "play.Table") -> dict:
    camp = t._need()
    page, leaks = render(camp.root)
    if page is None:
        return {"table": None,
                "held": f"The table was not drawn: {len(leaks)} thing(s) on it the player "
                        "must not see. Play on; the record is unaffected.",
                "for_the_operator": [f"{lk.what!r}: {lk.why}" for lk in leaks[:5]]}
    path = camp.root / "table.html"
    return {"table": path.as_uri(), "size_kb": round(len(page) / 1024),
            "tell_the_player": "Your table is ready. Open it beside this chat."}


# ── the inline table's data ──────────────────────────────────────────────────

def data(t: "play.Table") -> dict:
    """What the inline table (table_app.html) draws: the engine's own player_view, which is
    where the web table's fog is enforced, then checked again before it leaves.

    ⛔ Same rule as the rendered table: if the check finds anything, the view is held, not
    trimmed. A partial table that leaked is still a table that leaked.
    """
    camp = t._need()
    view = camp.player_view()
    view["title"] = camp.title()
    # The engine's player_view lists the party and `also_present`, but not non-party names in
    # scene `present` — so the fixture's cast, who are in the room on record, never showed.
    # The web table has the same gap; fixed here, in this layer, not in the engine.
    shown = {str(p.get("who") or "").lower() for p in view.get("present") or []}
    party = set(camp.party().keys())
    for slug in (camp.scene().get("present") or []):
        name = str(slug).replace("-", " ").title()
        if str(slug).lower() not in party and name.lower() not in shown:
            view["present"].append({"who": name, "state": "", "hp": ""})
    for k in ("spent", "cap", "turns"):          # web-only bookkeeping; nothing to show here
        view.pop(k, None)
    text = json.dumps(view, ensure_ascii=False)
    leaks = [l for l in play.fog.check(text, camp.dm_side()) if not play._table_talk(l)]
    if leaks:
        return {"held": "The table is not shown right now: something on it the player must "
                        "not see. Play on; the record is unaffected."}
    return view


# ── rules lookup ─────────────────────────────────────────────────────────────

def rules_lookup(query: str) -> dict:
    """SRD 5.2 articles by name first, then by body. Rules are not secret; no filter."""
    words = [w for w in re.findall(r"[a-z0-9]+", (query or "").lower()) if len(w) > 2]
    if not words:
        raise play.Refused("name the rule, spell, condition or item")
    base = _articles()
    if not base.is_dir():
        raise play.Refused("the rules library is not installed on this server")
    scored = []
    for p in base.rglob("*.md"):
        name = p.stem.replace("-", " ")
        s = sum(3 for w in words if w in name)
        if not s:
            body = p.read_text(encoding="utf-8", errors="ignore").lower()
            s = sum(1 for w in words if w in body) if all(w in body for w in words) else 0
        if s:
            scored.append((s, p))
    scored.sort(key=lambda x: (-x[0], len(x[1].stem)))
    out = []
    for s, p in scored[:3]:
        text = p.read_text(encoding="utf-8", errors="ignore")
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()
        out.append({"article": f"{p.parent.name}/{p.stem}", "text": text[:4000]})
    return {"results": out,
            "attribution": "SRD 5.2 by Wizards of the Coast LLC, CC-BY-4.0."}
