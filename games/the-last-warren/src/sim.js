// THE LAST WARREN — deterministic simulation.
// Pure: no DOM, no clock, no Math.random. step() returns events; the page and the sweep
// runner both read the same state. Same seed + same decisions = same world.

import { rnd } from './rng.js';
import { generateMap, flat, costFn, dijkstra, idx, COST, KIND_NAME } from './map.js';

// ---------------------------------------------------------------------------------------
// Config. Every number the sweeps perturb lives here.
export const DEFAULTS = {
  nightLen: 45,            // ticks to dawn
  maxNights: 8,
  startTroop: 4,
  growth: 1,               // people per tick while staying in a warren
  warrenBonus: 0.3,        // the +30%
  attune: 0.25,            // specialty gained per tick in a warren (0..1)
  carryDecay: 0.92,        // carried specialty multiplier per tick away from its warren
  fortify: 1.25,           // any warren is a fortified position
  depthNoise: { deep: 0.45, mid: 0.7, shallow: 1.0 },
  transitNoise: 1.0,
  terrainNoise: { '.': 1.0, '=': 1.4, 'f': 0.6, '~': 1.2 },
  hearK: 1.15,             // hearing radius = hearK * sqrt(size) * noise * kind.hear
  transit: 'exposed',      // 'exposed' | 'tracks' | 'bleed'
  trackLife: 14,
  bleedEvery: 2,
  attack: true,
  attackRange: 2,
  lossK: 0.45,             // casualties = lossK x their strength / your per-person strength
  transitSpeed: 3,         // troop movement points per tick on the road (hunters 2, hounds 3)
  dangerAvoid: 6,          // route cost added per cell next to a hunter
  ambush: 1.2,
  hunterBase: 7,
  hunterNightScale: 0.32,  // hunter strength *= 1 + scale*(night-1)
  hunterStart: 2,          // hunters at dusk on night 1
  hunterPerNight: 1,       // extra at dusk per later night
  reinforceEvery: 12,      // one more arrives every N ticks
  respawnDelay: 10,
  aggression: 1.0,
  musterDist: 3,           // once you're located they gather this far out until they're enough         // hunters assault when the group within 3 >= aggression x your strength
  siegeHaltsGrowth: true,  // held in a warren, the troop stops growing
  diffusion: 0.12,
  // v4: kinds trade off, and the edge sharpens
  combatNoise: 1.4,        // Combat warrens are loud
  scoutFortify: false,     // Scout warrens have thin walls (no fortify)
  defenseDepart: 3,        // leaving a Defense warren costs this many movement points
  accelAt: [10, 20],       // growth +1, then +2 after 10 ticks in one place, +3 after 20
  watchReact: 0.5,         // per tick you've been watched, hunters near the ring bank this many points when you bolt
  watchCap: 6,
  // progression toggles
  remnant: 0.4,            // share of troop kept at dawn (0 = off: start fresh at startTroop)
  draft: true,
  learn: true,
  kinds: true,
};

export const HUNTER_KINDS = {
  sweeper:  { str: 1.0, speed: 2, sight: 5, hear: 1.0, label: 'Sweeper' },
  tracker:  { str: 0.9, speed: 2, sight: 4, hear: 1.0, label: 'Tracker', trails: true },
  listener: { str: 0.8, speed: 2, sight: 3, hear: 1.9, label: 'Listener', unmuffled: true },
  hound:    { str: 1.3, speed: 3, sight: 4, hear: 0.8, label: 'Hound' },
};
function rosterFor(night, cfg) {
  if (!cfg.kinds) return ['sweeper'];
  return ['sweeper', 'tracker', 'listener', 'hound'].slice(0, Math.min(4, night));
}

// THE DAWN DRAFT. A pre-written table; dice pick three, the player keeps one.
export const BOONS = [
  { id: 'brood',  text: 'Brood. Grow one extra every third tick.' },
  { id: 'hush',   text: 'Hush. Everything you do is a fifth quieter.' },
  { id: 'teeth',  text: 'Teeth. +20% in any fight you start.' },
  { id: 'walls',  text: 'Walls. +20% defending a warren.' },
  { id: 'legs',   text: 'Legs. One more movement point a tick in transit.' },
  { id: 'deepen', text: 'Dig deeper. Your current warren becomes deep.' },
  { id: 'dig',    text: 'Dig a new warren beside the one you\'re in.' },
  { id: 'scatter',text: 'Scatter. Hunters forget half of what they believe at dusk.' },
];

// ---------------------------------------------------------------------------------------
export function newGame(seed, cfgIn = {}, mapOpts = {}) {
  const cfg = { ...DEFAULTS, ...cfgIn };
  const map = cfgIn.map || generateMap(seed, mapOpts);
  const tiles = flat(map);
  const W = map.w, H = map.h, N = W * H;
  const g = {
    seed, cfg, map, tiles, W, H, N,
    hCost: costFn(tiles, 'hunter'), tCost: costFn(tiles, 'troop'),
    fieldCache: new Map(),      // hunter-cost distance fields keyed by root cell
    troopFieldCache: new Map(),
    night: 1, tick: 0, T: 0, over: false, result: null,
    warrens: map.warrens.map(v => ({ ...v, i: idx(map, v) })),
    troop: null, hunters: [], nextHunterId: 0, respawnQueue: [],
    belief: new Float64Array(N), tracks: new Float64Array(N).fill(-1e9),
    boons: {}, history: { warrenTicks: {} }, events: [], log: [],
    stats: newStats(),
  };
  g.warrenAt = {}; for (const v of g.warrens) g.warrenAt[v.i] = v.id;
  g.nb = Array.from({ length: N }, (_, i) => neighbours(g, i).filter(j => g.tCost(j) < Infinity));
  // per-cell concealment a hunter would assume (x sqrt(size) x hearK x kind.hear)
  g.conceal = new Float64Array(N); g.concealU = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = g.warrenAt[i];
    if (w != null) { g.conceal[i] = g.concealU[i] = cfg.depthNoise[g.warrens[w].depth] * (g.warrens[w].kind === 'C' ? cfg.combatNoise : 1); continue; }
    const tn = cfg.terrainNoise[tiles[i]] ?? 1;
    g.conceal[i] = cfg.transitNoise * tn; g.concealU[i] = cfg.transitNoise * Math.max(1, tn);
  }
  const home = g.warrens[Math.floor(rnd(seed, 'home') * g.warrens.length)];
  g.troop = { x: home.x, y: home.y, size: cfg.startTroop, warren: home.id, path: null, pi: 0, mp: 0, besieged: false, stayRun: 0, watch: 0,
              dest: null, spec: { C: 0, S: 0, D: 0 }, seenBy: 0, since: 0 };
  beginNight(g);
  return g;
}

function newStats() {
  return { nights: [], moves: 0, attacks: 0, fights: 0, fightsWon: 0, stayTicks: 0, transitTicks: 0,
           kindTicks: { C: 0, S: 0, D: 0 }, death: null, peak: 0, boons: [], decisions: [] };
}
function nightStats() { return { stayTicks: 0, transitTicks: 0, moves: 0, attacks: 0, fights: 0, endSize: 0, survived: false }; }

function beginNight(g) {
  const { cfg } = g;
  g.tick = 0;
  g.hunters = []; g.respawnQueue = [];
  g.tracks.fill(-1e9);
  if (g.troop) g.troop.besieged = false;
  g.stats.nights.push(nightStats());
  const n = cfg.hunterStart + cfg.hunterPerNight * (g.night - 1);
  for (let k = 0; k < n; k++) spawnHunter(g, k);
  // The prior: hunters know you live in a warren. If they learn, your habits weigh it.
  g.belief.fill(0);
  const hist = g.history.warrenTicks, tot = Object.values(hist).reduce((a, b) => a + b, 0);
  for (const v of g.warrens) {
    const habit = cfg.learn && tot > 0 ? 4 * (hist[v.id] || 0) / tot : 0;
    g.belief[v.i] = 1 + habit;
  }
  if (g.boons.scatter) for (let i = 0; i < g.N; i++) g.belief[i] = g.belief[i] * 0.5 + 0.5 / g.warrens.length * (g.belief[i] > 0 ? 1 : 0);
  normalize(g.belief);
  g.events.push({ t: 'dusk', night: g.night, hunters: n });
}

function spawnHunter(g, k) {
  const roster = rosterFor(g.night, g.cfg);
  const id = g.nextHunterId++;
  const kind = roster[hashPick(g, 'kind', id, roster.length)];
  const sp = g.map.spawns[hashPick(g, 'spawn', id, g.map.spawns.length)];
  const K = HUNTER_KINDS[kind];
  const h = { id, kind, x: sp[0], y: sp[1], mp: 0, target: -1, retargetAt: 0, trail: false,
              str: g.cfg.hunterBase * K.str * (1 + g.cfg.hunterNightScale * (g.night - 1)) };
  g.hunters.push(h);
  return h;
}
function hashPick(g, tag, id, n) { return Math.floor(rnd(g.seed, tag, g.night, id) * n); }

// ---------------------------------------------------------------------------------------
// Fields and distances

export function hunterField(g, cell) {
  let f = g.fieldCache.get(cell);
  if (!f) { f = dijkstra(g.W, g.H, g.hCost, cell); g.fieldCache.set(cell, f); }
  return f;
}
export function troopField(g, cell) {
  let f = g.troopFieldCache.get(cell);
  if (!f) { f = dijkstra(g.W, g.H, g.tCost, cell); g.troopFieldCache.set(cell, f); }
  return f;
}
const cellOf = (g, p) => p.y * g.W + p.x;
/** ticks for a hunter to reach a cell */
export function hunterTicks(g, h, cell) {
  return hunterField(g, cell)[cellOf(g, h)] / HUNTER_KINDS[h.kind].speed;
}

// ---------------------------------------------------------------------------------------
// Troop properties

export function troopNoise(g) {
  const t = g.troop, c = g.cfg;
  let n = Math.sqrt(t.size);
  if (t.warren != null) n *= c.depthNoise[g.warrens[t.warren].depth] * (g.warrens[t.warren].kind === 'C' ? c.combatNoise : 1);
  else n *= c.transitNoise * c.terrainNoise[g.tiles[cellOf(g, t)]] * (1 - 0.3 * t.spec.S);
  if (g.boons.hush) n *= 0.8;
  return n;
}
function bonus(g, k) {
  const t = g.troop;
  const here = t.warren != null && g.warrens[t.warren].kind === k ? 1 : 0;
  return g.cfg.warrenBonus * Math.max(here, t.spec[k]);
}
export function troopStrength(g, mode) {
  const t = g.troop;
  let s = t.size * (1 + bonus(g, 'C'));
  if (t.warren != null && mode === 'defend') {
    const thin = g.warrens[t.warren].kind === 'S' && !g.cfg.scoutFortify;
    s *= (thin ? 1 : g.cfg.fortify) * (1 + bonus(g, 'D')) * (g.boons.walls ? 1.2 : 1);
  }
  if (mode === 'attack') s *= g.cfg.ambush * (g.boons.teeth ? 1.2 : 1);
  return s;
}

// ---------------------------------------------------------------------------------------
// The view a policy (or the page) is allowed: everything visible on the board. The belief
// map is included only when the troop is scouting.
export function view(g) {
  const t = g.troop, here = cellOf(g, t);
  const scouting = (t.warren != null && g.warrens[t.warren].kind === 'S') || t.spec.S > 0.5;
  return {
    g, night: g.night, tick: g.tick, nightLen: g.cfg.nightLen, troop: t, here,
    hunters: g.hunters, warrens: g.warrens, attack: g.cfg.attack, scouting,
    belief: scouting ? g.belief : null,
    nearestHunterTicks() { let m = Infinity; for (const h of g.hunters) m = Math.min(m, hunterTicks(g, h, here)); return m; },
    hunterTicksTo(cell) { let m = Infinity; for (const h of g.hunters) m = Math.min(m, hunterTicks(g, h, cell)); return m; },
    troopTicksTo(cell) { return troopField(g, cell)[here] / (g.cfg.transitSpeed + (g.boons.legs ? 1 : 0)); },
    attackable() {
      if (!g.cfg.attack || t.warren == null) return [];
      return g.hunters.filter(h => Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= g.cfg.attackRange);
    },
    strength: mode => troopStrength(g, mode),
  };
}

// ---------------------------------------------------------------------------------------
// One tick. `action` is { type: 'stay' } | { type: 'move', to: warrenId } |
// { type: 'attack', hunter: id }. Ignored while in transit (you are committed).
export function step(g, action = { type: 'stay' }) {
  if (g.over) return [];
  g.events = [];
  const t = g.troop, c = g.cfg, ns = g.stats.nights[g.night - 1];
  g.tick++; g.T++;

  // 1. the player's choice
  if (t.warren != null) {
    if (action.type === 'move' && action.to !== t.warren && g.warrens[action.to]) startMove(g, action.to);
    else if (action.type === 'attack' && c.attack) {
      const h = g.hunters.find(x => x.id === action.hunter);
      if (h && Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= c.attackRange) {
        g.stats.attacks++; ns.attacks++;
        fight(g, [h], 'attack');
        if (g.over) return g.events;
      }
    }
  }

  // 2. the troop: grow where it stands, or walk
  if (t.warren != null) {
    const v = g.warrens[t.warren];
    t.stayRun = (t.stayRun || 0) + 1;
    const accel = c.accelAt ? c.accelAt.filter(a => t.stayRun > a).length : 0;
    if (!(t.besieged && c.siegeHaltsGrowth)) t.size += c.growth + accel + (g.boons.brood && g.T % 3 === 0 ? 1 : 0);
    for (const k of ['C', 'S', 'D']) t.spec[k] = k === v.kind ? Math.min(1, t.spec[k] + c.attune) : t.spec[k] * c.carryDecay;
    g.history.warrenTicks[v.id] = (g.history.warrenTicks[v.id] || 0) + 1;
    g.stats.stayTicks++; ns.stayTicks++; g.stats.kindTicks[v.kind]++;
  } else {
    walk(g);
    for (const k of ['C', 'S', 'D']) t.spec[k] *= c.carryDecay;
    g.stats.transitTicks++; ns.transitTicks++;
    if (c.transit === 'bleed' && g.tick % c.bleedEvery === 0 && t.size > 1) t.size--;
  }
  g.stats.peak = Math.max(g.stats.peak, t.size);

  // 3. contact after the troop moves (walking into them counts)
  if (contact(g)) return g.events;

  // 4. the hunters sense, believe, move
  sense(g);
  g._ready = undefined;
  for (const h of g.hunters) moveHunter(g, h);

  // 5. contact after they move
  if (contact(g)) return g.events;
  // located, with the ring forming: that's a siege, and nobody grows under siege
  if (t.warren != null) {
    const was = t.besieged;
    t.besieged = located(g) && g.hunters.some(h => Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= c.musterDist);
    t.watch = located(g) ? (t.watch || 0) + 1 : 0;
    if (t.besieged && !was) g.events.push({ t: 'siege' });
  } else t.besieged = false;

  // 6. reinforcements and respawns
  if (g.tick % c.reinforceEvery === 0) { const h = spawnHunter(g); g.events.push({ t: 'arrive', id: h.id, kind: h.kind }); }
  g.respawnQueue = g.respawnQueue.filter(r => { if (r <= g.tick) { spawnHunter(g); return false; } return true; });

  // 7. dawn
  if (g.tick >= c.nightLen) dawn(g);
  return g.events;
}

function startMove(g, to) {
  const t = g.troop, dest = g.warrens[to], from = g.warrens[t.warren];
  const f = troopField(g, dest.i);
  if (f[cellOf(g, t)] === Infinity) return;
  // bolting while watched: the hunters near the ring are already moving
  if (located(g) && t.watch > 0) {
    const bank = Math.min(g.cfg.watchCap, g.cfg.watchReact * t.watch);
    for (const h of g.hunters) if (Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= g.cfg.musterDist + 2) h.mp += bank;
  }
  t.warren = null; t.dest = to; t.stayRun = 0; t.watch = 0;
  t.mp = from && from.kind === 'D' ? -g.cfg.defenseDepart : 0;
  g.stats.moves++; g.stats.nights[g.night - 1].moves++;
  g.events.push({ t: 'move', to });
}
function walk(g) {
  const t = g.troop, dest = g.warrens[t.dest];
  // route around the hunters you can see: recomputed every tick
  const danger = new Float64Array(g.N);
  for (const h of g.hunters) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = h.x + dx, y = h.y + dy, md = Math.abs(dx) + Math.abs(dy);
    if (md > 2 || x < 0 || y < 0 || x >= g.W || y >= g.H) continue;
    danger[y * g.W + x] += g.cfg.dangerAvoid * (md === 0 ? 3 : md === 1 ? 2 : 1);
  }
  const f = dijkstra(g.W, g.H, i => { const c = g.tCost(i); return c === Infinity ? c : c + Math.round(danger[i]); }, dest.i);
  t.mp += g.cfg.transitSpeed + (g.boons.legs ? 1 : 0);
  if (t.mp <= 0) return; // still climbing out of a Defense warren
  for (let guard = 0; guard < 8; guard++) {
    const here = cellOf(g, t);
    if (here === dest.i) { arrive(g); return; }
    const nxt = downhill(g, f, here); if (nxt < 0) return;
    const cost = g.tCost(nxt);
    if (cost > t.mp) { t.mp = Math.min(t.mp, 6); break; }
    t.mp -= cost;
    if (g.cfg.transit === 'tracks') g.tracks[here] = g.T;
    t.x = nxt % g.W; t.y = (nxt / g.W) | 0;
  }
  if (cellOf(g, t) === dest.i) arrive(g);
}
function arrive(g) {
  const t = g.troop; t.warren = t.dest; t.dest = null; t.mp = 0;
  g.events.push({ t: 'arrive-warren', id: t.warren });
}
function downhill(g, f, cur) {
  const x = cur % g.W, y = (cur / g.W) | 0; let best = -1, bd = f[cur];
  if (x > 0 && f[cur - 1] < bd) { bd = f[cur - 1]; best = cur - 1; }
  if (x < g.W - 1 && f[cur + 1] < bd) { bd = f[cur + 1]; best = cur + 1; }
  if (y > 0 && f[cur - g.W] < bd) { bd = f[cur - g.W]; best = cur - g.W; }
  if (y < g.H - 1 && f[cur + g.W] < bd) { bd = f[cur + g.W]; best = cur + g.W; }
  return best;
}

// ---------------------------------------------------------------------------------------
// The search. A shared Bayesian belief over where the troop is. Each tick: what every
// hunter saw and heard (or didn't) multiplies it, then it diffuses by a motion model.

function los(g, x0, y0, x1, y1) {
  // returns remaining "sight budget" cost: Infinity if a mountain blocks; forest costs 2
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0, cost = 0;
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
    if (x === x1 && y === y1) break;
    const tl = g.tiles[y * g.W + x];
    if (tl === '^') return Infinity;
    if (tl === 'f') cost += 2;
  }
  return cost;
}
function sees(g, h, x, y) {
  const K = HUNTER_KINDS[h.kind];
  const d = Math.abs(h.x - x) + Math.abs(h.y - y);
  if (d > K.sight + 1) return false;
  const tl = g.tiles[y * g.W + x];
  const extra = los(g, h.x, h.y, x, y) + (tl === 'f' ? 2 : 0);
  return d + extra <= K.sight;
}

function sense(g) {
  const t = g.troop, c = g.cfg, b = g.belief;
  const here = cellOf(g, t), inWarren = t.warren != null;
  const noise = troopNoise(g);
  let seen = false;
  t.seenBy = 0;
  for (const h of g.hunters) {
    const K = HUNTER_KINDS[h.kind];
    // sight: the troop above ground can be seen
    if (!inWarren && sees(g, h, t.x, t.y)) { seen = true; t.seenBy++; }
    // hearing: a roll against a logistic in distance
    const tn = !inWarren ? (c.terrainNoise[g.tiles[here]] ?? 1) : 1;
    const r = c.hearK * noise * K.hear * (K.unmuffled && tn < 1 ? 1 / tn : 1);
    const d = Math.abs(h.x - t.x) + Math.abs(h.y - t.y);
    const pTrue = 1 / (1 + Math.exp((d - r) / 0.75));
    const heard = rnd(g.seed, 'hear', g.night, g.tick, h.id) < pTrue;
    // Bayesian update over every cell for this hunter's hearing result
    const est = Math.sqrt(t.size) * (g.boons.hush ? 0.8 : 1); // hunters can count: they know how long you've had
    const cc = K.unmuffled ? g.concealU : g.conceal, kk = c.hearK * est * K.hear;
    for (let i = 0; i < g.N; i++) {
      if (b[i] < 1e-12) continue;
      const di = Math.abs(h.x - (i % g.W)) + Math.abs(h.y - ((i / g.W) | 0));
      const ri = kk * cc[i];
      const p = 1 / (1 + Math.exp((di - ri) / 0.75));
      b[i] *= heard ? p : (1 - 0.9 * p);
    }
    if (heard) g.events.push({ t: 'heard', id: h.id });
    // negative sight evidence: open cells it can see are probably empty (warrens are underground)
    const R = K.sight;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = h.x + dx, y = h.y + dy;
      if (x < 0 || y < 0 || x >= g.W || y >= g.H) continue;
      const i = y * g.W + x;
      if (b[i] < 1e-12 || g.warrenAt[i] != null) continue;
      if (sees(g, h, x, y) && !(seen && i === here)) b[i] *= 0.08;
    }
    // poking into an adjacent warren mouth
    for (const v of g.warrens) if (Math.abs(v.x - h.x) + Math.abs(v.y - h.y) <= 1 && !(inWarren && v.id === t.warren)) b[v.i] *= 0.05;
    // trackers read the ground
    if (K.trails && c.transit === 'tracks') {
      const hi = cellOf(g, h);
      h.trail = g.T - g.tracks[hi] < c.trackLife || neighbours(g, hi).some(j => g.T - g.tracks[j] < c.trackLife);
    } else h.trail = false;
  }
  if (seen) { b.fill(0); b[here] = 1; g.events.push({ t: 'seen' }); }
  diffuse(g);
  normalize(b);
  if (seen) for (const h of g.hunters) h.retargetAt = 0;
}

function neighbours(g, i) {
  const x = i % g.W, y = (i / g.W) | 0, out = [];
  if (x > 0) out.push(i - 1); if (x < g.W - 1) out.push(i + 1); if (y > 0) out.push(i - g.W); if (y < g.H - 1) out.push(i + g.W);
  return out;
}
function diffuse(g) {
  const b = g.belief, m = g.cfg.diffusion, nb = new Float64Array(g.N);
  for (let i = 0; i < g.N; i++) {
    if (b[i] === 0) continue;
    const ns = g.nb[i];
    nb[i] += b[i] * (1 - m);
    const share = b[i] * m / (ns.length || 1);
    if (!ns.length) nb[i] += b[i] * m; else for (const j of ns) nb[j] += share;
  }
  // a troop in the open will go to ground: belief slowly pools back into warrens
  let pool = 0;
  for (let i = 0; i < g.N; i++) if (g.warrenAt[i] == null) { const d = nb[i] * 0.04; nb[i] -= d; pool += d; }
  for (const v of g.warrens) nb[v.i] += pool / g.warrens.length;
  g.belief.set(nb);
}
function normalize(b) { let s = 0; for (let i = 0; i < b.length; i++) s += b[i]; if (s > 0) for (let i = 0; i < b.length; i++) b[i] /= s; }

// Targets: sweepers split the map into sectors and sweep their own; trackers follow a
// trail when they have one and chase the global peak when they don't; listeners and
// hounds chase the peak. Everyone discounts by distance.
function chooseTarget(g, h) {
  const b = g.belief, W = g.W;
  const sweepers = g.hunters.filter(x => x.kind === 'sweeper');
  let lo = 0, hi = W;
  if (h.kind === 'sweeper' && sweepers.length > 1) {
    const k = sweepers.indexOf(h), n = sweepers.length;
    lo = Math.floor(k * W / n); hi = Math.floor((k + 1) * W / n);
  }
  let best = -1, bv = -1, mass = 0;
  for (let i = 0; i < g.N; i++) {
    const x = i % W; if (x < lo || x >= hi) continue;
    mass += b[i];
    if (b[i] < 1e-9) continue;
    const d = Math.abs(h.x - x) + Math.abs(h.y - ((i / W) | 0));
    // other hunters already near a cell make it less attractive (spread out)
    let crowd = 0; for (const o of g.hunters) if (o !== h && o.target >= 0 && Math.abs((o.target % W) - x) + Math.abs(((o.target / W) | 0) - ((i / W) | 0)) < 3) crowd++;
    const v = b[i] / (1 + d / 9) / (1 + crowd);
    if (v > bv && hunterField(g, i)[cellOf(g, h)] < Infinity) { bv = v; best = i; }
  }
  if (best < 0 || (h.kind === 'sweeper' && mass < 0.02)) {
    // empty sector: help the global search
    for (let i = 0; i < g.N; i++) { if (b[i] < 1e-9) continue; const d = Math.abs(h.x - (i % W)) + Math.abs(h.y - ((i / W) | 0)); const v = b[i] / (1 + d / 9); if (v > bv && hunterField(g, i)[cellOf(g, h)] < Infinity) { bv = v; best = i; } }
  }
  return best;
}

export function located(g) { return g.belief[g.troop.y * g.W + g.troop.x] > 0.5; }
function musterReady(g) {
  const t = g.troop;
  const group = g.hunters.filter(h => Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= g.cfg.musterDist + 1);
  return group.reduce((a, h) => a + h.str, 0) >= g.cfg.aggression * troopStrength(g, 'defend');
}
function moveHunter(g, h) {
  const K = HUNTER_KINDS[h.kind];
  const t = g.troop;
  const dT = Math.abs(h.x - t.x) + Math.abs(h.y - t.y);
  // the muster: don't walk in alone. Hold at the ring until the group is enough.
  if (t.warren != null && located(g) && dT <= g.cfg.musterDist && !(g._ready ??= musterReady(g))) return;
  h.mp += K.speed;
  for (let guard = 0; guard < 6; guard++) {
    const here = cellOf(g, h);
    let nxt = -1;
    if (h.trail) {
      // follow the freshest neighbouring track
      let bt = g.tracks[here];
      for (const j of neighbours(g, here)) if (g.tracks[j] > bt && g.hCost(j) < Infinity) { bt = g.tracks[j]; nxt = j; }
      if (nxt < 0) { // end of the trail: the troop went to ground near here
        for (const v of g.warrens) { const d = Math.abs(v.x - h.x) + Math.abs(v.y - h.y); if (d <= 4) g.belief[v.i] += 0.15 / (1 + d); }
        normalize(g.belief); h.trail = false; h.retargetAt = 0;
      }
    }
    if (nxt < 0) {
      if (g.tick >= h.retargetAt || h.target < 0 || here === h.target) { h.target = chooseTarget(g, h); h.retargetAt = g.tick + 3; }
      if (h.target < 0) return;
      nxt = downhill(g, hunterField(g, h.target), here);
      if (nxt < 0) { h.retargetAt = 0; return; }
    }
    const cost = g.hCost(nxt);
    if (cost > h.mp) { h.mp = Math.min(h.mp, 3); return; }
    h.mp -= cost; h.x = nxt % g.W; h.y = (nxt / g.W) | 0;
    const nd = Math.abs(h.x - t.x) + Math.abs(h.y - t.y);
    if (nd <= (t.warren != null ? 1 : 0)) return; // reached you: stop
    if (t.warren != null && located(g) && nd <= g.cfg.musterDist && !(g._ready ??= musterReady(g))) return;
  }
}

// ---------------------------------------------------------------------------------------
// Contact and fights

// A hunter that reaches you does not fight alone. It holds, and everyone now knows where
// you are. When the group within three blocks is strong enough, they go in together.
function contact(g) {
  const t = g.troop, c = g.cfg;
  const d = h => Math.abs(h.x - t.x) + Math.abs(h.y - t.y);
  const reach = t.warren != null ? 1 : 0; // in transit they have to land on you
  const onYou = g.hunters.filter(h => d(h) <= reach);
  if (!onYou.length) return false;
  const group = g.hunters.filter(h => d(h) <= 3);
  const theirs = group.reduce((a, h) => a + h.str, 0);
  if (theirs >= c.aggression * troopStrength(g, 'defend')) { fight(g, group, 'defend'); return g.over; }
  if (!t.besieged) g.events.push({ t: 'siege', by: onYou.map(h => h.id) });
  t.besieged = true;
  g.belief.fill(0); g.belief[cellOf(g, t)] = 1;
  for (const h of g.hunters) if (d(h) > 1) h.retargetAt = 0;
  return false;
}

function fight(g, hs, mode) {
  const t = g.troop, ns = g.stats.nights[g.night - 1];
  g.stats.fights++; ns.fights++;
  const mine = troopStrength(g, mode === 'attack' ? 'attack' : 'defend');
  const theirs = hs.reduce((a, h) => a + h.str, 0);
  const r1 = 0.75 + 0.5 * rnd(g.seed, 'f1', g.night, g.tick, hs[0].id);
  const r2 = 0.75 + 0.5 * rnd(g.seed, 'f2', g.night, g.tick, hs[0].id);
  const where = t.warren != null ? 'warren' : 'transit';
  if (mine * r1 >= theirs * r2) {
    const perPerson = mine / t.size;
    const lost = Math.min(t.size - 1, Math.round(g.cfg.lossK * theirs * r2 / perPerson));
    t.size -= lost;
    g.stats.fightsWon++;
    for (const h of hs) { g.hunters.splice(g.hunters.indexOf(h), 1); g.respawnQueue.push(g.tick + g.cfg.respawnDelay); }
    g.events.push({ t: 'fight', won: true, mode, where, lost, killed: hs.map(h => h.id), mine, theirs });
  } else {
    g.events.push({ t: 'fight', won: false, mode, where, mine, theirs });
    end(g, { cause: mode === 'attack' ? 'attack' : where === 'warren' ? 'found' : 'transit', size: t.size, hunters: hs.map(h => h.kind) });
    return;
  }
  // a fight is loud: everyone now knows exactly where you are
  g.belief.fill(0); g.belief[cellOf(g, t)] = 1;
  for (const h of g.hunters) h.retargetAt = 0;
}

function end(g, death) {
  g.over = true;
  g.stats.death = { ...death, night: g.night, tick: g.tick, T: g.T };
  g.stats.nights[g.night - 1].endSize = g.troop.size;
  g.result = { nights: g.night - 1, death: g.stats.death };
  g.events.push({ t: 'end', ...g.stats.death });
}

// ---------------------------------------------------------------------------------------
// Dawn: keep a remnant, draft a boon, and the next night is worse.
function dawn(g) {
  const t = g.troop, c = g.cfg, ns = g.stats.nights[g.night - 1];
  ns.survived = true; ns.endSize = t.size;
  if (t.warren == null) arrive(g); // they get under before the light
  g.events.push({ t: 'dawn', night: g.night, size: t.size });
  if (g.night >= c.maxNights) { g.over = true; g.result = { nights: g.night, death: null }; g.events.push({ t: 'end', cause: 'survived' }); return; }
  t.size = c.remnant > 0 ? Math.max(c.startTroop, Math.round(t.size * c.remnant)) : c.startTroop;
  g.pendingDraft = c.draft ? draftOffer(g) : null;
  g.night++;
  beginNight(g);
}

export function draftOffer(g) {
  const pool = BOONS.map(b => b.id).filter(id => !g.boons[id] || id === 'dig' || id === 'deepen');
  const out = [];
  for (let k = 0; out.length < 3 && k < 50; k++) {
    const id = pool[Math.floor(rnd(g.seed, 'draft', g.night, k) * pool.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
export function takeBoon(g, id) {
  if (!g.pendingDraft || !g.pendingDraft.includes(id)) return;
  g.pendingDraft = null;
  g.stats.boons.push(id);
  const t = g.troop;
  if (id === 'deepen') { if (t.warren != null) { g.warrens[t.warren].depth = 'deep'; reconceal(g, g.warrens[t.warren]); } return; }
  if (id === 'dig') { digBeside(g); return; }
  g.boons[id] = true;
}
function digBeside(g) {
  const t = g.troop, f = troopField(g, cellOf(g, t));
  let best = -1, bd = -1;
  for (let i = 0; i < g.N; i++) {
    if (g.warrenAt[i] != null || f[i] === Infinity || !'.f'.includes(g.tiles[i])) continue;
    const x = i % g.W, y = (i / g.W) | 0, d = Math.abs(x - t.x) + Math.abs(y - t.y);
    if (d < 4 || d > 7) continue;
    const near = Math.min(...g.warrens.map(v => Math.abs(v.x - x) + Math.abs(v.y - y)));
    if (near > bd) { bd = near; best = i; }
  }
  if (best < 0) return;
  const kinds = ['C', 'S', 'D'];
  const v = { id: g.warrens.length, x: best % g.W, y: (best / g.W) | 0, kind: kinds[Math.floor(rnd(g.seed, 'dig', g.night) * 3)], depth: 'mid', name: null, why: 'dug at dawn', i: best };
  g.warrens.push(v); g.warrenAt[best] = v.id; reconceal(g, v);
}
function reconceal(g, w) {
  // the per-cell concealment table is shared with clones: copy before writing
  g.conceal = new Float64Array(g.conceal); g.concealU = new Float64Array(g.concealU);
  g.conceal[w.i] = g.concealU[w.i] = g.cfg.depthNoise[w.depth] * (w.kind === 'C' ? g.cfg.combatNoise : 1);
}

export { KIND_NAME, COST };

/** A copy cheap enough for lookahead: terrain caches are shared, everything that moves is copied. */
export function cloneGame(g, seedSalt = 0) {
  return {
    ...g,
    seed: seedSalt ? (g.seed ^ Math.imul(seedSalt, 0x9e3779b1)) : g.seed,
    troop: { ...g.troop, spec: { ...g.troop.spec } },
    hunters: g.hunters.map(h => ({ ...h })),
    respawnQueue: [...g.respawnQueue],
    belief: new Float64Array(g.belief), tracks: new Float64Array(g.tracks),
    boons: { ...g.boons }, history: { warrenTicks: { ...g.history.warrenTicks } },
    warrens: g.warrens.map(w => ({ ...w })), warrenAt: { ...g.warrenAt },
    stats: { ...g.stats, nights: g.stats.nights.map(n => ({ ...n })), kindTicks: { ...g.stats.kindTicks }, boons: [...g.stats.boons] },
    events: [], pendingDraft: null,
  };
}
