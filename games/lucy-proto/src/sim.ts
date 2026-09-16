// Ferret Bowling: Lucy Edition — rough deterministic prototype sim. No DOM.
// Rule: moods change what Lucy NOTICES and WANTS, never how far she goes. The payoff is her day.
// Same seed + same runs (prep + squeak tick) → same Lucy, same house, same journal.
import { Rng } from "./rng";
import {
  ARRIVALS, CAGE, DOORS, H, ROOMS, STASH, THINGS, W, roomAt, walkable,
  type RoomId, type Tag, type Thing,
} from "./house";

// ---------- prep items ----------
export type ItemId = "snacks" | "sock" | "insult" | "salmon" | "squeaky" | "bath";
type Mood = { tags: Partial<Record<Tag, number>>; speed: number; drain: number; squeak: number; swim?: boolean; sulk?: boolean; bath?: boolean };

export const ITEMS: Record<ItemId, { name: string; blurb: string; unlockAt: number; mood: Mood; godMode?: boolean }> = {
  snacks: { name: "A handful of snacks", blurb: "zoomies, and every crumb is a detour", unlockAt: 0, mood: { tags: { food: 3 }, speed: 1.4, drain: 1.6, squeak: 0.95 } },
  sock: { name: "A wound-up sock", blurb: "anything fabric is now prey", unlockAt: 0, mood: { tags: { fabric: 3, small: 1.4 }, speed: 1.1, drain: 1.1, squeak: 0.5 } },
  insult: { name: "A whispered insult", blurb: "she sulks, then forgives you. Eventually.", unlockAt: 0, mood: { tags: { hide: 3 }, speed: 1, drain: 1, squeak: 0.08, sulk: true } },
  salmon: { name: "Purple salmon", blurb: "she is convinced the house is a river", unlockAt: 0, mood: { tags: { water: 3.5, soft: 1.5 }, speed: 1.2, drain: 1.2, squeak: 0.4, swim: true } },
  squeaky: { name: "A squeaky toy", blurb: "everything that makes a noise must be investigated", unlockAt: 12, mood: { tags: { noise: 3, small: 1.3 }, speed: 1.2, drain: 1.2, squeak: 0.8 } },
  bath: { name: "A bath", blurb: "post-bath zoomies, drying off on everything, then her towel. Washes away a grudge.", unlockAt: 0, godMode: true, mood: { tags: { soft: 2.6, fabric: 1.6 }, speed: 1.5, drain: 1.25, squeak: 0.55, bath: true } },
};
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const EVERYDAY_IDS = ITEM_IDS.filter((i) => !ITEMS[i].godMode);

/** Two-item interactions: things neither item does alone. Discovering one is a journal entry. */
export const COMBOS: Record<string, { name: string; hint: string; did: string }> = {
  "salmon+snacks": { name: "Gone Fishing", hint: "she fished for snacks in the water", did: "went fishing for snacks" },
  "insult+sock": { name: "Revenge, Sock Edition", hint: "she stole your slipper specifically, and hid it", did: "took your slipper, specifically yours" },
  "insult+snacks": { name: "The Bribe", hint: "a squeak and a snack bought your forgiveness", did: "accepted your apology, and your snacks" },
  "sock+squeaky": { name: "Puppet Show", hint: "a sock became a puppet, and the puppet became prey", did: "put on a puppet show and ate the puppet" },
  "insult+squeaky": { name: "Squeak Thief", hint: "she stole the noisy things so nobody could have fun", did: "stole every noise so nobody could have fun" },
  "snacks+sock": { name: "The Snack Sock", hint: "she packed a stolen sock full of snacks, for later", did: "packed a sock full of snacks for later" },
  "salmon+sock": { name: "Laundry River", hint: "she went fishing for socks in anything made of fabric", did: "went fishing for socks" },
  "insult+salmon": { name: "Dramatic Exit", hint: "she swam away from you, dramatically, and sulked downstream", did: "swam away from you dramatically" },
  "salmon+squeaky": { name: "Duck Friend", hint: "she found the rubber duck and they are best friends now", did: "made friends with the rubber duck" },
  "snacks+squeaky": { name: "Dinner Bell", hint: "the squeak means snacks now, and she will not forget it", did: "learned the squeak means snacks" },
};
export const comboKey = (prep: ItemId[]) => { const e = prep.filter((i) => !ITEMS[i].godMode); return e.length === 2 ? [...e].sort().join("+") : null; };

// ---------- personality (Lucy is already perfect) ----------
const BASE: Record<Tag, number> = { fabric: 0.9, food: 0.8, soft: 0.6, hide: 1, noise: 0.7, shiny: 1, water: 0.35, warm: 0.6, small: 1.2 };

// ---------- deterministic seeds ----------
const hash = (...xs: (number | string)[]) => {
  let h = 2166136261 >>> 0;
  for (const x of xs) for (const c of String(x)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};

// ---------- persistent profile (rebuilt by replaying runs) ----------
/** origin: where it was before Lucy moved it (drawn as a dashed ghost). knocked: tipped over. Both persist until you tidy. */
export type Placed = Thing & { arrivedRun?: number; origin?: { x: number; y: number }; knocked?: boolean };
export type JournalEntry = { key: string; run: number; text: string; kind: "combo" | "behaviour" | "habit" | "room" | "item" };
export type Habits = { favNap: string | null; favRoom: RoomId | null; nemesis: string | null; routine: boolean };
/** 10–20% of how the last run left her. Your prep only goes so far if she isn't in the mood. */
export type Leftover = { kind: "hyper" | "sleepy" | "grudgy"; strength: number; why: string } | null;
export const LEFTOVER_TEXT = {
  hyper: "still wound up from last time",
  sleepy: "still a bit sleepy",
  grudgy: "still holding a grudge about last time",
} as const;
export type Profile = {
  seed: number;
  runs: RunSummary[];
  things: Placed[]; // what's in the house right now (stash items removed)
  stash: Placed[]; // her treasures, under the couch
  journal: Map<string, JournalEntry>;
  counts: { nap: Record<string, number>; room: Record<string, number>; startle: Record<string, number>; stashFirst: number };
  habits: Habits;
  arrivalOrder: string[];
  leftover: Leftover;
};

export function newProfile(seed: number): Profile {
  const rng = new Rng(hash(seed, "arrivals"));
  const order = ARRIVALS.map((a) => a.id);
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return {
    seed, runs: [], things: THINGS.map((t) => ({ ...t })), stash: [], journal: new Map(),
    counts: { nap: {}, room: {}, startle: {}, stashFirst: 0 },
    habits: { favNap: null, favRoom: null, nemesis: null, routine: false }, arrivalOrder: order, leftover: null,
  };
}

export const unlockedRooms = (p: Profile) => new Set(ROOMS.filter((r) => p.journal.size >= r.unlockAt).map((r) => r.id));
export const unlockedItems = (p: Profile) => EVERYDAY_IDS.filter((i) => p.journal.size >= ITEMS[i].unlockAt);

// ---------- a run ----------
export type Verb = "sniff" | "steal" | "hide" | "play" | "nap" | "fish" | "roll" | "stash" | "come" | "gift" | "startle" | "wander" | "glare" | "sulk" | "doze" | "drag" | "knock";
export type RunEvent = { tick: number; verb: Verb; target?: string; room?: RoomId | null; cause: string; text: string };
export type Action = { verb: Verb; target?: Placed; tx: number; ty: number; path: number[]; dur: number; t: number; notice: number; cause: string };

export type Run = {
  index: number; prep: ItemId[]; combo: string | null; mood: Mood;
  lucy: Rng; text: Rng;
  tick: number; x: number; y: number; energy: number;
  action: Action | null; carrying: Placed | null;
  events: RunEvent[]; touched: Set<string>; rooms: Set<RoomId>; trail: [number, number][];
  squeakedAt: number | null; squeakAnswered: boolean | null; done: boolean; napOn: string | null;
  unlocked: Set<RoomId>; things: Placed[]; stash: Placed[]; habits: Habits;
  rolls: number; decisions: number; stashFirstChecked: boolean; leftover: Leftover; dozed: boolean;
  roomTicks: Record<string, number>;
  visits: Record<string, number>;
  /** The last decision's shortlist, kept for the eye. The sim never reads it back. */
  shortlist: Shortlist;
};

/** What she nearly did instead, with the odds the roll actually used. */
export type Shortlist = { tick: number; picked: string; near: { what: string; why: string; weight: number }[] } | null;

export const MAX_TICKS = 3000;
const TICKS_PER_TILE = 3;

function mixMood(prep: ItemId[], left: Leftover): Mood {
  const m: Mood = { tags: {}, speed: 1, drain: 1, squeak: 0.5 };
  if (!prep.length) return applyLeftover(m, left);
  let sq = 0;
  for (const id of prep) {
    const it = ITEMS[id].mood;
    for (const [k, v] of Object.entries(it.tags)) m.tags[k as Tag] = (m.tags[k as Tag] ?? 1) * (v as number);
    m.speed *= it.speed; m.drain *= it.drain; sq += it.squeak;
    if (it.swim) m.swim = true; if (it.sulk) m.sulk = true; if (it.bath) m.bath = true;
  }
  m.squeak = sq / prep.length;
  if (comboKey(prep) === "insult+snacks" || comboKey(prep) === "snacks+squeaky") m.squeak = 1; // the bribe, the dinner bell
  return applyLeftover(m, left);
}

function applyLeftover(m: Mood, left: Leftover): Mood {
  if (!left || m.bath) return m; // a bath washes it away
  const damp = (k: number) => { for (const t of Object.keys(m.tags) as Tag[]) m.tags[t] = 1 + (m.tags[t]! - 1) * k; };
  const mul = (t: Tag, v: number) => { m.tags[t] = (m.tags[t] ?? 1) * v; };
  const s = left.strength; // 0.1–0.2
  if (left.kind === "grudgy") { damp(1 - s * 2); m.squeak *= 1 - s * 2.5; mul("hide", 1 + s * 2); }
  if (left.kind === "hyper") { m.speed *= 1 + s; m.drain *= 1 + s * 0.6; mul("noise", 1 + s * 2); mul("small", 1 + s); }
  if (left.kind === "sleepy") { damp(1 - s); m.speed *= 1 - s * 0.8; m.drain *= 1 + s * 1.6; mul("soft", 1 + s * 2.5); mul("warm", 1 + s * 2); }
  return m;
}

export function startRun(p: Profile, prep: ItemId[]): Run {
  const index = p.runs.length;
  const combo = comboKey(prep);
  const r: Run = {
    index, prep, combo: combo && COMBOS[combo] ? combo : null, mood: mixMood(prep, p.leftover),
    lucy: new Rng(hash(p.seed, index, "lucy")), text: new Rng(hash(p.seed, index, "text")),
    tick: 0, x: CAGE.x, y: CAGE.y, energy: 100, action: null, carrying: null,
    events: [], touched: new Set(), rooms: new Set(["living"]), trail: [[CAGE.x, CAGE.y]],
    squeakedAt: null, squeakAnswered: null, done: false, napOn: null,
    unlocked: unlockedRooms(p), things: p.things.map((t) => ({ ...t })), stash: p.stash.map((t) => ({ ...t })), habits: { ...p.habits },
    rolls: 0, decisions: 0, stashFirstChecked: false, roomTicks: {}, visits: {}, leftover: p.leftover, dozed: false, shortlist: null,
  };
  if (r.mood.bath) {
    const towel = r.things.find((t) => t.id === "bathtowel");
    if (towel && !r.unlocked.has("bathroom")) { towel.x = CAGE.x + 3; towel.y = CAGE.y + 2; towel.room = "living"; }
  }
  if (p.leftover && !r.mood.bath) say(r, "wander", undefined, `leftover: ${p.leftover.kind}`, `Lucy is ${LEFTOVER_TEXT[p.leftover.kind]}.`);
  if (p.leftover && r.mood.bath) say(r, "wander", undefined, "the bath", `A bath. Lucy was ${LEFTOVER_TEXT[p.leftover.kind]}, but not anymore. She is damp and delighted.`);
  say(r, "wander", undefined, prep.length ? `door opens (${prep.map((i) => ITEMS[i].name.toLowerCase()).join(" + ")})` : "door opens", pick(r, [
    "The cage door opens. Lucy considers the situation.",
    "Door's open. Lucy steps out like she owns the place. She does.",
    "Lucy pours herself out of the cage.",
  ]));
  return r;
}

// ---------- helpers ----------
const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const idx = (x: number, y: number) => y * W + x;
function pick<T>(r: Run, xs: T[]): T { return xs[r.text.int(xs.length)]; }

function say(r: Run, verb: Verb, target: Placed | undefined, cause: string, text: string) {
  r.events.push({ tick: r.tick, verb, target: target?.id, room: roomAt(r.x, r.y), cause, text });
}

function bfs(r: Run, sx: number, sy: number) {
  const dist = new Int16Array(W * H).fill(-1), prev = new Int32Array(W * H).fill(-1);
  const q = [idx(sx, sy)]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, n = idx(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[n] !== -1 || !walkable(nx, ny, r.unlocked)) continue;
      dist[n] = dist[c] + 1; prev[n] = c; q.push(n);
    }
  }
  return { dist, prev };
}
function pathTo(prev: Int32Array, sx: number, sy: number, tx: number, ty: number) {
  const out: number[] = []; let c = idx(tx, ty); const s = idx(sx, sy);
  while (c !== s && c !== -1) { out.push(c); c = prev[c]; }
  return c === -1 ? null : out.reverse();
}

function interest(r: Run, t: Placed) {
  let s = 0;
  for (const tag of t.tags) s += BASE[tag] * (r.mood.tags[tag] ?? 1);
  if (r.habits.favRoom && t.room === r.habits.favRoom) s += 0.4;
  if (r.habits.favNap === t.id) s += 0.6;
  if (t.arrivedRun !== undefined) s += 0.8; // new things are fascinating
  return s / Math.sqrt(t.tags.length);
}

// ---------- decisions: math ranks, the seed picks among the top few (never always-best) ----------
type Cand = { verb: Verb; target?: Placed; tx: number; ty: number; score: number; dur: number; cause: string };

function choose(r: Run) {
  r.decisions++;
  const { dist, prev } = bfs(r, r.x, r.y);
  const cands: Cand[] = [];
  const reach = (x: number, y: number) => dist[idx(x, y)];
  const tired = r.energy < 24;
  const present = r.things.filter((t) => r.unlocked.has(t.room) && reach(t.x, t.y) >= 0);

  for (const t of present) {
    const d = reach(t.x, t.y), near = 1 / (1 + d / 9), fresh = 1 / (1 + (r.mood.sulk ? 3 : 2) * (r.visits[t.id] ?? 0));
    const i = interest(r, t) * near;
    if (r.habits.nemesis === t.id) {
      if (d < 14 && !r.touched.has(t.id)) {
        const cause = r.mood.sulk ? "ritual:sulks-with-nemesis" : r.prep.includes("squeaky") ? "ritual:dooks-at-nemesis" : "habit: nemesis";
        cands.push({ verb: r.mood.sulk ? "sulk" : "glare", target: t, tx: t.x, ty: t.y, score: (cause === "habit: nemesis" ? 1.6 : 3) * near, dur: 18, cause });
      }
      continue;
    }
    if (tired) {
      if (t.tags.includes("soft") || t.tags.includes("warm")) {
        let s = (1 + (r.mood.tags.soft ?? 1) + (r.habits.favNap === t.id ? 3 : 0) + (t.id === "shoe" ? 0.7 : 0)) * near;
        if (t.id === "bathtowel" && r.mood.bath) s *= 5; // straight into her towel
        cands.push({ verb: "nap", target: t, tx: t.x, ty: t.y, score: s, dur: 0, cause: r.habits.favNap === t.id ? "habit: her spot" : "tired" });
      }
      continue;
    }
    cands.push({ verb: "sniff", target: t, tx: t.x, ty: t.y, score: i * fresh * 0.7, dur: 8, cause: tagCause(r, t) });
    // her favourite shoe: she randomly climbs in for a doze mid-run, once
    if (t.id === "shoe" && !r.dozed && r.energy < 70 && d < 10 && r.lucy.next() < (r.leftover?.kind === "sleepy" ? 0.8 : 0.35))
      cands.push({ verb: "doze", target: t, tx: t.x, ty: t.y, score: (r.leftover?.kind === "sleepy" ? 2.4 : 1.1) * near, dur: 42, cause: r.leftover?.kind === "sleepy" ? "leftover: sleepy" : "her favourite shoe" });
    if (t.stealable && !r.carrying) {
      let s = i * fresh * 1.1;
      if (r.combo === "insult+sock" && (t.id === "slipper" || (t.id === "keys" && !r.things.some((x) => x.id === "slipper")))) s *= 6;
      if (r.combo === "insult+squeaky" && t.tags.includes("noise")) s *= 4;
      if (r.combo === "snacks+sock" && t.tags.includes("fabric")) s *= 3;
      if (r.combo === "salmon+squeaky" && t.id === "duck") s *= 6;
      cands.push({ verb: "steal", target: t, tx: t.x, ty: t.y, score: s, dur: 6, cause: tagCause(r, t) });
    }
    if (t.tags.includes("hide")) {
      let s = i * fresh * (r.mood.sulk ? 1.6 : 0.6) * (r.mood.bath && r.rolls < 2 ? 0.3 : 1);
      if (r.mood.sulk) s *= 1 + Math.sqrt(dist2(t, CAGE)) / 15; // as far from you as possible
      if (t.id === "bathtowel") s *= r.mood.bath && r.rolls >= 2 && !r.visits.bathtowel ? 12 : 2.2; // her towel: after a bath, or a very bad mood
      cands.push({ verb: r.mood.sulk ? "sulk" : "hide", target: t, tx: t.x, ty: t.y, score: s, dur: t.id === "bathtowel" ? 50 : 26, cause: t.id === "bathtowel" && r.mood.bath ? "after the bath" : tagCause(r, t) });
      if (r.mood.sulk) cands[cands.length - 1].dur = t.id === "bathtowel" ? 50 : 38;
    }
    // Jay: pushing and tipping happen on her home turf (the living room), not everywhere
    if (t.drag && t.room === "living" && !r.carrying && (r.visits[t.id] ?? 0) < 2)
      cands.push({ verb: "drag", target: t, tx: t.x, ty: t.y, score: i * fresh * (r.prep.includes("sock") ? 1.2 : 0.55) * (r.mood.bath ? 1.4 : 1), dur: 16, cause: r.prep.includes("sock") ? "a wound-up sock" : "it was in the wrong place" });
    if (t.tip && t.room === "living" && !t.knocked)
      cands.push({ verb: "knock", target: t, tx: t.x, ty: t.y, score: i * fresh * (r.mood.speed >= 1.3 || r.leftover?.kind === "hyper" ? 1.3 : 0.5) * (r.prep.includes("squeaky") && t.tags.includes("noise") ? 1.8 : 1), dur: 10, cause: r.mood.speed >= 1.3 ? "zoomies" : r.leftover?.kind === "hyper" ? "leftover: hyper" : tagCause(r, t) });
    if (t.tags.includes("noise") || (r.combo === "sock+squeaky" && t.tags.includes("fabric") && t.tags.includes("small")))
      cands.push({ verb: "play", target: t, tx: t.x, ty: t.y, score: i * fresh * (r.combo === "sock+squeaky" && t.tags.includes("fabric") ? 2.4 : 0.9), dur: 20, cause: r.combo === "sock+squeaky" && t.tags.includes("fabric") ? "puppet show" : tagCause(r, t) });
    if (t.tags.includes("water") && (r.mood.swim || r.combo === "salmon+snacks"))
      cands.push({ verb: "fish", target: t, tx: t.x, ty: t.y, score: i * fresh * (r.combo === "salmon+squeaky" && t.id === "duck" ? 5 : 1.4), dur: 30, cause: r.combo === "salmon+squeaky" && t.id === "duck" ? "duck friend" : "purple salmon" });
    if (r.combo === "salmon+sock" && t.tags.includes("fabric") && !t.stealable)
      cands.push({ verb: "fish", target: t, tx: t.x, ty: t.y, score: i * fresh * 2.2, dur: 26, cause: "laundry river" });
    if (r.mood.bath && t.tags.includes("soft") && !r.touched.has(t.id) && t.id !== "bathtowel")
      cands.push({ verb: "roll", target: t, tx: t.x, ty: t.y, score: i * (r.rolls < 2 ? 5 : 1.2), dur: 14, cause: "drying off after the bath" });
  }

  if (tired && r.mood.sulk && r.stash.length && !r.events.some((e) => e.verb === "gift") && reach(CAGE.x, CAGE.y) >= 0)
    cands.push({ verb: "gift", tx: CAGE.x + 1, ty: CAGE.y, score: 50, dur: 10, cause: "forgiveness" });
  if (!tired && (r.stash.length || r.carrying)) {
    const routine = (r.habits.routine || r.stash.length >= 3) && r.decisions === 1;
    cands.push({ verb: "stash", tx: STASH.x, ty: STASH.y, score: r.carrying ? 40 : routine ? 30 : (0.5 + r.stash.length * 0.12) / (1 + 3 * (r.visits.stash ?? 0)), dur: 12, cause: r.carrying ? "carrying treasure" : routine ? "habit: routine" : "treasures" });
  }
  if (!tired) {
    const w = wanderTarget(r, dist);
    if (w) cands.push({ verb: "wander", tx: w[0], ty: w[1], score: r.mood.swim ? (r.mood.sulk && r.decisions <= 3 ? 6 : 1.4) : 0.45, dur: 0, cause: r.mood.swim ? "swimming" : "exploring" });
  }
  if (tired && !cands.some((c) => c.verb === "nap" || c.verb === "gift")) cands.push({ verb: "nap", tx: r.x, ty: r.y, score: 1, dur: 0, cause: "too tired to find a bed" });

  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 3);
  const total = top.reduce((s, c) => s + c.score * c.score, 0);
  let roll = r.lucy.next() * total;
  let c = top[0];
  for (const k of top) if ((roll -= k.score * k.score) <= 0) { c = k; break; }

  // Keep the shortlist for the eye: the same three candidates the roll chose between,
  // with their real odds (score², normalised). Recording it changes nothing.
  const label = (k: Cand) => `${k.verb}${k.target ? ` the ${shortName(k.target.name)}` : ""}`;
  r.shortlist = {
    tick: r.tick,
    picked: label(c),
    near: top.map((k) => ({ what: label(k), why: k.cause, weight: total > 0 ? (k.score * k.score) / total : 0 })),
  };

  const path = pathTo(prev, r.x, r.y, c.tx, c.ty) ?? [];
  r.action = { verb: c.verb, target: c.target, tx: c.tx, ty: c.ty, path, dur: c.dur, t: 0, notice: c.verb === "wander" ? 0 : 5, cause: c.cause };
}

function shortName(name: string) {
  return name.replace(/^(A|An|The|Your|Her|One) /i, "").toLowerCase();
}

function tagCause(r: Run, t: Placed) {
  let best = "", bv = 1;
  for (const tag of t.tags) { const v = r.mood.tags[tag] ?? 1; if (v > bv) { bv = v; best = tag; } }
  if (!best) return "curiosity";
  const item = r.prep.find((i) => (ITEMS[i].mood.tags[best as Tag] ?? 1) > 1);
  return item ? ITEMS[item].name.toLowerCase() : "curiosity";
}

function wanderTarget(r: Run, dist: Int16Array): [number, number] | null {
  if (r.mood.swim) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let [dx, dy] = dirs[r.lucy.int(4)];
    if (r.mood.sulk && r.decisions <= 3) { dx = r.x <= CAGE.x + 2 ? 1 : dx; dy = r.y <= CAGE.y + 2 ? 1 : dy; if (dx && dy) dy = 0; } // away from you, dramatically
    let x = r.x, y = r.y;
    while (walkable(x + dx, y + dy, r.unlocked)) { x += dx; y += dy; }
    if (x !== r.x || y !== r.y) return [x, y];
  }
  for (let tries = 0; tries < 12; tries++) {
    const x = r.lucy.int(W), y = r.lucy.int(H);
    if (dist[idx(x, y)] > 3) return [x, y];
  }
  return null;
}

// ---------- the tick ----------
export function step(r: Run): boolean {
  if (r.done) return true;
  r.tick++;
  const a0 = r.action;
  const moving = a0 && a0.notice <= 0 && a0.path.length > 0;
  r.energy -= 0.085 * r.mood.drain * (moving ? 1.15 : 0.8);
  if (r.energy <= 3 || r.tick >= MAX_TICKS) { napHere(r, "fell asleep mid-thought"); return true; }
  if (!r.action) choose(r);
  const a = r.action!;
  if (a.notice > 0) { a.notice--; return false; }
  if (a.path.length) {
    const every = Math.max(1, Math.round((r.mood.swim && a.verb === "wander" ? 1.2 : TICKS_PER_TILE) / r.mood.speed));
    if (r.tick % every === 0) {
      const c = a.path.shift()!;
      r.x = c % W; r.y = (c / W) | 0;
      r.trail.push([r.x, r.y]);
      const room = roomAt(r.x, r.y);
      if (room && !r.rooms.has(room)) r.rooms.add(room);
      if (room) r.roomTicks[room] = (r.roomTicks[room] ?? 0) + 1;
      maybeStartle(r);
    }
    return false;
  }
  if (a.t++ < a.dur) return false;
  complete(r, a);
  r.action = null;
  return r.done;
}

function maybeStartle(r: Run) {
  if (r.action?.verb === "startle") return;
  for (const t of r.things) {
    if (!t.startles || !r.unlocked.has(t.room) || dist2(t, r) > 4 || r.touched.has("startle:" + t.id)) continue;
    r.touched.add("startle:" + t.id);
    if (r.lucy.next() < 0.35) {
      say(r, "startle", t, "the " + t.name, pick(r, [
        `${cap(the(t.name))} made a noise. Lucy did a full vertical leap and pretended she meant to.`,
        `Lucy was ambushed by ${the(t.name)}. She has filed it under "enemies".`,
        `${cap(the(t.name))} hummed at her. She puffed up to twice her size, which is still small.`,
      ]));
      const hide = r.things.filter((h) => h.tags.includes("hide") && r.unlocked.has(h.room)).sort((a, b) => dist2(a, r) - dist2(b, r))[0];
      if (hide) {
        const { prev } = bfs(r, r.x, r.y);
        r.action = { verb: "hide", target: hide, tx: hide.x, ty: hide.y, path: pathTo(prev, r.x, r.y, hide.x, hide.y) ?? [], dur: 20, t: 0, notice: 0, cause: "startled" };
      }
      return;
    }
  }
}

function complete(r: Run, a: Action) {
  const t = a.target;
  if (t) r.visits[t.id] = (r.visits[t.id] ?? 0) + 1;
  const n = t?.name ?? "";
  switch (a.verb) {
    case "sniff":
      if (t) r.touched.add(t.id);
      say(r, "sniff", t, a.cause, pick(r, [`Lucy sniffed ${the(n)} thoroughly.`, `Lucy inspected ${the(n)}. Verdict pending.`, `${cap(the(n))} has been sniffed. Approved, probably.`]));
      break;
    case "steal":
      if (!t || !r.things.includes(t)) break;
      r.touched.add(t.id);
      r.things = r.things.filter((x) => x !== t);
      r.carrying = t;
      say(r, "steal", t, a.cause, r.combo === "insult+sock" && t.id === "slipper"
        ? "Lucy took your slipper. Not a slipper. Yours. She made eye contact the whole time."
        : pick(r, [`Lucy stole ${the(n)}. She is walking very fast and very casually.`, `${cap(the(n))}: acquired. Lucy did not ask.`, `Lucy grabbed ${the(n)} and dooked about it.`]));
      break;
    case "stash": {
      if (r.carrying) {
        const item = r.carrying; r.carrying = null;
        const shoe = r.things.find((x) => x.id === "shoe");
        if (r.combo === "snacks+sock" && item.tags.includes("fabric")) {
          say(r, "stash", item, "the snack sock", `Lucy packed ${the(item.name)} with snacks and hid it under the couch. For later. For emergencies.`);
        } else if (r.prep.includes("sock") && shoe && r.unlocked.has(shoe.room) && item.tags.includes("fabric") && r.lucy.next() < 0.5) {
          say(r, "stash", item, "ritual:shoe-nest", `Lucy stuffed ${the(item.name)} into her favourite shoe. It is a nest now. It was always going to be a nest.`);
        } else if (r.prep.includes("sock") && r.habits.favNap && item.tags.includes("fabric")) {
          const spot = r.things.find((x) => x.id === r.habits.favNap);
          say(r, "stash", item, "ritual:decorates-spot", `Lucy draped ${the(item.name)} over ${spot ? the(spot.name) : "her spot"}. Interior design.`);
        } else say(r, "stash", item, a.cause, `Lucy hid ${the(item.name)} under the couch with her other treasures.`);
        r.stash.push(item);
      } else {
        r.visits.stash = (r.visits.stash ?? 0) + 1;
        if (r.decisions === 1) r.stashFirstChecked = true;
        say(r, "stash", undefined, r.prep.includes("snacks") && r.habits.routine ? "ritual:crumbs-in-treasure" : r.stash.length >= 4 ? "ritual:rearranged-treasure" : a.cause,
          r.prep.includes("snacks") && r.habits.routine ? "Lucy added crumbs to her treasure pile. For later. For emergencies."
          : r.stash.length >= 4 ? `Lucy rearranged all ${r.stash.length} of her treasures, by an order only she understands.`
          : r.stash.length
          ? `Lucy checked on her treasures. All ${r.stash.length} present. She counted twice.`
          : "Lucy checked under the couch. Nothing there yet. She seemed disappointed in you.");
      }
      break;
    }
    case "hide":
    case "sulk":
      if (t) r.touched.add(t.id);
      say(r, a.verb, t, a.cause, a.cause === "ritual:sulks-with-nemesis"
        ? `Lucy sulked right next to ${the(n)}. They are on the same side now.`
        : a.verb === "sulk"
        ? (t?.id === "bathtowel" ? `Lucy rolled herself into her towel like a burrito and refused to be perceived.` : pick(r, [`Lucy sulked behind ${the(n)}. Loudly.`, `Lucy is not speaking to you. She is behind ${the(n)}.`]))
        : t?.id === "bathtowel"
        ? (r.mood.bath ? "Lucy dove into her towel, still damp, and became a small warm lump. This is the best part of any bath." : "Lucy hid in her towel. Nobody gave her a bath. She just likes it there.")
        : pick(r, [`Lucy vanished into ${the(n)}. Only the tail is visible.`, `Lucy hid in ${the(n)} for no reason she will share.`]));
      break;
    case "play":
      if (t) r.touched.add(t.id);
      say(r, "play", t, a.cause, r.combo === "sock+squeaky" && t?.tags.includes("fabric")
        ? `Lucy made ${the(n)} into a puppet, then attacked the puppet. The puppet lost.`
        : pick(r, [`Lucy played with ${the(n)}. Many dooks were had.`, `Lucy did the war dance at ${the(n)}. Sideways hops. Mouth open.`]));
      break;
    case "fish":
      if (t) r.touched.add(t.id);
      say(r, "fish", t, a.cause, a.cause === "duck friend"
        ? "Lucy found the rubber duck. She groomed it. It squeaked. They are best friends now."
        : a.cause === "laundry river"
        ? `Lucy went fishing in ${the(n)} and pulled out a sock that was not there. Spiritually, she caught it.`
        : r.combo === "salmon+snacks"
        ? `Lucy sat by ${the(n)} and fished for snacks with one paw. None were caught. Spirits remain high.`
        : pick(r, [`Lucy swam laps near ${the(n)}. On the floor. With conviction.`, `Lucy tried to swim in ${the(n)}. She is dry. She is thrilled.`]));
      break;
    case "roll":
      if (t) r.touched.add(t.id);
      r.rolls++;
      say(r, "roll", t, a.cause, pick(r, [`Lucy rolled all over ${the(n)} to dry off. Aggressively.`, `Lucy dried her face on ${the(n)}, then her back, then her face again.`]));
      break;
    case "glare":
      if (t) r.touched.add(t.id);
      say(r, "glare", t, a.cause, a.cause === "ritual:dooks-at-nemesis"
        ? `Lucy dooked at ${the(n)} until it apologized. It did not apologize.`
        : `Lucy stopped to glare at ${the(n)}. It knows what it did.`);
      break;
    case "gift": {
      const g = r.stash.shift()!;
      g.x = CAGE.x + 1; g.y = CAGE.y; g.room = "living";
      r.things.push(g);
      say(r, "gift", g, "forgiveness", `Lucy left ${the(g.name)} by the cage. You are forgiven. Probably.`);
      break;
    }
    case "doze":
      if (t) r.touched.add(t.id);
      r.dozed = true; r.energy = Math.min(100, r.energy + 20);
      say(r, "doze", t, a.cause, r.leftover?.kind === "sleepy"
        ? "Lucy climbed into her favourite shoe for a nap she has apparently been owed since last time."
        : pick(r, ["Lucy climbed into her favourite shoe for a quick nap. Then she remembered she had things to do.", "Lucy fell asleep in her shoe for exactly one minute and woke up furious about it.", "Lucy's head is in the shoe. The rest of Lucy is asleep outside the shoe."]));
      break;
    case "drag": {
      if (!t) break;
      r.touched.add(t.id);
      const room = ROOMS.find((x) => x.id === t.room)!;
      const taken = (x: number, y: number) => r.things.some((o) => o !== t && o.x === x && o.y === y) || (x === CAGE.x && y === CAGE.y) || (x === STASH.x && y === STASH.y);
      for (let tries = 0; tries < 16; tries++) {
        const dx = r.lucy.int(5) - 2, dy = r.lucy.int(5) - 2, nx = t.x + dx, ny = t.y + dy;
        if ((dx || dy) && nx >= room.x && nx < room.x + room.w && ny >= room.y && ny < room.y + room.h && !taken(nx, ny)) {
          if (!t.origin) t.origin = { x: t.x, y: t.y };
          t.x = nx; t.y = ny;
          if (t.origin.x === t.x && t.origin.y === t.y) delete t.origin; // dragged it right back
          break;
        }
      }
      say(r, "drag", t, a.cause, t.id === "bathtowel"
        ? "Lucy dragged her towel somewhere better. Better for Lucy."
        : pick(r, [`Lucy dragged ${the(n)} a little to the left. It is better there. She has decided.`, `Lucy rearranged ${the(n)}. Without consulting anyone.`, `Lucy tugged ${the(n)} across the floor by one corner, walking backwards the whole way.`]));
      break;
    }
    case "knock":
      if (!t) break;
      r.touched.add(t.id);
      t.knocked = true;
      say(r, "knock", t, a.cause, t.id === "bin"
        ? "Lucy tipped over the kitchen bin. Investigation ongoing."
        : pick(r, [`Lucy knocked over ${the(n)}. She looked at it. She looked at you. No regrets.`, `${cap(the(n))} is on its side now. Lucy did that.`, `Lucy tipped ${the(n)} over to see what was inside. Nothing. She tipped it anyway.`]));
      break;
    case "wander":
      if (r.mood.swim && r.habits.favRoom && roomAt(r.x, r.y) === r.habits.favRoom && !r.events.some((e) => e.cause === "ritual:territory-lake"))
        say(r, "wander", undefined, "ritual:territory-lake", `Lucy declared the ${roomName(r.habits.favRoom)} a lake. She is its only fish.`);
      else if (r.mood.swim) say(r, "wander", undefined, "purple salmon", pick(r, ["Lucy swam across the room in a straight line, flat as a pancake.", "Lucy glided down the current of the floor.", "Lucy crossed the room doing what can only be called the breaststroke."]));
      break;
    case "nap": {
      if (a.target) r.touched.add(a.target.id);
      finishNap(r, a.target ?? null, a.cause);
      break;
    }
  }
}

function napHere(r: Run, cause: string) {
  const t = r.things.filter((x) => r.unlocked.has(x.room)).sort((a, b) => dist2(a, r) - dist2(b, r))[0];
  finishNap(r, t && dist2(t, r) <= 8 ? t : null, cause);
}

function finishNap(r: Run, t: Placed | null, cause: string) {
  if (r.done) return;
  if (r.carrying) { r.stash.push(r.carrying); r.carrying = null; }
  r.napOn = t?.id ?? null;
  const where = t?.id === "shoe" ? "in her favourite shoe" : t?.id === "bathtowel" ? "in her towel" : t ? `on ${the(t.name)}` : `in the middle of the ${roomName(roomAt(r.x, r.y))}`;
  if (t?.id === "shoe" && r.prep.includes("snacks")) {
    say(r, "nap", t, "ritual:food-coma", "Lucy ate everything, climbed into her favourite shoe, and went into a food coma. Paws up.");
    r.done = true; return;
  }
  if (t && r.habits.favNap === t.id && r.leftover?.kind === "sleepy") {
    say(r, "nap", t, "ritual:pancake-on-spot", `Lucy went straight to her spot on ${the(t.name)} and became a pancake. She was tired before she even started.`);
    r.done = true; return;
  }
  say(r, "nap", t ?? undefined, cause, pick(r, [`Lucy curled up ${where} and fell asleep. Run over. She is extremely proud.`, `Lucy fell asleep ${where}, mid-dook.`, `Lucy is asleep ${where}. Do not move her. Those are the rules.`]));
  r.done = true;
}

const roomName = (id: RoomId | null) => (id ? ROOMS.find((x) => x.id === id)!.name.toLowerCase() : "house");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** "fallen scarf" → "the fallen scarf"; "your slipper", "a single sock" stay as they are */
export const the = (n: string) => (/^(a|an|the|your|her|one|toast|house)\b/i.test(n) ? n : "the " + n);

/** The treat squeak: one per run. She may or may not care. */
export function squeak(r: Run) {
  if (r.done || r.squeakedAt !== null) return;
  r.squeakedAt = r.tick;
  const yes = r.lucy.next() < r.mood.squeak;
  r.squeakAnswered = yes;
  if (yes) {
    const { prev } = bfs(r, r.x, r.y);
    if (r.carrying) { r.stash.push(r.carrying); r.carrying = null; }
    r.action = { verb: "come", tx: CAGE.x + 1, ty: CAGE.y, path: pathTo(prev, r.x, r.y, CAGE.x + 1, CAGE.y) ?? [], dur: 12, t: 0, notice: 3, cause: "the squeak" };
    if (r.stash.length && !r.mood.sulk) {
      const shown = r.stash[r.lucy.int(r.stash.length)];
      say(r, "come", shown, "ritual:show-and-tell", `You squeaked. Lucy came running with ${the(shown.name)} from her stash, to show you. She did not let you hold it.`);
    } else say(r, "come", undefined, "the squeak", r.combo === "insult+snacks"
      ? "You squeaked. Lucy considered the snacks, then your apology. She accepts both."
      : "You squeaked. Lucy came galloping back, dooking the entire way.");
  } else {
    say(r, "come", undefined, "the squeak", r.mood.sulk ? "You squeaked. Lucy turned her back on you, loudly." : "You squeaked. Lucy heard. Lucy has other plans.");
  }
}

export function runToEnd(r: Run, squeakAt?: number) {
  while (!r.done) {
    if (squeakAt !== undefined && r.tick === squeakAt) squeak(r);
    step(r);
  }
  return r;
}

// ---------- after the nap: the journal, the stash, habits, the house moves on ----------
export type RunSummary = {
  index: number; prep: ItemId[]; squeakAt: number | null; ticks: number; events: RunEvent[];
  newEntries: JournalEntry[]; sentence: string; rooms: RoomId[]; napOn: string | null; stashSize: number;
  returned: string[]; arrived: string | null; unlockedNow: string[]; comboFired: string | null; trail: [number, number][];
  leftoverIn: Leftover; leftoverOut: Leftover; god: boolean;
  /** For the eye: how much rolling happened, and her last shortlist. */
  rolls: number; decisions: number; shortlist: Shortlist;
};

const JOURNAL_VERBS: Verb[] = ["steal", "hide", "sulk", "play", "fish", "roll", "startle", "glare", "gift", "nap", "doze", "drag", "knock"];

export function finishRun(p: Profile, r: Run): RunSummary {
  const beforeRooms = unlockedRooms(p), beforeItems = unlockedItems(p);
  const newEntries: JournalEntry[] = [];
  const add = (key: string, kind: JournalEntry["kind"], text: string) => {
    if (p.journal.has(key)) return;
    const e = { key, run: r.index, text, kind };
    p.journal.set(key, e); newEntries.push(e);
  };

  for (const e of r.events) if (JOURNAL_VERBS.includes(e.verb) && e.target) add(`${e.verb}:${e.target}`, "behaviour", e.text);
  for (const e of r.events) if (e.cause.startsWith("ritual:")) add(e.cause, "habit", e.text);
  if (r.squeakAnswered === true) add("come:squeak", "behaviour", "She comes when you squeak. Sometimes.");
  if (r.squeakAnswered === false) add(`ignore:squeak:${r.mood.sulk ? "sulk" : "busy"}`, "behaviour", r.mood.sulk ? "A sulking Lucy ignores the squeak." : "Lucy can ignore a squeak when busy.");
  if (r.mood.swim && r.events.some((e) => e.verb === "wander" && e.cause === "purple salmon")) add("swim", "behaviour", "Purple salmon: the floor is a river now.");
  if (r.leftover && !r.mood.bath) add(`leftover:${r.leftover.kind}`, "habit", `Lucy can be ${LEFTOVER_TEXT[r.leftover.kind]}. It changes what your prep can do.`);
  if (r.leftover?.kind === "grudgy" && r.mood.bath) add("bath:grudge", "habit", "A bath washes away a grudge.");
  if (r.mood.bath && r.events.some((e) => e.target === "bathtowel")) add("bath:towel", "behaviour", "After a bath she dries off on everything, then disappears into her towel.");

  // did the combo actually happen?
  let comboFired: string | null = null;
  const has = (pred: (e: RunEvent) => boolean) => r.events.some(pred);
  if (r.combo) {
    const k = r.combo;
    const fired =
      (k === "salmon+snacks" && has((e) => e.verb === "fish")) ||
      (k === "insult+sock" && has((e) => e.verb === "steal" && (e.target === "slipper" || e.target === "keys"))) ||
      (k === "insult+snacks" && r.squeakAnswered === true) ||
      (k === "snacks+squeaky" && r.squeakAnswered === true) ||
      (k === "snacks+sock" && has((e) => e.cause === "the snack sock")) ||
      (k === "salmon+sock" && has((e) => e.cause === "laundry river")) ||
      (k === "insult+salmon" && has((e) => e.cause === "purple salmon") && has((e) => e.verb === "sulk")) ||
      (k === "salmon+squeaky" && has((e) => e.target === "duck")) ||
      (k === "sock+squeaky" && has((e) => e.verb === "play" && !!r.things.concat(r.stash).find((t) => t.id === e.target && t.tags.includes("fabric")))) ||
      (k === "insult+squeaky" && has((e) => e.verb === "steal" && !!THINGS.concat(ARRIVALS as Thing[]).find((t) => t.id === e.target && t.tags.includes("noise")))) ||
      false;
    if (fired) { comboFired = k; add(`combo:${k}`, "combo", `${COMBOS[k].name}: ${COMBOS[k].hint}.`); }
  }

  // commit the house (her towel goes back to the bathroom after a bath)
  const home = THINGS.find((t) => t.id === "bathtowel")!;
  for (const t of r.things) if (t.id === "bathtowel") { t.x = home.x; t.y = home.y; t.room = home.room; }
  p.things = r.things; p.stash = r.stash;
  if (r.napOn) p.counts.nap[r.napOn] = (p.counts.nap[r.napOn] ?? 0) + 1;
  for (const [room, n] of Object.entries(r.roomTicks)) p.counts.room[room] = (p.counts.room[room] ?? 0) + n;
  for (const e of r.events) if (e.verb === "startle" && e.target) p.counts.startle[e.target] = (p.counts.startle[e.target] ?? 0) + 1;
  if (r.stashFirstChecked) p.counts.stashFirst++;

  // habits: residue that persists lightly (decays), then forms when it's strong enough
  const decay = (o: Record<string, number>) => { for (const k of Object.keys(o)) o[k] *= 0.85; };
  decay(p.counts.nap); decay(p.counts.startle); decay(p.counts.room); p.counts.stashFirst *= 0.85;
  const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const nap = top(p.counts.nap), st = top(p.counts.startle), rm = top(p.counts.room);
  const totalRoom = Object.values(p.counts.room).reduce((s, v) => s + v, 0);
  const h: Habits = {
    favNap: nap && nap[1] >= 1.35 ? nap[0] : null,
    nemesis: st && st[1] >= 1.2 ? st[0] : null,
    favRoom: rm && p.runs.length >= 2 && rm[1] / totalRoom > 0.36 ? (rm[0] as RoomId) : null,
    routine: p.counts.stashFirst >= 1.3 || (p.habits.routine && p.stash.length > 0),
  };
  const thingName = (id: string) => THINGS.concat(ARRIVALS as Thing[]).find((t) => t.id === id)?.name ?? id;
  if (h.favNap && h.favNap !== p.habits.favNap) add(`habit:nap:${h.favNap}`, "habit", `Habit: the ${thingName(h.favNap)} is her spot now.`);
  if (h.nemesis && h.nemesis !== p.habits.nemesis) add(`habit:nemesis:${h.nemesis}`, "habit", `Habit: Lucy has a nemesis. It is the ${thingName(h.nemesis)}.`);
  if (h.favRoom && h.favRoom !== p.habits.favRoom) add(`habit:room:${h.favRoom}`, "habit", `Habit: the ${roomName(h.favRoom)} is her territory.`);
  if (h.routine && !p.habits.routine) add("habit:routine", "habit", "Habit: every run starts with a treasure check.");
  p.habits = h;

  // how this run leaves her (10–20% carries into the next one; recomputed every run, so it never piles up)
  const ev = (v: Verb) => r.events.filter((e) => e.verb === v).length;
  let leftoverOut: Leftover = null;
  const forgave = ev("gift") > 0 || (r.squeakAnswered === true && r.mood.sulk);
  if ((r.mood.sulk && !forgave) || ev("startle") >= 1 || r.squeakAnswered === false)
    leftoverOut = { kind: "grudgy", strength: r.mood.sulk && !forgave ? 0.2 : 0.12, why: r.mood.sulk ? "never got her apology" : ev("startle") >= 1 ? `${nameOf(r, r.events.find((e) => e.verb === "startle")!.target!)} ambushed her` : "she ignored your squeak and now feels weird about it" };
  else if (ev("doze") > 0 || r.tick > 950)
    leftoverOut = { kind: "sleepy", strength: 0.14, why: ev("doze") > 0 ? "that nap in the shoe was not enough" : "a long day" };
  else if ((r.prep.includes("snacks") && ev("play") >= 2) || ev("play") >= 4)
    leftoverOut = { kind: "hyper", strength: 0.15, why: r.prep.includes("snacks") ? "snacks, and then more excitement" : "a very exciting day" };
  else if (false)
    leftoverOut = { kind: "sleepy", strength: 0.14, why: ev("doze") > 0 ? "that nap in the shoe was not enough" : "a long day" };
  if (leftoverOut && p.leftover?.kind === leftoverOut.kind) leftoverOut = { ...leftoverOut, strength: leftoverOut.strength * 0.6 }; // moods fade if they repeat
  if (leftoverOut && leftoverOut.strength < 0.1) leftoverOut = null;
  p.leftover = leftoverOut;

  // the house moves on (world rng: never depends on prep)
  const world = new Rng(hash(p.seed, r.index, "world"));
  const returned: string[] = [];
  for (const t of p.things) {
    if ((t.origin || t.knocked) && world.next() < 0.25) {
      if (t.origin) { t.x = t.origin.x; t.y = t.origin.y; delete t.origin; }
      t.knocked = false;
      returned.push(t.name);
    }
  }
  p.stash = p.stash.filter((t) => {
    if (world.next() < 0.22) {
      const orig = THINGS.find((o) => o.id === t.id);
      if (orig) { p.things.push({ ...orig }); returned.push(t.name); return false; }
    }
    return true;
  });
  let arrived: string | null = null;
  const next = p.arrivalOrder[Math.floor((r.index + 1) / 2) - 1];
  if (r.index % 2 === 1 && next && !p.things.some((t) => t.id === next) && !p.stash.some((t) => t.id === next)) {
    const a = ARRIVALS.find((x) => x.id === next)!;
    const rooms = ROOMS.filter((rm) => unlockedRooms(p).has(rm.id));
    const room = rooms[world.int(rooms.length)];
    for (let tries = 0; tries < 40; tries++) {
      const x = room.x + world.int(room.w), y = room.y + world.int(room.h);
      if (!p.things.some((t) => t.x === x && t.y === y) && !(x === CAGE.x && y === CAGE.y)) {
        p.things.push({ ...a, x, y, room: room.id, arrivedRun: r.index }); arrived = a.name; break;
      }
    }
  }

  const unlockedNow = [
    ...ROOMS.filter((rm) => !beforeRooms.has(rm.id) && p.journal.size >= rm.unlockAt).map((rm) => `The ${rm.name.toLowerCase()} door is open now.`),
    ...EVERYDAY_IDS.filter((i) => !beforeItems.includes(i) && p.journal.size >= ITEMS[i].unlockAt).map((i) => `New in the cage: ${ITEMS[i].name.toLowerCase()}.`),
  ];

  const summary: RunSummary = {
    index: r.index, prep: r.prep, squeakAt: r.squeakedAt, ticks: r.tick, events: r.events, newEntries,
    sentence: sentence(r, comboFired), rooms: [...r.rooms], napOn: r.napOn, stashSize: p.stash.length,
    returned, arrived, unlockedNow, comboFired, trail: r.trail,
    leftoverIn: r.leftover, leftoverOut, god: r.prep.some((i) => ITEMS[i].godMode),
    rolls: r.rolls, decisions: r.decisions, shortlist: r.shortlist,
  };
  p.runs.push(summary);
  return summary;
}

function sentence(r: Run, combo: string | null) {
  const napE = r.events.find((e) => e.verb === "nap");
  const where = napE?.target === "shoe" ? "in her favourite shoe" : napE?.target === "bathtowel" ? "in her towel" : napE?.target ? `on ${nameOf(r, napE.target)}` : "wherever she happened to be";
  const pickE = (v: Verb) => r.events.filter((e) => e.verb === v).at(-1);
  let did: string;
  if (r.mood.bath && r.events.some((e) => e.target === "bathtowel")) return napE?.target === "bathtowel"
    ? "Lucy had a bath, dried off on everything she could find, and fell asleep in her towel."
    : `Lucy had a bath, dried off on everything she could find, hid in her towel, then fell asleep ${where}.`;
  if (combo) did = COMBOS[combo].did;
  else if (pickE("gift")) did = `forgave you with ${nameOf(r, pickE("gift")!.target!)}`;
  else if (pickE("steal")) did = `stole ${nameOf(r, pickE("steal")!.target!)}`;
  else if (pickE("startle")) did = `was ambushed by ${nameOf(r, pickE("startle")!.target!)}`;
  else if (pickE("fish")) did = `went swimming near ${nameOf(r, pickE("fish")!.target!)}`;
  else if (pickE("sulk")) did = `sulked behind ${nameOf(r, pickE("sulk")!.target!)}`;
  else if (pickE("play")) did = `played with ${nameOf(r, pickE("play")!.target!)}`;
  else if (pickE("hide")) did = `hid in ${nameOf(r, pickE("hide")!.target!)}`;
  else did = "explored";
  return `Lucy ${did}, then fell asleep ${where}.`;
}
const nameOf = (r: Run, id: string) => the(r.things.concat(r.stash).concat(THINGS as Placed[]).concat(ARRIVALS as Placed[]).find((t) => t.id === id)?.name ?? id);

// ---------- sessions: seed + runs, replayed ----------
export type RunSpec = { prep: ItemId[]; squeakAt?: number };
export function replay(seed: number, specs: RunSpec[]): Profile {
  const p = newProfile(seed);
  for (const s of specs) finishRun(p, runToEnd(startRun(p, s.prep), s.squeakAt));
  return p;
}
export { DOORS };
