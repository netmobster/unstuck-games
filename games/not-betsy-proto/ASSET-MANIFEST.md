# Asset + layer manifest — for CD

Unstuck pipeline: CC builds the UI functionally → **CD designs it** → sprite layers come from CD as
**transparent SVGs**. The prototype's placeholder shapes use these exact layer names (`data-layer` attributes
in the ship SVG), so CD's files can replace them one to one. Nothing here is final art direction.

## Three layout starting points (switch in Playtest controls, or `?layout=`)

| Layout | URL | Idea | Strength | Weakness seen in testing |
|---|---|---|---|---|
| **A · Panels** | `?layout=panels` | Four panels: her log · the planet · her parts · before you go | Everything visible at once; best for a tuning pass | Reads like a dashboard, not a place |
| **B · Ship cutaway** | `?layout=ship` | Not Betsy is the centre of the screen; parts bolt onto hardpoints; the log becomes a drawer | "Always weirder" is *visible*: you see the new silhouette before you read anything | Beyond 8 parts, the rest go off-ship (needs a design answer) |
| **C · Log-first (phone)** | `?layout=log` | Her log as a message thread; planet as a card; parts in a swipe row; a bottom sheet for goal, last words and leaving | Matches the fiction (she reports to you); one thumb | Sticky header + bottom sheet eat ~half a phone screen |

## The ship (layout B): sprite stack, bottom to top

| Layer | `data-layer` | States / variants | Notes |
|---|---|---|---|
| Amber glow | `glow` | off · on (when Smudge > the Prestige's target) | Behind everything; soft radial |
| Hull | `hull` | one base shape (an oversized escape pod) | Must read as *too big for an escape pod* and slightly wrong |
| Grime | `grime` | continuous opacity 0–1 driven by `--rust` | Pattern or noise overlay clipped to the hull |
| Window | `window` | idle · someone aboard (strays) | Where strays peek out |
| Name decal | (inside `hull`) | "NOT BETSY"; later hand-painted versions | The name *is* the core joke |
| Modules | `module:<category>` | 7 categories × {idle, kept (God Mode, gold outline), pays-off flash, tidied-away fade} | Anchor at a hardpoint centre; label offset away from the hull |
| Strays | `stray` | one small token per stray (up to 3 aboard) | Placeholder: initial in a circle |
| Habits | `habit` | tiny marks near the hull | Placeholder: dots; could be decals, stickers, scorch marks |

### Hardpoints (fill order, in a 600 × 360 viewBox)
1 top centre (300, 78) · 2 nose (490, 180) · 3 belly (300, 284) · 4 tail (110, 180) · 5 top-left (205, 100) · 6 bottom-right (395, 262) · 7 top-right (395, 100) · 8 bottom-left (205, 262).
Order spreads parts around the hull so labels never collide. **Design question:** what happens at part 9+?

### Module categories (placeholder colour → shape)
| Category | Placeholder | Example parts |
|---|---|---|
| food | orange circle | External Potato Replicator, Infinite Gravy Line |
| propulsion | red triangle | Cathedral Organ Exhaust, Snow Plow Prow |
| hull | grey plate | Tax-Deductible Hull Plating, Hockey Rink Cargo Bay |
| comms | blue antenna | Karaoke Distress Beacon, Coat-Hanger Antenna |
| defence | purple hexagon | Sentient Seatbelt, Bouncy Castle Airlock |
| power | yellow diamond | Lava Lamp Reactor, Haunted Coffee Maker |
| repair | green cross | Recursive Toolbox, Self-Folding Laundry Arm |

**Real content will need per-part art or a kit-bash system** (category base + 2–3 accessory layers), because
the database is meant to grow to hundreds of parts. That choice is CD's to make, and it's the biggest art-cost question.

## Interface assets (all layouts)

| Asset | States | Driven by |
|---|---|---|
| Prestige frame / panel chrome | clean → rusted (continuous) | `--rust` |
| Edge grime vignette | 0–1 | `--rust` |
| Front clocks: Vorian, Tubs, the Synthesis | 0…N segments; "firing" | front values |
| Resource marks: Scrap, Power, Smudge | value; Smudge vs. target | run state |
| Log speakers: Not Betsy, the Prestige, Jame, system | four voices, distinct | log entry `who` |
| Last-words cards | in hand · selected | hand |
| Goal chips | 4 goals · selected | goal |
| God Mode mark | available · kept | `keptId` |
| Verdict report (the Prestige's) | archived · deferred · unclassifiable | verdict band |
| The why card (written *over* the report) | 4 registers: defiant, elegiac, absurd, tender | why register |
| Archive list | entries | local archive |

## Degradation rules (from the boundaries)
- Clean, silent, Prestige-white at `--rust` 0.
- As Smudge outruns the target, grime creeps in from the edges and straight lines stop being straight.
- The why is written over the Prestige's clean report: data turning into meaning.
