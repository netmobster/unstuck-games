# Handoff: The Last Warren · the site (last-warren.unstuck-games.com)

## Overview
The site is a diary kept by one family in *The Last Warren*, open on a desk. Three thirds: ① the book, the story of the line of Sorrel across three generations, pages that turn; ② what we decided, the three verbs and four spends as journal entries (decision → reason → consequence) around a live fold-out map; ③ how it works, the one place we break character: rules, hunters, dawn, the line, the working, $5 / God Mode, the letter box.

The diary is the product. The game is the thing that generates the diary. The site is the invitation to enter it.

Open `index.html` in a browser. No build step; the only network calls are Google Fonts and the Kit form.

## About the design files
Plain HTML/CSS/JS, hand-readable. Unlike the sister sites, the styles live in `style.css` with class names rather than inline, because the page objects (pages, sheets, torn pages, slips) repeat. Port as-is or inline it, your call. Everything is desktop-first at 1280 (`body { min-width: 1280px }`); narrower screens scroll sideways for now. Mobile is a later pass.

## Fidelity
High-fidelity for desktop. Type, colours, the three hands, the photo geometry, the turning and the copy are final. The run in the book is **plausible, not recorded**: once the game can export a line's chronicle, the entries on pages 1–10 should come from a real seed (see "The meta-loop").

## Files
| File | What it is |
| --- | --- |
| `index.html` | The whole page. Comments mark the three thirds and every sheet. |
| `style.css` | Tokens at the top, then one block per object. Page geometry is documented where it's set. |
| `book.js` | Page turning: click a page, the arrows, the dots, ←/→, or wait (it turns itself every 7s until touched). `?page=N` opens on spread N. |
| `board.js` | `<lw-board>`: the game's board renderer with a `diary` theme (graphite on cream, three-frame boil). Also the Burrow look (`theme="burrow"`) and others. Scenes are baked in for the mock; the game feeds real state. |
| `kit.js` | Posts the letter box straight to Kit form 9916999, same protocol as `kit-waitlist.js` at the repo root. |
| `assets/notebook.jpg` | The book (1715×917). Shown at 1280×685. |
| `assets/page-left.jpg`, `assets/page-right.jpg` | Exact 640×790 crops of the two pages, so a turning sheet is pixel-identical to the paper beneath it. |

## Design tokens (`:root` in style.css)
- `--desk #1f1109` the wood; `--cream #e3d6bc` and `--mute #9b8a70` for type on the desk.
- `--ink #2a211a` Sorrel I's graphite · `--ink2 #5a2e14` Sorrel II's brown · `--ink3 #2b3a52` Sorrel III's blue-black · `--graphite #5c4e3f` margin notes and footnotes · `--red #9e3a2c` the night's red (found, caught, costs).
- Hands: `--h1` Reenie Beanie (I), `--h2` Nanum Pen Script (II), `--h3` La Belle Aurore (III). In-world text only.
- Typeset: `--ts` Alegreya, `--sc` Alegreya SC (small caps for anything the system says: kickers, page numbers, buttons, the night's sentence in italic). `--mono` Courier Prime for costs and the board's counts.
- The board's own colours live in `board.js → THEMES.diary`.

## Geometry of the book
The photo is 1715×917, shown at 1280 wide (scale 0.7464). Spine at x=860 → **642px**. Each page crop is 640×790 starting at y=60 → **478×590 at top 45px**. Right page occupies x 642–1120, left page 164–642. Red margin lines sit 61px into the right page and 38px into the left, so right pages pad 78px left and left pages 54px. Page numbers in Alegreya SC 11px at the outer bottom corners.

## The book (`.book`, `.sheet`, `book.js`)
- Two base `.page` layers (inside cover left, last page right) sit directly on the photo; they are transparent, the photo is the paper.
- Five `.sheet`s stack on the right. Each has `.front` (odd page, background `page-right.jpg`) and `.back` (even page, `rotateY(180deg)`, background `page-left.jpg`). A sheet turns with `transform: rotateY(-180deg)` about its left edge, 0.95s `cubic-bezier(.45,.05,.2,1)`, `perspective: 2600px` on the book.
- z-order: unturned sheets `N - i + 6` (first on top), turned sheets `i + 1` (last on top), the turning sheet `50` for a second. `book.js` owns this.
- `<lw-board still="true|false">`: only the sheet on show animates; `book.js` flips the attribute.
- Spreads and labels: 0 Night 1 · dusk, 1 Seen, 2 The decoy, 3 Dawn, 4 The fall, 5 Sorrel II · III (labels live in `data-labels` on `.book`).

What the pages hold (the accumulated feel is deliberate: I writes carefully and large, II smaller and brown, III finer and blue; page 8 holds one sentence):
1. Sorrel I, night 1 · dusk. Margin: night 1, tally, → 19, nursery · shallow, 2 sweepers, decision: STAY.
2. Stayed; tick 31, seen; the crossed-out line.
3. "where they stand": taped map (scene `located`).
4. Tick 33: decoy east, run south. Margin: decoy −4, 19 → 15, RUN.
5. "the decoy": taped map (scene `decoy`) + typeset footnote.
6. Dawn: counted 23, two in five go on, chose hush.
7. Night 2: trackers; small taped map (scene `scout`, the belief heat).
8. Night 3: the night's sentence, typeset; then only "We should have run." in Sorrel II's hand; a charcoal smudge.
9. "where she stayed": taped map (scene `fell`); "— Sorrel II. We are four. She left us Teeth."; heirloom footnote.
10. Sorrel II's fall (caught in the open); "There is no twin for running."; Sorrel III begins.
11. Last page: "If none of us sees a dawn, this book closes." · "That was the last warren." · "Here is what happened to one family. You can make another." · **Watch a night →** (`play/`, the bot plays seed 1) · Leave your name.

## What we decided (`.torn`, `.foldout`, `.slip`)
Three torn pages (Stay / Run / Attack) with the red team's entries verbatim and a typeset `Rule` footnote each. The fold-out is a live `<lw-board scene="hidden" cell="24">`: hover shows the race chip (our ticks vs theirs, moss if we win, blood if not), click runs there. Four slips for Decoy −4, Rearguard −5, Scout −3, Dig −8.

## How it works (`.spread`)
Left page: the rules (+1 person, +1 hunter step; 54 ticks), the verbs, the hunters (Sweepers → Trackers → Listeners → Hounds, with the glyphs), the working. Right page: dawn, the line, the three closing lines, the chronicle so far. Then the $5 card (God Mode copy word for word from GOD-MODE.md: one ad a day, then another hour, no ad, until tomorrow; God Mode here = replay the night from the twin's tick) and the letter box.

## Interactions & behaviour
- Turning: click any page (right pages turn forward, left pages turn back), arrows, dots, keyboard ←/→. Auto-turn every 7s stops on first interaction and while the tab is hidden.
- The fold-out board is interactive; the in-book boards are display only (the sheet click turns the page).
- Letter box: `kit.js` posts to Kit, shows "Written down…", handles Kit's quarantine URL and errors in the note line. Never shows the address back.
- Reduced motion: animations and transitions are off; the page turn becomes a cut.
- Focus: 2px `#d2bb86` outline, 3px offset.

## The meta-loop (next, in the game)
The book should be generated from a real line. Each entry maps to events the sim already emits: the opening (`size`, warren kind/depth, hunter count at dusk), located (`watched`, ring forming), a spend (decoy/rearguard/scout/dig with the −N), dawn (count, remnant, boon), the night's sentence (`ui.js` already writes it), the twin line, the heirloom pick, the line ending. Margin notes are the numbers; entries are the sentences. One hand per generation, cycling through the three.

## Not in this package
Mobile; a real recorded run; the studio switcher (`switcher.js` at the repo root drops in as on the other sites); OG image; the `play/` build (serve `dist-the-last-warren.html` there with the bot on seed 1).
