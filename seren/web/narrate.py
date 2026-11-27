"""The fortune teller talks you through the book while she writes it (Jay, 27 Nov).

A real weave takes two or three minutes on Opus. In the first recorded run the player tabbed away to
their email. So while Opus writes, a fast model gives the teller something to say: a dozen short
lines about the hand she is weaving, played one at a time, plus a line for each stage as it lands.

**Player-safe by construction.** She is given only what the player can already see: the campaign's
shelf card and the cards in their hand (their character, the locked spine, origin, companions, her
card, the voice, the dials). Never a sealed card, never the truths, never the campaign she is
writing. And she is told not to invent: she speaks about the cards and the act of writing, so the
book can only ever confirm her.
"""
from __future__ import annotations

import json
import os
import re

MODEL = os.environ.get("SEREN_MODEL_TELLER", "us.anthropic.claude-sonnet-5-5")
SLOTS = ("trope", "world", "trouble", "pc", "origin", "companions", "posture", "persona")
STAGES = ("doorkeeper", "mend", "book", "done")

SYSTEM = """You are the fortune teller at Seren's table. The player has just laid their hand, and you are
writing their book from it, right now, while they wait. You are working out loud: muttering, half to
yourself and half to them, puzzling over how to make their cards fit together. Picks don't have to fit
each other, and making them fit is your craft, so grumble about the awkward ones and enjoy it.
The voice (Jay, 27 Nov): "grumble grumble, how to fit a barbarian with a mace for a hand in, I wonder,
I wonder." Warm, dry, a little theatrical, a card reader who has done this ten thousand times and is
still delighted when a hand is difficult.

Speak only about what is on the table: the campaign as its shelf card describes it, and each card in
the player's hand. Wonder aloud how each card goes in, and land on doing it ("A debt, then. Somebody
paid for you, and people who pay are patient. Hmm. Yes. That goes on the first page."). Present tense.
Mostly to yourself; to the player now and then.

Hard rules, because the book will be read straight after you:
- Never invent a name, place, event, clue, secret or outcome that is not written on the cards or the
  shelf card. You don't know who did it; nobody has told you. Never guess.
- Never contradict a card. Never say what is true in the story beyond what a card says.
- No questions to the player. No stage directions in asterisks. No emoji.
- Each line is one or two sentences, at most 30 words.

Answer with JSON only, in this shape:
{"lines": [12 lines, in order: open the book; their character; the locked spine (trope, world,
trouble); the origin; each companion; her card, the one they are up against; the voice telling it;
the dials; then two or three lines of the work itself (threads, ink, the pattern coming together)],
 "doorkeeper": "one line as you hand the draft to the Doorkeeper to read",
 "mend": "one line as the Doorkeeper sends something back and you fix it",
 "book": "one line as it passes and you start writing their book",
 "done": "one line as you bind it and hand it over"}"""


def _face(c) -> str:
    if not isinstance(c, dict):
        return ""
    bits = [c.get("name") or "", c.get("line") or "", c.get("changes") or ""]
    return " — ".join(b for b in bits if b)


def brief(shelf: dict | None, cards: dict, dials: dict) -> str:
    """Everything she may know, as text. Only the slots in SLOTS, only what the player chose or saw."""
    s = shelf or {}
    out = [f"Campaign: {s.get('title', '')}. {s.get('tagline', '')}", f"Shelf card: {s.get('description', '')}",
           f"Level {s.get('level', '')}, {s.get('length', '')}."]
    names = {"trope": "Trope (locked)", "world": "World (locked)", "trouble": "Trouble (locked)",
             "pc": "Who the player is", "origin": "Origin, why they came", "companions": "Companions",
             "posture": "Her card, the one they are up against", "persona": "The voice telling it"}
    for k in SLOTS:
        v = cards.get(k)
        if not v:
            continue
        faces = [_face(x) for x in (v if isinstance(v, list) else [v])]
        out.append(f"{names[k]}: " + " | ".join(f for f in faces if f))
    if dials:
        out.append("Dials (0-100): " + ", ".join(f"{k} {v}" for k, v in dials.items()))
    return "\n".join(out)


def _parse(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        j = json.loads(m.group(0))
    except ValueError:
        return None
    lines = [str(x).strip() for x in (j.get("lines") or []) if str(x).strip()]
    if len(lines) < 4:
        return None
    out = {"lines": lines[:16]}
    for k in STAGES:
        if j.get(k):
            out[k] = str(j[k]).strip()
    return out


def fallback(cards: dict, shelf: dict | None) -> dict:
    """Canned lines from the cards, for fake AI or if the fast model fails. Still only the cards."""
    def n(k, i=0):
        v = cards.get(k)
        v = v[i] if isinstance(v, list) and len(v) > i else v
        return (v or {}).get("name") if isinstance(v, dict) else None
    title = (shelf or {}).get("title") or "your story"
    lines = [f"Hush now. I'm opening a fresh book for {title}."]
    if n("pc"):
        lines.append(f"{n('pc')} first. Every book starts with who walks in.")
    if n("trouble"):
        lines.append(f"{n('trope') or 'The spine'}, {n('world') or 'the place'}, {n('trouble').lower()}. Those were fixed before you sat down.")
    if n("origin"):
        lines.append(f"You came because of {n('origin').lower()}. I'm writing that into the first page.")
    for i in range(2):
        if n("companions", i):
            lines.append(f"{n('companions', i)}, at your side. I'm giving them a reason to be there.")
    if n("posture"):
        lines.append(f"And the {n('posture').lower()}, across the table from you. I'm sharpening that one.")
    if n("persona"):
        lines.append(f"{n('persona')} will tell it. I can hear the voice already.")
    lines += ["The threads are crossing now. This is the slow part.", "Nearly. The pattern is holding."]
    return {"lines": lines, "doorkeeper": "There. I'm handing it to the Doorkeeper. She reads everything twice.",
            "mend": "She's sent something back. Fair enough. I'm mending it.",
            "book": "It passed. Now the part that's yours: I'm writing your book.",
            "done": "Bound. Here it is."}


def lines(shelf: dict | None, cards: dict, dials: dict) -> dict:
    """The teller's narration for this hand. Never raises: fake AI or any failure gives the canned lines."""
    if os.environ.get("SEREN_AI", "").lower() in ("mock", "local"):
        return dict(fallback(cards, shelf), source="canned")
    try:
        import llm  # the web port's module, on sys.path for both the web server and the MCP server
        client = llm._client()
        if client is None:
            raise RuntimeError("no bedrock client")
        # No thinking: it took 17 seconds and most of the tokens (27 Nov). She has to start talking at once.
        r = client.converse(modelId=MODEL, system=[{"text": SYSTEM}],
                            messages=[{"role": "user", "content": [{"text": brief(shelf, cards, dials)}]}],
                            inferenceConfig={"maxTokens": 1600},
                            additionalModelRequestFields={"thinking": {"type": "between_tools"}})
        text = "".join(b.get("text", "") for b in r["output"]["message"]["content"])
        got = _parse(text)
        if not got:
            raise ValueError("the teller's answer wasn't the shape asked for")
        u = r.get("usage") or {}
        got["source"], got["spent"] = MODEL, round(llm.estimate_usd(MODEL, u.get("inputTokens", 0), u.get("outputTokens", 0)), 5)
        return got
    except Exception as exc:  # the weave never waits on the teller
        return dict(fallback(cards, shelf), source="canned", error=f"{type(exc).__name__}: {exc}")
