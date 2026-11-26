"""Seren on this machine, with fake AI. Nothing is spent and nothing leaves the laptop.

    python seren/web/run_local.py          # http://127.0.0.1:8799/deal

- SEREN_AI=mock: the weave returns a canned book built from the dealt cards, and turns at
  the table get the stock DM. Set SEREN_AI= (empty) to use Bedrock instead.
- Content: seren/.local/content, a copy of the DM corpus from the private SEREN repo
  (dm, docs, npcs). Gitignored. Woven campaigns land under it in players/solo/.
- Published campaigns: read from the private SEREN repo's campaigns/published.
"""
import os
import runpy
from pathlib import Path

HERE = Path(__file__).resolve().parent
UNSTUCK = HERE.parent.parent
PROJECTS = UNSTUCK.parent
content = HERE.parent / ".local" / "content"
content.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("SEREN_AI", "mock")
os.environ.setdefault("SEREN_CONTENT_DIR", str(content))
os.environ.setdefault("SEREN_PUBLISHED", str(PROJECTS / "SEREN" / "campaigns" / "published"))
os.environ.setdefault("SEREN_PORT", "8799")
os.environ.setdefault("SEREN_TIER", "free")

os.chdir(HERE)
import sys
sys.path.insert(0, str(HERE))
runpy.run_path(str(HERE / "server.py"), run_name="__main__")
