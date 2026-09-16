# Ferret Bowling — sound brief

Jay makes these. Filed 2026-09-16, after the alpha shipped silent.

Three layers, in the order they matter: **the room**, **her**, **what she did to the furniture**.

The game is watched, not played, so sound is the only channel that can tell you something
happened in a room you are not looking at. A knock in the kitchen while the camera sits on
the hallway is information, and it is free.

## 1 · The room (one bed, always there)

| | |
|---|---|
| **house bed** | A quiet, warm, slightly boring room tone. Fridge hum, distant street, a clock that is not quite in time with anything. Loops for minutes without becoming a pattern you can hear. |
| **night version** | Same room, fewer edges. Used post-run, when the lamps are on and she is asleep. |

Rule: nothing melodic that repeats inside a run. If the player notices the loop, the loop is wrong.

## 2 · Lucy (a handful, each short)

| | |
|---|---|
| **dook** | The happy chuckle. Fires on a combo landing, a ritual firing, a proud moment. This is the one people will remember; it is worth doing several takes. |
| **sniff** | Investigating something. Tiny, wet, curious. |
| **scuffle** | Four feet accelerating on a hard floor. Used for zoomies and any dash. |
| **thump** | The weasel war dance landing. Soft body, hard floor, no pain. |
| **yawn / settle** | Going down for a nap. Ends with the sound of an animal collapsing entirely. |
| **grumble** | Her being told no, or refusing a squeaky toy she is not in the mood for. |
| **squeak toy** | The one you give her. Should be genuinely annoying — that is the joke. |

## 3 · Events (the furniture)

| | |
|---|---|
| **knock over, soft** | Cushion, towel, laundry. A whump and a slump. |
| **knock over, hard** | Wastebasket, books, anything that scatters. Should make you look up. |
| **drag, fabric** | A rug or a hoodie moving across the floor, in a loop that can be cut at any length. |
| **drag, object** | Something with a bit of weight to it, scraping. |
| **rummage** | Nose in a bag, a basket, a laundry pile. Rustle without melody. |
| **steal / pickup** | The moment of acquisition. Small, satisfying, slightly guilty. |
| **stash deposit** | The treasure joining the hoard under the couch. Should feel like a tiny reward. |
| **water** | The bath, and anything in the bathroom. Sloshy, undignified. |

## 4 · Moments

| | |
|---|---|
| **open the door** | The run starting. One sound, confident, a latch and a gate swinging. |
| **run end / nap** | She is asleep. Lands under the end-of-run modal; should feel like an exhale, not a failure. |
| **new journal entry** | You learned something. Tiny paper sound, one per entry, stackable. |
| **unlock** | A room or an item opening up. Rare, so it can be a little grand. |

## Notes for whoever wires it up

- **Everything is optional.** No sound file may ever block a run from resolving.
- **One mixer, three buses** (room / Lucy / events), so a single mute is possible and so
  event sounds can duck the bed slightly rather than fight it.
- **Pitch and timing vary per play** from the run's own seed, so a repeated action never
  sounds identical twice. The sim already carries seeds; use them.
- **Formats:** `.webm` (opus) with an `.m4a` fallback covers every browser we care about.
  Keep each one-shot under about 40 kB; the whole set should be smaller than one of the
  sprite sheets.
- **Volume default:** quiet. This is a game people leave running.
