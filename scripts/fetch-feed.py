#!/usr/bin/env python3
"""Cache the Substack feed as JSON for the updates page.

A browser cannot read another site's RSS (the cross-origin rule), and fetching it
on every page view would hammer Substack for no reason. So the box fetches it once
a day, converts it to small JSON, and nginx serves that file.

Writes atomically and leaves the previous copy in place if the fetch fails: a
stale journal is much better than an empty one.

    python3 scripts/fetch-feed.py [--out /srv/cache/feed.json]
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEED = os.environ.get("UNSTUCK_FEED", "https://gamesgotout.substack.com/feed")
TIMEOUT = 20
KEEP = 10


def text_of(node, tag):
    el = node.find(tag)
    return (el.text or "").strip() if el is not None and el.text else ""


def summarise(raw: str, limit: int = 220) -> str:
    """Strip the HTML Substack puts in the description down to one plain sentence."""
    plain = html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= limit:
        return plain
    cut = plain[:limit]
    return cut[: cut.rfind(" ")].rstrip(",;:—-") + "…"


def iso(date_str: str) -> str:
    try:
        return parsedate_to_datetime(date_str).astimezone(timezone.utc).date().isoformat()
    except Exception:
        return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/srv/cache/feed.json")
    args = ap.parse_args()

    req = urllib.request.Request(FEED, headers={"User-Agent": "unstuck-games.com feed cache"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        root = ET.fromstring(r.read())

    items = []
    for item in root.iter("item"):
        items.append({
            "title": text_of(item, "title"),
            "link": text_of(item, "link"),
            "date": iso(text_of(item, "pubDate")),
            "summary": summarise(text_of(item, "description")),
        })
        if len(items) >= KEEP:
            break

    payload = {
        "source": FEED,
        "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "items": items,
    }

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(out), suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, out)          # atomic: readers never see half a file
    os.chmod(out, 0o644)
    print(f"wrote {out}: {len(items)} items")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:                      # keep yesterday's copy
        print(f"feed fetch failed, leaving the cached copy alone: {exc}", file=sys.stderr)
        sys.exit(1)
