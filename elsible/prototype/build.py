"""Build the Elsible prototype page: the template with the deck and packs embedded.

    python elsible/prototype/build.py          writes elsible/prototype/elsible.html (not committed)

Open the result in a browser to try the deal locally (the weave falls back to the plain version
outside claude.ai), or publish it as a claude.ai artifact with the `sample` capability so
"Weave my life" runs a real Claude weave and audit.
"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
core = json.load(io.open(os.path.join(ROOT, "decks/story/deck.json"), encoding="utf-8"))
biz = json.load(io.open(os.path.join(ROOT, "decks/story/packs/business.json"), encoding="utf-8"))
t = io.open(os.path.join(HERE, "elsible.template.html"), encoding="utf-8").read()
j = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<" + chr(92) + "/")
out = os.path.join(HERE, "elsible.html")
io.open(out, "w", encoding="utf-8").write(t.replace("/*DECK*/null", j(core)).replace("/*PACK*/null", j(biz)))
print("built", out)
