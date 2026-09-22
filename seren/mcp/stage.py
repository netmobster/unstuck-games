"""Assemble a disposable content dir for local play: the real rules, the SRD library, and
the Weighbridge fixture on the `tester` shelf.

    python seren/mcp/stage.py            # → seren/mcp/.stage, prints the Claude Desktop config

The rules and the fixture are COPIED from where they live, never duplicated in this folder,
so local play cannot drift from what they are testing (the fixture's own rule).

A second account, `intruder`, gets its own copy. It exists so the isolation test has
somebody to fail to reach.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEREN = HERE.parent
# The rules and the SRD library are not in git (seren/content/ is ignored). Locally they are
# in seren/content; on the box they are in /srv/seren, read and never written.
REAL = Path(os.environ.get("SEREN_SRC_CONTENT") or SEREN / "content")
FIXTURE = SEREN / "fixture" / "campaign"
STAGE = HERE / ".stage"
SLUG = "the-weighbridge"


def stage(dest: Path = STAGE, keep: bool = False) -> Path:
    if keep and (dest / "players").is_dir():
        return dest          # a restart must not wipe a session in progress
    if dest.exists():
        shutil.rmtree(dest)
    (dest / "dm").mkdir(parents=True)
    (dest / "docs").mkdir(parents=True)
    shutil.copy2(REAL / "dm" / "DM.md", dest / "dm" / "DM.md")
    shutil.copy2(REAL / "docs" / "state-formats.md", dest / "docs" / "state-formats.md")
    shutil.copytree(REAL / "library" / "srd-5.2" / "articles",
                    dest / "library" / "srd-5.2" / "articles")
    for account in ("tester", "intruder"):
        live = dest / "players" / account / SLUG
        shutil.copytree(FIXTURE, live)
    return dest


def desktop_config(dest: Path) -> dict:
    py = HERE / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    return {"mcpServers": {"seren": {
        "command": str(py),
        "args": [str(HERE / "server.py")],
        "env": {"SEREN_CONTENT_DIR": str(dest), "SEREN_ACCOUNT": "tester", "SEREN_PC": "wick"},
    }}}


if __name__ == "__main__":
    to = Path(sys.argv[sys.argv.index("--to") + 1]) if "--to" in sys.argv else STAGE
    d = stage(to, keep="--keep" in sys.argv)
    print(f"staged  {d}")
    print("Claude Desktop → Settings → Developer → Edit config, merge this in:")
    print(json.dumps(desktop_config(d), indent=2))
