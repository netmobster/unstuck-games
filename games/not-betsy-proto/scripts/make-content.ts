// PLACEHOLDER content for the first rough test.
// Names and lines make sense; properties are rolled at random (Jay: "random stuff that makes sense
// with random properties that don't"). Real content comes from the CONTENT-SPEC generation pipeline.
//
//   bun run content        (re-rolls properties from CONTENT_SEED)
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { Rng } from "../src/rng";

const CONTENT_SEED = 20260913;
const rng = new Rng(CONTENT_SEED);
const out = join(import.meta.dir, "..", "content");
mkdirSync(out, { recursive: true });

const NEEDS = ["starving", "silent", "bureaucratic", "frozen", "hostile", "lonely", "broken", "too-perfect"] as const;
const WHY_TAGS = ["literal", "refusal", "generosity", "salvage", "stubborn", "mess", "waiting", "loyalty", "feeding",
  "excess", "strays", "misclassified", "warmth", "repair", "persistence", "home", "noise", "music"];
const DOWNSIDE_TAGS = ["customs-flag", "leaks", "loud", "power-hungry", "attracts-prestige", "sheds-parts", "smells"];

const pick = <T>(xs: readonly T[]) => xs[rng.int(xs.length)];
const pickN = <T>(xs: readonly T[], n: number) => {
  const pool = [...xs];
  const res: T[] = [];
  while (res.length < n && pool.length) res.push(pool.splice(rng.int(pool.length), 1)[0]);
  return res;
};
const delta = (lo: number, hi: number) => lo + rng.int(hi - lo + 1);
const provenance = { batch: "proto-placeholder-001", generator: "make-content.ts (random properties)", date: "2026-09-13", reviewed: "placeholder" };

// name, category, a sensible "solves"
const MUTATIONS: [string, string, string][] = [
  ["External Potato Replicator", "food", "starving"],
  ["Cathedral Organ Exhaust", "propulsion", "silent"],
  ["Decorative Black Hole", "hull", "too-perfect"],
  ["Self-Folding Laundry Arm", "repair", "broken"],
  ["Emergency Weather Balloon Array", "comms", "lonely"],
  ["Heated Everything", "power", "frozen"],
  ["Sentient Seatbelt", "defence", "hostile"],
  ["Tax-Deductible Hull Plating", "hull", "bureaucratic"],
  ["Borrowed Moon Anchor", "propulsion", "hostile"],
  ["Karaoke Distress Beacon", "comms", "silent"],
  ["Hydroponic Mullet", "food", "starving"],
  ["Recursive Toolbox", "repair", "broken"],
  ["Cannon That Fires Compliments", "defence", "hostile"],
  ["Lava Lamp Reactor", "power", "frozen"],
  ["Retractable Porch", "hull", "lonely"],
  ["Door That Refuses Mud", "hull", "too-perfect"],
  ["Mosquito Farm (Class Eight Certified)", "food", "too-perfect"],
  ["Fax Machine to Last Tuesday", "comms", "bureaucratic"],
  ["Snow Plow Prow", "propulsion", "frozen"],
  ["Infinite Gravy Line", "food", "starving"],
  ["Haunted Coffee Maker", "power", "broken"],
  ["Coat-Hanger Antenna, 10 km", "comms", "silent"],
  ["Bouncy Castle Airlock", "defence", "hostile"],
  ["Hockey Rink Cargo Bay", "hull", "lonely"],
];

const mutations = MUTATIONS.map(([name, category, solves], i) => ({
  id: `mut-${String(i + 1).padStart(2, "0")}`,
  name,
  category,
  upside: { scrap: delta(0, 3), power: delta(-1, 2), smudge: delta(1, 3) },
  downside: { scrap: delta(-2, 0), power: delta(-2, 0), smudge: delta(-1, 0), tags: pickN(DOWNSIDE_TAGS, 1 + rng.int(2)) },
  solves: rng.next() < 0.25 ? [solves, pick(NEEDS)] : [solves],
  absurdity: 1 + rng.int(5),
  why_tags: pickN(WHY_TAGS, 2),
  log: {
    bolted: `Acquired: ${name}. It is attached now. I did not ask it.`,
    useless: `${name} continues to exist. No emergency.`,
    pays_off: `${name} was useful. I am recording this as an anomaly.`,
  },
  provenance,
}));

const STRAYS = [
  ["Widget", "a sanitation drone that learned to smile", "your mud, kept safe"],
  ["The Gas Cloud Holding Your S", "a sentient cloud with a letter it won't give back", "to be called plural"],
  ["Retired Customs Kiosk", "a kiosk with nobody left to process", "one more form, stamped"],
  ["Stowaway Pika Cadet", "a very small soldier with very large ears", "to not be sent home"],
  ["Salvage Crab", "a crab that collects hats", "a hat from every planet"],
  ["Lost Tour Guide Hologram", "a hologram still giving the Aurelia tour", "one listener who stays to the end"],
].map(([name, what, want], i) => ({
  id: `stray-${i + 1}`,
  name,
  what,
  want,
  effect: pick(["grant-mutation", "remove-mutation", "scrap-drip", "power-drip", "smudge-drip"]),
  why_tags: pickN(WHY_TAGS, 2),
  log: { arrives: `${name} is aboard. They were not invited. They are staying.`, leaves: `${name} has left. I have kept their seat.` },
  provenance,
}));

const HABITS = [
  "plays Taylor Swift at every docking", "refuses to fly in straight lines", "hoards jerky in the vents",
  "salutes passing debris", "narrates Jame's naps", "labels everything 'not Betsy'",
  "turns amber when nobody talks to her", "counts stars out loud", "renames Jame's socks", "knocks before opening airlocks",
].map((habit, i) => ({
  id: `habit-${i + 1}`,
  habit,
  tiny_effect: pick([{ smudge: 1 }, { power: -1 }, { scrap: 1 }, {}, { smudge: 1, power: -1 }]),
  why_tags: pickN(WHY_TAGS, 1),
  log: `New behaviour: she ${habit}. This is not a malfunction. It is a preference.`,
  provenance,
}));

const PLANETS = [
  ["Grainless Vesper", "starving", "The harvest failed for the ninth year. The ration cubes ran out politely."],
  ["Aurelia-Prime", "silent", "A world of perfect silence. The five-hundred-year dance has lost its rhythm."],
  ["Form Station Twelve", "bureaucratic", "Everyone is waiting for a form that requires the form they are waiting for."],
  ["Glacier Nine", "frozen", "The heaters were optimized out. The colonists are optimizing their shivering."],
  ["Outer Rim Checkpoint", "hostile", "General Tubs's patrol has declared the landing pad a crime."],
  ["Lighthouse Rock", "lonely", "One keeper, one light, nobody has visited in a century."],
].map(([name, need, problem], i) => ({
  id: `planet-${i + 1}`,
  name,
  need,
  problem,
  customs: pick(["none", "light", "full"]),
  why_tags: pickN(WHY_TAGS, 1),
  provenance,
}));

const LAST_WORDS = [
  ["Don't do anything I wouldn't do.", "Only do things Jame would do. Jame repairs things.", { salvage: 1, repair: 3 }, ["repair", "literal"]],
  ["Keep her warm.", "Keep everything warm. Everything.", { power: -2, salvage: 1 }, ["warmth", "literal"]],
  ["Grab anything shiny.", "Shiny is a salvage priority. Stars are shiny.", { salvage: 3 }, ["salvage", "excess"]],
  ["Be nice to strangers.", "Strangers are to be retained.", { stray: 3 }, ["strays", "generosity"]],
  ["Lie low.", "Minimize altitude. And opinions.", { quiet: 3, prestige: -1 }, ["waiting"]],
  ["Find us some grub.", "Acquire food. Define food broadly.", { salvage: 2, trade: 1 }, ["feeding"]],
  ["Make some noise if there's trouble.", "Trouble is likely. Noise is therefore continuous.", { prestige: 1, habit: 2 }, ["noise", "music"]],
  ["Don't talk to the Prestige.", "Communicate with the Prestige only by gesture.", { prestige: 1, quiet: 1 }, ["refusal"]],
  ["Treat her like family.", "All parts are family. No part may be discarded.", { trade: -2, salvage: 1 }, ["loyalty", "home"]],
  ["Back in a jiffy.", "Counting jiffies. It has been many jiffies.", { quiet: 2, habit: 1 }, ["waiting", "persistence"]],
  ["Fix whatever's broken.", "Everything is broken. Commencing.", { salvage: 2, repair: 2 }, ["repair", "stubborn"]],
  ["Go nuts.", "Nuts acquired. Continuing to go.", { salvage: 2, stray: 1, habit: 2 }, ["excess", "mess"]],
].map(([line, literal, weights, why_tags], i) => ({ id: `words-${i + 1}`, line, literal_reading: literal, encounter_weights: weights, why_tags, provenance }));

const write = (file: string, records: unknown[]) =>
  writeFileSync(join(out, file), JSON.stringify({ placeholder: true, seed: CONTENT_SEED, records }, null, 2));
write("mutations.json", mutations);
write("strays.json", STRAYS);
write("habits.json", HABITS);
write("planets.json", PLANETS);
write("last-words.json", LAST_WORDS);
copyFileSync(join(import.meta.dir, "..", "..", "..", "teardowns", "universal-paperclips", "seed", "whys.json"), join(out, "whys.json"));
console.log(`content: ${mutations.length} mutations, ${STRAYS.length} strays, ${HABITS.length} habits, ${PLANETS.length} planets, ${LAST_WORDS.length} last words, whys copied`);
