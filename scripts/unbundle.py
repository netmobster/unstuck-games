"""Turn a Claude Design bundle into a flat HTML page.

CD exports pages as a loader: a JSON template plus a manifest of assets (fonts, images),
each referenced in the template by a UUID and optionally gzipped. The browser unpacks it
with JavaScript, which means the file shows "Unpacking..." without JS, can't be read as
text, and ships ~700 KB of loader around the page.

This does the same substitution once, offline: every UUID becomes a data: URI, and the
result is a normal static page nginx can serve.

    python scripts/unbundle.py <bundle.html> <out.html>
"""
import base64
import gzip
import json
import re
import sys
from pathlib import Path


def block(src: str, kind: str) -> str:
    m = re.search(r'<script type="__bundler/' + kind + r'">([\s\S]*?)</script>', src)
    if not m:
        raise SystemExit(f"not a CD bundle: no __bundler/{kind} block")
    return m.group(1).strip()


def main(inp: str, out: str) -> None:
    src = Path(inp).read_text(encoding="utf-8")
    manifest = json.loads(block(src, "manifest"))
    html = json.loads(block(src, "template"))

    for uuid, entry in manifest.items():
        raw = base64.b64decode(entry["data"])
        if entry.get("compressed"):
            raw = gzip.decompress(raw)
        uri = f"data:{entry.get('mime', 'application/octet-stream')};base64,{base64.b64encode(raw).decode()}"
        html = html.replace(uuid, uri)

    # The loader strips these too; SRI hashes can't match inlined resources.
    html = re.sub(r'\s+integrity="[^"]*"', "", html)
    html = re.sub(r'\s+crossorigin="[^"]*"', "", html)

    left = [u for u in manifest if u in html]
    if left:
        raise SystemExit(f"unsubstituted resources: {left[:3]}")
    Path(out).write_text(html, encoding="utf-8", newline="\n")
    print(f"{inp} -> {out}: {len(manifest)} assets inlined, {len(html) // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
