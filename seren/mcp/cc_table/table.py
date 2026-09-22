#!/usr/bin/env python3
# VENDORED into seren-mcp from SEREN/scripts/table.py @ 0c01479, unchanged.
# Copyright (c) 2026 Jeremy Wright. All rights reserved. See LICENSE.txt
"""
table.py - the fog-of-war gate for the Seren Table

    python scripts/table.py filter <facts.jsonl>          # player-visible facts only
    python scripts/table.py check  <rendered> <live-dir>  # did anything leak?
    python scripts/table.py banned                         # print the global list
    python scripts/table.py look   <name> [type]          # resolve a name to an article

Exit 0 = clean. Exit 1 = LEAK, with what leaked and where it came from.

------------------------------------------------------------------------------
WHY THIS EXISTS

pieces-table.md: "Every panel declares what it must NOT show." That rule was
prose in a markdown file and nothing enforced it. Everything else in this
project that had to be true got a validator; the fog-of-war boundary got a rule
and one lucky self-catch.

DM.md S2 already establishes the principle: AN INSTRUCTION IS NOT A CONTROL.
A never-show list the DM is asked to remember is the same object as the note
that asked it to remember to log its rolls, which cost two dice.

------------------------------------------------------------------------------
THE DETAIL THAT SHAPES THIS FILE

The real leak, 2026-08-27, was Noke's front clock rendered on the Now panel as:

    [##--------]

THAT IS A VALUE, NOT A KEY. A filter that strips a `clock:` field would not
have caught it, because by render time the field name is gone and only the bar
remains. So there are two halves here and they do different jobs:

  FILTER  strips banned FIELDS from data before it reaches a panel.
  CHECK   scans RENDERED OUTPUT for banned CONTENT, including distinctive
          strings lifted out of the DM-side files themselves.

Filter alone is prevention with no proof. Check alone is detection after the
fact. pieces-table.md says build both or neither, and it is right.

------------------------------------------------------------------------------
AND IT RUNS ON EVERY RENDER

The Table is LIVE (decided 2026-08-28). A live panel redraws when state
changes, and a front clock advances while the party is elsewhere. So a panel
that was clean when it was built reappears dirty three hours later unless this
runs each time. The first leak was caught at build by a human reading a mockup.
The second one arrives silently, mid-session.
"""

import json
import os
import re
import sys

SPEC = "docs/pieces-table.md"

# ---------------------------------------------------------------------------
# THE GLOBAL LIST - no panel shows these, ever.
#
# Per-panel rules are IN ADDITION to this. The list is global because the leak
# proved it had to be: `clocks` was banned on the Quests row and leaked on Now.
# A leak that can surface anywhere has to be banned everywhere, or the panel
# nobody wrote it on is the one that leaks.
# ---------------------------------------------------------------------------

BANNED_FIELDS = {
    "clock":    "front clocks - the DM's model of what the world does unobserved",
    "clocks":   "front clocks",
    "front":    "fronts are agendas the party has not seen",
    "fronts":   "fronts are agendas the party has not seen",
    "if_full":  "a front's completion state",
    "beat":     "the beat graph - showing a beat before it happens is showing the plot",
    "beats":    "the beat graph",
    "wants":    "the DM's notebook",
    "secret":   "the DM's notebook",
    "secrets":  "the DM's notebook",
    "fork":     "the DM's notebook",
    "forks":    "the DM's notebook",
    "truth":    "`true`/`false` visibility - the player vocabulary is known/suspected only",
    "grudge_seed": "an antagonist's un-instanced motivation",
}

# Values, not keys. This is the half that would have caught the real leak.
BANNED_PATTERNS = [
    (re.compile(r"\[[#█]{1,}[-░\s]*\]"), "a clock bar, e.g. [##--------]"),
    (re.compile(r"\btruth\s*[:=]\s*[\"']?(true|false)\b", re.I), "a true/false visibility tag"),
    (re.compile(r"\bvisibility\s*[:=]\s*[\"']?(true|false)\b", re.I), "a true/false visibility tag"),
]

# Facts the player may see. Architecture S3: `true` and `false` are DM-side.
PLAYER_VISIBILITY = {"known", "suspected"}

# DM-side files. Distinctive strings are lifted out of these and hunted for in
# any rendered panel - which catches a leak even when the field name is gone.
DM_SIDE = ("fronts.md", "ideas.md", "secrets.md")

# Whole directories that are DM-side regardless of filename.
#
# ⛔ ADDED 2026-08-30. canon/antagonists/ holds grudges, appears_when
# conditions, escalation state and answered secrets forks - all of it
# DM-side - and NONE of it was being scanned, because DM_SIDE is a list
# of FILENAMES and these files are named after people. The directory did
# not exist when that list was written and nothing went back for it.
DM_SIDE_DIRS = ("canon/antagonists",)

MIN_PHRASE = 28   # shorter strings collide with ordinary prose


class Leak(Exception):
    def __init__(self, what, why, where):
        self.what, self.why, self.where = what, why, where
        super().__init__(why)


# ---------------------------------------------------------------------------
# FILTER - strip banned fields before data reaches a panel
# ---------------------------------------------------------------------------

def filter_fact(entry):
    """Return a player-safe copy of a facts.jsonl entry, or None if it is
    wholly DM-side.

    A `believe` entry with truth:false is the sharpest case in the system. The
    player MUST see the belief - it is what their character thinks - and must
    NOT see that it is flagged wrong. pieces-table.md: "if the player can see
    which belief is flagged as wrong, the flag IS the answer."
    """
    vis = entry.get("visibility")
    if vis is not None and vis not in PLAYER_VISIBILITY:
        return None                      # `true` and `false` are DM-side entirely
    return {k: v for k, v in entry.items() if k not in BANNED_FIELDS}


def filter_facts(path):
    kept, dropped, stripped = [], 0, set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            e = json.loads(line)
            safe = filter_fact(e)
            if safe is None:
                dropped += 1
                continue
            stripped |= (set(e) & set(BANNED_FIELDS))
            kept.append(safe)
    return kept, dropped, stripped


# ---------------------------------------------------------------------------
# CHECK - scan a rendered panel for banned content
# ---------------------------------------------------------------------------

def _bare(s):
    """Strip markdown decoration so an exact substring match can succeed.

    Added 2026-08-30. 60 of 100 extracted phrases carried `**`, backticks or a
    leading emoji, and were then compared against rendered output by EXACT
    SUBSTRING. A phrase that can never match is not a check.
    """
    s = re.sub(r'[*`_~"]', "", s)
    s = re.sub(r"[⭐⚠⛔⬜✅️]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def dm_side_phrases(live_dir):
    """Distinctive strings from the DM-side files.

    Any of these appearing in a rendered panel is a leak by definition: the
    player has no route to that text.

    ------------------------------------------------------------------------
    ⛔ WHAT THIS HALF DOES *NOT* DO - measured 2026-08-30, playtest B

    The docstring here used to claim this was "what would have caught
    [##--------] on the Now panel." IT IS NOT. That bar is caught by the
    PATTERN half. Negative-testing with four injected leaks found this half
    caught none of the ones only it could catch.

    ⭐ AND THE REAL GAP IS STRUCTURAL, NOT A BUG:

        A DM DOES NOT LEAK BY COPY-PASTE. IT LEAKS BY RESTATING SOMETHING
        IN ITS OWN WORDS. THIS HALF HAS NO COVERAGE FOR THAT AT ALL.

    Exact substring matching against source phrases cannot see a paraphrase.
    Nothing here will ever catch one, and no amount of tuning changes that.
    It was called an "inherent limitation" on 2026-08-29 and that was too
    generous: two of the three failures below were plain defects.

    FIXED 2026-08-30:
      1. the line was split on the first ":" and only the REMAINDER kept, so
         "advances when the party asks anyone about the wand" was never a
         phrase in its own right - only the clock-bar prefix plus the tail.
         Both halves are now stored, and so is the whole line.
      2. decoration was left on. See _bare().
    """
    phrases, seen = [], set()

    def add(s, src):
        s = _bare(s)
        if len(s) >= MIN_PHRASE and (s, src) not in seen:
            seen.add((s, src))
            phrases.append((s, src))

    for root, _dirs, files in os.walk(live_dir):
        for name in files:
            here = os.path.join(root, name).replace("\\", "/")
            if name not in DM_SIDE and not any(d in here for d in DM_SIDE_DIRS):
                continue
            src = os.path.join(root, name)
            try:
                text = open(src, encoding="utf-8").read()
            except OSError:
                continue
            rel = os.path.relpath(src, live_dir)
            for raw in text.splitlines():
                line = raw.strip().lstrip("#>-*| ").strip()
                if line.startswith("<!--") or line.startswith("```"):
                    continue
                pieces = [line]                       # the WHOLE line
                if ":" in line:
                    pieces.append(line.split(":", 1)[1])   # value after `key:`
                for p in list(pieces):
                    # a clock line is `[----------]  <clause>`. The CLAUSE is the
                    # leakable part and it was only ever stored glued to the bar,
                    # so it could never match on its own. Found by re-testing
                    # R-7's own example after the first fix, 2026-08-30.
                    pieces.append(re.sub(r"^\s*\[[^\]]*\]\s*", "", p))
                    # these files are column-aligned; a 2+ space run is a field
                    # boundary, not a sentence.
                    pieces.extend(re.split(r"\s{2,}", p))
                    pieces.extend(re.split(r"(?<=[.;])\s+", p))
                for p in pieces:
                    add(p, rel)
    return phrases


def check_render(rendered_path, live_dir):
    text = open(rendered_path, encoding="utf-8").read()
    leaks = []

    for pattern, why in BANNED_PATTERNS:
        for m in pattern.finditer(text):
            leaks.append(Leak(m.group(0)[:60], why, "global list"))

    for field in BANNED_FIELDS:
        for m in re.finditer(r'(?<![\w-])%s\s*[:=]' % re.escape(field), text):
            leaks.append(Leak(m.group(0), BANNED_FIELDS[field], "global list"))

    if live_dir and os.path.isdir(live_dir):
        # ⛔ NORMALISE BOTH SIDES. Fixed 2026-08-30.
        #
        # `_bare()` was applied to the SOURCE phrases and not to the rendered
        # text, so every cleanup made a match LESS likely rather than more: a
        # source phrase stripped of `**` and quotes could no longer be found
        # verbatim in a panel that still had them.
        #
        # ⭐ A normalisation applied to one side of a comparison is not a
        # normalisation, it is a corruption. That is the whole R-7 defect and
        # the reason the content half was measurably weaker than it read.
        hay = _bare(text)
        for phrase, src in dm_side_phrases(live_dir):
            if phrase in hay:
                leaks.append(Leak(phrase[:60] + ("..." if len(phrase) > 60 else ""),
                                  "verbatim DM-side text - the player has no route to this",
                                  src))
    return leaks



# ---------------------------------------------------------------------------
# LOOK - resolve a name to one of the 617 articles.
#
# Piece 5. It is a lookup, not a build: library/srd-5.2/articles/index.json
# already carries name + slug + metadata for every article, and the path is
# derivable as <type-dir>/<slug>.md. Verified 2026-08-28: 616 indexed entries,
# zero unresolvable.
#
# This is what turns a spell on a character sheet into a link. The Library
# panel and the Sheet panel both need it, and neither is secret - rules are the
# one part of the DM layer a player is allowed to browse freely.
# ---------------------------------------------------------------------------

ARTICLES = os.path.join("library", "srd-5.2", "articles")
TYPE_DIR = {
    "spell": "spells", "magic-item": "magic-items", "rule": "rules",
    "feat": "feats", "background": "backgrounds", "class": "classes",
    "subclass": "subclasses",
}


def _index(root=""):
    path = os.path.join(root, ARTICLES, "index.json") if root else os.path.join(ARTICLES, "index.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def look(name, only_type=None, root=""):
    """Resolve a name to (type, slug, path). Exact match first, then contains.

    Returns a list - a bare name can be ambiguous across types, and guessing
    which one the player meant is not this function's job.
    """
    idx = _index(root)
    needle = name.strip().lower()
    exact, partial = [], []
    for atype, items in idx.items():
        if only_type and atype != only_type:
            continue
        for it in items:
            nm = it.get("name", "")
            rel = os.path.join(ARTICLES, TYPE_DIR[atype], it["slug"] + ".md")
            hit = (atype, it["slug"], rel.replace("\\", "/"), nm)
            if nm.lower() == needle:
                exact.append(hit)
            elif needle in nm.lower():
                partial.append(hit)
    return exact or partial


# ---------------------------------------------------------------------------

def main(argv):
    # Session content is UTF-8 and Windows consoles default to cp1252, which
    # dies on the first star in a fact note. The gate must never fail for a
    # reason unrelated to leaks.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

    if len(argv) < 2:
        print(__doc__.strip().split("\n\n")[1], file=sys.stderr)
        return 2
    cmd = argv[1]

    if cmd == "banned":
        print("THE GLOBAL LIST - no panel shows these, ever\n")
        for f, why in sorted(BANNED_FIELDS.items()):
            print(f"  {f:14} {why}")
        print("\nAnd as values, not just field names:\n")
        for _p, why in BANNED_PATTERNS:
            print(f"  {why}")
        print(f"\nPlus any verbatim line from: {', '.join(DM_SIDE)}")
        print(f"\nSpec: {SPEC}")
        return 0

    if cmd == "look":
        if len(argv) < 3:
            print("usage: table.py look <name> [type]", file=sys.stderr)
            return 2
        only = argv[3] if len(argv) > 3 else None
        hits = look(argv[2], only)
        if not hits:
            print(f"no article matches {argv[2]!r}"
                  + (f" of type {only!r}" if only else ""), file=sys.stderr)
            return 1
        for atype, slug, path, nm in hits:
            print(f"{nm}	{atype}	{path}")
        return 0

    if cmd == "filter":
        if len(argv) < 3:
            print("usage: table.py filter <facts.jsonl>", file=sys.stderr)
            return 2
        kept, dropped, stripped = filter_facts(argv[2])
        for e in kept:
            print(json.dumps(e, ensure_ascii=False))
        print(f"\n{len(kept)} facts visible to the player, {dropped} withheld as DM-side.",
              file=sys.stderr)
        if stripped:
            print(f"Fields stripped: {', '.join(sorted(stripped))}", file=sys.stderr)
        return 0

    if cmd == "check":
        if len(argv) < 3:
            print("usage: table.py check <rendered> [live-dir]", file=sys.stderr)
            return 2
        live = argv[3] if len(argv) > 3 else ""
        leaks = check_render(argv[2], live)
        if leaks:
            for lk in leaks:
                print(f"LEAK  {lk.what}\n      {lk.why}\n      source: {lk.where}",
                      file=sys.stderr)
            print(f"\n{len(leaks)} leak(s). This panel must not render.  [{SPEC}]",
                  file=sys.stderr)
            return 1
        print("No leaks. Panel is clean.")
        return 0

    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
