"""A fake book, for local runs with SEREN_AI=mock.

The real book is the briefing (SEREN docs/weave-from-hand.md §4b): what a DM hands a one-shot
player before the first scene, in this order: the pitch, you (with what you can do in plain
words), your people, the world and how it works, who's who, places you know, tonight, and how
this table plays. Player-side only, second person, present tense.

This writes one from the dealt cards' own faces and the shelf card, so the depth and the shape
can be felt without a model. **It is canned.** The real weaver writes it; this file only stands
in for it, and it must never name anybody the campaign's truths keep secret.
"""
from __future__ import annotations

# What a level-3 character of each class can do, in plain words.
CAN_DO = {
    "rogue": [("Get in", "Locks, latches, windows and pockets. You are quiet when you want to be"),
              ("Read a room", "You notice who is lying, and who is watching the door"),
              ("Hit first", "When you have the drop on someone, it hurts a great deal more"),
              ("Get out", "Dash, slip away, or hide, quicker than anyone expects")],
    "fighter": [("Hold a door", "Nobody gets past you without a fight, and few want one"),
                ("Hit hard", "A sword or a cudgel, and you know which ends of both to use"),
                ("Keep going", "Catch your breath mid-fight and be on your feet again"),
                ("Carry", "Barrels, people, the coffin if it comes to that")],
    "cleric": [("Heal", "Close a wound with a touch, and settle a fever overnight"),
               ("Bless", "Steady the hands of the people beside you"),
               ("Speak for the dead", "Say the words at a grave, and the parish listens"),
               ("Know the book", "Births, marriages and burials: you can read the register")],
    "bard": [("Talk", "Everyone talks to you, and most of them say more than they meant to"),
             ("Charm", "A friendly word that lands as a favour"),
             ("Remember", "Every song you know is a record of somebody's business"),
             ("Steady the room", "A tune at the right moment calms a crowd, or turns it")],
    "ranger": [("Track", "Footprints, cart ruts, dogs and people, through orchard and mud"),
               ("Know the ground", "Every row, ditch and back way for three miles"),
               ("Shoot", "A bow, from further away than anyone at the wake would like"),
               ("Animals", "Dogs come to you, and horses settle for you")],
}

PLACES = {
    "blood-and-ink": [
        ("The press at Thornby", "Agnes's press and house, where the wake is tonight. The yard, the press house, the cider table. **You live here**"),
        ("The pressing pit", "Stone-lined, under the press house floor. Where she was found. The door to it has been shut since"),
        ("The ledger room", "Off the yard. Every family's fruit and every family's debt, in Agnes's hand and Linnet's"),
        ("Thornby church", "Across the lane: the lychgate, the parish register, and the grave dug this afternoon for noon tomorrow"),
        ("The Sallow", "Five farmhouses up the valley road, every one of them related to every other one"),
        ("The Crook", "The inn at the crossroads. Where the county hears things first"),
        ("The county road", "Back to Saltgate, two days' walk. Nobody expects you to take it, and some would like you to"),
    ],
}


def _md_table(rows):
    out = ["| | |", "|---|---|"]
    out += [f"| **{a}** | {b} |" for a, b in rows]
    return "\n".join(out)


def briefing(camp: dict, cards: dict, shelf: dict | None, slug: str) -> str:
    shelf = shelf or {}
    pc = cards.get("pc") or {}
    who = pc.get("name") or (camp.get("pc") or {}).get("name") or "You"
    klass = str(pc.get("changes", "Rogue")).split(".")[0].strip() or "Rogue"
    flavour = str(pc.get("changes", "")).partition(".")[2].strip()
    origin, world, trouble = cards.get("origin") or {}, cards.get("world") or {}, cards.get("trouble") or {}
    posture, persona = cards.get("posture") or {}, cards.get("persona") or {}
    comps = cards.get("companions") or []
    title = shelf.get("title") or camp.get("title") or "Your campaign"

    lines = [f"# {title} — your book", ""]
    lines += [f"**You are {who}, and tonight the person who took you in is being waked.** "
              + (shelf.get("description") or camp.get("premise") or ""), ""]
    lines += ["It is the hour before dark. You are standing at the lychgate, and the wake has started without you.", "", "---", ""]

    lines += ["## You", "",
              f"**{who}.** {klass}. {pc.get('line', '')}. {flavour}".strip(), ""]
    if pc.get("as"):
        said = pc['as'].split('·', 1)[-1].strip()
        lines += [f"- {said[:1].upper() + said[1:]}."]
    if (cards.get("trope") or {}).get("as"):
        lines += [f"- {cards['trope']['as']}"]
    if origin.get("as"):
        lines += [f"- **{origin.get('name', 'Your past')}.** {origin['as']}"]
    lines += ["", "### What you can do, in plain words", "",
              _md_table(CAN_DO.get(klass.lower(), CAN_DO["rogue"])), "",
              "Your full sheet is on the **Sheet** tab.", "", "---", ""]

    lines += ["## Your people", ""]
    for c in comps:
        lines += [f"**{c.get('name', '')}.** {c.get('as', c.get('line', ''))} "
                  f"*{c.get('line', '')}*, though: {str(c.get('changes', '')).lower()}.", ""]
    lines += ["---", ""]

    lines += [f"## {world.get('name', 'The world')}, and how it works", "",
              f"**{world.get('as', '')}** {world.get('line', '')}.", "",
              f"{world.get('changes', '')}. A fight here is not a fight, it is a scandal, and the "
              "whole valley will know by morning who threw the first punch.", ""]
    for k in shelf.get("key_info") or []:
        lines += [f"- {k}"]
    lines += ["", "---", ""]

    lines += ["## Who's who", "", "| who | what the valley says |", "|---|---|",
              "| **Agnes Tull** | Kept the press, kept the ledger, kept you. Forty years. Found at the bottom of her own pit two mornings ago |",
              "| **Linnet Hobb** | Agnes's clerk. Writes down everything, and has been crying in the ledger room |",
              "| **The five families** | Dacre, Corlett, Fenwick, Brisco and Thorne. Everybody's cousin is somebody's creditor |",
              f"| **Somebody at this wake** | {posture.get('as', '')} |",
              "| **The parson** | Says the words at noon. His new curate does the running |",
              "", "---", ""]

    places = PLACES.get(slug) or [("Where you are", "The first scene's place"), ("Somewhere else", "Wherever the story goes")]
    lines += ["## Places you know", "", "Go anywhere. These are the places you already know your way around.", "",
              "| place | what is there |", "|---|---|"] + [f"| **{a}** | {b} |" for a, b in places] + ["", "---", ""]

    lines += ["## Tonight", "",
              f"**{trouble.get('as', '')}**", "",
              "The county is coming up the lane with lanterns and covered dishes. The coffin is on "
              "trestles in the front room. Somebody has already asked who gets the press.", "",
              f"> {camp.get('opening', '')}", "", "---", ""]

    lines += ["## How this table plays", "",
              f"- **Told by {persona.get('name', 'the DM')}.** {persona.get('as', '')} {persona.get('line', '')[:1].upper() + persona.get('line', '')[1:]}.",
              "- **Dice come out only when the outcome is genuinely uncertain.** If the cause is plain, it just happens.",
              "- **Violence is scandal.** You can do it. Everyone will know.",
              f"- **Death is death.** If {who} dies, the campaign ends. You will be warned first.",
              "- **Everything in this book is true.** The rest of the valley is there to find.", ""]
    return "\n".join(lines)
