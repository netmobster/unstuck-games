"""A campaign's state: where we are, who is standing, what is true, what was rolled.

Formats are SEREN's, from docs/state-formats.md — party.md and scene.md are YAML
frontmatter, ledger.jsonl and facts.jsonl are append-only lines. This module reads them,
writes the two that change during play, and hands the player only what the fog allows.

Deliberately not a database. A campaign is a folder you can read with your eyes, which is
the property that made SEREN trustworthy in the first place.
"""
from __future__ import annotations

import json
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
            standing.append({
                "name": slug.replace("-", " ").title(),
                "state": f"{hp.get('current', '?')} / {hp.get('max', '?')}",
            })

        facts = []
        for f in fog.player_facts(dice.read(self.facts_file)):
            if f.get("fact"):
                facts.append(f["fact"])

        rolls = [e for e in dice.read(self.ledger) if "roll" in e][-8:]
        return {
            "place": allowed.get("where") or "somewhere",
            "when": f"SESSION {self.session}",
            "party": standing,
            "facts": facts[-12:],
            "also_present": allowed.get("also_present") or [],
            "rolls": rolls,
            "session": self.session,
            "turns": self.turns,
            "spent": f"${self.spent:.2f}",
            "cap": None,
        }
