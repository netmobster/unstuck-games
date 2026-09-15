// Ferret Bowling: Lucy Edition — rough deterministic prototype sim. No DOM.
// Rule: moods change what Lucy NOTICES and WANTS, never how far she goes. The payoff is her day.
// Same seed + same runs (prep + squeak tick) → same Lucy, same house, same journal.
import { Rng } from "./rng";
import {
  ARRIVALS, CAGE, DOORS, H, ROOMS, STASH, THINGS, W, roomAt, walkable,
  type RoomId, type Tag, type Thing,
} from "./house";

// ---------- prep items ----------
export type ItemId = "snacks" | "sock" | "insult" | "salmon" | "towel" | "squeaky";
type Mood = { tags: Partial<Record<Tag, number>>; speed: number; drain: number; squeak: number; swim?: boolean; sulk?: boolean };

export const ITEMS: Record<ItemId, { name: string; blurb: string; unlockAt: number; mood: Mood }> = {
  snacks: { name: "A handful of snacks", blurb: "zoomies, and every crumb is a detour", unlockAt: 0, mood: { tags: { food: 3 }, speed: 1.4, drain: 1.6, squeak: 0.95 } },
  sock: { name: "A wound-up sock", blurb: "anything fabric is now prey", unlockAt: 0, mood: { tags: { fabric: 3, small: 1.4 }, speed: 1.1, drain: 1.1, squeak: 0.5 } },
  insult: { name: "A whispered insult", blurb: "she sulks, then forgives you. Eventually.", unlockAt: 0, mood: { tags: { hide: 3 }, speed: 1, drain: 1, squeak: 0.08, sulk: true } },
  salmon: { name: "Purple salmon", blurb: "she is convinced the house is a river", unlockAt: 0, mood: { tags: { water: 3.5, soft: 1.5 }, speed: 1.2, drain: 1.2, squeak: 0.4, swim: true } },
  towel: { name: "A warm towel", blurb: "cozy. extremely cozy.", unlockAt: 4, mood: { tags: { soft: 2.2, warm: 3 }, speed: 0.7, drain: 0.7, squeak: 0.6 } },
  squeaky: { name: "A squeaky toy", blurb: "everything that makes a noise must be investigated", unlockAt: 9, mood: { tags: { noise: 3, small: 1.3 }, speed: 1.2, drain: 1.2, squeak: 0.8 } },
};
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

/** Two-item interactions: things neither item does alone. Discovering one is a journal entry. */
export const COMBOS: Record<string, { name: string; hint: string; did: string }> = {
  "sock+towel": { name: "The Nest", hint: "she dragged fabric into a nest and slept in it", did: "built a nest out of other people's laundry" },
  "salmon+snacks": { name: "Gone Fishing", hint: "she fished for snacks in the water", did: "went fishing for snacks" },
  "insult+sock": { name: "Revenge, Sock Edition", hint: "she stole your slipper specifically, and hid it", did: "took your slipper, specifically yours" },
  "insult+snacks": { name: "The Bribe", hint: "a squeak and a snack bought your forgiveness", did: "accepted your apology, and your snacks" },
  "salmon+towel": { name: "Drying Off", hint: "she rolled on every soft thing to dry her imaginary fur", did: "dried off on every soft thing in the house" },
  "sock+squeaky": { name: "Puppet Show", hint: "a sock became a puppet, and the puppet became prey", did: "put on a puppet show and ate the puppet" },
  "insult+squeaky": { name: "Squeak Thief", hint: "she stole the noisy things so nobody could have fun", did: "stole every noise so nobody could have fun" },
  "snacks+towel": { name: "Food Coma", hint: "she ate, then immediately collapsed next to the food", did: "ate, then collapsed next to the food" },
  "insult+towel": { name: "Blanket Burrito", hint: "she sulked so hard she became a burrito", did: "sulked herself into a burrito" },
};
export const comboKey = (prep: ItemId[]) => (prep.length === 2 ? [...prep].sort().join("+") : null);

// ---------- personality (Lucy is already perfect) ----------
const BASE: Record<Tag, number> = { fabric: 0.9, food: 0.8, soft: 0.6, hide: 1, noise: 0.7, shiny: 1, water: 0.35, warm: 0.6, small: 1.2 };

// ---------- deterministic seeds ----------
const hash = (...xs: (number | string)[]) => {
  let h = 2166136261 >>> 0;
  for (const x of xs) for (const c of String(x)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};

// ---------- persistent profile (rebuilt by replaying runs) ----------
export type Placed = Thing & { arrivedRun?: number };
export type JournalEntry = { key: string; run: number; text: string; kind: "combo" | "behaviour" | "habit" | "room" | "item" };
export type Habits = { favNap: string | null; favRoom: RoomId | null; nemesis: string | null; routine: boolean };
export type Profile = {
  seed: number;
  runs: RunSummary[];
  things: Placed[]; // what's in the house right now (stash items removed)
  stash: Placed[]; // her treasures, under the couch
  journal: Map<string, JournalEntry>;
  counts: { nap: Record<string, number>; room: Record<string, number>; startle: Record<string, number>; stashFirst: number };
  habits: Habits;
  arrivalOrder: string[];
};

export function newProfile(seed: number): Profile {
  const rng = new Rng(hash(seed, "arrivals"));
  const order = ARRIVALS.map((a) => a.id);
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return {
    seed, runs: [], things: THINGS.map((t) => ({ ...t })), stash: [], journal: new Map(),
    counts: { nap: {}, room: {}, startle: {}, stashFirst: 0 },
    habits: { favNap: null, favRoom: null, nemesis: null, routine: false }, arrivalOrder: order,
  };
}

export const unlockedRooms = (p: Profile) => new Set(ROOMS.filter((r) => p.journal.size >= r.unlockAt).map((r) => r.id));
export const unlockedItems = (p: Profile) => ITEM_IDS.filter((i) => p.journal.size >= ITEMS[i].unlockAt);

// ---------- a run ----------
export type Verb = "sniff" | "steal" | "hide" | "play" | "nap" | "fish" | "roll" | "stash" | "come" | "gift" | "startle" | "wander" | "glare" | "sulk";
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
  nestSpot: { x: number; y: number } | null; nestCount: number; rolls: number; decisions: number; stashFirstChecked: boolean;
  roomTicks: Record<string, number>;
  visits: Record<string, number>;
};

export const MAX_TICKS = 3000;
const TICKS_PER_TILE = 3;

function mixMood(prep: ItemId[]): Mood {
  const m: Mood = { tags: {}, speed: 1, drain: 1, squeak: 0.5 };
  if (!prep.length) return m;
  let sq = 0;
  for (const id of prep) {
    const it = ITEMS[id].mood;
    for (const [k, v] of Object.entries(it.tags)) m.tags[k as Tag] = (m.tags[k as Tag] ?? 1) * (v as number);
    m.speed *= it.speed; m.drain *= it.drain; sq += it.squeak;
    if (it.swim) m.swim = true; if (it.sulk) m.sulk = true;
  }
  m.squeak = sq / prep.length;
  if (comboKey(prep) === "insult+snacks") m.squeak = 1; // the bribe
  return m;
}

export function startRun(p: Profile, prep: ItemId[]): Run {
  const index = p.runs.length;
  const combo = comboKey(prep);
  const r: Run = {
    index, prep, combo: combo && COMBOS[combo] ? combo : null, mood: mixMood(prep),
    lucy: new Rng(hash(p.seed, index, "lucy")), text: new Rng(hash(p.seed, index, "text")),
    tick: 0, x: CAGE.x, y: CAGE.y, energy: 100, action: null, carrying: null,
    events: [], touched: new Set(), rooms: new Set(["living"]), trail: [[CAGE.x, CAGE.y]],
    squeakedAt: null, squeakAnswered: null, done: false, napOn: null,
    unlocked: unlockedRooms(p), things: p.things.map((t) => ({ ...t })), stash: p.stash.map((t) => ({ ...t })), habits: { ...p.habits },
    nestSpot: null, nestCount: 0, rolls: 0, decisions: 0, stashFirstChecked: false, roomTicks: {}, visits: {},
  };
  if (r.combo === "sock+towel") {
    const soft = r.things.filter((t) => t.tags.includes("soft") && r.unlocked.has(t.room));
    const near = soft.sort((a, b) => dist2(a, CAGE) - dist2(b, CAGE))[0];
    r.nestSpot = near ? { x: near.x, y: near.y } : { x: CAGE.x + 1, y: CAGE.y + 1 };
  }
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
    const d = reach(t.x, t.y), near = 1 / (1 + d / 9), fresh = 1 / (1 + 2 * (r.visits[t.id] ?? 0));
    const i = interest(r, t) * near;
    if (r.habits.nemesis === t.id) { if (d < 12 && !r.touched.has(t.id)) cands.push({ verb: "glare", target: t, tx: t.x, ty: t.y, score: 1.6 * near, dur: 18, cause: "habit: nemesis" }); continue; }
    if (tired) {
      if (t.tags.includes("soft") || t.tags.includes("warm")) {
        let s = (1 + (r.mood.tags.soft ?? 1) + (r.habits.favNap === t.id ? 3 : 0)) * near;
        if (r.combo === "snacks+towel" && present.some((f) => f.tags.includes("food") && dist2(f, t) < 30)) s *= 2.5;
        cands.push({ verb: "nap", target: t, tx: t.x, ty: t.y, score: s, dur: 0, cause: r.habits.favNap === t.id ? "habit: her spot" : "tired" });
      }
      continue;
    }
    cands.push({ verb: "sniff", target: t, tx: t.x, ty: t.y, score: i * fresh * 0.7, dur: 8, cause: tagCause(r, t) });
    if (t.stealable && !r.carrying) {
      let s = i * fresh * 1.1;
      if (r.combo === "insult+sock" && t.id === "slipper") s *= 6;
      if (r.combo === "insult+squeaky" && t.tags.includes("noise")) s *= 4;
      cands.push({ verb: "steal", target: t, tx: t.x, ty: t.y, score: s, dur: 6, cause: tagCause(r, t) });
    }
    if (t.tags.includes("hide")) {
      let s = i * fresh * (r.mood.sulk ? 1.6 : 0.6);
      if (r.mood.sulk) s *= 1 + Math.sqrt(dist2(t, CAGE)) / 15; // as far from you as possible
      cands.push({ verb: r.mood.sulk ? "sulk" : "hide", target: t, tx: t.x, ty: t.y, score: s, dur: r.combo === "insult+towel" && t.tags.includes("soft") ? 60 : 26, cause: tagCause(r, t) });
    }
    if (t.tags.includes("noise") || (r.combo === "sock+squeaky" && t.tags.includes("fabric") && t.tags.includes("small")))
      cands.push({ verb: "play", target: t, tx: t.x, ty: t.y, score: i * fresh * 0.9, dur: 20, cause: tagCause(r, t) });
    if (t.tags.includes("water") && (r.mood.swim || r.combo === "salmon+snacks"))
      cands.push({ verb: "fish", target: t, tx: t.x, ty: t.y, score: i * fresh * 1.4, dur: 30, cause: "purple salmon" });
    if (r.combo === "salmon+towel" && t.tags.includes("soft") && !r.touched.has(t.id))
      cands.push({ verb: "roll", target: t, tx: t.x, ty: t.y, score: i * 1.5, dur: 14, cause: "drying off" });
  }

  if (tired && r.mood.sulk && r.stash.length && !r.events.some((e) => e.verb === "gift") && reach(CAGE.x, CAGE.y) >= 0)
    cands.push({ verb: "gift", tx: CAGE.x + 1, ty: CAGE.y, score: 50, dur: 10, cause: "forgiveness" });
  if (!tired && (r.stash.length || r.carrying)) {
    const routine = r.habits.routine && r.decisions === 1;
    cands.push({ verb: "stash", tx: STASH.x, ty: STASH.y, score: r.carrying ? 40 : routine ? 30 : 0.5 + r.stash.length * 0.12, dur: 12, cause: r.carrying ? "carrying treasure" : routine ? "habit: routine" : "treasures" });
  }
  if (!tired) {
    const w = wanderTarget(r, dist);
    if (w) cands.push({ verb: "wander", tx: w[0], ty: w[1], score: r.mood.swim ? 1.4 : 0.45, dur: 0, cause: r.mood.swim ? "swimming" : "exploring" });
  }
  if (tired && !cands.some((c) => c.verb === "nap" || c.verb === "gift")) cands.push({ verb: "nap", tx: r.x, ty: r.y, score: 1, dur: 0, cause: "too tired to find a bed" });

  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 3);
  const total = top.reduce((s, c) => s + c.score * c.score, 0);
  let roll = r.lucy.next() * total;
  let c = top[0];
  for (const k of top) if ((roll -= k.score * k.score) <= 0) { c = k; break; }

  const path = pathTo(prev, r.x, r.y, c.tx, c.ty) ?? [];
  r.action = { verb: c.verb, target: c.target, tx: c.tx, ty: c.ty, path, dur: c.dur, t: 0, notice: c.verb === "wander" ? 0 : 5, cause: c.cause };
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
    const [dx, dy] = dirs[r.lucy.int(4)];
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
        `The ${t.name} made a noise. Lucy did a full vertical leap and pretended she meant to.`,
        `Lucy was ambushed by the ${t.name}. She has filed it under "enemies".`,
        `The ${t.name} hummed at her. She puffed up to twice her size, which is still small.`,
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
      say(r, "sniff", t, a.cause, pick(r, [`Lucy sniffed the ${n} thoroughly.`, `Lucy inspected the ${n}. Verdict pending.`, `The ${n} has been sniffed. Approved, probably.`]));
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
        if (r.nestSpot) {
          r.nestCount++;
          say(r, "stash", item, "the nest", `Lucy added ${the(item.name)} to her nest. It is coming along beautifully.`);
        } else say(r, "stash", item, a.cause, `Lucy hid ${the(item.name)} under the couch with her other treasures.`);
        r.stash.push(item);
      } else {
        if (r.decisions === 1) r.stashFirstChecked = true;
        say(r, "stash", undefined, a.cause, r.stash.length
          ? `Lucy checked on her treasures. All ${r.stash.length} present. She counted twice.`
          : "Lucy checked under the couch. Nothing there yet. She seemed disappointed in you.");
      }
      break;
    }
    case "hide":
    case "sulk":
      if (t) r.touched.add(t.id);
      say(r, a.verb, t, a.cause, a.verb === "sulk"
        ? (r.combo === "insult+towel" && t?.tags.includes("soft") ? `Lucy rolled herself into the ${n} like a burrito and refused to be perceived.` : pick(r, [`Lucy sulked behind the ${n}. Loudly.`, `Lucy is not speaking to you. She is behind the ${n}.`]))
        : pick(r, [`Lucy vanished into the ${n}. Only the tail is visible.`, `Lucy hid in the ${n} for no reason she will share.`]));
      break;
    case "play":
      if (t) r.touched.add(t.id);
      say(r, "play", t, a.cause, r.combo === "sock+squeaky" && t?.tags.includes("fabric")
        ? `Lucy made the ${n} into a puppet, then attacked the puppet. The puppet lost.`
        : pick(r, [`Lucy played with the ${n}. Many dooks were had.`, `Lucy did the war dance at the ${n}. Sideways hops. Mouth open.`]));
      break;
    case "fish":
      if (t) r.touched.add(t.id);
      say(r, "fish", t, a.cause, r.combo === "salmon+snacks"
        ? `Lucy sat by the ${n} and fished for snacks with one paw. None were caught. Spirits remain high.`
        : pick(r, [`Lucy swam laps near the ${n}. On the floor. With conviction.`, `Lucy tried to swim in the ${n}. She is dry. She is thrilled.`]));
      break;
    case "roll":
      if (t) r.touched.add(t.id);
      r.rolls++;
      say(r, "roll", t, a.cause, `Lucy rolled all over the ${n} to dry off. She was never wet.`);
      break;
    case "glare":
      if (t) r.touched.add(t.id);
      say(r, "glare", t, "habit: nemesis", `Lucy stopped to glare at the ${n}. It knows what it did.`);
      break;
    case "gift": {
      const g = r.stash.shift()!;
      g.x = CAGE.x + 1; g.y = CAGE.y; g.room = "living";
      r.things.push(g);
      say(r, "gift", g, "forgiveness", `Lucy left ${the(g.name)} by the cage. You are forgiven. Probably.`);
      break;
    }
    case "wander":
      if (r.mood.swim) say(r, "wander", undefined, "purple salmon", pick(r, ["Lucy swam across the room in a straight line, flat as a pancake.", "Lucy glided down the current of the floor.", "Lucy crossed the room doing what can only be called the breaststroke."]));
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
  const where = r.nestSpot && r.nestCount >= 2 ? "in her nest" : t ? `on the ${t.name}` : `in the middle of the ${roomName(roomAt(r.x, r.y))}`;
  say(r, "nap", t ?? undefined, cause, pick(r, [`Lucy curled up ${where} and fell asleep. Run over. She is extremely proud.`, `Lucy fell asleep ${where}, mid-dook.`, `Lucy is asleep ${where}. Do not move her. Those are the rules.`]));
  r.done = true;
}

const roomName = (id: RoomId | null) => (id ? ROOMS.find((x) => x.id === id)!.name.toLowerCase() : "house");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** "fallen scarf" → "the fallen scarf"; "your slipper", "a single sock" stay as they are */
export const the = (n: string) => (/^(a|an|the|your|one|toast|house)\b/i.test(n) ? n : "the " + n);

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
    say(r, "come", undefined, "the squeak", r.combo === "insult+snacks"
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
};

const JOURNAL_VERBS: Verb[] = ["steal", "hide", "sulk", "play", "fish", "roll", "startle", "glare", "gift", "nap"];

export function finishRun(p: Profile, r: Run): RunSummary {
  const beforeRooms = unlockedRooms(p), beforeItems = unlockedItems(p);
  const newEntries: JournalEntry[] = [];
  const add = (key: string, kind: JournalEntry["kind"], text: string) => {
    if (p.journal.has(key)) return;
    const e = { key, run: r.index, text, kind };
    p.journal.set(key, e); newEntries.push(e);
  };

  for (const e of r.events) if (JOURNAL_VERBS.includes(e.verb) && e.target) add(`${e.verb}:${e.target}`, "behaviour", e.text);
  if (r.squeakAnswered === true) add("come:squeak", "behaviour", "She comes when you squeak. Sometimes.");
  if (r.squeakAnswered === false) add(`ignore:squeak:${r.mood.sulk ? "sulk" : "busy"}`, "behaviour", r.mood.sulk ? "A sulking Lucy ignores the squeak." : "Lucy can ignore a squeak when busy.");
  if (r.mood.swim && r.events.some((e) => e.verb === "wander" && e.cause === "purple salmon")) add("swim", "behaviour", "Purple salmon: the floor is a river now.");

  // did the combo actually happen?
  let comboFired: string | null = null;
  const has = (pred: (e: RunEvent) => boolean) => r.events.some(pred);
  if (r.combo) {
    const k = r.combo;
    const fired =
      (k === "sock+towel" && r.nestCount >= 2) ||
      (k === "salmon+snacks" && has((e) => e.verb === "fish")) ||
      (k === "insult+sock" && has((e) => e.verb === "steal" && e.target === "slipper")) ||
      (k === "insult+snacks" && r.squeakAnswered === true) ||
      (k === "salmon+towel" && r.rolls >= 2) ||
      (k === "sock+squeaky" && has((e) => e.verb === "play" && !!r.things.concat(r.stash).find((t) => t.id === e.target && t.tags.includes("fabric")))) ||
      (k === "insult+squeaky" && has((e) => e.verb === "steal" && !!THINGS.concat(ARRIVALS as Thing[]).find((t) => t.id === e.target && t.tags.includes("noise")))) ||
      (k === "snacks+towel" && !!r.napOn && r.things.some((f) => f.tags.includes("food") && dist2(f, r) < 30)) ||
      (k === "insult+towel" && has((e) => e.verb === "sulk" && e.text.includes("burrito")));
    if (fired) { comboFired = k; add(`combo:${k}`, "combo", `${COMBOS[k].name}: ${COMBOS[k].hint}.`); }
  }

  // commit the house
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
    favNap: nap && nap[1] >= 1.6 ? nap[0] : null,
    nemesis: st && st[1] >= 1.5 ? st[0] : null,
    favRoom: rm && p.runs.length >= 2 && rm[1] / totalRoom > 0.45 ? (rm[0] as RoomId) : null,
    routine: p.counts.stashFirst >= 1.6 || (p.habits.routine && p.stash.length > 0),
  };
  const thingName = (id: string) => THINGS.concat(ARRIVALS as Thing[]).find((t) => t.id === id)?.name ?? id;
  if (h.favNap && h.favNap !== p.habits.favNap) add(`habit:nap:${h.favNap}`, "habit", `Habit: the ${thingName(h.favNap)} is her spot now.`);
  if (h.nemesis && h.nemesis !== p.habits.nemesis) add(`habit:nemesis:${h.nemesis}`, "habit", `Habit: Lucy has a nemesis. It is the ${thingName(h.nemesis)}.`);
  if (h.favRoom && h.favRoom !== p.habits.favRoom) add(`habit:room:${h.favRoom}`, "habit", `Habit: the ${roomName(h.favRoom)} is her territory.`);
  if (h.routine && !p.habits.routine) add("habit:routine", "habit", "Habit: every run starts with a treasure check.");
  p.habits = h;

  // the house moves on (world rng: never depends on prep)
  const world = new Rng(hash(p.seed, r.index, "world"));
  const returned: string[] = [];
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
    ...ITEM_IDS.filter((i) => !beforeItems.includes(i) && p.journal.size >= ITEMS[i].unlockAt).map((i) => `New in the cage: ${ITEMS[i].name.toLowerCase()}.`),
  ];

  const summary: RunSummary = {
    index: r.index, prep: r.prep, squeakAt: r.squeakedAt, ticks: r.tick, events: r.events, newEntries,
    sentence: sentence(r, comboFired), rooms: [...r.rooms], napOn: r.napOn, stashSize: p.stash.length,
    returned, arrived, unlockedNow, comboFired, trail: r.trail,
  };
  p.runs.push(summary);
  return summary;
}

function sentence(r: Run, combo: string | null) {
  const napE = r.events.find((e) => e.verb === "nap");
  const where = r.nestSpot && r.nestCount >= 2 ? "in a nest she built herself" : napE?.target ? `on ${nameOf(r, napE.target)}` : "wherever she happened to be";
  const pickE = (v: Verb) => r.events.filter((e) => e.verb === v).at(-1);
  let did: string;
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
