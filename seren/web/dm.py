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

The amendment is the honest part. SEREN told the DM to roll with `shuf` and log with
gate.py, on trust. Here it cannot: it has a `roll` tool, the server rolls, and the number
comes back already written to the ledger. An instruction is not a control; a tool is.
"""
from __future__ import annotations

import json

import corpus
import dice
import fog
import llm

MAX_LEGS = 6  # tool round-trips inside one turn before we stop and narrate what we have

AMENDMENT = """
# The web amendment — how this table differs from the one in your contract

**You cannot roll.** There is no shell here. When the success or failure state could
change, call the `roll` tool: say who is acting, what kind of event it is, the target
number and the modifiers, and it returns the die, the total and the verdict, already
written to the ledger. **You then narrate the result you were handed.** You may not
propose a roll, a total or a verdict — the tool refuses entries that arrive with an
outcome already in them.

**An unlogged roll is an unrolled roll.** This has not changed. It is now impossible.

**Record what becomes true.** When something enters the record, or the party learns or
suspects something, call `fact`. When you make a call the rules do not cover, call
`ruling` and say you are making it.

**Narrate in chat.** Everything you say goes straight to the player. There is no separate
panel you can hide the mechanics in, so the register rule matters more here, not less:
nobody in the fiction has ever heard of a DC, a saving throw, a modifier or a d20. The
Table shows the player the numbers. Your prose shows them the world.

**Your words are checked before they are shown.** A leak gate reads what you write and
holds anything carrying DM-side vocabulary, a clock bar, or a phrase lifted from the
fronts and antagonist files. If it holds your turn you will be told, and you will have to
say it again without the leak. This is new: in the version you were written for, the panel
was gated and the chat was not, and the chat is where every leak went.

**Keep it to a beat.** Two or three paragraphs, then stop and let them act.
""".strip()

TOOLS = [
    {
        "toolSpec": {
            "name": "roll",
            "description": (
                "Roll dice and write the ledger line, one operation. Use whenever the "
                "success or failure state could change. Returns the die, the total and "
                "the verdict. Never supply an outcome."
            ),
            "inputSchema": {"json": {
                "type": "object",
                "properties": {
                    "dice": {"type": "string", "description": "e.g. 1d20, 2d6, 1d20+3"},
                    "t": {"type": "string", "description": "event type: check, attack, save, damage, encounter"},
                    "who": {"type": "string", "description": "slug of whoever is acting"},
                    "skill": {"type": "string"},
                    "ability": {"type": "string"},
                    "dc": {"type": "integer", "description": "the target, if there is one"},
                    "vs": {"type": "integer", "description": "AC, for attacks"},
                    "mods": {
                        "type": "array",
                        "description": "[name, value] pairs, e.g. [[\"wis\",3],[\"prof\",2]]",
                        "items": {"type": "array"},
                    },
                    "note": {"type": "string", "description": "where the DC came from, and why. The player can read this."},
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
    layers = [
        "# 1. The contract — this outranks everything below it\n" + (rules.get("dm") or ""),
        "# 2. The state formats you write into\n" + (rules.get("state_formats") or "")[:6000],
        "# 3. This campaign\n" + campaign.campaign_static(),
        "# 4. Where things stand\n" + campaign.state_layer(),
        AMENDMENT,
    ]
    return "\n\n---\n\n".join(layer for layer in layers if layer.strip())


def _run_tool(campaign, name: str, args: dict) -> dict:
    """Execute a tool. Every refusal comes back as a result, not an exception, so the DM
    learns what it did wrong inside the same turn."""
    try:
        if name == "roll":
            spec = args.pop("dice", "1d20")
            entry = dice.roll(campaign.ledger, spec, args)
            return {"ok": True, "entry": entry}
        if name == "fact":
            op = args.pop("op")
            entry = dice.fact(campaign.facts_file, campaign.session, op, **args)
            return {"ok": True, "entry": entry}
        if name == "ruling":
            entry = dice.note(campaign.ledger, "ruling", args.get("note", ""),
                              who=args.get("who"), scope=args.get("scope"))
            return {"ok": True, "entry": entry}
        return {"ok": False, "error": f"no such tool: {name}"}
    except dice.Refused as exc:
        return {"ok": False, "refused": str(exc)}
    except Exception as exc:  # never kill a turn over a bad argument
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}


def _beats_from(entry: dict) -> dict | None:
    """Turn a ledger line into something the Table can show."""
    if "roll" not in entry:
        return None
    parts = []
    if entry.get("mods"):
        parts = [f"{name} {value:+d}" for name, value in entry["mods"]]
    beat = {
        "kind": "roll",
        "what": " · ".join(filter(None, [entry.get("who"), entry.get("skill") or entry.get("t")])),
        "parts": [f"d → {entry['roll']}"] + parts,
        "total": entry.get("total"),
    }
    if entry.get("dc") is not None:
        beat["dc"] = entry["dc"]
        beat["pass"] = entry.get("pass")
    elif entry.get("vs") is not None:
        beat["dc"] = entry["vs"]
        beat["pass"] = entry.get("hit")
    return beat


def take_turn(campaign, history: list[dict], said: str) -> dict:
    """One turn: what the player did, what the dice said, what the DM made of it."""
    messages = history + [{"role": "user", "content": [{"text": said}]}]
    system = system_prompt(campaign)
    dm_side = campaign.dm_side()
    beats: list[dict] = []

    for _ in range(MAX_LEGS):
        reply = llm.converse(
            system=system, messages=messages, tools=TOOLS,
            tier=campaign.tier, spent=campaign.spent,
        )
        campaign.spent = reply["spent"]
        messages.append({"role": "assistant", "content": reply["content"]})

        calls = llm.tool_calls(reply["content"])
        if not calls:
            break

        results = []
        for call in calls:
            out = _run_tool(campaign, call["name"], dict(call.get("input") or {}))
            if out.get("ok") and call["name"] == "roll":
                shown = _beats_from(out["entry"])
                if shown:
                    beats.append(shown)
            if out.get("ok") and call["name"] == "fact":
                entry = out["entry"]
                vis = entry.get("to") or entry.get("visibility")
                if vis in fog.PLAYER_VISIBILITY:
                    beats.append({"kind": "note", "text": f"{vis.upper()} — {entry.get('fact', '')}"})
            results.append({"toolResult": {
                "toolUseId": call["toolUseId"],
                "content": [{"json": out}],
                "status": "success" if out.get("ok") else "error",
            }})
        messages.append({"role": "user", "content": results})

    text = llm.text_of(messages[-1]["content"]) if messages[-1]["role"] == "assistant" else ""
    leaks = fog.check(text, dm_side) if text else []
    if leaks:
        # Held, not shown, and not silently swallowed.
        dice.note(campaign.ledger, "leak", "held by the fog gate: " + "; ".join(leaks))
        beats.append({"kind": "note", "text": fog.held_message(leaks)})
        text = ""

    if text:
        beats.append({"kind": "dm", "text": text})
    campaign.turns += 1
    return {"beats": beats, "messages": messages}
