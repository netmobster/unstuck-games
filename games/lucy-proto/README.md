# Lucy — rough prototype (throwaway)

Ferret Bowling: Lucy Edition, the "explore the house" shape. **Prepare Lucy. Open the door. Get out of the way.**
Placeholder floor plan, placeholder content, a real deterministic sim. Not the game; the test of whether the game is there.

```bash
bun run --cwd games/lucy-proto dev     # http://localhost:5193   (?seed=42 pins a Lucy)
bun run --cwd games/lucy-proto smoke   # SEEDS=400 by default; writes reports/smoke-*.md
```

## Decisions it's built on (Jay, 2026-09-14)
- **Space:** the house, room by room. Rooms open as the journal grows.
- **Prep:** up to two of five everyday items; all ten pairs do something neither does alone. Plus a God Mode bath.
- **Payoff:** her day (a log and one sentence) plus a journal of things you've learned about her. No distance, no score.
- **Input:** one treat squeak per run. She may or may not care.
- **After a few runs:** her stash grows, she forms habits, and moods meet habits in rituals.
- **Run length:** until she naps.
- **Tone:** adorable, cute, weird. Not chaos, not danger.
- **Lucy canon (Jay):** her towel lives in the bathroom (she hides in it after a bath); her favourite shoe is where she randomly naps mid-run.
- **Mood carries over:** 10–20% of how the last run left her (hyper, sleepy, grudgy). Your prep only goes so far if she isn't in the mood. The cage is becoming a game of its own.
- **God Mode:** a bath. Post-bath zoomies, drying off on everything, then her towel. It washes away a grudge.

## How the sim works
- **Moods change attention, not stats.** Each item multiplies how interesting tags are (fabric, food, hide, water, noise, warm…). Snacks, sock, insult and salmon are open from the start; the squeaky toy opens through the journal. Every one of the ten pairs has a combo.
- **Decisions:** math ranks everything she could do nearby; the seed picks among the top three, weighted, never always-best (The Sims lesson). She "notices" before acting, and every log line records *because:* its cause.
- **Separate dice:** Lucy's choices, log wording and the house (what turns up, what you put back) use separate seeded streams. Changing the prep never reshuffles the house, which keeps twin tests honest.
- **Persistence:** a session is `seed + runs[]` (prep + squeak tick), replayed. Stash, habits, arrivals and journal all come from replay.

## Files
`src/house.ts` rooms, doors, objects, arrivals · `src/sim.ts` Lucy · `src/main.ts` viewer · `scripts/smoke.ts` smoke tests · `SPRITES.md` the art list for the red team.
