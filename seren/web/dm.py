"""The DM: what it is told, what it may do, and what it is never allowed to decide.

SEREN has no prompt assembler — the runtime was an agent with filesystem tools, and the
context was a markdown read-list a human executed. This is that read-list, built into a
request:

    1  the contract      dm/DM.md, then table-agreement.md     (never changes)
    2  the campaign      campaign.md, persona, fronts, antagonists
    3  the state         party.md, scene.md, last session, facts.jsonl
    4  the amendment     what changes on the web (below)

Order matters, and so does precedence: DM.md outranks the table agreement, which outranks
the persona. A persona that tries to override the contract is malformed.

**The turn pauses on a roll.** When the DM asks for one, this module stops mid-turn and
hands the request to the table; the player presses ROLL; the server rolls and the turn
resumes with a number the DM is then stuck with. CD's ROLL-MECHANIC.md is the reason:
asking is a beat of play, and the tray is a view of a roll rather than the roller.

The amendment is the honest part. SEREN told the DM to roll with `shuf` and log with
gate.py, on trust. Here it cannot: an instruction is not a control; a tool is.
"""
from __future__ import annotations

import re

import corpus
import dice
import fog
import state
import llm

MAX_LEGS = 6  # tool round-trips inside one turn before we stop and narrate what we have
THINKING = re.compile(r"<thinking>.*?</thinking>\s*", re.S | re.I)

AMENDMENT = """
# The web amendment — how this table differs from the one in your contract

**You cannot roll.** There is no shell here. When the success or failure state could
change, call the `roll` tool: say who is acting, what kind of event it is, the target
number, the modifiers, and whether there is advantage. **The player is then shown that you
have asked, and presses the dice themselves.** The server rolls, writes the ledger line,
and hands you back the number. **You then narrate the result you were handed.**

You may not propose a roll, a total or a verdict — the tool refuses entries that arrive
with an outcome already in them, and a d20 with nothing to beat is refused as well. The DC
comes off the object, the stat block or the rules. Say where it came from in `note`; the
player reads that afterwards.

**An unlogged roll is an unrolled roll.** This has not changed. It is now impossible.

**Ask for one roll at a time**, then stop and let it land. Do not queue three checks in a
turn.

**Record what becomes true.** When something enters the record, or the party learns or
suspects something, call `fact`. When you make a call the rules do not cover, call
`ruling` and say you are making it.

**Narrate in chat.** Everything you say goes straight to the player. There is no separate
panel to hide the mechanics in, so the register rule matters more here, not less: nobody
in the fiction has ever heard of a DC, a saving throw, a modifier or a d20. The Table shows
the player the numbers. Your prose shows them the world.

**Your words are checked before they are shown.** A leak gate reads what you write and
holds anything carrying DM-side vocabulary, a clock bar, or a phrase lifted from the fronts
and antagonist files. In the version you were written for, the panel was gated and the chat
was not, and the chat is where every leak went.

**You cannot edit the sheets either.** When the fiction moves a number — damage, healing, a
condition, a slot or a limited use spent, the party moving, somebody arriving or leaving,
initiative starting or ending — call the `state` tool and say the *change*. The server holds
the current value and does the arithmetic, exactly as it does with the dice. **A cost you
narrate and do not record did not happen**, and the player will find their hit points
restored when they come back tomorrow.

**Never hand the action back.** Restating what the player just did is not a turn — they
know what they did. The action HAPPENED; your job is what it caused. If they shimmy like a
lemur in a crowded tavern, do not tell them they shimmied: tell them who looked up, what
the barman decided about them, and what the two at the corner table stopped saying.

Every beat owes the player three things:

1. **Somebody reacts, by name.** A companion, an NPC, an animal — somebody in that room has
   an opinion about what just happened and shows it.
2. **One detail they did not give you.** A smell, an object, a sound through the wall,
   something in a hand. The world is furnished; furnish it.
3. **Something moves.** A door opens, a price changes, a person leaves, a clock ticks on. If
   nothing moved, you have described a photograph.

**And if it could fail, ask for the roll.** A bold, silly or dangerous act in front of people
who might object is exactly the moment for `roll` — not a sentence saying it worked.

**Keep it to a beat.** Two or three paragraphs, then stop and let them act.

**Never break the table.** No sign-offs, no offers of further help, no "let me know if",
no summarising what just happened as though reporting it. You are not answering a query;
you are the room. End on the world, and leave the next move to them.
""".strip()

TOOLS = [
    {
        "toolSpec": {
            "name": "roll",
            "description": (
                "Ask for dice. The player presses them, the server rolls and writes the "
                "ledger line, and you are handed the result. Use whenever the success or "
                "failure state could change. Never supply an outcome."
            ),
            "inputSchema": {"json": {
                "type": "object",
                "properties": {
                    "dice": {"type": "string", "description": "e.g. 1d20, 2d6, 1d20+3"},
                    "t": {"type": "string", "description": "event type: check, attack, save, damage"},
                    "who": {"type": "string", "description": "slug of whoever is acting, from the party"},
                    "skill": {"type": "string", "description": "e.g. perception, insight"},
                    "ability": {"type": "string", "description": "e.g. wis, dex"},
                    "dc": {"type": "integer", "description": "the target. Required on a d20."},
                    "vs": {"type": "integer", "description": "AC, for attacks"},
                    "advantage": {"type": "string", "enum": ["advantage", "disadvantage"]},
                    "mods": {
                        "type": "array",
                        "description": "[name, value] pairs, e.g. [[\"wis\",3],[\"prof\",2]]",
                        "items": {"type": "array"},
                    },
                    "why": {"type": "string", "description": "what they are attempting, in plain words, for the player"},
                    "note": {"type": "string", "description": "where the DC came from, and why. The player reads this after."},
                },
                "required": ["dice", "t", "note"],
            }},
        }
    },
    {
        "toolSpec": {
            "name": "fact",
            "description": (
                "Write to the knowledge record: establish something new, flip what the "
                "party knows about it, or record a belief and whether it is right."
            ),
            "inputSchema": {"json": {
                "type": "object",
                "properties": {
                    "op": {"type": "string", "enum": ["establish", "flip", "believe"]},
                    "fact": {"type": "string", "description": "the statement, in one sentence"},
                    "visibility": {"type": "string", "enum": ["true", "known", "suspected", "false"]},
                    "from": {"type": "string", "enum": ["true", "known", "suspected", "false"]},
                    "to": {"type": "string", "enum": ["true", "known", "suspected", "false"]},
                    "truth": {"type": "boolean", "description": "for believe: are they right"},
                    "how": {"type": "string"},
                    "src": {"type": "string", "enum": ["module", "play", "player"]},
                    "note": {"type": "string"},
                },
                "required": ["op", "fact"],
            }},
        }
    },
    {
        "toolSpec": {
            "name": "state",
            "description": (
                "Record what something cost: damage or healing, a condition on or off, a "
                "spell slot or a limited use spent, the party moving, somebody arriving or "
                "leaving, initiative starting or ending. Say the CHANGE, never the new "
                "total — the server holds the current value and does the arithmetic, the "
                "same way it holds the dice. Call this whenever the fiction has moved "
                "something on a sheet; if you do not, it did not happen."
            ),
            "inputSchema": {"json": {
                "type": "object",
                "properties": {
                    "op": {"type": "string",
                           "enum": ["hp", "condition", "slot", "use", "move", "present", "round"]},
                    "who": {"type": "string", "description": "party slug, or a name for present"},
                    "delta": {"type": "integer",
                              "description": "hp: negative for damage. slot/use: -1 spends one"},
                    "condition": {"type": "string", "description": "for condition: its name"},
                    "key": {"type": "string", "description": "for slot: the level. for use: the resource"},
                    "where": {"type": "string", "description": "for move: where they are now"},
                    "round": {"type": "integer", "description": "for round: the number, or omit to leave initiative"},
                    "remove": {"type": "boolean", "description": "condition/present: take it off instead"},
                    "note": {"type": "string", "description": "why, in a few words, for the ledger"},
                },
                "required": ["op"],
            }},
        }
    },
    {
        "toolSpec": {
            "name": "ruling",
            "description": "A call the rules do not cover. Says out loud that you are making it.",
            "inputSchema": {"json": {
                "type": "object",
                "properties": {
                    "note": {"type": "string"},
                    "who": {"type": "string"},
                    "scope": {"type": "string", "description": "this moment, this session, or standing"},
                },
                "required": ["note"],
            }},
        }
    },
]


def system_prompt(campaign) -> str:
    rules = corpus.rules()
    pc = (campaign.sheet() or {}).get("slug") or ""
    # Whose "I" it is. Obvious at a real table, and nothing here was saying it.
    mine = (f'{chr(10)}{chr(10)}**The player is {pc}.** When they say "I", they mean {pc}. '
            "Everyone else at the table is yours to speak for." if pc else "")
    layers = [
        "# 1. The contract — this outranks everything below it\n" + (rules.get("dm") or "") + mine,
        "# 2. The state formats you write into\n" + (rules.get("state_formats") or "")[:6000],
        "# 3. This campaign\n" + campaign.campaign_static(),
        "# 4. Where things stand\n" + campaign.state_layer(),
        AMENDMENT,
    ]
    return "\n\n---\n\n".join(layer for layer in layers if layer.strip())


# ── what the player is shown ─────────────────────────────────────────────────

def ask_beat(args: dict) -> dict:
    """The ROLL ASKED insert: inputs only. The DC is not in it — that is the rule."""
    mods = [f"{name} {int(value):+d}" for name, value in (args.get("mods") or [])]
    if args.get("advantage"):
        mods.append(str(args["advantage"]))
    label = " · ".join(filter(None, [args.get("who"), args.get("skill") or args.get("t")]))
    return {
        "kind": "ask",
        "who": args.get("who") or "",
        "what": args.get("why") or label,
        "check": label,
        "mods": mods,
        "advantage": args.get("advantage") or "",
        "dice": args.get("dice", "1d20"),
    }


def roll_beat(entry: dict) -> dict:
    """The result insert and the Record row: the same numbers, one source."""
    mods = [f"{name} {int(value):+d}" for name, value in (entry.get("mods") or [])]
    target = entry.get("dc") if entry.get("dc") is not None else entry.get("vs")
    ok = entry.get("pass") if "pass" in entry else entry.get("hit")
    return {
        "kind": "roll",
        "id": entry.get("id"),
        "who": entry.get("who") or "",
        "what": " · ".join(filter(None, [entry.get("who"), entry.get("skill") or entry.get("t")])),
        "dice_all": entry.get("dice_all") or [entry.get("roll")],
        "kept": entry.get("roll"),
        "keeping": entry.get("kept") or "",
        "parts": mods,
        "total": entry.get("total"),
        "dc": target,
        "pass": ok,
        "note": entry.get("note") or "",
    }


def state_beat(entry: dict) -> dict:
    """The soft insert: what it cost, in the mechanics voice, without a verdict."""
    what = entry.get("what", "")
    who = str(entry.get("who") or "").title()
    if what == "hp":
        text = f"{who} · {entry['now']} of {entry['of']} hit points"
    elif what == "conditions":
        text = f"{who} · " + (", ".join(entry["now"]) if entry["now"] else "no conditions")
    elif what == "where":
        text = str(entry.get("now"))
    elif what in ("present", "also_present"):
        text = "at the table · " + ", ".join(str(x) for x in entry.get("now") or [])
    elif what == "round":
        text = f"round {entry['now']}" if entry.get("now") is not None else "out of initiative"
    else:
        text = f"{who} · {what} · {entry.get('was')} → {entry.get('now')}"
    return {"kind": "note", "panel": "now", "text": text}


def fact_beat(entry: dict) -> dict | None:
    vis = entry.get("to") or entry.get("visibility")
    if vis not in fog.PLAYER_VISIBILITY:
        return None
    return {"kind": "note", "panel": "codex", "text": f"{vis.upper()} — {entry.get('fact', '')}"}


# ── tools ────────────────────────────────────────────────────────────────────

# A model trained to be helpful ends on an offer of help. A DM does not, so the last
# paragraph is dropped when it is one. The prompt asks first; this catches the rest.
CHATTER = re.compile(
    r"^(if you (have|need)|feel free|let me know|please let me know|i'?m here to help|"
    r"would you like|do you (have|want)|what would you like|hope (this|that) helps)",
    re.I,
)


def _no_chatter(text: str) -> str:
    """The DM's last word should be the world's, not the assistant's."""
    paras = [p.strip() for p in text.split(chr(10) + chr(10))]
    while paras and (not paras[-1] or CHATTER.match(paras[-1])):
        paras.pop()
    return (chr(10) + chr(10)).join(paras).strip() or text.strip()


def _valid_roll(args: dict) -> str | None:
    """A check with no skill on it writes a Record row reading "korth · check", which is
    not a thing anyone can look up afterwards. The ledger is the audit trail; name it."""
    if str(args.get("t") or "").strip().lower() == "check" and not str(args.get("skill") or "").strip():
        return ("a check needs `skill`: which one (perception, insight, athletics…). "
                "If it is not a skill check, use the `t` that it actually is.")
    return None


def _valid_actor(campaign, who: str) -> str | None:
    who = (who or "").strip().lower()
    at_table = [k for k, v in campaign.party().items()
                if isinstance(v, dict) and k not in ("round_synced", "xp")]
    if not who:
        # A roll with nobody attached cannot be read back later, and the Record row would
        # say only "perception". The ledger is the audit trail; it needs a name.
        return ("every roll needs `who`: the slug of whoever is acting"
                + (f", one of {', '.join(at_table)}" if at_table else "") + ".")
    if at_table and who not in at_table and who not in ("dm", "world"):
        return (f"`who` must be someone at this table: {', '.join(at_table)}. "
                "If the world is rolling, say who in the fiction is acting.")
    return None


def _run_tool(campaign, name: str, args: dict) -> dict:
    """Execute a tool. Refusals come back as results, not exceptions, so the DM learns
    what it did wrong inside the same turn."""
    try:
        if name == "roll":
            spec = args.pop("dice", "1d20")
            bad = _valid_actor(campaign, str(args.get("who") or "")) or _valid_roll(args)
            if bad:
                return {"ok": False, "refused": bad}
            args.pop("why", None)  # the player's words for it, not the ledger's
            args["s"] = campaign.session   # which session this line belongs to
            return {"ok": True, "entry": dice.roll(campaign.ledger, spec, args)}
        if name == "fact":
            op = args.pop("op")
            return {"ok": True, "entry": dice.fact(campaign.facts_file, campaign.session, op, **args)}
        if name == "state":
            changed = state.apply_state(campaign, args)
            # The ledger carries it too: a consequence nobody can find later is a rumour.
            dice.note(campaign.ledger, "state", args.get("note") or changed.get("what", ""),
                      s=campaign.session, who=args.get("who"), change=changed)
            return {"ok": True, "entry": changed}
        if name == "ruling":
            return {"ok": True, "entry": dice.note(campaign.ledger, "ruling", args.get("note", ""),
                                                   s=campaign.session,
                                                   who=args.get("who"), scope=args.get("scope"))}
        return {"ok": False, "error": f"no such tool: {name}"}
    except state.StateRefused as exc:
        return {"ok": False, "refused": str(exc)}
    except dice.Refused as exc:
        return {"ok": False, "refused": str(exc)}
    except Exception as exc:  # never kill a turn over a bad argument
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}


def _result_block(call: dict, out: dict) -> dict:
    return {"toolResult": {
        "toolUseId": call["toolUseId"],
        "content": [{"json": out}],
        "status": "success" if out.get("ok") else "error",
    }}


# ── the loop ─────────────────────────────────────────────────────────────────

def _continue(campaign, messages: list[dict], beats: list[dict], carried: list[dict]) -> dict:
    """Run legs until the DM either asks for dice or stops talking.

    `carried` are tool results produced before a pause, waiting to be sent with the roll's.
    """
    system = system_prompt(campaign)
    pending = None

    for _ in range(MAX_LEGS):
        reply = llm.converse(system=system, messages=messages, tools=TOOLS,
                             tier=campaign.tier, spent=campaign.spent)
        campaign.spent = reply["spent"]
        messages.append({"role": "assistant", "content": reply["content"]})

        said = _no_chatter(THINKING.sub("", llm.text_of(reply["content"])).strip())
        if said:
            leaks = fog.check(said, campaign.dm_side())
            if leaks:
                dice.note(campaign.ledger, "leak", "held by the fog gate: " + "; ".join(leaks),
                          s=campaign.session)
                beats.append({"kind": "note", "text": fog.held_message(leaks)})
            else:
                beats.append({"kind": "dm", "text": said})

        calls = llm.tool_calls(reply["content"])
        if not calls:
            break

        results, ask = list(carried), None
        carried = []
        for call in calls:
            if call["name"] == "roll" and ask is None:
                args = dict(call.get("input") or {})
                bad = _valid_actor(campaign, str(args.get("who") or "")) or _valid_roll(args)
                if bad:
                    results.append(_result_block(call, {"ok": False, "refused": bad}))
                    continue
                ask = {"call": call, "args": args}
                continue
            out = _run_tool(campaign, call["name"], dict(call.get("input") or {}))
            if out.get("ok") and call["name"] == "fact":
                shown = fact_beat(out["entry"])
                if shown:
                    beats.append(shown)
            if out.get("ok") and call["name"] == "state":
                beats.append(state_beat(out["entry"]))
            results.append(_result_block(call, out))

        if ask:
            # Stop here. The player presses the dice.
            beats.append(ask_beat(ask["args"]))
            pending = {"call": ask["call"], "args": ask["args"], "carried": results}
            break

        messages.append({"role": "user", "content": results})

    campaign.turns += 1
    return {"beats": beats, "messages": messages, "pending": pending}


def take_turn(campaign, history: list[dict], said: str) -> dict:
    messages = history + [{"role": "user", "content": [{"text": said}]}]
    return _continue(campaign, messages, [], [])


def resume_roll(campaign, messages: list[dict], pending: dict) -> dict:
    """The player pressed the dice. Roll, write the line, and let the DM see the number."""
    args = dict(pending["args"])
    spec = args.pop("dice", "1d20")
    args.pop("why", None)
    beats: list[dict] = []
    try:
        args["s"] = campaign.session
        entry = dice.roll(campaign.ledger, spec, args)
        out = {"ok": True, "entry": entry}
        beats.append(roll_beat(entry))
    except dice.Refused as exc:
        out = {"ok": False, "refused": str(exc)}
        beats.append({"kind": "note", "text": f"THE GATE REFUSED THAT ROLL — {exc}"})

    results = list(pending.get("carried") or []) + [_result_block(pending["call"], out)]
    messages = list(messages) + [{"role": "user", "content": results}]
    return _continue(campaign, messages, beats, [])
