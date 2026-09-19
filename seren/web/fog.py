"""The fog gate, moved to where the leaks actually happen.

SEREN ported this idea first as `scripts/table.py`: strip DM-side fields before they reach
a panel (FILTER), then scan the rendered page for banned content and delete the file if
anything got through (CHECK). Both halves are here.

What is new is the surface. SEREN's own ledger, entry e013, written by the DM after being
caught by the player:

    "THE STRUCTURAL POINT ... scripts/table.py gates the rendered PANEL and nothing
     whatsoever gates the DM CHAT, and chat is where every word of this went."

On the web the DM's words pass through this server before anyone reads them, so `check()`
runs on the narration itself. A leak is held, not shown.

Honest about the limit, which SEREN states plainly and which porting does not fix: exact
matching cannot see a paraphrase. This catches copied phrases, banned vocabulary and
clock bars. A DM restating a secret in its own words gets through, and always will.
"""
from __future__ import annotations

import re

# Fields that are the DM's side of the screen. Lifted from scripts/table.py.
BANNED_FIELDS = {
    "clock": "front clocks — the DM's model of what the world does unobserved",
    "clocks": "front clocks",
    "front": "fronts are agendas the party has not seen",
    "fronts": "fronts are agendas the party has not seen",
    "if_full": "a front's completion state",
    "beat": "the beat graph — showing a beat before it happens is showing the plot",
    "beats": "the beat graph",
    "wants": "the DM's notebook",
    "secret": "the DM's notebook",
    "secrets": "the DM's notebook",
    "fork": "the DM's notebook",
    "forks": "the DM's notebook",
    "truth": "true/false visibility — the player vocabulary is known/suspected only",
    "grudge_seed": "an antagonist's un-instanced motivation",
    "appears_when": "an antagonist's trigger",
    "escalation": "an antagonist's escalation state",
}

# Values, not keys — the half that catches a leak nobody labelled.
BANNED_PATTERNS = [
    (re.compile(r"\[[#█]{1,}[-░\s]*\]"), "a clock bar, e.g. [##--------]"),
    (re.compile(r"\btruth\s*[:=]\s*[\"']?(true|false)\b", re.I), "a true/false visibility tag"),
    (re.compile(r"\bvisibility\s*[:=]\s*[\"']?(true|false)\b", re.I), "a true/false visibility tag"),
]

# The player's half of the four values. `true` and `false` are DM-side entirely.
PLAYER_VISIBILITY = {"known", "suspected"}

# The DM speaks in the fiction. Nobody in the world has heard of a DC (DM.md §1.1).
TABLE_TALK = [
    (re.compile(r"\bDC\s*\d+", re.I), "a DC, said out loud"),
    (re.compile(r"\bd20\b|\bd\s?20\b", re.I), "the die, named"),
    (re.compile(r"\bsaving throw\b", re.I), "a saving throw, named"),
    (re.compile(r"\bmodifier\b", re.I), "a modifier, named"),
    (re.compile(r"\badvantage\b|\bdisadvantage\b", re.I), "advantage, named"),
]

MIN_PHRASE = 28  # shorter strings collide with ordinary prose


def _bare(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower())


def filter_fact(entry: dict) -> dict | None:
    """One fact, as the player may see it. None means they may not see it at all."""
    vis = entry.get("visibility")
    if vis is not None and vis not in PLAYER_VISIBILITY:
        return None
    return {k: v for k, v in entry.items() if k not in BANNED_FIELDS}


def player_facts(entries: list[dict]) -> list[dict]:
    out = []
    for e in entries:
        # A flip's destination is its current visibility; establish carries its own.
        vis = e.get("to") or e.get("visibility")
        if vis not in PLAYER_VISIBILITY:
            continue
        kept = filter_fact({**e, "visibility": vis})
        if kept:
            out.append(kept)
    return out


def check(text: str, dm_side: str = "") -> list[str]:
    """Scan words bound for the player. Returns the reasons it must not be shown.

    `dm_side` is the concatenated DM-only material for this campaign — fronts, secrets,
    antagonist files — so a phrase lifted out of it verbatim is caught.
    """
    leaks: list[str] = []
    for pattern, why in BANNED_PATTERNS + TABLE_TALK:
        if pattern.search(text):
            leaks.append(why)
    for field, why in BANNED_FIELDS.items():
        if re.search(rf"\b{re.escape(field)}\s*[:=]", text, re.I):
            leaks.append(f"the field `{field}`: {why}")

    if dm_side:
        bare_text = _bare(text)
        for line in dm_side.splitlines():
            stripped = line.strip()
            # Comments, headings and table rules are not secrets; matching them is noise.
            if stripped.startswith(("<!--", "#", "|", "---", "```")):
                continue
            phrase = _bare(line).strip()
            if len(phrase) >= MIN_PHRASE and phrase in bare_text:
                leaks.append(f'a phrase lifted from the DM side: "{line.strip()[:60]}…"')
                break
    return leaks


def held_message(leaks: list[str]) -> str:
    """What the player sees instead. Never the leak, and never a silent swallow."""
    return (
        "The table goes quiet for a second.\n\n"
        "(The DM said something it should not have, and this server held it: "
        + "; ".join(leaks[:2])
        + ". Say what you were doing again.)"
    )
