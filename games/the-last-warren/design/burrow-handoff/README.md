# Handoff: The Last Warren · "Burrow" restyle

## Overview
A restyle of the Play screen of *The Last Warren* (Unstuck Games) in the **Burrow** direction: black ground, moss / blood / gold as faint glow, almost no chrome. The board is drawn as a survey map read in the dark: hachured mountains, ruled water, stippled forest, dashed roads, ink symbols for warrens, glowing tokens for the troop and the hunters. The rules, the numbers, the 28×18 grid and what the player can see are untouched.

Open `index.html` in a browser. No build step, no dependencies beyond two Google Fonts.

## About the design files
Everything in this folder is a **design reference written in plain HTML/CSS/JS**. It is a mock, not the game: `demo.js` fakes ten board moments with a tiny simulation so the board moves; the panel numbers are illustrative. The task is to **recreate this look inside the real game** (`games/the-last-warren/`, branch `ideas/the-last-warren`): the art seam is `ui.js` (`draw()`) and `style.css`; nothing in `src/` needs touching.

That said, `board.js` is written to be portable: it draws from a plain state object, carries no mock logic, and can be lifted into `ui.js` more or less whole. `style.css` can replace the game's stylesheet section by section.

## Fidelity
**High-fidelity.** Colours, type, sizes, spacing, motion timings and the board symbology are final for this direction. Copy is the game's own; where the mock invented log lines (`demo.js` / `app.js`), the game's real log wins.

## Files
| File | What it is | Port target |
| --- | --- | --- |
| `index.html` | The Play screen: header, dawn line, board, panel, verbs, "show the working" | `index.html` of the game |
| `style.css` | Tokens + all chrome styles. Classes documented inline | `style.css` of the game |
| `board.js` | `LWBoard`: terrain layer builder + `draw(ctx, view, state, t)`. Pure drawing, no game logic | `ui.js` → `draw()` |
| `demo.js` | Mock only: the map, ten board moments, a toy sim, `<lw-board>` element with hover/click. **Do not port**; read it to see how the board state is built | — |
| `app.js` | Mock only: panel copy per moment, the moment stepper, keyboard flashes | — (the panel markup in `index.html` is the reference) |
| `assets/*.svg` | Layered 64×64 SVGs of every board token in this style (see `assets/README.md`) | sprites, if the game prefers images to canvas paths |

## Design tokens
Colours (`:root` in `style.css`, mirrored in `LWBoard.THEME` in `board.js`):

| Token | Value | Meaning |
| --- | --- | --- |
| `--bg` | `#070806` | page |
| `--ground` | `#08090a` | the board |
| `--ink` | `#e4ddcc` | text, warren outlines, counts on hollow tokens |
| `--mute` | `#8f8a76` | labels, secondary text, keys |
| `--line` | `rgba(228,221,204,.10)` | hairlines (the only "boxes") |
| `--moss` | `#8fbf63` | **you / alive**: troop, current warren ring, your route, tracks, STAY, log lines about you |
| `--blood` | `#e2654c` | **them / danger**: hunters, their gaze, the siege ring, located, ATTACK, bad log lines, a race you'd lose |
| `--gold` | `#d2b052` | **knowledge / time**: dawn line, belief heat, Watched threads and pips, the line's name, on-trail pip |
| glows | colour at `.35` alpha | `text-shadow: 0 0 14–28px`; on canvas `shadowBlur = 0.45 × cell` |

Terrain inks (canvas only): forest `rgba(143,191,99,.55)` on tint `.06`; lake `rgba(130,160,200,.5)` on tint `.07`; mountain `rgba(220,210,190,.45)` on tint `.04`; road `rgba(228,221,204,.45)`; survey crosses ink at `.18` every 4 cells.

Type:
- `--fs` **Big Shoulders Stencil Display** (Google Fonts; `Big Shoulders Stencil` / `Saira Stencil One` / Impact as fallbacks). Verbs, the big count, status, section names, the title. Letter-spacing `.04–.06em`, always uppercase.
- `--fm` **JetBrains Mono** 400–800. Everything else: body 12.5px/1.5, labels 10–11px with `.12em` tracking uppercase, counts on the board 700–800.

Radius `3px` everywhere a radius exists. Spacing: page gutter 28px, column gap 28px, section gap 18px, 14px padding above each hairline.

## Screen: Play (1440 wide, desktop)
Layout, top to bottom (`index.html`):

1. **Header** `.hdr` — one baseline row, 18/28/12px padding, mono 11px uppercase `.12em`, muted. Title in stencil 24px ink. "Line · Sorrel I · no heirloom" with the name in gold + glow. "Night 1" with the number in ink 14px/700. Tabs right-aligned (Play · Chronicle · CD brief), current tab in ink.
2. **Dawn line** `.dawn` — a 2px track at gold `.14` across the full content width; the filled part is gold with a 10px glow; `"23 / 54 to dawn"` in gold 11px at the right. Width transition `.6s ease`.
3. **Body** `.layout` — grid `1008px | 1fr`, gap 28. Board 28×18 at 36px cells (1008×648). No frame around the board; the board's own vignette makes its edge.
4. **Panel** `.panel` (356px) — a text column, hairlines between sections:
   - count in stencil **112px/.86** moss with glow, then the sentence (`in a shallow Nursery warren`) in mono ink
   - status in stencil 26px uppercase: moss (hidden, holding, in transit), blood (located, besieged), ink (dead)
   - stats `dl`: strength / noise / growing / watched; labels muted, watched value gold
   - the odds sentence (`Holding here you'd beat 1 sweeper (71%), not 2 (24%).`)
   - **This warren** (hidden when not in one): kind glyph 26px + `NURSERY · SHALLOW` stencil 22px; gift in moss, cost in blood, depth note muted
   - **Hunters · N**: glyph (shape = kind, blood with a 4px drop-shadow glow) · name · state in blood 11px · count in blood, right-aligned
   - **Log**: numbered mono 12px; the latest line full opacity, earlier lines `.6`; coloured by meaning (you moss, them blood, knowledge gold, else ink)
5. **Verbs** `.verbs` — a hairline, then one baseline row of stencil words: `STAY` 32px moss + `SPACE · HOLD`; `ATTACK` 32px blood + `A · 71%` (or `A · NONE IN REACH`, disabled); a gap; `DECOY −4 D`, `REARGUARD −5 R`, `SCOUT −3 S`, `DIG HERE −8 G` at 24px ink with the cost in muted mono. Disabled = opacity `.3`. Hover/pressed = 2px underline, 6px offset. No boxes.
6. **Foot** — the one-line instruction in muted 11px, and `SHOW THE WORKING` in gold uppercase at the right. It toggles `.working`: Seed input, rules select, player select, `NEW RUN` (outlined), `Replay this night` (gold text). Underline-only inputs.

The `.moments` stepper above the header is review scaffolding; delete it.

## The board (`board.js`)
`LWBoard.terrainLayer(terrainAt, cell, dpr)` renders the ground once to an offscreen canvas (rebuild on map or cell change). `LWBoard.draw(ctx, {cell, terrain}, state, tSeconds)` paints a frame in this order:

1. terrain layer
2. **belief heat** (Scout only): per-cell gold at `v × .5` alpha, rounded 2px, shimmer `±8%` at 1.3 rad/s
3. **tracks**: two moss pips per cell, alpha fades with `age` 0→1 (14 ticks)
4. **route** (hover preview or committed transit): dotted line `lineWidth .085c`, dash `[0.01, .36c]`, animated offset; ring at the destination. Moss when you win the race, blood when they do
5. **warrens**: outline radius `.36c`, filled with ground to mask terrain. Kind = shape: Combat 16-point toothed polygon (+ zigzag inside), Scout lens (+ pupil), Defense circle (+ inner wall + dot), Nursery circle (+ 3 brood dots). Depth = line: deep `.11c` (≥2.6px), mid `.065c`, shallow `.04c` dashed. Current warren: moss ring at `.5c` with glow. Hovered: ink dotted ring
6. **siege ring**: a diamond 3.5 cells out, blood, `.07c`. Draws itself in over **1.4s** (dash grows along the perimeter), then pulses alpha `.55↔1` on a 1.4s cycle with a marching dash. `ringSolid` (besieged): solid `.09c`
7. **hunter gaze** (searching): sweeper, a 2.6c fan `±0.5 rad` swinging at 0.9 rad/s; tracker, a thin 3.6c beam breathing; listener, two expanding rings; hound, a dashed dart that lunges. All blood at low alpha
8. **watched threads**: gold lines from each hunter in reach / on your trail to the troop; dotted when watched 1 tick, dashed to 3, solid beyond
9. **hunters**: sweeper square, tracker triangle, listener thick ring, hound diamond; `s = .3c`; blood with glow. In reach: blood ring at `.47c`. Mustering: dotted ring. On your trail: gold pip top-right
10. **decoy**: small dashed moss ring `r .2c` marked `d` with two speed lines; `seen` adds a dashed blood ring
11. **rearguard**: moss rounded square `.26c` with its count in ground colour; `fighting` shakes `±.03c` at 14 rad/s with three blood strikes
12. **troop**: radius `.43c`, breathing `±4%` on a 2.6s cycle, **1.3s once located**, still when besieged or dead. In a warren: solid moss disc, count in ground colour. Holding: hollow moss ring `.13c`, count in ink. Transit: dashed hollow ring with marching dash, count in ink. Dead: ink dotted ring with a slash. Located: rotating dashed blood ring at `.62c`. Besieged: solid blood ring. Watched N: up to 8 gold pips on an arc above
13. **light**: radial vignette to black (`.75` at the edges, `.9` when dead); located → the edges run blood-warm, pulsing with the ring; dawn → gold wash from the east breathing slowly
14. **label chip**: `600 12px` mono on `rgba(8,9,10,.94)`, 3px radius, 1.5px border in the race colour. Hover: `Scout (sees belief, thin walls) · deep · you 9t · them 13t` / `forest: hidden and quiet · hold here · you 3t · them 9t`. Transit: `Scout · deep · 4t`, then `Scout · deep · in.`

### Board state
What `ui.js` should hand to `draw()` each frame (see `demo.js → boardState()` for a worked example):

```js
{
  warrens: [{x, y, k: 'C'|'S'|'D'|'N', d: 'deep'|'mid'|'shallow'}],
  current: index into warrens, or -1,
  hover: {x, y} | null,
  troop: {x, y /* floats while in transit */, n, state: 'warren'|'holdOpen'|'holdForest'|'transit'|'dead',
          located?: bool, besieged?: bool, watched?: ticks},
  hunters: [{x, y, k: 'sweeper'|'tracker'|'listener'|'hound', reach?, trail?, muster?, ph?: phase}],
  ring: bool, ringSolid: bool, ringAge: seconds since the ring started forming,
  heat: Float32Array(28*18) 0..1 | null,
  tracks: [{x, y, age: 0..1}],
  route: {path: [{x, y}], win: bool, label: string} | null,
  decoy: {x, y, seen} | null,
  rearguard: {x, y, n, state: 'waiting'|'fighting'|'held'|'fell'} | null,
  light: {warm, dark, dawn}
}
```

## Interactions & behaviour
- Hover any square: route preview + race chip. Click a warren: run for it. Click any other square: go there and hold. Click a ringed hunter: attack (not simulated in the mock). `Space` stays a tick, held repeats. `A` attacks the weakest in reach. `D R S G` spend. The mock flashes the verb on keypress; the game does the thing.
- **Transit** plays itself out at **220 ms a tick**; the token goes hollow and dashed, the route counts down, tracks fade behind over 14 ticks (tracks variant only). Hunters step each tick.
- Verbs grey to `.3` opacity when unaffordable or the moment is wrong (`Dig here` also when already in a warren). Attack shows its odds in its key label.
- Disabled is never colour alone: opacity + the key label text.
- Focus: 1.5px gold outline, 3px offset.
- Reduce motion: not handled in the mock; wrap the breathing, pulse and gaze sweeps in `prefers-reduced-motion` and leave the state cues (ring drawn, located ring, besieged ring) static.
- Desktop only at 1440; the board runs 14–40px cells in the game and every size in `board.js` is a fraction of the cell with pixel minimums, so it holds at 14px.

## State the panel needs
`night`, `dawnTicks` (of 54), `count`, `where` sentence, `strength`, `noise`, `growing`, `watched`, `status` + which meaning it belongs to, the odds sentence, the current warren (kind, depth, gift, cost, depth note) or none, hunters (kind, name, count, state phrase), the log (lines with a meaning each), attack odds or none, affordability of the four spends.

## Not in this package
The dawn draft and "the warren fell" dialogs, the chronicle, mobile, and the boon / spend / heirloom icons. They come next in this direction; the voice to follow is already here: stencil for the sentence that matters, mono for everything else, hairlines instead of boxes, one meaning per colour.
