# Bad Monkeys — UI handoff

`index.html` is a single flat file, no build, no dependencies except Google Fonts. Open it in a browser. It contains all three screens (LANDED / AWAY / VERDICT) plus a dev panel bottom-left.

One file on purpose: the three screens share the CSS, the grime system and the voice/material system. Three files would triplicate all of it and drift within a week.

## What to read first

The header comment block in `index.html` is the real spec. Short version below.

## The one rule

The screen is **Jame's workbench**, not the Prestige's dashboard. Her log is **evidence, not an inventory** — the reading order is the game:

> what she did → what's on the ship → today's problem → the ridiculous part → what I'll say

Protect that sequence. The Prestige gets exactly **one** clean white strip (the ticker at the top). Everything else is hers: paper, tape, handwriting, crooked angles, grime. Those are narrative, not decoration — don't normalise them into a single `Card` component.

## Four voices = four materials

| Voice | Material | Face |
|---|---|---|
| NOT BETSY | cream paper, taped | Caveat (handwritten) |
| THE PRESTIGE | white form, square, untaped | IBM Plex Mono, caps |
| JAME (you) | yellow post-it, taped | Pacifico (pink marker) |
| SYSTEM | dark pill | IBM Plex Mono, small |

Never render two voices with the same material. That contrast is how the player learns who's talking with no tutorial. A fifth voice needs a fifth material.

## Grime — one number, `--g`, 0..5

One CSS custom property on `#root` drives every degradation effect. Every effect is a `calc()` off it, so there's no separate "dirty theme" to maintain.

| `--g` | Look |
|---|---|
| 0 | Clean. Steel-hull grey ground, straight bench planks, soft shadows, square paper corners. About as organised as the marketing site. |
| 1 | Default. Ground warms toward wood, faint rust at the edges. |
| 2–3 | Rust bleeds in, shadows lose blur and gain a hard pixel offset, paper picks up inset stains, bench planks tilt and widen. |
| 3+ | Paper corners tear (`clip-path`), the layout jitters in 2-step frames, the Prestige strip flickers and chips its bottom edge, headings get pink/sage chromatic fringing, the hull grows rust bolts and crack lines. |
| 5 | Unhinged. |

**Grime is not an art setting.** Derive it from the sim:

```js
g = clamp(0, 5, (smudge - target) / 2)
```

How far past the Prestige's tolerance she is. The UI decaying *is* the audit going badly. See `grimeValue()` / `applyGrime()`. Dragging the dev slider sets `S.grime` and overrides the derivation until reload; set it back to `null` to re-derive.

To wear a **new** object: give it one `.wear-sm|md|lg` and one `.torn-a|b|c|d` class. Nothing else. The four `.torn-*` variants chew different corners so no two pieces of paper tear alike.

`prefers-reduced-motion` kills all animation; the static grime still applies.

## Part count — 8 hardpoints, then a sled

The hull has **eight** hardpoints (`HP`). Parts 1–8 mount at those fixed positions. Part 9+ do **not** get hardpoints — they tow behind on a **sled** with a `+N` badge. Deliberate: the hull stays readable no matter how much junk she's bolted on, and the sled is funnier than a scrolling list. If you add hardpoints, keep the sled for overflow.

Module art is **kit-bashed**, not per-part drawings: seven category silhouettes (`SHAPES`) × an accessory stroke, all centred on 0,0 so they drop onto any hardpoint. **A new part only needs a category, never new artwork.**

Module fill encodes state:

- grey — idle
- pink — solves *this* planet's problem tag (also prints "this one!")
- yellow stroke + ✦ — kept past the stop (God Mode)
- dashed + faded — tidied away by the Prestige

`solves` is matched against the planet's `tag`, lowercased. Every part must have both an `up` and a `down` — every positive has a negative is the rule.

## Wired interactions in this file

- Click any module on the hull → selects it, updates the hang tag.
- **Try it on the problem** → spends a try, stamps RESOLVED or NOTED on the work order, raises smudge (success smudges too — that's the point), and the grime follows.
- **✦ keep past this stop** → the God Mode toggle. One ad = one hour = one part survives the shed. That's the whole monetisation surface; don't add a second thing to sell.
- Circle a goal, circle one of three last-words → the post-it. Changing the words updates her log header immediately.
- **Leave her for a week →** → AWAY. Days pass, blips resolve from dashed-unknown to solid-known, rumours accumulate in their own voices.
- VERDICT → band and score derive from smudge; the why is written over their form in marker. The ending is a sentence, not a score.

## Delete before shipping

`.devpanel` (markup, CSS block, and the handlers under "DEV PANEL handlers"). Everything else is game UI.

## Placeholder vs. real

All content in the `DATA` section is placeholder, authored to show the *shape* of each record — parts, log entries, rumours, whys, the planet. In the real game these come from the generation/seed layer. The `TILTS` array is cycled rather than random so the layout is stable across re-renders; keep that.
