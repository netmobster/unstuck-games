"""Write a text file with LF endings, on the Python the server actually runs.

`Path.write_text(newline=...)` arrived in 3.10. The box runs 3.9, so every call written
that way was a crash waiting for a request — and it crashed as a 502, because the traceback
never reached the handler's own error path. This machine's Python is 3.14, which is exactly
why it passed here and failed there.

One helper, used everywhere we write state, so the next person does not have to remember.
"""
from __future__ import annotations

from pathlib import Path

LF = chr(10)


def write(path: Path, text: str) -> Path:
    """UTF-8, LF, no surprises. Campaign files are read by humans and by git."""
    with open(path, "w", encoding="utf-8", newline=LF) as fh:
        fh.write(text)
    return path
