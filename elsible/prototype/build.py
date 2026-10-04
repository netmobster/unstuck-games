"""Build the Elsible parlor: Claude Design's table, with the deck written in from deck.json.

    python elsible/prototype/build.py            writes elsible/prototype/parlor.html (not committed)
    python elsible/prototype/build.py --publish  also writes elsible/site/play/index.html, which is
                                                 committed and is what elsible.unstuck-games.com/play/ serves
    python elsible/prototype/build.py --sketch   builds the old sketch instead (elsible.template.html,
                                                 the claude.ai prototype with a web weave), to elsible.html

The page gets only what the table deals: each card's id, name, line and what it changes in play,
the dials, and the packs. The weave's reference material (each trope's hidden half, the secrets)
stays in the deck file and out of the page.
"""
import glob, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DECKDIR = os.path.join(ROOT, "decks", "story")
core = json.load(io.open(os.path.join(DECKDIR, "deck.json"), encoding="utf-8"))
packs = {os.path.splitext(os.path.basename(p))[0]: json.load(io.open(p, encoding="utf-8"))
         for p in sorted(glob.glob(os.path.join(DECKDIR, "packs", "*.json")))}
j = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<" + chr(92) + "/")


def put(page, mark, value):
    if page.count(mark) != 1:
        sys.exit(f"build: expected {mark} exactly once in the template, found {page.count(mark)}")
    return page.replace(mark, value)


if "--sketch" in sys.argv:
    t = io.open(os.path.join(HERE, "elsible.template.html"), encoding="utf-8").read()
    page = put(put(t, "/*DECK*/null", j(core)), "/*PACK*/null", j(packs.get("business")))
    out = os.path.join(HERE, "elsible.html")
    io.open(out, "w", encoding="utf-8").write(page)
    print("built the sketch", out)
    sys.exit(0)

DEALT = [s["id"] for s in core["slots"] if not s.get("reference")]


def slim(cards):
    return {slot: [{k: c[k] for k in ("id", "name", "line", "changes")} for c in cards[slot]]
            for slot in DEALT if slot in cards}


deck = {"version": core["version"], "deal": core.get("deal", {}), "dials": core["dials"], "cards": slim(core["cards"])}
for_page = {name: {"pack": p.get("pack", name), "cards": slim(p["cards"])} for name, p in packs.items()}

t = io.open(os.path.join(HERE, "parlor.template.html"), encoding="utf-8").read()
page = put(put(t, "/*DECK*/null", j(deck)), "/*PACKS*/null", j(for_page))
out = os.path.join(HERE, "parlor.html")
io.open(out, "w", encoding="utf-8", newline="\n").write(page)
n = sum(len(v) for v in deck["cards"].values())
print(f"built {out}: deck v{deck['version']}, {n} cards, packs: {', '.join(for_page) or 'none'}")

if "--publish" in sys.argv:
    # A page served raw needs its own charset, or a browser guesses Windows-1252 and every em dash
    # turns into mojibake. The parlor template carries one; this guards any template that doesn't.
    if "charset" not in page[:2000].lower():
        page = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n') + page
    site = os.path.join(ROOT, "site", "play", "index.html")
    os.makedirs(os.path.dirname(site), exist_ok=True)
    io.open(site, "w", encoding="utf-8", newline="\n").write(page)
    print("published", site, "- commit it; elsible.unstuck-games.com/play/ serves it")
