"""The corpus: everything the DM can draw on, read from disk, never from the repo.

SEREN's content is private — `LIVE/` never ships, and the test campaign is built on a
DMs Guild adventure — so the server reads it from SEREN_CONTENT_DIR. The repo holds the
engine; the filesystem holds the world.

Layout expected under SEREN_CONTENT_DIR:

    dm/DM.md                  the DM's standing rules
    docs/                     state formats, architecture, campaign start
    npcs/tables/roles/        role templates: town/, world/, hostile/
    npcs/antagonists/         antagonist templates (+ -secrets.md)
    adventures/<slug>/        an adventure: module.md, elements/
    campaigns/<slug>/         a live campaign's state (see state.py)

Nothing here interprets the content. It finds it, reads it, and hands it over.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(os.environ.get("SEREN_CONTENT_DIR", "/srv/seren")).resolve()


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


def frontmatter(text: str) -> dict[str, str]:
    """The YAML-ish header SEREN puts on templates. Flat keys only, which is all it uses."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    out: dict[str, str] = {}
    for line in text[3:end].splitlines():
        m = re.match(r"^([a-z_]+):\s*(.*)$", line.strip())
        if m and m.group(2):
            out[m.group(1)] = m.group(2).strip().strip('"')
    return out


@dataclass(frozen=True)
class Entry:
    """One piece of the corpus: a role, an antagonist, a rule file."""
    kind: str          # "role" | "antagonist" | "rule" | "adventure" | "doc"
    slug: str
    path: Path
    meta: dict[str, str]

    @property
    def text(self) -> str:
        return _read(self.path)

    @property
    def words(self) -> int:
        return len(self.text.split())


def _entries(kind: str, folder: str, pattern: str = "*.md") -> list[Entry]:
    base = ROOT / folder
    if not base.is_dir():
        return []
    found = []
    for path in sorted(base.rglob(pattern)):
        if path.name.startswith("_") or path.name == "README.md":
            continue
        if path.stem.endswith("-secrets") or path.stem.endswith("-interactions"):
            continue  # reachable through their owner, never loaded on their own
        found.append(Entry(kind, path.stem, path, frontmatter(_read(path))))
    return found


def roles() -> list[Entry]:
    return _entries("role", "npcs/tables/roles")


def antagonists() -> list[Entry]:
    return _entries("antagonist", "npcs/antagonists")


def secrets_for(slug: str) -> Entry | None:
    path = ROOT / "npcs" / "antagonists" / f"{slug}-secrets.md"
    return Entry("secrets", slug, path, {}) if path.is_file() else None


def adventures() -> list[Entry]:
    """An adventure is a folder with a module.md. Its slug is the folder name."""
    base = ROOT / "adventures"
    if not base.is_dir():
        return []
    out = []
    for folder in sorted(p for p in base.iterdir() if p.is_dir()):
        module = folder / "module.md"
        if module.is_file():
            out.append(Entry("adventure", folder.name, module, frontmatter(_read(module))))
    return out


def rules() -> dict[str, str]:
    """The DM's standing rules and the formats it must obey. Always in context."""
    return {
        "dm": _read(ROOT / "dm" / "DM.md"),
        "state_formats": _read(ROOT / "docs" / "state-formats.md"),
    }


def health() -> dict[str, object]:
    """Enough to tell, at a glance, whether the corpus is actually there."""
    r = rules()
    return {
        "root": str(ROOT),
        "present": ROOT.is_dir(),
        "dm_rules_words": len(r["dm"].split()),
        "roles": len(roles()),
        "antagonists": len(antagonists()),
        "adventures": [a.slug for a in adventures()],
    }


if __name__ == "__main__":
    import json
    print(json.dumps(health(), indent=2))
