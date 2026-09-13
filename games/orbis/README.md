# Orbis

An ant farm you watch evolve. Change the conditions. Or just breathe. See [RULES.md](RULES.md).

```bash
bun install                 # from the repo root
bun run --cwd games/orbis dev
```

Open http://localhost:5188 · add `?debug` for the dev console · `?seed=42` to replay a world.

| Command | What |
|---|---|
| `bun run test` | Hard invariants (must pass) |
| `bun run sweep --seeds 30 --minutes 15 --grid` | Experience metrics across the dial grid → `reports/` |
| `bun run sweep --seeds 30 --minutes 4 --causal` | Does moving a dial produce a perceptible change? |
| `bun run build` | Production build → `dist/` |

Keys: `Space` pause · `B` breathe · `M` music.

## Layout

- `src/sim/` — deterministic world (no DOM). Same seed → same world.
- `src/render/` — canvas renderer + aurora background
- `src/audio/` — music bed + sliced SFX voices (behaviour is sacred, see RULES.md #5)
- `src/game.ts` — fixed-step loop, time skip, God Mode state
- `src/ui.ts`, `src/debug.ts` — player UI, dev console
- `public/audio/` — Jay's Suno tracks (licensed). SFX trimmed losslessly by `scripts/prepare-audio.ts`.
