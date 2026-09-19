# The roll mechanic — briefing for CC

**Reference build:** `seren/table.html` (flat HTML, one script). The tray lives at
`<div class="tray" id="tray" hidden>` inside `<main class="page">`; the behaviour is the
block under `// The tray:` in the script. Open the page, click **Roll it** (or the
ROLL ASKED insert) to see it.

## What the player sees, in order

1. **Seren asks.** A ruled insert appears at the end of the stream, oxide rules,
   label `ROLL ASKED`, text names the check and the modifiers in plain words:
   *"Wisdom (Perception), Ser'en. Listening at the hedgerow. WIS +3 · proficiency +2 ·
   advantage from the dog"*. Right-hand cell reads `OPEN THE TRAY`. The insert is
   clickable; so is the suggested-action chip **Roll it**.
2. **The tray rises** over the story (`trayIn`, 450 ms, from 24 px below, slight scale).
   Dark slip, 340 px wide, centred over the page, sitting above the composer. Header:
   `WISDOM · PERCEPTION` left, `ADVANTAGE` and a ×  right. Two dice tiles: the kept die
   in bone, the dropped die recessed dark. Maths cell: `2d20, higher + 5`. One button: `ROLL`.
3. **Rolling** (~950 ms). Both tiles cycle random faces every 70 ms and jitter
   (`dieRoll`, kept die 350 ms, dropped die 400 ms reversed so they never sync).
   Button is replaced by the word `ROLLING`.
4. **Settle.** Faces stop on the real result; higher goes to the bone tile, lower to
   the dark one. Kept die pulses once (`settle`, 700 ms, ember ring fading outward).
   Maths cell becomes `14 + 5, higher of two` with the total large beneath. Status line:
   *"Written to Record as e014. The DC is Seren's; you will see it there."*
5. **Commit** (1.9 s after settle). Tray leaves. In the stream the ROLL ASKED insert is
   replaced by the result insert — `e014 · SER'EN · Listening at the hedgerow · d20 14 + 5,
   took the higher of two · 19 vs 15 · HELD` — followed by the narration that depends on the
   verdict. Record gets a new top row, tinted for one view. The RECORD ribbon glows
   (`ribbonGlow`) until the player opens it. If the check held, NOW and QUESTS update too.

## Rules the UI encodes

- **The player never sees the DC before the roll.** The tray shows inputs only. The DC
  appears in the result insert and in Record, after the fact.
- **Every roll produces exactly one Record row and one stream insert**, same id (`e0nn`).
  If those disagree the Record is right. Nothing in the stream is edited after commit
  except the ROLL ASKED insert, which is *replaced* by its result, not deleted.
- **Verdict vocabulary is two words:** `HELD` (green `--held`) / `DID NOT` (oxide).
  Resource spends and untargeted rolls show `—`.
- **The engine owns randomness.** In the reference it is `Math.random()`; in production it
  is whatever writes `ledger.jsonl`. The tray is a *view* of a roll, not the roller — it must
  render the numbers it is given, never generate them client-side.
- **Advantage/disadvantage is visible as two dice, one kept.** Straight rolls show one tile.
  Never hide the dropped die; that is the whole point of showing the maths.
- **× closes without rolling.** The ROLL ASKED insert stays in the stream. Seren may ask
  again; the player may act otherwise.
- **Nothing in the tray is a component for banned content.** No DC field before the roll,
  no foe stats, no clock.

## Hooks a real build needs

| moment | fires | payload |
|---|---|---|
| Seren requests a check | insert `{t:'ask', check, mods[], advantage?}` | renders ROLL ASKED |
| player opens tray | UI only | — |
| player presses ROLL | `POST roll {check, mods}` → engine | engine returns `{id, dice[], kept, mod, total, dc, ok}` |
| result arrives | replace ask → `{t:'ins', …}`; unshift Record; flag ribbon | the same object, one source |
| Seren narrates | `{t:'p'}` appended after the insert | ordinary stream item |

Timings (450 / 950 / 700 / 1900 ms) are tuned for feel; keep the roll animation running
until the engine responds rather than to a fixed clock — the reference fakes this because
it has no engine.

## Tokens used

`--oxide #b6472c` mechanics voice · `--held #4f7a4a` · `--ember #e07a58` glow on dark ·
`--slip-dark #2a231b` tray · `--bone #efe4cc` kept die · Cormorant Garamond for numbers,
Work Sans 10.5 px / .14em letter-spacing for labels.
