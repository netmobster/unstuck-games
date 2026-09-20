"""Catch the class of bug that only shows up on the box.

This machine runs Python 3.14; the server runs 3.9. Code that is perfectly good here can be
a crash there, and it arrives as a 502 from nginx with no traceback in front of the player.
That happened once, to `Path.write_text(newline=...)`, which is 3.10+.

    python py39-check.py            # from seren/tools

Greps, not imports — the point is to run anywhere, in a second, before a deploy.
"""
from __future__ import annotations

import pathlib
import re
import sys

WEB = pathlib.Path(__file__).resolve().parents[1] / "web"

# (pattern, what it needs, what to do instead)
LATER_THAN_39 = [
    (r"\.write_text\([^)]*newline=", "3.10", "use files.write(path, text)"),
    (r"\.write_bytes\([^)]*newline=", "3.10", "write_bytes takes no newline"),
    (r"\bitertools\.pairwise\b", "3.10", "zip(x, x[1:])"),
    (r"\bmatch\s+\w+\s*:\s*$", "3.10", "if/elif — match is 3.10"),
    (r"\bdatetime\.UTC\b", "3.11", "datetime.timezone.utc"),
    (r"\bExceptionGroup\b", "3.11", "plain exceptions"),
    (r"\btomllib\b", "3.11", "do not parse toml on the server"),
    (r"\benum\.StrEnum\b", "3.11", "str, Enum"),
    (r"\bhashlib\.file_digest\b", "3.11", "read and hash it yourself"),
    (r"\bitertools\.batched\b", "3.12", "slice it yourself"),
    (r"\bPath\.walk\b", "3.12", "os.walk or rglob"),
    (r"\btype\s+\w+\s*=", "3.12", "a plain alias"),
]


def main() -> int:
    found = []
    for path in sorted(WEB.glob("*.py")):
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if line.lstrip().startswith("#") or '"""' in line:
                continue
            for pattern, needs, instead in LATER_THAN_39:
                if re.search(pattern, line):
                    found.append((path.name, n, needs, line.strip()[:70], instead))
    for name, n, needs, line, instead in found:
        print(f"{name}:{n}  needs {needs} — {line}\n    → {instead}")
    print(f"\n{len(found)} thing{'' if len(found) == 1 else 's'} the server's Python 3.9 cannot run.")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
