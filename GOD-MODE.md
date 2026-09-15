# GOD MODE — spec

**Status: spec only. Do not implement yet.** This locks the economy and mechanics. Implementation waits until God Mode itself comes up on the build queue, and is left alone until then.

## The one sentence

> God Mode requires at most one rewarded ad per game per calendar day; after that ad has been watched, the player may repeatedly activate one-hour God Mode periods that day without watching another ad.

## Core rule

One activation = **one hour** of God Mode, per game.

**ONE AD PER DAY, PER GAME.**

- The first activation on a given day requires watching one ad.
- After that, no further ads are required that day in that game.
- When the hour expires, the player clicks GOD MODE again and gets another hour.
- They can repeat this for the rest of the day.

### Example (Orbis)

```text
GOD MODE → watches one ad → active for 1 hour
one hour later: GOD MODE → click → another hour
one hour later: GOD MODE → click → another hour
no additional ad
```

## The important distinction

The ad is **not** a payment for each hour. The ad establishes that the player has completed the day's optional ad interaction for that game. After that, the game gives them unlimited one-hour activations for the rest of the day.

Do not turn this into any of:

- one ad per hour
- one ad per activation
- ad chains, "watch another ad", rewarded-ad loops
- cooldowns, energy, tickets, currency
- streaks, FOMO, diminishing rewards
- forced ad timing

None of that belongs here.

## Daily reset

The one-ad allowance resets once per calendar day. The exact reset implementation is decided when God Mode is built.

**Invariant: maximum one ad watched per game per day.** The player can then activate God Mode repeatedly without another ad.

## Spin to Win

The daily Spin to Win wheel is **separate** from the ad allowance.

- The wheel can award God Mode hours without requiring an ad.
- Every slice is a win: **1H / 2H / 3H / 5H / 10H / 24H**. No losing slices.
- A player can get God Mode from the wheel without having watched the day's ad.
- If they later activate God Mode through the normal ad path, the one-ad-per-day rule still applies.

## Subscription

The $5/month studio subscription is also **separate**, and is not required to access God Mode.

Free players get:

- complete games
- Spin to Win
- God Mode
- one optional ad per game per day, which unlocks unlimited God Mode activations for that day

The subscription is the studio-wide relationship/convenience layer, not a power gate.

## Design principle

The joke: **the economy? There isn't one.**

The player reasonably expects "surely if I want another hour, I have to watch another ad." Nope. They already watched today's ad. Go play.

The studio deliberately leaves that monetization opportunity on the table. The resulting "economy" is essentially guilt at getting for free what you feel you should have to pay for. **Do not manufacture that feeling with UX tricks. The generosity is the joke.**

## Implementation invariant (for when it's built)

```text
daily_ad_watched(game, date) = true
        ↓
God Mode activation available
        ↓
1 hour
        ↓
expires
        ↓
activation available again
        ↓
1 hour
        ↓
repeat indefinitely that calendar day
```

Ad state and God Mode hour state are **separate things**:

- **Ad state:** have we watched today's ad for this game?
- **God Mode state:** is an hour currently active?

Do not model the ad as an hour-granting currency.

## Not in this spec

What God Mode *does* is per game (Orbis: direct intervention; Bad Monkeys: keep one mutation; Ferret Bowling: God Mode prep such as the bath). This spec covers only how it is unlocked and how long it lasts.

## Live copy that predates this spec

These were written under "one ad = one hour" and don't match the rule above. Update them when Jay asks. Left unchanged for now:

- `index.html` (UNSTUCK homepage):
  - spin section: "Want more? One ad is still one extra hour."
  - ad demo: "Watch one ad → God Mode for one hour."
  - FAQ: "One ad buys an hour of God Mode. When you've had your hour, there's nothing else to sell you."
- `bad-monkeys/index.html`: "One ad. One hour." and "Once you've had your hour there's nothing else to sell you."
- `ferret-bowling/index.html`: "One ad = one hour of God Mode."
- `teardowns/universal-paperclips/*` (CONCEPT-BRIEF, GAME-SHAPE, PRD-TRD): "one ad = one hour".
