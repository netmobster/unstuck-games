# Judgement OS · the lamp

The mark is the room's lamp: a shade, a beam, one decision under the light.

Files:
- `mark.svg` — the mark alone, transparent. Colour is the `color` attribute on the root (`#c2a46a` gold by default; set `#14110e` for paper).
- `favicon.svg` — the mark on the ink tile, heavier strokes for small sizes. Use this first; browsers that read SVG icons scale it to any size.
- `favicon-16.png`, `favicon-32.png` — tab sizes, rounded tile.
- `apple-touch-icon.png` — 180 px, square tile (iOS rounds it).
- `icon-512.png` — square tile for manifests, stores and social.
- `logo-256.png`, `logo-512.png`, `logo-1024.png` — the mark alone, gold on transparent (for dark grounds).
- `favicon-transparent-16.png`, `-32.png`, `-64.png` — the heavy favicon drawing, gold on transparent, no tile.

In `<head>`:

    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">

Lockup: the mark at 20 px, a 10 px gap, then JUDGEMENT OS in Cinzel 600 with .22em letter-spacing (the page's masthead does exactly this). Stacked: mark above the wordmark, tagline in Space Mono: *NOT AN OPERATING SYSTEM.

Palette: ink #060504 · tile #14110e · gold #c2a46a · title #e8d8b0 · paper #ebe4d5.
