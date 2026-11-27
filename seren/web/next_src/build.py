"""Builds seren/web/static/next/*.html from the fragments beside this file: one shell, one nav.
   python seren/web/next_src/build.py   ·   preview the way nginx routes it: python seren/web/next_src/serve.py 8812
   The pages are static and public at seren.unstuck-games.com/next/ (infra/nginx/unstuck.conf)."""
import html, re
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent / "static" / "next"
BOOK = SRC.parent.parent / ".local" / "books" / "blood-and-ink-4c51.md"  # Serenista's real Opus book, kept locally

PAGES = [  # file, path, nav label, title, description
    ("index", "/next/", "The run", "Seren · Roads Not Taken",
     "Bring the character you love into a campaign nobody has ever played. One real run of Seren, an AI dungeon master for one player."),
    ("engine", "/next/engine", "The engine", "Seren · The Engine",
     "Same campaign, never the same story: three tables dealt, five dials, and 9,676,800 books from one campaign."),
    ("mischief", "/next/mischief", "Mischief", "Seren · DM Mischief",
     "The deck of small, strange things a real DM does to a table, for Seren to do to you."),
    ("chronicle", "/next/chronicle", "The chronicle", "Seren · The Chronicle",
     "At the end, the fog lifts: Seren's first campaign, told back as a story."),
    ("creators", "/next/creators", "For creators", "Seren · For Creators",
     "Write the campaign once. Every player gets their own."),
]

LANTERN = ('<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="glow" cx="13" cy="15" r="9" fill="#ffb347" opacity=".35"/>'
           '<path d="M9 7h8l-1 3H10z M8 10h10v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z M11 4h4v3h-4z" fill="none" stroke="#e3c06a" stroke-width="1.4"/>'
           '<path class="glow" d="M13 13c1.6 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .4-2.2 2-4z" fill="#ffcf73"/></svg>')

FONTS = ("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cinzel+Decorative:wght@400;700"
         "&family=IM+Fell+English:ital@0;1&family=Spectral:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Space+Mono:wght@400;700&display=swap")


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"<i>\1</i>", s)
    return s.replace("'", "’")


def book_html(md):
    out, lines, i = [], md.splitlines(), 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln or ln == "---":
            i += 1; continue
        m = re.match(r"(#{1,4}) (.*)", ln)
        if m:
            lvl = len(m.group(1)) + 1
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, body = rows[0], [r for r in rows[2:]]
            th = "" if not any(head) else "<thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead>"
            tb = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="tw"><table>{th}<tbody>{tb}</tbody></table></div>'); continue
        if ln.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>"); i += 1
            out.append("<ul>" + "".join(items) + "</ul>"); continue
        if ln.startswith("> "):
            out.append(f"<blockquote>{inline(ln[2:])}</blockquote>"); i += 1; continue
        out.append(f"<p>{inline(ln)}</p>"); i += 1
    return "\n".join(out)


def shell(cur, title, desc, body):
    here = ' aria-current="page"'
    nav = "".join(
        f'<a href="{p}"{here if f == cur else ""}>{label}</a>' for f, p, label, _, _ in PAGES)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#0d1424">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="https://seren.unstuck-games.com/next/art/blood-and-ink-header.webp">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/next/next.css">
</head>
<body>
<a class="skip" href="#main">Skip to the page</a>
<header class="top">
  <div class="in">
    <a class="brand" href="/next/">SEREN<small>1.5</small></a>
    <a class="cta top-cta" href="/">Play</a>
    <nav class="nav" aria-label="Pages">{nav}<a class="cta" href="/">Come to the table</a></nav>
  </div>
</header>
{body}
<footer class="foot">
  <div class="in">
    <span>SEREN · an <a href="https://unstuck-games.com/">Unstuck Games</a> build · 1.5, in the making</span>
    <span>Rules from SRD 5.2, CC BY 4.0, Wizards of the Coast · Not affiliated with D&amp;D Beyond</span>
  </div>
</footer>
<script src="/next/next.js"></script>
</body>
</html>
"""


book = book_html(BOOK.read_text(encoding="utf-8"))
for f, path, label, title, desc in PAGES:
    body = (SRC / f"{f}.html").read_text(encoding="utf-8").replace("{{L}}", LANTERN).replace("{{BOOK}}", book)
    assert "{{" not in body, f
    (OUT / f"{f}.html").write_text(shell(f, title, desc, body), encoding="utf-8", newline="\n")
    print("wrote", f, len(body))
