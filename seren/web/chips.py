"""The three suggestions above the composer, written by a small model.

**It reads only what the player has already been shown.** Not the fronts, not the
antagonist file, not a fact tagged `true` — the same stream that is on their screen. That
is not a courtesy, it is the design: a suggester with DM-side sight would leak the campaign
one button at a time, and no fog gate downstream would catch it, because a chip is not
narration.

Nova Lite, a few hundredths of a cent a turn, and it fails quietly — if it errs or takes
too long, the table falls back to the plain three it has always had.
"""
from __future__ import annotations

import json
import re

import llm

SYSTEM = """You write three short things a player could try next at a tabletop game.

Rules:
- THREE options, each at most five words, in the player's own voice as an action.
  "Ask her who paid him" · "Look behind the counter" · "Leave before he turns round".
- They must be possible from what you were shown. Do not invent a person, an object or a
  door that is not in the text.
- One of them should be something other than talking or fighting.
- Never mention dice, checks, rolls, numbers, DCs, or anything about how the game works.
- No questions to the player, no "you could". Just the action.

Return one json array of three strings and nothing else."""

STRIP = re.compile(r"^[\s\-–—*\d.)\"']+|[\s\"']+$")


def suggest(seen: str, tier: str = "free") -> list[str]:
    """Three actions, from the text the player can see. Empty list means fall back."""
    seen = (seen or "").strip()
    if len(seen) < 40:
        return []
    try:
        reply = llm.converse(system=SYSTEM,
                             messages=[{"role": "user", "content": [{"text": seen[-1800:]}]}],
                             tools=None, tier=tier, spent=0.0, temperature=0.7)
        text = llm.text_of(reply["content"])
        # A small model answers in whatever shape it fancies — one array, three arrays, a
        # bulleted list. Take the quoted strings and stop pretending it is an API.
        items = re.findall(r'"([^"]{3,60})"', text)
        if not items:
            items = [ln for ln in (l.strip(" -*	") for l in text.splitlines()) if 2 < len(ln) <= 60]
        out = []
        for item in items:
            line = STRIP.sub("", str(item)).rstrip(",.")
            if 2 < len(line) <= 44:
                out.append(line[0].upper() + line[1:])
        return out[:3]
    except Exception:
        return []    # a suggestion that fails is not worth a turn failing over
