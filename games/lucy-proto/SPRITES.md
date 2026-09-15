# Lucy sprite list — for red team image generation

**The joke is the duality.** Lucy is painted: warm, hand-inked, the character sheet style (v0.1). **The house is not.** Floors, walls, furniture and objects stay deliberately flat, geometric, code-drawn SVG/canvas, like a floor plan someone left on the table. A real-looking ferret wandering a diagram. So: **only Lucy gets generated art.** Everything else is CC's job, in code.

## Style anchors (attach both to every prompt)
1. The character sheet, *Ferret Bowling · Character Exploration v0.1* (idle, walk, sniff, stretch, sit, back view, top down, the 8 moods).
2. The five-pose rear-view run strip.

## Rules for every sprite
- **Transparent PNG, 512 × 512**, Lucy centred, nothing else in frame.
- **No cast shadow, no floor, no props** unless the row says so (the game draws shadows and held items).
- **Same scale across a set:** in top-down sprites her nose-to-tail-tip length fills about 70% of the canvas width.
- **Top-down sprites face straight up (north).** The game rotates them to her direction of travel, so keep them rotation-safe: no text, no light direction that breaks when rotated.
- **Animation frames** keep the body centre in the same place so frames can be hard-swapped (CD's rule: hard swaps, no cross-fades).
- Warm brown fur, cream mask and belly, dark tail, pink ears and nose, ink outline, exactly as on the sheet.
- **Tone: adorable, cute, weird.** Never scared-in-danger, never hurt. When she's startled she's puffy and dramatic, not afraid.
- File names as listed.

---

## A · Top-down Lucy (the game view, highest priority)

These are what you watch during a run on the house plan.

| File | Frames | What it is |
|---|---|---|
| `top_walk_1..4.png` | 4 | Ordinary trot, legs alternating, tail trailing in a gentle S |
| `top_zoom_1..4.png` | 4 | Zoomies gallop: stretched long, back arched, tail straight out (snacks) |
| `top_sniff_1..2.png` | 2 | Head low and forward, nose working, body still |
| `top_notice.png` | 1 | Frozen mid-step, head up and turned slightly, ears perked (the "!" moment before she acts) |
| `top_carry_1..4.png` | 4 | Walking proudly with head held high and mouth closed on *nothing*. The game draws the stolen item in her mouth. Leave a clear gap at the mouth |
| `top_wardance_1..3.png` | 3 | Sideways hopping war dance, back arched, mouth open (playing) |
| `top_sulk.png` | 1 | Curled with her back turned, tail wrapped around, one eye open (insult) |
| `top_hide.png` | 1 | Only the back half visible, front half "under something" (cut off cleanly at the shoulders so it can sit under a furniture shape) |
| `top_swim_1..3.png` | 3 | Flat as a pancake on the floor doing the breaststroke, legs splayed (purple salmon) |
| `top_roll_1..2.png` | 2 | On her back wriggling, then side-rolled (drying off) |
| `top_startle.png` | 1 | Puffed to twice her size, tail a bottlebrush, all four legs stiff (dramatic, not scared) |
| `top_glare.png` | 1 | Stiff and still, body angled, staring (at her nemesis) |
| `top_dook_1..2.png` | 2 | Happy bouncing, mouth open (coming for the squeak) |
| `top_nap_curl_1..2.png` | 2 | Curled in a donut, nose tucked under tail; frame 2 is a slightly bigger breath |
| `top_nap_pancake.png` | 1 | Flat out, legs splayed behind, completely gone (nap on her spot) |
| `top_burrito.png` | 1 | Just a head poking out of a rolled-up blob. Leave the blob plain cream so the game can tint it as whatever soft thing she's in |

## B · Front-facing Lucy (the cage, the journal, the day card)

The expressive, faces-you poses. The sheet already covers idle, sit, stretch, curious, hyper, stubborn, distracted, scared, lazy, focused, mischievous. New ones for this design:

| File | What it is |
|---|---|
| `front_sock.png` | Sitting up with a sock clutched to her chest, extremely serious |
| `front_insult.png` | Back half-turned, looking over her shoulder with maximum side-eye |
| `front_salmon.png` | Wide-eyed, whiskers out, one paw raised like she's about to dive into the floor |
| `front_towel.png` | Wrapped in a towel up to the chin, eyes half closed, blissed out |
| `front_squeaky.png` | Head tilted hard at a sound only she can hear, one ear forward |
| `front_snacks.png` | Cheeks full, sitting very upright, pretending she's eaten nothing |
| `front_gift.png` | Proudly placing something at your feet (leave the item area empty; the game draws the gift) |
| `front_treasure.png` | Lying protectively over a pile of stuff (the pile can be a plain cream blob for the game to decorate) |
| `front_nest.png` | Sitting in a nest of fabric (plain cream/grey fabric shapes), very pleased with herself |
| `front_foodcoma.png` | Belly up, paws in the air, crumbs on her chin |
| `front_nemesis.png` | Puffed and arched, glaring off-frame to the right |
| `front_forgiven.png` | Soft eyes, slow blink, tiny smile (after the gift) |

## C · Journal stamps (optional, nice to have)

Small round badges for combo discoveries in the journal, **200 × 200**, Lucy's head only plus one simple symbol, same painted style:
`stamp_nest` · `stamp_fishing` · `stamp_revenge` (slipper) · `stamp_bribe` (snack) · `stamp_drying` (towel) · `stamp_puppet` (sock with googly eyes) · `stamp_thief` (squeaky toy) · `stamp_foodcoma` · `stamp_burrito`

---

## Not generated (CC draws these in code, on purpose)
Floors, walls, doors, locked-room hatching, furniture blocks, every object in the house (rug, bin, keys, dryer, the Amazon box…), the cage, the treasure pile marker, the dashed red route line, shadows, the "!" and "z z" marks, and items held in her mouth. Flat, geometric, labelled like a floor plan. The contrast with painted Lucy is the point.

## Suggested prompt shape
> Using the attached Lucy character sheet as the exact style and character reference, paint **[row description]**. Top-down view, facing straight up. Transparent background, 512×512, character centred, no shadow, no floor, no other objects. Same line weight, fur colours and proportions as the sheet. Cute and a little weird, never frightened or hurt.

For animation rows, ask for all frames in one horizontal strip on a transparent background, equal-width cells, body centre aligned across cells. CD can cut them.
