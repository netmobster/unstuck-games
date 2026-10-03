"""Build the Elsible prototype page: the template with the deck and packs embedded.

    python elsible/prototype/build.py            writes elsible/prototype/elsible.html (not committed)
    python elsible/prototype/build.py --publish  also writes elsible/site/index.html, which is
                                                 committed and is what elsible.unstuck-games.com serves

Open the result in a browser to try the deal locally (the weave falls back to the plain version
outside claude.ai), or publish it as a claude.ai artifact with the `sample` capability so
"Weave my life" runs a real Claude weave and audit.
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
core = json.load(io.open(os.path.join(ROOT, "decks/story/deck.json"), encoding="utf-8"))
biz = json.load(io.open(os.path.join(ROOT, "decks/story/packs/business.json"), encoding="utf-8"))
t = io.open(os.path.join(HERE, "elsible.template.html"), encoding="utf-8").read()
j = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<" + chr(92) + "/")
page = t.replace("/*DECK*/null", j(core)).replace("/*PACK*/null", j(biz))
out = os.path.join(HERE, "elsible.html")
io.open(out, "w", encoding="utf-8").write(page)
print("built", out)
if "--publish" in sys.argv:
    # The template is an artifact fragment: claude.ai wraps it in a document with a charset.
    # Served raw, a browser guesses Windows-1252 and every em dash turns into mojibake.
    if "charset" not in page[:2000].lower():
        page = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n') + page
    site = os.path.join(ROOT, "site", "index.html")
    os.makedirs(os.path.dirname(site), exist_ok=True)
    io.open(site, "w", encoding="utf-8", newline="\n").write(page)
    print("published", site, "- commit it; elsible.unstuck-games.com serves elsible/site/")
