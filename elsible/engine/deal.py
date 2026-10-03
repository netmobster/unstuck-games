"""deal.py — deal an Elsible hand from a Loom deck, locally, in the seren-hand/1 shape.

    python engine/deal.py story --offer              what the Loom shows: five cards a slot
    python engine/deal.py story --offer --seed 7     the same five every time
    python engine/deal.py story --play               "play it out for me": a whole random hand
    python engine/deal.py story --pick role=heir --pick circle=child,animal ...
                                                      pick some; the rest are dealt for you
    python engine/deal.py story --play --not vote,storm
                                                      "make her play another": the dealer's card
                                                      is never one of these
    python engine/deal.py story --play --pack business --out hand.json
    python engine/deal.py story --check              check the deck (and any --pack) and exit

The flow is docs/elsible.md §6, corrected 3 Oct 2026 (back to the Loom's feel):

1. **Five cards a slot, never locked.** `--offer` shows them; `--pick slot=id` takes one (two for
   the Circle); anything not picked is dealt. `--play` deals the whole hand at once.
2. **The dealer plays a complication back**: the Pressure card, leaning toward what the hand you
   picked makes likely. `--not` is "make her play another".
3. **Nothing hidden is dealt.** The undercurrent and the secret are the weave's reference
   material; the weave writes what is underneath from the random hand, and the auditor makes it
   true (in Claude Code, on the Seren engine; the story-mode weave is next).

Packs (decks/story/packs/<name>.json) add cards to any slot: romance, thriller, horror, business.
The core deck is generic and deliberately incomplete.
"""
from __future__ import annotations

import io
import json
import os
import random
import sys
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Bad(Exception):
    pass


def load_deck(name: str, packs: list[str] | None = None) -> dict:
    p = os.path.join(ROOT, "decks", name, "deck.json")
    if not os.path.isfile(p):
        raise Bad(f"no deck called {name!r} (looked for decks/{name}/deck.json)")
    d = json.load(io.open(p, encoding="utf-8"))
    d["packs"] = []
    for pack in packs or []:
        pp = os.path.join(ROOT, "decks", name, "packs", f"{pack}.json")
        if not os.path.isfile(pp):
            raise Bad(f"no pack called {pack!r} (looked for decks/{name}/packs/{pack}.json)")
        for slot, cards in json.load(io.open(pp, encoding="utf-8"))["cards"].items():
            d["cards"].setdefault(slot, []).extend(cards)
        d["packs"].append(pack)
    return d


def picked_slots(d):
    return [s for s in d["slots"] if not s.get("dealer") and not s.get("reference")]


def dealer_slot(d):
    return next(s for s in d["slots"] if s.get("dealer"))


def per_slot(d) -> int:
    return (d.get("deal") or {}).get("per_slot", 5)


def check_deck(d: dict) -> list[str]:
    """What is wrong with the deck. Empty means it deals."""
    errs, cards, n = [], d.get("cards", {}), per_slot(d)
    for slot in d["slots"]:
        pool = cards.get(slot["id"]) or []
        if not slot.get("reference") and len(pool) < n:
            errs.append(f"{slot['id']}: {len(pool)} cards, a deal needs at least {n}")
        if slot.get("dealer") and len(pool) < 2:
            errs.append(f"{slot['id']}: the dealer needs another card to play")
        ids = [c["id"] for c in pool]
        if len(ids) != len(set(ids)):
            errs.append(f"{slot['id']}: duplicate ids {sorted({i for i in ids if ids.count(i) > 1})}")
        for c in pool:
            for f in ("id", "name", "line", "changes"):
                if not c.get(f):
                    errs.append(f"{slot['id']}/{c.get('id', '?')}: no {f}")
            for tslot, tids in (c.get("pulls") or {}).items():
                known = {x["id"] for x in cards.get(tslot) or []}
                for t in tids:
                    if t not in known:
                        errs.append(f"{slot['id']}/{c['id']}: pulls {tslot}/{t}, which does not exist")
    for c in cards.get("undercurrent", []):
        if len(c.get("signals") or []) < 3:
            errs.append(f"undercurrent/{c['id']}: needs at least three signals")
        if len(c.get("if_full") or []) < 2 or not c.get("if_resolved"):
            errs.append(f"undercurrent/{c['id']}: needs if_full (2+) and if_resolved")
    return errs


def offer(d: dict, rng: random.Random) -> dict:
    """What the Loom shows: five cards for each slot the player picks."""
    return {s["id"]: [c["id"] for c in rng.sample(d["cards"][s["id"]], min(per_slot(d), len(d["cards"][s["id"]])))]
            for s in picked_slots(d)}


def _face(d, slot, cid):
    c = next(x for x in d["cards"][slot] if x["id"] == cid)
    return {"name": c["name"], "line": c["line"], "changes": c["changes"]}


def deal(d: dict, seed: int | None = None, picks: dict | None = None, not_dealer: list[str] | None = None) -> dict:
    seed = seed if seed is not None else random.SystemRandom().randrange(1, 10**6)
    rng = random.Random(seed)
    cards = d["cards"]
    by_id = {s: {c["id"]: c for c in cards[s]} for s in cards}
    slots = {s["id"]: s for s in d["slots"]}
    picks = {k: (v if isinstance(v, list) else [x for x in str(v).split(",") if x]) for k, v in (picks or {}).items()}
    for slot, ids in picks.items():
        if slot not in slots:
            raise Bad(f"--pick {slot}: no such slot")
        if slots[slot].get("reference"):
            raise Bad(f"--pick {slot}: that is the weave's reference material, never dealt")
        if slots[slot].get("dealer"):
            raise Bad(f"--pick {slot}: the dealer plays that card. Use --not to make her play another")
        for cid in ids:
            if cid not in by_id[slot]:
                raise Bad(f"--pick {slot}={cid}: no such card")

    # 1 · the hand the player picks (anything not picked is dealt, as "play it out for me" does)
    life: dict[str, list[str]] = {}
    for s in picked_slots(d):
        sid, n = s["id"], s.get("count", 1)
        if sid in picks:
            life[sid] = picks[sid][:n]
            if len(life[sid]) < n:
                rest = [c["id"] for c in cards[sid] if c["id"] not in life[sid]]
                life[sid] += rng.sample(rest, n - len(life[sid]))
        elif s.get("optional") and rng.random() < 0.5:
            life[sid] = []
        else:
            life[sid] = [c["id"] for c in rng.sample(cards[sid], n)]

    # 2 · the dealer plays a complication, leaning toward what the hand makes likely
    ds = dealer_slot(d)["id"]
    pool = [c for c in cards[ds] if c["id"] not in set(not_dealer or [])]
    if not pool:
        raise Bad("the dealer has no other card to play")

    def affinity(card):
        n = 0
        for ls, ids in life.items():
            for lid in ids:
                if card["id"] in (by_id[ls][lid].get("pulls") or {}).get(ds, []):
                    n += 1
                if lid in (card.get("pulls") or {}).get(ls, []):
                    n += 1
        return n

    played = rng.choices(pool, weights=[1 + 2 * affinity(c) for c in pool], k=1)[0]
    life[ds] = [played["id"]]

    multi = {s["id"] for s in d["slots"] if s.get("count", 1) > 1}
    return {
        "format": "seren-hand/1",
        "deck": d["deck"],
        "packs": d.get("packs") or [],
        "dealt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seed": seed,
        "picks": {s: (v if s in multi else (v[0] if v else None)) for s, v in life.items()},
        "dealer": {"slot": ds, "played": played["id"], "refused": list(not_dealer or [])},
        "dials": {x["id"]: rng.choice(range(0, 101, 10)) for x in d["dials"]},
        "cards": {s: ([_face(d, s, c) for c in v] if s in multi else (_face(d, s, v[0]) if v else None))
                  for s, v in life.items()},
    }


def sentence(h: dict) -> str:
    """The hand as one sentence, the way the Loom writes it as you pick."""
    c = h["cards"]
    bits = ([f"{c['trope']['name']}:"] if c.get("trope") else []) +            [f"{c['role']['name'].lower()} — {c['role']['line'].rstrip('.').lower()} —", f"in {c['world']['name'].lower()},"]
    bits.append(f"with {c['other']['name'].lower()} at the centre,")
    bits.append("and " + " and ".join(x["name"].lower() for x in c["circle"]) + " around you;")
    if c.get("modifier"):
        bits.append(f"{c['modifier']['name'].lower()};")
    bits.append(f"and now {c['pressure']['name'].lower()} — told by {c['told_by']['name'].lower().replace('the ', 'the ', 1)}.")
    return " ".join(bits)


def show_hand(h: dict, d: dict) -> str:
    rows = []
    for s in d["slots"]:
        if s.get("reference"):
            continue
        c = h["cards"].get(s["id"])
        tag = "  ← the dealer played this" if s.get("dealer") else ""
        if not c:
            rows.append(f"  {s['label']:<12} —")
        for x in (c if isinstance(c, list) else [c] if c else []):
            rows.append(f"  {s['label']:<12} {x['name']}  ·  {x['line']}{tag}")
    rows.append("  dials        " + "  ".join(f"{k} {v}" for k, v in h["dials"].items()))
    return "\n".join(rows) + "\n\n  " + sentence(h)


def show_offer(o: dict, d: dict) -> str:
    by_id = {s: {c["id"]: c for c in d["cards"][s]} for s in d["cards"]}
    rows = []
    for s in picked_slots(d):
        extra = (", pick two" if s.get("count", 1) > 1 else "") + (", optional" if s.get("optional") else "")
        rows.append(f"  {s['label']}  ({s['q']}{extra})")
        for cid in o[s["id"]]:
            c = by_id[s["id"]][cid]
            rows.append(f"      {s['id']}={cid:<12} {c['name']}  ·  {c['line']}")
    return "\n".join(rows)


def _list_arg(argv, flag):
    out = []
    for i, a in enumerate(argv):
        if a == flag and i + 1 < len(argv):
            out += [x for x in argv[i + 1].split(",") if x]
    return out


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.split("\n\n")[0], file=sys.stderr)
        return 2
    try:
        d = load_deck(argv[1], _list_arg(argv, "--pack"))
        errs = check_deck(d)
        if "--check" in argv:
            dealt = sum(len(d["cards"][s["id"]]) for s in d["slots"] if not s.get("reference"))
            ref = sum(len(d["cards"][s["id"]]) for s in d["slots"] if s.get("reference"))
            print(f"deck {d['deck']} v{d['version']}{' + ' + ', '.join(d['packs']) if d['packs'] else ''}: "
                  f"{dealt} cards to deal, {ref} reference cards for the weave, {per_slot(d)} a slot")
            for e in errs:
                print("  PROBLEM " + e)
            print("  deals clean" if not errs else f"  {len(errs)} problem(s)")
            return 1 if errs else 0
        if errs:
            raise Bad("the deck has problems; run with --check")
        seed = int(argv[argv.index("--seed") + 1]) if "--seed" in argv else None
        if "--offer" in argv:
            seed = seed if seed is not None else random.SystemRandom().randrange(1, 10**6)
            print(f"The Loom deals (seed {seed}). Take one with --pick slot=id; --play deals the rest.\n"
                  + show_offer(offer(d, random.Random(seed)), d))
            return 0
        picks = {}
        for i, a in enumerate(argv):
            if a == "--pick":
                k, _, v = argv[i + 1].partition("=")
                picks[k] = picks.get(k, []) + [x for x in v.split(",") if x]
        h = deal(d, seed, picks, _list_arg(argv, "--not"))
        print(f"Your hand (seed {h['seed']}).\n" + show_hand(h, d))
        if "--out" in argv:
            out = argv[argv.index("--out") + 1]
            with io.open(out, "w", encoding="utf-8") as f:
                json.dump(h, f, ensure_ascii=False, indent=1)
            print(f"\nwritten to {out}. Weave it in Claude Code (story mode is next).")
    except Bad as exc:
        print("refused: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
