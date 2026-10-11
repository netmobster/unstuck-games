# INFINITE FRONTIER — the tombstone report

> Filed 2026-10-11. The real dig, after the quick [shortlist](TOMBSTONE-SHORTLIST.md) and
> the [pivot](PIVOT.md). Five research passes ran in parallel (about 140 searches in all).
> This box reaches the web only through search results: Wikipedia, Steam and every other
> page fetch failed, so facts are from result snippets and secondary coverage. Anything not
> pinned to a source is marked **(unverified)**, and everything gets checked again in the
> teardown before it is quoted publicly. **Jay picks the corpse.** CC's read is at the end.

## The organ, in Jay's words

> *Taking a constrained game and unconfining it, where your original choices have lasting
> consequences.* Infinite minesweeper was the seed. The frontier keeps growing.

With the pivot's additions, that is four tests a corpse can be held against:

| | **Unconfined** | **Lasting consequence** | **Denizens** | **Space controls the enemy** |
|---|---|---|---|---|
| | A small start that grows outward without a wall at the edge | Early choices stay in the world and shape the whole run | Placed things have behaviour of their own, not a damage number | The player shapes where the enemy can go; the route is what you left open |
| **Dungeon Keeper** (1997) | ◐ dig outward from the Heart, on a fixed 85×85 map | ● the dug, claimed network is the map for the rest of the level | ● rooms do things because creatures use them | ● heroes inherit the tunnels you dug |
| **Dungeon of the Endless** (2014) | ● a floor is opened door by door | ● every opened door is a spawn pool for the rest of the floor | ◐ heroes are autonomous; modules are turrets | ● the power chain is a path you build and can cut |
| **The Settlers II** (1996) | ● territory grows in rings from the HQ | ● the first roads are the trunk the whole economy hangs on | ◐ workers and carriers choose their own routes over your roads | ○ conflict only at the border |
| **Desktop Tower Defense** (2007) | ○ a fixed desk mat | ◐ sell at 75% | ○ guns on a grid | ● the route is the negative space; live reroute |
| **Minesweeper line** (1990 →) | ● infinite variants exist | ● a revealed cell is irreversible | ○ | ○ |
| **Castle Story · Towns** (2012 →) | ◐ | ◐ | ● | ◐ walls steer the nightly attack |

The shortlist's A/B/C split is retired. It assumed a route grammar with a defence layer on
top; the pivot deleted that seam, and the organ as Jay states it is about consequence and
growth, not about whether the road is drafted or drawn.

---

## Candidate 1 · Dungeon Keeper (1997)

| | |
|---|---|
| **Game** | Dungeon Keeper · MS-DOS / Windows 95 · 26 June 1997 (NA), 3 July (EU) |
| **Made by** | Bullfrog Productions, Peter Molyneux producing and co-designing; published by EA, which had bought Bullfrog in 1995 |
| **Status** | Molyneux left the week it shipped. Bullfrog was folded into EA UK by 2001. DK2 (1999). DK3 cancelled March 2000; designer Ernest Adams later said EA's Harry Potter and Lord of the Rings licences ("licences to print money") made an experimental RTS easy to scrap. **The 2014 EA mobile game** made imps take up to 24 hours to dig one block, sold gems from about £5 to £69.99, routed 1–4 star ratings to a private email form, scored 43 on Metacritic, and had its "free" ad banned by the UK ASA on 2 July 2014. EA's CEO at E3 2014: *"We misjudged the economy."* Retired 9 August 2022. The original is on GOG and, since 7 March 2024, Steam at $4.99. KeeperFX, the fan remake, hit 1.0 in November 2023 after fifteen years. |
| **Still mourned** | AnandTech, c. 2003: *"in all these years since DK2 nobody has done anything even remotely like it."* Steam, 2023: DK and Dungeons 3 are *"the closest video games have ever gotten to the dungeon-core genre... KeeperRL still doesn't quite scratch the itch."* Molyneux on the mobile game, BBC, February 2014: *"What? This is ridiculous. I just want to make a dungeon."* |

**How it played, the parts that matter here.**

- **Digging is the verb.** Imps dig flagged earth and then *claim* the floor. Only claimed
  tiles take rooms, traps and doors. Imps fortify walls beside claimed tiles, and in DK1 a
  fortified wall cannot be breached by enemy diggers at all. The excavated, claimed network
  is the whole map the enemy can traverse.
- **Rooms are regions of tiles, and their behaviour comes from use.** A room has a shape, a
  capacity and an *efficiency* that depends on shape and enclosing walls. An efficient
  Hatchery breeds more chickens, an efficient Library researches faster. The Prison starves
  captives into Skeletons; the Graveyard turns ten rotted enemies into a Vampire; the
  Scavenger Room lures enemy creatures to your side; the Temple takes sacrifices. **Creatures
  arrive through the Portal because of which rooms exist and how big they are.** You never
  place a Bile Demon. You build enough Lair and Hatchery, and one turns up.
- **Creatures have needs** (pay, lair space, food, work) and moods. Unpaid or idle or
  starving, they vandalise, fight, or leave through the Portal.
- **Heroes come through Hero Gates** and from strongholds. Tunnellers dig toward your Heart
  (and loot the Treasury first); everyone else walks the corridors you dug. **A Hero Gate is
  killed by claiming every tile around it.** Space is a weapon.
- **Possess** a creature and play first-person with its own abilities.
- **Sell** rooms, traps and doors for gold; players claimed and sold enemy rooms to fund
  their own (refund fraction **(unverified)**).
- Fixed, authored levels of 85×85 tiles; each level a fresh start. No infinite or random
  map ever shipped; KeeperFX lifted the size cap in 2023 but maps are still authored.

**Why it died.** *Orphaned IP and a monetization disaster.* Not the platform, not the
design: it runs today. The creator left, the studio dissolved, the sequel was cut for
licensed money, and the one revival turned the organ, *digging*, into a 24-hour timer with a
gem price. Spiritual successors (War for the Overworld, the Dungeons series, KeeperRL)
cannot use the name.

**Cremation.** The dungeon-lord fiction and its humour. First-person possession as a
feature. The research tree. Spells cast from above. Twenty authored levels. The fixed map.

**Transplant.**

| Dungeon Keeper | Infinite Frontier |
|---|---|
| Dug corridor | **The empty hex**: the enemy's road is what you did not fill |
| Claimed room, efficiency by shape | **A cluster of tiles, and its shape decides what lives there** |
| Creatures arrive because rooms exist | **Denizens are attracted, not placed**: build the bog, a thing comes to live in it |
| Fortified wall nobody can breach | **The tile that does nothing but stay** |
| Hero Gate dies when surrounded | **Surround a spawn to close it**, at a price (the one legal way to break invariant 1) |
| Sell a room for gold | **Destroy a tile** and feed Jay's rng shop |
| Possess a creature | A God Mode candidate: **possess a denizen for the hour** |

**Unstuck.** Dungeon Keeper's players were asked to dig a dungeon; Infinite Frontier's are
asked to *grow a world*, outward, on a phone, where every cluster of ground becomes the home
of something that acts for itself. The enemy walks the gaps.

**What nobody used properly.** The dungeon's topology *was* the defence, and successors
kept rooms as stat buildings and traps as turrets. Nobody built the game where shaping the
void is the first-class system and rooms stay places creatures behave in.

**The few changes that make sense now, if this is the corpse.** Denizens come to tiles,
you don't place them: the draft offers *ground*, and a shape of ground earns its creature.
That is one of Jay's established beats ("each placed hex represents a piece of the world
with a denizen") read sideways, and it is what makes this not DTD with biomes. Destroy stays
a verb, and sells into the shop.

---

## Candidate 2 · Dungeon of the Endless (2014)

| | |
|---|---|
| **Game** | Dungeon of the Endless · Windows/Mac · Early Access 11 Dec 2013, 1.0 27 Oct 2014 · iPad 2015 · Xbox One 2016 · PS4 and Switch May 2020 · "Apogee" mobile 2021 |
| **Made by** | Amplitude Studios, Paris, a team of four or five; Sega bought Amplitude in July 2016 |
| **Status** | Still sold (Metacritic 79, Steam ~87% positive on ~9,400 reviews); last content work 2021. The studio's own successor **Endless Dungeon** (19 Oct 2023) kept doors-as-income, dropped the room-lighting economy for real-time shooting with fixed spawn points: Steam ~64% positive, estimated ~114k units **(third-party estimate)**, named by Sega in February 2024 among titles whose sales were "below expectations". Updates stopped mid-2024. **Sega sold Amplitude to a management buyout on 8 November 2024**, booking a ¥5.9bn loss. |
| **Still mourned** | Steam, 20 Oct 2023, "Dungeon of the Endless VERSUS Endless Dungeon": *"same universe, but a completely different game, and the older game was more fun."* Amplitude's own forum, late 2023, "What went wrong?": *"The Dust mechanic for lighting rooms that was central to DotE's strategy component is gone."* Saving Content, 17 Oct 2023: the successor is *"missing the heart and humour that was so prevalent in Dungeon of the Endless."* |

**How it played, the parts that matter here.**

- Each floor begins with your **Crystal** fixed in the entry room. **Dust** is the floor's
  power budget and also the Crystal's hit points.
- A room can be **powered** only through a chain of powered rooms back to the Crystal.
  Powering costs Dust and can be switched freely. **A lit room never spawns monsters.**
- **Opening a door is the turn.** It reveals a room and ticks the floor: income arrives
  (Industry, Science, Food, Dust) and *every unpowered room already opened rolls to spawn*.
  Bigger dark rooms spawn more. You can almost never afford to light everything, so **the map
  you grow is always larger than the map you can hold.**
- Module slots: minor (turrets, slow fields, healers, shields) and a few major (resource
  generators). Industry builds them. Heroes, up to four, have needs, pay and permadeath.
  Monsters have targets: some go for the Crystal, some for modules, some for heroes.
- **The exit**: a hero picks up the Crystal, moves slowly, cannot fight, and from that
  moment every dark room exhales waves without end until the carrier is through. Twelve
  floors.

**Why it died.** *The successor missed the organ.* The original is alive but frozen; the
studio's own attempt to carry it forward removed the exact mechanic its players name, and
the studio was sold back to its staff a year later. This is the Majesty pattern: the fans
standing at the grave saying the new one isn't it.

**Cremation.** Heroes with skill trees and pay. The dungeon crawl and the sci-fi prison ship.
Items, research, four resource types. The twelve floors as acts. Co-op. Real-time with pause.

**Transplant.**

| Dungeon of the Endless | Infinite Frontier |
|---|---|
| Open a door | **Place a tile at the frontier**. There is no "next wave" button; growth is the wave |
| Dust powers a room | **Holding** ground costs; what you hold is yours, what you don't is theirs |
| Unpowered rooms spawn when a door opens | **Unheld ground on the frontier is where they come from** |
| The power chain back to the Crystal | **Holding must connect to the core**; cut the chain and the far ground goes dark |
| The Crystal carry | **Banking a run is a carry** across the world you built, and everything unheld wakes |

**Unstuck.** Take the one verb (opening is attacking) out of a dungeon with heroes and put it
on a bare hex frontier where the player lays the ground. The brief's wave timer and
milestone cadence collapse into that verb.

**What nobody used properly.** Expansion as the enemy's clock, and unaffordable ground as
the spawn pool, together with player-authored connectivity. No released game has reused the
three together; the successor dropped two of them.

**The few changes that make sense now, if this is the corpse.** Kill the wave timer. A
placed tile is the tick. Introduce *held* vs *unheld* as the second state of a tile, which
gives "destroy" a sibling: *release*. The run's ending is a carry, which is a sentence, not a
score.

---

## Candidate 3 · The Settlers II: Veni, Vidi, Vici (1996)

| | |
|---|---|
| **Game** | The Settlers II · MS-DOS 1996 · Mission CD 1996 · Gold Edition 1997 · GOG 2009 · "History Edition" 2018 · a licensed Amiga port shipped 18 Oct 2025 |
| **Made by** | Blue Byte, Mülheim; directed by Thomas Häuser, series creator Volker Wertich on concept and design (split **(unverified)**) |
| **Status** | Ubisoft bought Blue Byte in 2001. The 2006 remake (*10th Anniversary*) added a half-cost refund on demolition. The series' 2023 reboot **The Settlers: New Allies** released without a review embargo lift and little marketing: Metacritic 54, user score 2.4 at launch, Steam ~49% positive; Ubisoft cut 65 jobs at Düsseldorf in January 2025; no Settlers project is announced **(abandonment not official)**. Wertich left mid-project **(unverified)** and his *Pioneers of Pagonia* (Early Access Dec 2023) is openly a Settlers II road-and-carrier game. The fan reimplementation *Return to the Roots* has been running since 2005 and still commits. |
| **Still mourned** | Steam, New Allies forum, c. 2023–24: *"settlers and settlers 2 was always so much better than anything that came past it."* GameStar on Pagonia: it *"has everything the new Settlers lacks, and the Settlers inventor."* Italian press on New Allies: *"abandonment of the series' canons."* |

**How it played, the parts that matter here.**

- You draw **roads** by hand between flags. **Each flag-to-flag segment gets exactly one
  carrier**, who moves one good at a time and hands it on. Goods queue at flags, about eight
  deep; a full flag blocks everything upstream. A long segment is a slow segment; the fix is
  more flags or a parallel road.
- **Territory grows only by military buildings**, each adding a radius once garrisoned. The
  frontier grows in rings from the HQ.
- The economy is a physical chain: woodcutter to sawmill, farm to mill to bakery, mines that
  need food, smelter to armoury, mint to coins that promote soldiers. Everything walks.
- **The first roads around the HQ become the trunk the whole economy depends on.** The
  classic late-game failure is a jam at an HQ-adjacent flag you laid in minute one, and the
  fix is tearing it up.
- **Demolition burns.** In the original a demolished building burns and its stock is lost
  **(stock loss unverified)**; roads can be deleted, stranding goods at flags. The half
  refund arrived only in 2006.
- Enemies are neighbouring tribes running the same economy; they meet you at the border.

**Why it died.** *Successor missed, publisher drifted.* Each sequel moved further from
roads-and-carriers; the reboot turned into a generic RTS and was abandoned within a year.
The original is sold, remade, re-ported and reimplemented by fans, and still nobody has
made the next one.

**Cremation.** The medieval tribes, the full production chain, soldiers and coins, borders
and catapults, the fixed map, the economy as the whole game.

**Transplant.**

| The Settlers II | Infinite Frontier |
|---|---|
| Roads you lay, carriers who choose their route | **Gaps you leave, enemies who choose their route**; or denizens who walk your paths |
| One carrier per segment | **A corridor's width is its throughput**: a one-hex gap queues them |
| Rings from the HQ | **The frontier grows from the core**; new ground only at the edge of held ground |
| The first roads are the trunk | **Your first ten tiles shape your last hour** |
| Demolition burns, no refund | **Destroy has a cost, and the scar stays** |

**Unstuck.** Settlers II is the only mass-market game where the player authors paths and
never commands the agents. Put that on a hex frontier with hostile traffic, and the question
"where does this road go" becomes "where do I let them come".

**What nobody used properly.** That early road geometry is permanent infrastructure debt,
and that demolition could be a tactic rather than a cleanup chore. Successors removed roads
altogether rather than make the debt the game.

**The few changes that make sense now, if this is the corpse.** Reconsider the refund: Jay's
"partial refund" invariant may be too kind; the organ says *consequence*, and a burned tile
that leaves a scar is more honest than 50% back. Make corridor width a mechanic (queueing).
Growth is strictly at the edge of held ground.

---

## Candidate 4 · Desktop Tower Defense (2007), the red team's pick

| | |
|---|---|
| **Game** | Desktop Tower Defense · Flash · March 2007 on handdrawngames.com · 1.5 June 2007 · multiplayer 1.9 and *Desktop TD Pro* on Casual Collective, Nov 2008 · Nintendo DS (THQ/ValuSoft) May 2009 |
| **Made by** | Paul Preece, UK, with a day job; it followed David Scott's Flash Element TD (Jan 2007) |
| **Status** | 15 million plays by June 2007. Preece and Scott founded Casual Collective (seed $1M, Lightspeed, Nov 2008), which **rebranded as Kixeye in April 2011** with Battle Pirates, raised $18M that August, and was sold to Stillfront in 2019 for $90M plus earnout. Flash died 31 Dec 2020; a ten-year multiplayer community reports Kixeye *"pulled the plug last week"* just before. Playable today only as the original SWF under Ruffle emulation (CrazyGames, Internet Archive, Flashpoint). TIME All-Time 100 Video Games, 2012: it *"may not have invented the tower defense genre, but it popularized it."* |
| **Still mourned** | Hacker News, 26 June 2020: a player had found no replacement because newer TDs *"use a fixed field"* while DTD let you build your own walls. Defold forum, Dec 2020: *"we've played the multiplayer version for over ten years... With the demise of Flash, our playing time is over."* kottke.org, May 2026: *"one of the very best games from the Flash era."* |

**How it played, the parts that matter here.**

- A desk-mat grid. Creeps enter left and exit right; from Normal up a second stream enters
  top and exits bottom, so **the two routes cross in the middle**. Flyers ignore the maze.
- **No fixed path.** Creeps take the shortest path and **recompute whenever the layout
  changes.** A placement that would seal every route is refused with "Blocking".
- 50 waves, 20 lives, 80 gold. Gold per kill, no interest. Bonus for sending the next wave
  early.
- **Selling:** 1.0 full refund **(unverified)**; 1.2 added a score penalty, 1.2c made
  selling progressively slower, 1.5 refunds 75%. All of it to curb **juggling**: build two
  exits, sell and rebuild one tile so the open exit flips as creeps approach, and cycle them
  forever. 1.5 ships a "No sell (no juggling)" challenge.
- Seven towers (Pellet, Squirt, Dart, Swarm, Frost, Bash, Boost); Boost does not shoot, it
  multiplies neighbours. The community converged on a compact central serpentine.

**Why it died.** *Platform extinction plus owner abandonment.* The IP sat inside a company
that pivoted to Facebook war games and was sold to a roll-up. The creators' path, DTD to
Backyard Monsters to Battle Pirates, is the F2P pivot in person.

**Cremation.** The desk, Flash, the fixed rectangle, towers as guns with ranges and tiers,
gold-per-kill as the only economy, the leaderboard, the juggling *as an exploit*.

**Transplant.** Negative-space routing · the can't-seal rule · live rerouting · sell as a
verb.

**Unstuck.** The honest finding of this dig: **DTD holds one of the four tests, and the
pivot as the red team wrote it holds the same one.** Growth, consequence and denizens are
all absent from the corpse. If DTD is the tombstone, the game must earn its distance with
the three things DTD never had, and experiment 3 in PIVOT.md is the test.

**What nobody used properly.** Live rerouting as a legitimate verb. The engine recomputed
every path the instant you sold or placed, and Preece spent three patches penalising what
that made possible. Fieldrunners, GemCraft, Infinitode and Mindustry all kept the maze
static after placement and sell as a refund button. **Nobody built the game where selling is
the attack and the maze is meant to be rewritten under the creeps.**

**The few changes that make sense now, if this is the corpse.** Make juggling the game:
destroy is the primary skill, not a refund, and Jay's "destroy feeds the rng shop" is the
economy for it. Keep the crossing streams; two routes that share a middle is where mazing
gets interesting.

---

## The markers (flags in the ground)

- **Mamono Sweeper** (Hojamaka, Flash, c. 2009–10, now a frozen HTML5 port) — *the numbers
  are information about the frontier, and your level changes what they mean.* Its child
  **Dragonsweeper** (Benmergui, Jan 2025) is alive. **A Few Billion Square Tiles** (iOS,
  July 2014, dormant) was one shared infinite Minesweeper board where every revealed cell was
  permanently yours. **Microsoft Minesweeper** (2012) is the "buried under monetization"
  joke: 30-second unskippable ads and $9.99 a year to remove them; heise, Oct 2025: *"From
  Windows classic to subscription horror."* What nobody in the line used: **the revealed
  board is the world**; deduction never left a lasting structure.
- **Castle Story** (Sauropod, Kickstarter $702k 2012, 1.0 2017, paused 2019) and **Towns**
  (SMP, 2012, abandoned 2014 by burnout) — *dig and build a voxel world, autonomous
  denizens, nightly enemies steered by what you built.* Both died of scope.
- **Rampart** (Atari Games, 1990; rights now Warner Bros., absent from Atari 50, left
  Antstream Nov 2023) — *damage is a hole in your build; rebuild under the clock.*
- **Fieldrunners** (Subatomic, iPhone Oct 2008, IGF Mobile 2009; studio silent since 2017)
  — *open-field mazing that fit in a hand.*
- **Loop Hero** (Four Quarters, 2021; frozen since 2022) — *every tile is a spawn and a buff
  at once*; Oblivion removes tiles.
- **Gem TD** (WC3 custom map) — *what you don't keep becomes the wall.*

## DNA only (alive; stay unlike them)

- **Against the Storm** (Eremite, updated to Nov 2025) — holds "opening the frontier is the
  risk" exactly: cutting into a Dangerous Glade guarantees a threat. On glades you reveal,
  not tiles you lay.
- **Carcassonne · Dorfromantik · Islanders** — draw-and-place growth with zero hostility.
- **Isle of Arrows · Rogue Tower** (both 2022, both complete and dormant; Rogue Tower 2
  announced June 2025) — the path grows by draft, but enemies only walk the road and tiles
  are never destroyed.
- **Kingdom · Thronefall** — where you build decides where you fight, on a fixed map.
- **Infinitode 2 · Mindustry** — the living mazing TDs.

---

## CC's read

Three corpses hold three tests each; one holds one.

**Dungeon Keeper** holds *denizens* and *space controls the enemy* better than anything
else found, and its death is the studio's founding joke: the organ was turned into a
24-hour timer with a gem price. Its weakness is growth: it never left the authored map.
Picking it says the heart of Infinite Frontier is *a world of things that live in the
ground you make, and the enemy walks the gaps.*

**Dungeon of the Endless** holds *unconfined* and *lasting consequence* in one verb:
opening is attacking, and what you open stays open. Picking it says the heart is *growth
is the wave*, which collapses the brief's two cadences and gives the run an ending that is a
carry. Its weakness is denizens: its placed things are turrets.

**The Settlers II** holds *lasting consequence* purest: your first ten minutes of paths
shape your last hour, and demolition burns. Picking it says the heart is *infrastructure
debt*, which argues against Jay's partial-refund invariant. Its weakness is that enemies
never walk its paths.

**Desktop Tower Defense** holds mazing and only mazing, and the pivot as the red team wrote
it is DTD with biomes. Best use: the marker that keeps us honest, and the source of one
idea worth stealing whole, *juggling as the game*.

If one must be named: **Dungeon Keeper**, with Dungeon of the Endless as the first marker
("the ground you can't afford to hold is where they spawn") and the Minesweeper line as the
second ("the revealed board is the world"). It is the only corpse where a *tile has a
denizen* was already true, and it is the one whose grave the studio exists to stand at.

Three possible records, for the pick:

```
THE GRAVEYARD (if Dungeon Keeper)
Tombstone:  Dungeon Keeper (1997)
Markers:    Dungeon of the Endless — the ground you can't afford to hold is where they spawn
            Desktop Tower Defense — the route is the negative space; rewrite it under them
            The Settlers II — your first ten tiles shape your last hour; demolition burns
            Mamono Sweeper / A Few Billion Square Tiles — the revealed board is the world
            Rampart — damage is a hole in your build; rebuild under the clock
DNA only:   Against the Storm · Carcassonne/Dorfromantik · Isle of Arrows/Rogue Tower ·
            Kingdom/Thronefall · Infinitode 2/Mindustry

THE GRAVEYARD (if Dungeon of the Endless)
Tombstone:  Dungeon of the Endless (2014)
Markers:    Dungeon Keeper — a cluster of ground earns its denizen; surround a gate to kill it
            Desktop Tower Defense — the route is the negative space
            The Settlers II — infrastructure debt
            Mamono Sweeper — the numbers are information about the frontier
DNA only:   as above

THE GRAVEYARD (if The Settlers II)
Tombstone:  The Settlers II (1996)
Markers:    Dungeon Keeper — denizens arrive because the room exists
            Dungeon of the Endless — opening is attacking
            Desktop Tower Defense — the route is the negative space
            Mamono Sweeper — the revealed board is the world
DNA only:   as above
```

## What this changes in PIVOT.md, whichever is picked

- **Round two Q1 (tile source)** is answered by Jay: a draft, with destruction feeding a
  mini shop. Held as hypothesis until the tombstone is chosen.
- **Round two Q2 (passability)** was the red team's framing, not Jay's. Dropped.
- **Round two Q3 (the board)** is answered: it grows, without a wall at the edge.
- A new question the dig raises: **is the refund too kind?** Settlers II says a destroyed
  thing leaves a scar. DK says selling is how you fund the next thing. DTD says selling is
  the attack. These are three different games.

## Sources

Search results only; page fetches were unavailable. Grouped by dig.

**Dungeon Keeper**: [Wikipedia: DK](https://en.wikipedia.org/wiki/Dungeon_Keeper) · [DK2](https://en.wikipedia.org/wiki/Dungeon_Keeper_2) · [DK3](https://en.wikipedia.org/wiki/Dungeon_Keeper_3) · [DK 2014](https://en.wikipedia.org/wiki/Dungeon_Keeper_(2014_video_game)) · [War for the Overworld](https://en.wikipedia.org/wiki/War_for_the_Overworld) · [Bullfrog](https://en.wikipedia.org/wiki/Bullfrog_Productions) · [digitec, 25 years of DK](https://www.digitec.ch/en/page/25-years-of-dungeon-keeper-this-is-how-it-was-created-thats-why-a-sequel-is-out-of-the-question-23815) · [ASA ruling, 2 Jul 2014](https://www.asa.org.uk/Rulings/Adjudications/2014/7/Electronic-Arts-Ltd/SHP_ADJ_258907.aspx) · [Engadget on the ruling](https://www.engadget.com/2014-07-02-uk-regulator-rules-free-dungeon-keeper-ad-was-misleading.html) · [Engadget on the rating prompt](https://www.engadget.com/2014-02-07-dungeon-keeper-android-makes-it-difficult-to-rate-app-less-than.html) · [TouchArcade: Molyneux](https://toucharcade.com/2014/02/10/peter-molyneux-dungeon-keeper-is-ridiculous/) · [Engadget: Gibeau](https://www.engadget.com/2014-07-10-gibeau-ea-innovated-too-much-with-dungeon-keeper.html) · [Pocket Gamer: Wilson](https://www.pocketgamer.com/dungeon-keeper/dungeon-keeper-on-ios-and-android-was-a-shame-according-to-eas-ceo-andrew-wilson/) · [TechRaptor: Mythic closed](https://techraptor.net/gaming/news/mythic-entertainment-shut-down-ea) · [Time Extension: KeeperFX 1.0](https://www.timeextension.com/news/2023/11/after-15-years-the-dungeon-keeper-fan-remake-keeperfx-has-hit-1-0) · [keeperfx.net](https://keeperfx.net/) · [Stevivor: WftO review](https://stevivor.com/reviews/review-war-for-the-overworld/) · [AnandTech, DK2 thread](https://forums.anandtech.com/threads/dungeon-keeper-2.304207/post-28190607) · [Bloody Disgusting retrospective](https://bloody-disgusting.com/editorials/3717856/retrospective-evil-is-still-strong-with-dungeon-keeper-25-years-later/) · [Steam: Naheulbeuk forum](https://steamcommunity.com/app/2005160/discussions/0/603024424618226810) · [DK fan wiki: Claimed Path, Rooms, Traps, Happiness, Scavenge](https://dungeonkeeper.fandom.com/wiki/Claimed_Path) · [DK2 editor manual](https://keeper.lubiki.pl/dk2_docs/dk2_editor_manual.htm) · [Steam DK Gold stats](https://steambase.io/games/dungeon-keeper-gold)

**Dungeon of the Endless**: [Wikipedia: DotE](https://en.wikipedia.org/wiki/Dungeon_of_the_Endless) · [Endless Dungeon](https://en.wikipedia.org/wiki/Endless_Dungeon) · [Amplitude](https://en.wikipedia.org/wiki/Amplitude_Studios) · [Steam: DotE](https://store.steampowered.com/app/249050/Dungeon_of_the_ENDLESS) · [Metacritic](https://www.metacritic.com/game/dungeon-of-the-endless/) · [Kotaku, 2020](https://kotaku.com/six-years-later-dungeon-of-the-endless-is-still-getting-1842779587) · [fan wiki: The Basics](https://dungeon-of-the-endless.fandom.com/wiki/The_Basics) · [Beating the Game](https://dungeonoftheendless.fandom.com/wiki/Beating_The_Game) · [Amplitude forum: What went wrong?](https://community.amplitude-studios.com/amplitude-studios/endless-dungeon/forums/203-general/threads/55285-endless-dungeon-what-went-wrong?page=1) · [Steam: DotE vs ED](https://steamcommunity.com/app/1485590/discussions/0/3877095200005728578/) · [OpenCritic: ED](https://opencritic.com/game/15650/view) · [SteamPulse estimate](https://steampulse.org/game/1485590) · [Game Developer: Sega sales](https://www.gamedeveloper.com/business/game-sales-fall-below-expectations-at-sega-but-revenue-remains-steady) · [VGC: Sega sells Amplitude](https://videogameschronicle.com/news/sega-has-sold-humankind-developer-amplitude) · [Gematsu](https://www.gematsu.com/2024/11/sega-sells-amplitude-studios-to-members-of-internal-team) · [Saving Content review](https://www.savingcontent.com/2023/10/17/endless-dungeon-review/) · [TechRadar review](https://www.techradar.com/gaming/consoles-pc/endless-dungeon-review-infinite-drudgery)

**The Settlers II**: [Wikipedia: Settlers II](https://en.wikipedia.org/wiki/The_Settlers_II) · [10th Anniversary](https://en.wikipedia.org/wiki/The_Settlers_II_(10th_Anniversary)) · [New Allies](https://en.wikipedia.org/wiki/The_Settlers:_New_Allies) · [settlers2.net: roads](https://settlers2.net/guides/roads/) · [Return to the Roots](https://github.com/Return-To-The-Roots/s25client/releases) · [Time Extension: Amiga port](https://www.timeextension.com/news/2025/08/beloved-city-builder-getting-amiga-release-almost-30-years-after-skipping-the-platform) · [OpenCritic: New Allies](https://opencritic.com/game/14336/the-settlers-new-allies) · [ResetEra: New Allies launch](https://www.resetera.com/threads/ubisoft-releases-the-settlers-new-allies-without-marketing-reviews-or-steam-release.687982/) · [Steam: New Allies forum](https://steamcommunity.com/app/2750080/discussions/0/595156969934890084/) · [heise: Düsseldorf layoffs](https://heise.de/-10258188) · [GameStar: Pagonia](https://www.gamestar.de/artikel/pioneers-of-pagonia-siedler-aufbau-komplexitaet,3389725.html) · [Noobfeed: History Collection](https://www.noobfeed.com/reviews/the-settlers-history-collection-pc-review)

**Desktop Tower Defense**: [Wikipedia](https://en.wikipedia.org/wiki/Desktop_Tower_Defense) · [TIME All-Time 100](https://techland.time.com/2012/11/15/all-time-100-video-games/slide/desktop-tower-defense-2007/) · [TechCrunch: 15M plays](https://techcrunch.com/2007/06/19/desktop-tower-defense-played-15-million-times) · [TechCrunch: spurs startup](https://techcrunch.com/2007/06/08/desktop-tower-defense-spurs-startup) · [Engadget: Casual Collective](https://www.engadget.com/2008-11-19-desktop-tower-defense-creators-found-casual-collective.html) · [Game Developer interview](https://www.gamedeveloper.com/game-platforms/interview-flash-i-tower-defense-i-creators-on-vc-deal-social-gaming-site) · [GamesBeat: Kixeye rebrand](https://gamesbeat.com/kixeye-re-brands-and-pivots-into-hardcore-social-games-with-battle-pirates/) · [Wikipedia: Kixeye](https://en.wikipedia.org/wiki/Kixeye) · [Pocket Gamer: Stillfront buys Kixeye](https://www.pocketgamer.biz/stillfront-snaps-up-kixeye-in-deal-worth-up-to-120m) · [JayIsGames: DTD](https://jayisgames.com/review/desktop-tower-defense.php) · [JayIsGames: 1.5](https://jayisgames.com/review/desktop-tower-defense-15.php) · [JayIsGames: Pro](https://jayisgames.com/review/desktop-td-pro.php) · [juggling tip, May 2007](http://desktoptowerdefense.blogspot.com/2007/05/desktop-tower-defense-tip-juggling.html) · [Defold forum, Dec 2020](https://forum.defold.com/t/rip-desktop-tower-defense-long-live-desktop-tower-defense/66988) · [Hacker News, Jun 2020](https://news.ycombinator.com/item?id=23653296) · [kottke.org, May 2026](https://kottke.org/26/05/0048924-from-the-flash-era) · [GamesRadar DS review](https://gamesradar.com/desktop-tower-defense-review) · [Internet Archive](https://archive.org/details/desktop-tower-defence_flash) · [Wikipedia: Fieldrunners](https://en.wikipedia.org/wiki/Fieldrunners) · [Engadget: IGF Mobile 2009](https://www.engadget.com/2009-03-24-gdc09-igf-mobile-award-winners-announced.html) · [Wikipedia: Rampart](https://en.wikipedia.org/wiki/Rampart_(video_game)) · [Hardcore Gaming 101: Rampart](https://www.hardcoregaming101.net/rampart/) · [Pure Xbox: Antstream loses WB](https://www.purexbox.com/news/2023/11/xboxs-antstream-arcade-loses-27-games-as-warner-bros-partnership-ends)

**Minesweeper line**: [TIGSource: Mamono Sweeper, 2011](https://www.tigsource.com/2011/03/06/mamono-sweeper/) · [JayIsGames: Mamono Sweeper](https://jayisgames.com/review/mamono-sweeper.php) · [Hojamaka HTML5 port](http://hojamaka.com/game/mamono_sweeper_h2/html5/en.html) · [Set Side B: Minesweeper-likes](https://setsideb.com/tag/mines/) · [Dragonsweeper on itch](https://danielben.itch.io/dragonsweeper) · [A Few Billion Square Tiles](https://toucharcade.com/community/threads/looking-for-testers-for-an-online-infinite-multiplayer-ios-minesweeper.228637/) · [Wikipedia: Microsoft Minesweeper](https://en.wikipedia.org/wiki/Microsoft_Minesweeper) · [How-To Geek, 2015](https://www.howtogeek.com/225128/you-dont-have-to-pay-20-a-year-for-solitaire-and-minesweeper-on-windows-10/) · [heise, Oct 2025](https://heise.de/-10733957) · [Lost Media Wiki: Minesweeper Flags](https://lostmediawiki.com/Minesweeper_Flags_(lost_Windows_Live_Messenger_game,_2000s)) · [Wikipedia: Infiniminer](https://en.wikipedia.org/wiki/Infiniminer) · [Crosscut: Zach Barth](https://crosscut.com/2015/08/the-godfather-of-minecraft-a-conversation-with-indie-gamer-zachary-barth)

**Tile-laying and growing worlds**: [Wikipedia: Castle Story](https://en.wikipedia.org/wiki/Castle_Story) · [Wikipedia: Towns](https://en.wikipedia.org/wiki/Towns_(video_game)) · [Cliqist: Timber and Stone](https://cliqist.com/2016/08/04/ztimber-stone-may-finished/) · [Giant Bomb: Gnomoria](https://giantbomb.com/wiki/Games/Gnomoria) · [Wikipedia: Loop Hero](https://en.wikipedia.org/wiki/Loop_Hero) · [PC Gamer: Loop Hero combos](https://pcgamer.com/loop-hero-combos-cards-tile) · [GameSpot: Loop Hero piracy](https://Gamespot.com/articles/loop-hero-dev-publisher-condone-piracy-of-their-game-for-certain-players/1100-6502058/) · [Steam: Rogue Tower news](https://steamcommunity.com/app/1843760/announcements/) · [Steam: Isle of Arrows](https://store.steampowered.com/app/1946970/Isle_of_Arrows/) · [TechRaptor: Against the Storm glades](https://techraptor.net/gaming/guides/against-the-storm-glades-guide) · [Eremite: Brineworks 1.9](https://eremitegames.com/brineworks-update-1-9/) · [Wikipedia: Carcassonne (video game)](https://en.wikipedia.org/wiki/Carcassonne_(video_game)) · [Wikipedia: Dorfromantik](https://en.wikipedia.org/wiki/Dorfromantik) · [Wikipedia: Kingdom](https://en.wikipedia.org/wiki/Kingdom_(video_game)) · [Steam Deck HQ: Thronefall 1M](https://steamdeckhq.com/news/thronefall-has-sold-over-one-million-copies/) · [Wikipedia: Reus](https://en.wikipedia.org/wiki/Reus_(video_game))
