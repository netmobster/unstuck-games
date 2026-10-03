# TOMBSTONE · THE LAST WARREN — provisional (red team)

> Filed 2026-10-01 from the red team, as handed over. **Provisional: the organ is named,
> the corpse is not.** Tower defense is a genre, not a game, so it cannot be the tombstone
> (METHOD: one tombstone per game, and we take its organ). The real tombstone research
> follows this file.

**Candidate organ: tower defense.**

## The verdict

Tower defense has the wrong direction of travel.

The living bit isn't necessarily the towers. It's **the tension created by accumulating
defensive strength while an increasingly dangerous enemy approaches.**

Traditional tower defense resolves that tension by giving the player a fixed position and
asking: *How do I make this place strong enough?*

The Last Warren asks: ***How long can I afford to stay here?***

That is the transplant.

## The record

Tower defense establishes an extremely readable loop: **place → grow → upgrade → survive.**
The player establishes a defensive position, improves it, and responds to increasingly
threatening waves.

The genre's spatial assumption is usually fixed: the player owns the territory; the enemy
enters it.

The Last Warren reverses that: the player owns almost nothing; the enemy is searching for
them.

- The "tower" becomes the troop.
- The "base" becomes temporary.
- The map becomes a hiding place.

## The organ

Accumulated defensive strength creates temptation. The longer the player invests in a
position, the stronger that position becomes. But investment also creates exposure.

That produces the useful contradiction:

> Staying makes you stronger.
> Staying also makes staying more dangerous.

That's the organ worth stealing. Everything else about conventional tower defense is
negotiable.

## The transplant

From: *Build the strongest possible position.*
To: ***Decide when your current position has become too dangerous to remain in.***

Every tick — **Player:** gains one person, becomes stronger, gains the benefits of the
current Warren. **Enemy:** advances one block, gets closer to discovering/reaching the
player.

Three fundamental responses:

- **STAY** — become stronger.
- **MOVE** — abandon safety and expose the troop.
- **ATTACK** — use accumulated strength to create space or remove threats.

The entire game can initially exist inside that triangle.

## Why the Warren matters

A conventional tower has a specialization. So does a Warren. But instead of placing ten
different towers, the player is growing one persistent thing.

A Warren might make its inhabitants +30% combat; another +30% defense; another +30%
scouting. So moving isn't simply *new location*. It's ***new version of yourself.*** That
feels like an important mutation of the tower-defense organ.

## What the player doesn't get

No individual unit management. No conventional upgrade tree. No giant tech tree. No fog of
war initially. No tower-placement puzzle. No elaborate enemy AI.

**Time is the upgrade system.** Every tick gives you one more person. That's it. The
strategic complexity comes from deciding when to cash in that growth by moving or attacking.

## Why it might work

The potential emotional beat is extremely simple:

> *I can survive here.*

followed immediately by:

> *But if I stay here, they're going to find me.*

And then: ***One more tick.*** That's the dangerous button. One more person. One more tick.
One more little bit of strength. Until suddenly: **OH FUCK.** And you're moving.

That's much closer to the feeling we want than conventional optimization.

## The other DNA

Useful Unstuck relatives — not tombstones for this game, Unstuck DNA:

- **Elsewhere** — persistent world + consequences + the world continuing without the player.
- **Not Betsy** — absence and a system that continues operating outside direct player control.
- **Orbis** — simple autonomous systems where the interest comes from watching the system behave.
- **Deadline Dungeon** — a constrained system where the interesting decisions emerge from
  actors and mechanics rather than conventional upgrade ladders.

## What The Last Warren takes

The pressure of tower defense. Not its architecture, its towers, its waves or its upgrade
trees. Just:

> *I have invested in this position, and now something is coming to destroy it.*

Then turn the player around. **The thing being defended is the player.**

## Open questions

These are for the first prototype to answer, not to design in advance.

1. **Is complete information actually fun?** No fog initially. If STAY / MOVE / ATTACK
   isn't interesting when the board is visible, fog won't save it.
2. **How vulnerable is movement?** Potentially the game's most important tuning parameter.
   If moving is painless, there's no tension. If moving is suicidal, the player simply
   stays. There needs to be a genuine "fuck it, RUN" decision.
3. **What exactly does "found" mean?** Does an enemy attack the Warren? Reveal it? Begin
   converging? Force movement? Become a persistent threat? Don't solve yet.
4. **What makes Warrens strategically different?** +30% is a great starting abstraction.
   The question is whether choosing a Warren changes *how you want to play*, rather than
   simply making one statistically better.
5. **Is attack actually necessary?** It may be. It may also turn out that STAY vs MOVE is
   the real game, and attack is just the obvious thing we assumed a troop should be able to
   do. That's exactly the sort of thing the prototype should be allowed to kill.

## The smoke test

Don't balance by vibes. Build the tiny deterministic machine and run thousands of worlds.
Specifically discover: **does the system naturally produce a meaningful window where
staying, moving, and attacking are all viable?**

- If one strategy dominates: kill/tune the mechanic.
- If different strategies produce different survival profiles: now we have something.

## The flag for CC

Don't claim tower defense is the tombstone yet. We've identified the organ, not the corpse.
The cleanest current statement:

> **THE LAST WARREN is a sideways resurrection of the accumulation pressure inside tower
> defense: growing defensive strength while an enemy approaches, except the player is the
> tower and the defense is temporary.**

That is strong enough to prototype. Then the actual tombstone research finds the specific
dead game(s) that did something adjacent, and asks the more interesting question:

> ***What did they build that nobody used properly?***
