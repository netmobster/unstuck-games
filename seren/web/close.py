"""Session close: the ceremony, with the arithmetic done by the server.

DM.md §6 close, in order: validate and reconcile, write the session log, reconcile the
scene against it, promote facts into canon, promote the queue, award XP, leave the ledger
alone. Two of those are arithmetic and five are judgement, so they are split here:

    the server   counts the rolls, counts the facts, writes the reconciliation block,
                 promotes facts into canon with provenance, never edits the ledger
    the DM       writes what happened, in order, and the open loops

SEREN's close step 1 says: count the rolls you narrated against the entries in the ledger,
and if those two numbers disagree, say so in the log. On the web they cannot disagree — a
roll only exists because the server made it — so the block says that instead, and says how
many there were. A reconciliation that cannot fail is worth printing precisely because it
is the thing that used to.
"""
from __future__ import annotations

import datetime as _dt

import dice
import fog
import llm

LOG_PROMPT = """
You are closing the session. Write the session log, and nothing else.

Two headings, in this order:

## What happened, in order
Prose. What the party did and what it cost them, in the order it happened. Concrete, not a
summary of themes. Name people. Do not invent anything that is not in the record below.

## Open loops
A short list. One line each: what is unresolved, and why it matters. End on the one you
stopped at, because that is what the next session opens on.

Do not write a reconciliation block, do not award XP, and do not describe dice by their
numbers — the arithmetic is printed above your section by the server.
""".strip()


CHRONICLE_PROMPT = """
Write the chronicle of this session: what happened, as a story.

**This is not the log.** The log is written separately, in order, for the record. This is
the thing the player reads afterwards and recognises as their evening.

Rules, and they are the whole brief:

1. **Write in their register.** Their own words are below, verbatim. If they were arch,
   be arch. If they were plain, be plain. If they called a thing a horn-less goat, it is a
   horn-less goat and it is never "a hornless caprine". You are the world talking back to
   THAT person, not to a player in general.
2. **People, not events.** What changed in somebody. Who decided something about them.
   Who will remember this. A chronicle that lists what occurred has failed.
3. **No dice, no numbers, no mechanics, not one.** Not a DC, not a check, not a total, not
   the word roll. The arithmetic is printed elsewhere and it is not the story.
4. **Invent nothing.** Everything you write happened, and the record below is all of it.
   You may say what a thing meant; you may not say a thing that is not there.
5. **Three or four short paragraphs.** End on what is still open — not a cliffhanger, not
   a question to the player, just the thing that did not finish.

No heading, no preamble, no sign-off. Begin with the story.
""".strip()


def reconcile(campaign) -> dict:
    """The numbers, before anyone writes a sentence about them."""
    ledger = _this_session(campaign)
    rolled = [e for e in ledger if "roll" in e]
    facts = [f for f in dice.read(campaign.facts_file) if f.get("s") == campaign.session]
    return {
        "entries": len(ledger),
        "rolls": len(rolled),
        "passes": sum(1 for e in rolled if e.get("pass") is True or e.get("hit") is True),
        "fails": sum(1 for e in rolled if e.get("pass") is False or e.get("hit") is False),
        "facts_this_session": len(facts),
        "established": sum(1 for f in facts if f.get("op") == "establish"),
        "flips": sum(1 for f in facts if f.get("op") == "flip"),
        "beliefs": sum(1 for f in facts if f.get("op") == "believe"),
        "leaks_held": sum(1 for e in ledger if e.get("t") == "leak"),
    }


def _block(campaign, counts: dict) -> str:
    """The part no model touches."""
    lines = [
        "## The reconciliation, first",
        "",
        f"- **{counts['rolls']} rolls**, every one made by the server and written before it was narrated.",
        f"  {counts['passes']} held, {counts['fails']} did not.",
        f"- **{counts['entries']} ledger entries** in total. The ledger was not edited, summarised or discarded.",
        f"- **{counts['facts_this_session']} facts** this session: "
        f"{counts['established']} established, {counts['flips']} flipped, {counts['beliefs']} beliefs recorded.",
    ]
    if counts["leaks_held"]:
        lines.append(f"- **{counts['leaks_held']} leaks held** by the fog gate before they reached the player.")
    if not counts["beliefs"]:
        lines.append("- ⚠️ **No `believe` entries.** state-formats §5.3 predicted this is the op that gets "
                     "skipped, and it is the one that records the party being wrong.")
    lines.append("")
    lines.append("*A roll that was spoken and not written is the failure this system exists to prevent. "
                 "On the web it cannot happen: the number does not exist until the ledger line does.*")
    return "\n".join(lines)


def _evidence(campaign) -> str:
    """What the DM is allowed to write the log from: the record, and only the record."""
    # A held leak is the server's audit note about the DM, not something that happened at
    # the table. Session 5's log called it a fog gate in front of the player; it is not the
    # DM's to narrate, so it does not go in the evidence.
    ledger = [e for e in _this_session(campaign) if e.get("t") not in ("leak", "session_close")][-40:]
    facts = [f for f in dice.read(campaign.facts_file) if f.get("s") == campaign.session]
    rows = []
    for e in ledger:
        bits = [e.get("id", ""), e.get("t", "")]
        if e.get("who"):
            bits.append(str(e["who"]))
        if "roll" in e:
            bits.append(f"{e['roll']} → {e.get('total')} vs {e.get('dc') or e.get('vs')} "
                        f"{'held' if e.get('pass') or e.get('hit') else 'failed'}")
        if e.get("note"):
            bits.append(str(e["note"])[:400])
        rows.append(" · ".join(b for b in bits if b))
    facts_rows = [f"{f.get('op')}: {f.get('fact')} ({f.get('to') or f.get('visibility') or f.get('truth')})"
                  for f in facts]
    return ("# The ledger, this session\n" + "\n".join(rows) +
            "\n\n# The facts, this session\n" + "\n".join(facts_rows))


def promote(campaign, counts: dict) -> list[str]:
    """Facts into canon, with the provenance line gate.py canon requires.

    Visibility travels with the fact (session-ceremonies §3): a `true` fact the party never
    learned is promoted as DM-side and stays that way.
    """
    facts = [f for f in dice.read(campaign.facts_file) if f.get("s") == campaign.session]
    if not facts:
        return []
    today = _dt.date.today().isoformat()
    out = campaign.root / "canon" / f"session-{campaign.session:02d}-facts.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Facts established in session {campaign.session}",
        "",
        f"**Source:** session {campaign.session}, {today}, the web table. "
        f"Promoted at close from `state/facts.jsonl` — {len(facts)} entries.",
        "",
        "| visibility | fact | how |",
        "|---|---|---|",
    ]
    for f in facts:
        vis = f.get("to") or f.get("visibility") or ("believed" if f.get("op") == "believe" else "?")
        how = (f.get("how") or f.get("note") or f.get("src") or "").replace("|", "/")[:160]
        lines.append(f"| `{vis}` | {str(f.get('fact', '')).replace('|', '/')} | {how} |")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return [str(out.relative_to(campaign.root))]


def _voice(stream: list) -> str:
    """The player's own lines, verbatim, for the chronicle to write in their register.

    Lifted from Elsewhere, which keeps the player's phrasing on every ledger row for this
    exact purpose: *"'hopefully not dying too much' is a voice, and the story should sound
    like the world talking back to THAT person. Never paraphrased, never cleaned up."*

    ⚠️ Read from the session stream rather than the ledger. The ledger records events with
    consequences and free text does not belong in it — it would land in `_evidence()` and
    in the material the fog gate compares against, which is how a player's own words became
    a "leak" on 2026-09-20.
    """
    said = [str(b.get("text") or "").strip() for b in (stream or [])
            if b.get("kind") == "said"]
    said = [t for t in said if t]
    if not said:
        return ""
    nl = chr(10)
    head = ["# What the player said, this session, in their own words",
            "# Their register is the chronicle's register.", ""]
    return nl.join(head + ["- " + t[:300] for t in said[-40:]])


def chronicle(campaign, stream: list) -> str:
    """One call, once a session. The one place the gate is not fighting her."""
    if not llm.ready():
        return ""
    evidence = _evidence(campaign)
    voice = _voice(stream)
    gap = chr(10) * 2
    try:
        reply = llm.converse(
            system=CHRONICLE_PROMPT,
            messages=[{"role": "user", "content": [{"text": evidence + (gap + voice if voice else "")}]}],
            tier=campaign.tier, spent=campaign.spent, temperature=0.85,
        )
        campaign.spent = reply["spent"]
        text = llm.text_of(reply["content"]).strip()
    except Exception as exc:
        return f"*(The chronicle could not be written: {type(exc).__name__}.)*"

    # It is player-facing, so it goes through the same gate as everything else she says.
    leaks = fog.check(text, campaign.dm_side())
    if leaks:
        return ("*(The chronicle was held by the fog gate: " + "; ".join(leaks[:2])
                + ". Nothing else about the session is affected.)*")
    return text


def close(campaign, history: list[dict], stream: list | None = None) -> dict:
    """Run the close. Returns the log, the counts, and what was written where."""
    counts = reconcile(campaign)
    written = []

    narrative = ""
    if llm.ready():
        try:
            reply = llm.converse(
                system=LOG_PROMPT,
                messages=[{"role": "user", "content": [{"text": _evidence(campaign)}]}],
                tier=campaign.tier, spent=campaign.spent, temperature=0.4,
            )
            campaign.spent = reply["spent"]
            written_log = llm.text_of(reply["content"])
            leaks = fog.check(written_log, campaign.dm_side())
            if leaks:
                # The log is a player-visible surface too, so it goes through the same gate.
                held = "## What happened, in order" + chr(10) * 2
                narrative = (held + "*(The log was held by the fog gate: "
                             + "; ".join(leaks[:2]) + ". The record below is unaffected.)*")
            else:
                narrative = written_log
        except Exception as exc:
            narrative = f"*(The log could not be written: {type(exc).__name__}.)*"

    body = "\n\n".join(filter(None, [
        f"# Session {campaign.session}",
        _block(campaign, counts),
        narrative or "## What happened, in order\n\n*(No narrative written.)*",
    ]))

    folder = campaign.root / "sessions"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{campaign.session}.md"
    path.write_text(body + "\n", encoding="utf-8")
    written.append(str(path.relative_to(campaign.root)))

    # The chronicle is a separate artifact for a separate reader: the log is the record and
    # this is the evening. Written second so a failure here cannot cost the log.
    story = chronicle(campaign, stream or [])
    if story:
        cpath = folder / f"{campaign.session}-chronicle.md"
        head = f"# Session {campaign.session} — the chronicle"
        cpath.write_text(chr(10).join([head, "", story, ""]), encoding="utf-8")
        written.append(str(cpath.relative_to(campaign.root)))

    written += promote(campaign, counts)

    dice.note(campaign.ledger, "session_close",
              f"Session {campaign.session} closed: {counts['rolls']} rolls, "
              f"{counts['facts_this_session']} facts, promoted to canon.")
    return {"counts": counts, "log": body, "chronicle": story, "written": written}


def _this_session(campaign) -> list[dict]:
    """The ledger lines written since this session opened.

    Lines from before `s` was recorded have no session on them; they belong to a session
    that has already been closed, so they are not this one's to count or to narrate.
    """
    return [e for e in dice.read(campaign.ledger) if e.get("s") == campaign.session]
