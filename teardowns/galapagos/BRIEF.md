# Ferret Bowling: Lucy Edition — gameplay build brief

Jay + red team, 2026-09-14, incorporating CD's page (`cd-ferret-bowling-reference.html`, whose own CC brief band says the same things). **Not gospel**: the teardown tests it. Condensed faithfully; Jay's lines kept.

> **Prepare Lucy. Open the door. Get out of the way.** Everything else is implementation.

## The game
A launcher game about a long animal. Lucy lives in a cage. The player does not throw her or steer her: they prepare her, choose her environment, open the cage, and get out of the way. *Aim is a suggestion.*

**Mechanical DNA, lifted sideways (not a clone of any):**
- **Galápagos** (tombstone) → autonomous creature, indirect control: influence, release, observe the consequence.
- **Learn to Fly** → preparation + experimentation before each attempt, progression.
- **Shopping Cart Hero** → launcher structure, distance, escalating environments.

**What we're testing:** what happens when the launcher payload has opinions?

## Core loop
1. **Prep Lucy's mood.** Snacks → zoomies · wound-up sock → energy / wilder route · whispered insult → offended / unpredictable · purple salmon → insane bouncing, wall ricochets. **Behavioural modifiers, not RPG stats.** Numbers may exist underneath; the player thinks "what will this do to Lucy?", never "which loadout has the highest DPS?"
2. **Choose the floor.** Kitchen linoleum (fast · true) · hall floorboards (grippy · sudden) · long runner rug (slow · she burrows) · later Woodbine Mall (polished · long · unsupervised). Different behaviours, not bigger multipliers.
3. **Open the door.** The player loses control. No steering. Watch the result of the prep.

## The run (CD's solution, preserve it)
Rear-view Lucy · five hard-swapped poses, no cross-fade · camera behind · Lucy doesn't scale much · environment gives depth · shadow/tilt/position give pseudo-3D · hallway moves toward camera · speed shown by seams and stacks. 2D pretending to be 3D; no 3D engine.
*Lucy is expressive before the run; physical during the run.*

## Things in the hallway (not chosen by the player)
Slipper (worn as hat: distance up, accuracy gone) · good rug (takes the lamp: chain reaction) · toilet-paper roll (unspools: +1 roll/s) · static from the runner rug (ricochet, 3 walls) · the cat (unscorable, worth it) · impossible momentum (physics complaint filed).
**The player creates the conditions. Lucy creates the chaos.**

## Progression
Rolls are the currency: Lucy knocks things over → rolls → longer, stranger environments. **Progression is the house, not the ferret.** No health, lives, death, resurrection, energy, vet bills, attempts remaining.
*SHE ALWAYS COMES BACK. THAT IS NOT A MECHANIC. IT IS JUST TRUE.*

## The goal
The player builds a model of Lucy: not "purple salmon = +18% velocity" but "purple salmon makes Lucy insane" → "what if insane Lucy gets the rug?" → "oh my god."

**Biggest red-team warning: not an optimization game.** No collapse into food → stat → optimal build → max distance → upgrade. The player never fully solves Lucy. A bad run can be funny; a weird pickup can beat a high score. "UNSCORABLE · WORTH IT" is a feature.

## Money + God Mode
Free is the whole game. $5/month: no ads, God Mode, all floors, bonus hallways, every Unstuck game. Never energy, lives, premium socks, or a ferret behind a paywall. One ad = one hour of God Mode (preserved pickups, deliberate interventions). *God Mode is a magnifying glass and a box of matches. It isn't the game.* The page's money copy is frozen.

## Technical priorities
Smallest simulation that answers the central question: deterministic seed · deterministic Lucy behaviour · behavioural modifiers · surface modifiers · collisions/obstacles · pickups · distance · rolls · progression · run replay/debug. Not 50 foods, 30 floors or an equipment system.
**First prove:** can changing Lucy's preparation produce visibly and mechanically different runs that are fun to watch?

## Art
Five rear-view run poses; expressive front poses for page/prep. Few reusable objects; toilet-paper rolls as simple transparent sprites CD can rotate/scale. Objects that need no Lucy-specific animation (a hat) are disproportionately valuable.

## Red-team success test (20–30 runs)
1. Do I care what Lucy is going to do? 2. Can I tell why she behaved differently? 3. Do I want to try a different preparation? 4. Does she produce "WHAT THE FUCK, LUCY" moments? 5. Do I want the next hallway because it changes what might happen?
Yes → keep building. No → don't add progression; fix Lucy.

## CD's design belief
*You don't aim the ferret. You aim the ferret's mood.* Lucy is already perfect; the player changes conditions; the hallway changes possibilities; Lucy decides; the player watches.
