"""A campaign's state: where we are, who is standing, what is true, what was rolled.

Formats are SEREN's, from docs/state-formats.md — party.md and scene.md are YAML
frontmatter, ledger.jsonl and facts.jsonl are append-only lines. This module reads them,
writes the two that change during play, and hands the player only what the fog allows.

Deliberately not a database. A campaign is a folder you can read with your eyes, which is
the property that made SEREN trustworthy in the first place.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

import dice
import fog

# Scene keys the player may see. An allow-list, because a deny-list is one schema change
# away from being wrong (render_table.py's reasoning, kept).
SCENE_ALLOWED = ("where", "present", "also_present", "round", "initiative", "foes")

# Everything else in scene.md is the DM's model: beats, clocks, antagonists.
DM_SIDE_FILES = ("fronts.md", "ideas.md", "rulings.md")
DM_SIDE_DIRS = ("canon/antagonists",)


def _frontmatter(text: str) -> dict:
    """The YAML block at the top of a state file, without a YAML dependency.

    SEREN's own files use flat keys, lists of scalars, and inline {k: v} maps. That is the
    subset parsed here; anything more exotic is returned as its raw string so nothing is
    silently dropped.
    """
    # SEREN's state files open with a copyright comment, so the block is not always
    # the first thing in the file. Find the opening fence wherever it is.
    start = text.find("---")
    if start < 0:
        return {}
    before = text[:start].strip()
    if before and not (before.startswith("<!--") and before.endswith("-->")):
        return {}
    end = text.find(chr(10) + "---", start + 3)
    block = text[start + 3:end] if end > 0 else text[start + 3:]
    out: dict = {}
    key = None
    for raw in block.splitlines():
        line = raw.split("  #")[0].rstrip()
        if not line.strip():
            continue
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m and not raw.startswith((" ", "\t", "-")):
            key, value = m.group(1), m.group(2).strip()
            out[key] = _scalar(value) if value else {}
        elif key is not None and raw.startswith((" ", "\t", "-")):
            child = line.strip()
            if child.startswith("- "):
                out.setdefault(key, [])
                if isinstance(out[key], list):
                    out[key].append(_scalar(child[2:].strip()))
            else:
                m2 = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", child)
                if m2 and isinstance(out.get(key), dict):
                    out[key][m2.group(1)] = _scalar(m2.group(2).strip())
    return out


def _scalar(v: str):
    v = v.strip()
    if v in ("null", "~", ""):
        return None
    if v in ("true", "false"):
        return v == "true"
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [_scalar(p) for p in _split(inner)] if inner else []
    if v.startswith("{") and v.endswith("}"):
        out = {}
        for part in _split(v[1:-1]):
            if ":" in part:
                k, val = part.split(":", 1)
                out[k.strip()] = _scalar(val)
        return out
    return v.strip('"').strip("'")


def _split(s: str) -> list[str]:
    """Split on commas that are not inside brackets or quotes."""
    out, depth, cur, quote = [], 0, "", ""
    for ch in s:
        if quote:
            quote = "" if ch == quote else quote
        elif ch in "\"'":
            quote = ch
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
        if ch == "," and depth == 0 and not quote:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


@dataclass
class Campaign:
    """One campaign folder, and everything play needs from it."""
    root: Path
    session: int = 1
    turns: int = 0
    spent: float = 0.0
    tier: str = "free"
    beats: list[dict] = field(default_factory=list)

    # ── paths ────────────────────────────────────────────────────────────────
    @property
    def ledger(self) -> Path:
        return self.root / "state" / "ledger.jsonl"

    @property
    def facts_file(self) -> Path:
        return self.root / "state" / "facts.jsonl"

    def _read(self, rel: str) -> str:
        path = self.root / rel
        try:
            return path.read_text(encoding="utf-8")
        except OSError:
            return ""

    # ── the DM's side ────────────────────────────────────────────────────────
    def scene(self) -> dict:
        return _frontmatter(self._read("state/scene.md"))

    def party(self) -> dict:
        return _frontmatter(self._read("state/party.md"))

    def dm_side(self) -> str:
        """Everything the player must never see, concatenated for the leak check."""
        chunks = [self._read(name) for name in DM_SIDE_FILES]
        for folder in DM_SIDE_DIRS:
            base = self.root / folder
            if base.is_dir():
                chunks += [p.read_text(encoding="utf-8", errors="ignore") for p in base.glob("*.md")]
        return "\n".join(c for c in chunks if c)

    def campaign_static(self) -> str:
        """The layer that does not change during a session: premise, persona, fronts."""
        parts = []
        for name in ("campaign.md", "DM-persona.md", "fronts.md"):
            text = self._read(name)
            if text:
                parts.append(f"# {name}\n{text}")
        base = self.root / "canon" / "antagonists"
        if base.is_dir():
            for path in sorted(base.glob("*.md")):
                if path.name != "README.md":
                    parts.append(f"# canon/antagonists/{path.name}\n{path.read_text(encoding='utf-8', errors='ignore')}")
        return "\n\n".join(parts)

    def state_layer(self) -> str:
        """Refreshed each session open: who is standing, where, and what just happened."""
        parts = []
        for rel in ("state/party.md", "state/scene.md"):
            text = self._read(rel)
            if text:
                parts.append(f"# {rel}\n{text}")
        sessions = sorted((self.root / "sessions").glob("*.md")) if (self.root / "sessions").is_dir() else []
        if sessions:
            last = sessions[-1]
            parts.append(f"# last session ({last.name})\n{last.read_text(encoding='utf-8', errors='ignore')[:6000]}")
        facts = dice.read(self.facts_file)
        if facts:
            parts.append("# state/facts.jsonl — what is true, and who knows it\n" +
                         "\n".join(json.dumps(f, ensure_ascii=False) for f in facts[-60:]))
        return "\n\n".join(parts)

    # ── the player's side ────────────────────────────────────────────────────
    def quests(self) -> list[dict]:
        """Open loops, from the last session log. The close ceremony writes them; until
        now nothing showed them to the player, which is where they are most wanted."""
        logs = self._logs()
        if not logs:
            return []
        out = []
        for title, body in _sections(logs[-1].read_text(encoding="utf-8", errors="ignore")):
            if "open loop" not in title.lower():
                continue
            for line in body.splitlines():
                line = line.strip()
                if line.startswith(("- ", "* ")):
                    item = re.sub(r"[*`]", "", line[2:]).strip()
                    if len(item) > 3:
                        out.append({"text": item, "meta": ""})
        return out[:8]

    def _logs(self) -> list:
        """The written sessions, in the order they were played."""
        folder = self.root / "sessions"
        if not folder.is_dir():
            return []
        return sorted((p for p in folder.glob("*.md") if p.stem != "README"),
                      key=lambda p: _num(p.stem))

    def player_view(self) -> dict:
        """What the Table may show. The fog is enforced here, once, on the way out."""
        scene = self.scene()
        allowed = {k: scene.get(k) for k in SCENE_ALLOWED if scene.get(k) is not None}
        party = self.party()

        standing = []
        for slug, block in party.items():
            if slug in ("round_synced", "xp") or not isinstance(block, dict):
                continue
            hp = block.get("hp") if isinstance(block.get("hp"), dict) else {}
            cur, mx = hp.get("current"), hp.get("max")
            standing.append({
                "name": slug.replace("-", " ").title(),
                "slug": slug,
                "state": f"{cur} / {mx}" if cur is not None else "",
                "hp": cur, "max": mx,
                "conditions": block.get("conditions") or [],
                "slots": block.get("slots") or {},
                "uses": block.get("uses") or {},
                "concentrating": (block.get("concentration") or {}).get("spell")
                if isinstance(block.get("concentration"), dict) else None,
            })

        all_facts = [f for f in dice.read(self.facts_file) if f.get("fact")]
        facts = []
        for f in fog.player_facts(all_facts):
            if f.get("fact"):
                facts.append({"vis": (f.get("visibility") or "known").upper(), "text": f["fact"]})
        hidden = len(all_facts) - len(facts)

        rolls = []
        for e in dice.read(self.ledger):
            if "roll" not in e:
                continue
            target = e.get("dc") if e.get("dc") is not None else e.get("vs")
            ok = e.get("pass") if "pass" in e else e.get("hit")
            rolls.append({
                "id": e.get("id"),
                "what": " · ".join(filter(None, [str(e.get("who") or ""), str(e.get("skill") or e.get("t") or "")])),
                "vs": f"{e.get('total')} vs {target}" if target is not None else str(e.get("total")),
                "res": "HELD" if ok else ("DID NOT" if ok is False else "—"),
                "ok": ok,
            })

        present = [{"who": p["name"], "state": ", ".join(p["conditions"]) or "at the table", "hp": p["state"]}
                   for p in standing]
        for who in (allowed.get("also_present") or []):
            present.append({"who": str(who), "state": "", "hp": ""})

        return {
            "place": allowed.get("where") or "somewhere",
            "when": f"SESSION {self.session}",
            "round": allowed.get("round"),
            "initiative": allowed.get("initiative") or [],
            "party": standing,
            "present": present,
            "facts": facts[-14:],
            "hidden": hidden,
            "quests": self.quests(),
            "rolls": rolls[-12:],
            "session": self.session,
            "turns": self.turns,
            "spent": f"${self.spent:.2f}",
            "cap": None,
        }

    # ── the reference slips ──────────────────────────────────────────────────
    def sheet(self) -> dict:
        """The player's own character, from builds/<pc>.md. Read here, never written.

        Which character is the player's is a campaign fact, not an engine one, so it
        comes from the environment: SEREN_PC, defaulting to the campaign's first build.
        """
        pc = os.environ.get("SEREN_PC") or self._first_build()
        text = self._read(f"builds/{pc}.md")
        fm = _frontmatter(text)
        if not fm:
            return {}
        ab = fm.get("abilities") if isinstance(fm.get("abilities"), dict) else {}
        hp = fm.get("hp") if isinstance(fm.get("hp"), dict) else {}
        slots = fm.get("spell_slots") if isinstance(fm.get("spell_slots"), dict) else {}
        return {
            "who": pc.replace("-", " ").title(),
            "slug": pc,
            "build": " · ".join(str(x) for x in [fm.get("class"), fm.get("subclass")] if x),
            "species": fm.get("species") or "",
            "abilities": [[k.upper(), ab[k], _mod(ab[k])] for k in ABILITIES if k in ab],
            "ac": fm.get("ac"),
            "hp_max": hp.get("max"),
            "save_dc": fm.get("spell_save_dc"),
            "slots": {str(k): v for k, v in slots.items()},
            "prepared": _listed(text, "prepared") + _listed(text, "known"),
        }

    def _first_build(self) -> str:
        base = self.root / "builds"
        found = sorted(p.stem for p in base.glob("*.md")) if base.is_dir() else []
        found = [f for f in found if f != "README"]
        # the engine is named after her, and so is the campaign's own PC
        return next((f for f in found if f == "seren"), found[0] if found else "")

    def title(self) -> str:
        """What the campaign calls itself — its first heading, minus any level note."""
        for line in self._read("campaign.md").splitlines():
            if line.startswith("# "):
                return line[2:].split("—")[0].split(" - ")[0].strip()
        return self.root.name.replace("-", " ").title()

    def library(self) -> list[dict]:
        """The manifest's resolved rows — what this party's rules actually are.

        A manifest, not a copy (library-manifest.md says so in bold). Article text is
        served when the corpus carries the library; otherwise the row still names the
        article, which is the part the player needs to look it up.
        """
        text = self._read("library-manifest.md")
        out = []
        for line in text.splitlines():
            cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.strip().startswith("|") else []
            if len(cells) != 4 or cells[0].startswith("---") or cells[0] in ("what", "**what**"):
                continue
            name = cells[0].strip("*").strip()
            rel = cells[3].strip("`").strip()
            if not name or not rel.endswith(".md"):
                continue
            out.append({"name": name, "kind": cells[1].strip("`"), "for": cells[2].strip("`"),
                        "text": _article(self.root, rel)})
        return out

    def pages(self) -> list[dict]:
        """The sessions already written. The rail's earlier chapters are these, verbatim."""
        out = []
        for path in self._logs():
            text = path.read_text(encoding="utf-8", errors="ignore")
            head = path.stem
            items = []
            for title, body in _sections(text):
                if title.startswith("Session ") and head == path.stem:
                    head = title
                if "what happened" not in title.lower():
                    continue
                for para in body.split(chr(10) + chr(10)):
                    para = para.strip()
                    if para.startswith("#") or len(para) < 40:
                        continue
                    items.append({"t": "p", "text": re.sub(r"[*`]", "", para)})
            out.append({"title": head, "when": "WRITTEN", "items": items})
        return out


def _sections(text: str) -> list[tuple[str, str]]:
    """(heading, body) for every heading in a markdown file, at any level.

    A section owns everything under it until a heading of its own level or higher, so a
    part written as sub-scenes reads the same as one written as prose.
    """
    lines = text.splitlines()
    heads = [(i, len(m.group(1)), m.group(2).strip())
             for i, ln in enumerate(lines)
             if (m := re.match(r"^(#{1,4}) +(.+)$", ln))]
    out = []
    for n, (at, level, title) in enumerate(heads):
        end = len(lines)
        for later_at, later_level, _ in heads[n + 1:]:
            if later_level <= level:
                end = later_at
                break
        body = chr(10).join(ln for ln in lines[at + 1:end] if not ln.startswith("#"))
        out.append((title, body))
    return out


ABILITIES = ("str", "dex", "con", "int", "wis", "cha")


def _mod(v) -> str:
    try:
        return f"{(int(v) - 10) // 2:+d}"
    except (TypeError, ValueError):
        return ""


def _num(stem: str) -> tuple:
    return (0, int(stem)) if stem.isdigit() else (1, 0)


def _listed(text: str, key: str) -> list[str]:
    """The items under a nested `key:` block. The flat frontmatter parser drops these,
    and the sheet is exactly where they are wanted."""
    lines = text.splitlines()
    out, depth = [], None
    for line in lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        if depth is None:
            if stripped.rstrip(":") == key and stripped.endswith(":"):
                depth = indent
            continue
        if stripped.startswith("- "):
            item = stripped[2:].split("#")[0].strip().strip('"').strip("'")
            if item:
                out.append(item)
        elif stripped and indent <= depth:
            break
    return out


def _article(root, rel: str) -> str:
    """An SRD article's text, if the library travelled with the campaign.

    Stripped of the licence comment and the frontmatter — the attribution belongs on the
    panel, where it is stated once, not in the middle of a rule.
    """
    import corpus
    for base in (root, root.parent.parent, corpus.ROOT):
        path = base / rel
        try:
            if path.is_file():
                return _prose(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            pass
    return ""


def _prose(text: str) -> str:
    """Body text, with the wrapper removed and the section headings kept as sentences."""
    while text.lstrip().startswith("<!--"):
        at = text.find("-->")
        if at < 0:
            break
        text = text[at + 3:]
    body = text.lstrip()
    if body.startswith("---"):
        at = body.find(chr(10) + "---", 3)
        body = body[at + 4:] if at > 0 else body
    out = []
    body = re.sub(r"[*_]{1,2}", "", body)   # the panel is not a markdown renderer
    first = True
    for para in body.split(chr(10)):
        line = para.strip()
        if not line:
            continue
        if line.startswith("|"):
            cells = [c.strip().strip("*") for c in line.strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in cells):
                continue
            line = ": ".join(c for c in cells if c)
            if not line:
                continue
            out.append(line)
            continue
        if line.startswith("#"):
            title = line.lstrip("# ").strip()
            if first:        # the row above already names the article
                first = False
                continue
            out.append(title + ".")
            continue
        out.append(line)
        if sum(len(x) for x in out) > 900:
            break
    return chr(10).join(out).strip()[:900]
