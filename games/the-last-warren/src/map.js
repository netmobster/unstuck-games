// The map: a hand, some dials, a seed. Shaped like a SEREN campaign module so that the
// campaign creator can later supply the hand and weave names/reasons into the same file
// (see MAP-FORMAT.md). Procedural generation fills every field the creator would.

import { stream } from './rng.js';

export const T = { OPEN: '.', ROAD: '=', FOREST: 'f', LAKE: '~', MOUNTAIN: '^' };

// Movement-point cost to ENTER a tile. Everyone banks 2 points a tick (hounds 3), so open
// ground is one block a tick, roads two, forest two-thirds, a lake swim a third.
export const COST = {
  troop:  { '.': 2, '=': 1, 'f': 3, '~': 6, '^': Infinity },
  hunter: { '.': 2, '=': 1, 'f': 3, '~': Infinity, '^': Infinity },
};

// THE HAND: twelve frames, SEREN-style. A frame is not scenery; each sets the dials.
// Dials are 0..1 and every one changes a number in the generator, never just a word.
export const FRAMES = {
  'The low fields':     { water: .25, relief: .2,  cover: .3,  roads: .5,  warrens: .5 },
  'The drowned coast':  { water: .7,  relief: .2,  cover: .25, roads: .3,  warrens: .5 },
  'The cold march':     { water: .2,  relief: .7,  cover: .2,  roads: .2,  warrens: .4 },
  'The old wood':       { water: .2,  relief: .25, cover: .75, roads: .2,  warrens: .55 },
  'The hedged country': { water: .2,  relief: .2,  cover: .5,  roads: .7,  warrens: .6 },
  'The broken hills':   { water: .3,  relief: .6,  cover: .45, roads: .3,  warrens: .5 },
  'The fen':            { water: .6,  relief: .1,  cover: .55, roads: .15, warrens: .45 },
  'The quarry towns':   { water: .15, relief: .5,  cover: .15, roads: .75, warrens: .6 },
  'The burned heath':   { water: .15, relief: .3,  cover: .1,  roads: .4,  warrens: .45 },
  'The river bends':    { water: .55, relief: .3,  cover: .4,  roads: .5,  warrens: .55 },
  'The high moor':      { water: .3,  relief: .45, cover: .15, roads: .25, warrens: .4 },
  'The last commons':   { water: .3,  relief: .3,  cover: .4,  roads: .4,  warrens: .5 },
};
export const FRAME_NAMES = Object.keys(FRAMES);

export const KINDS = ['C', 'S', 'D'];
export const KIND_NAME = { C: 'Combat', S: 'Scout', D: 'Defense' };
export const DEPTHS = ['deep', 'mid', 'shallow'];

function valueNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = Array.from({ length: gw * gh }, () => rand());
  const out = new Float64Array(w * h);
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = sm(fx - x0), ty = sm(fy - y0);
    const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
    out[y * w + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  return out;
}
function fbm(w, h, rand) {
  const a = valueNoise(w, h, 7, rand), b = valueNoise(w, h, 3.5, rand), c = valueNoise(w, h, 1.8, rand);
  const o = new Float64Array(w * h);
  for (let i = 0; i < o.length; i++) o[i] = a[i] * 0.6 + b[i] * 0.3 + c[i] * 0.1;
  return o;
}
function quantile(arr, q) { const s = Array.from(arr).sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

/**
 * Generate a map. `opts` may carry { frame, dials, w, h, warrenCount }.
 * Retries internally until the map is sound (connected, warrens reachable, spawns valid).
 */
export function generateMap(seed, opts = {}) {
  const frame = opts.frame ?? FRAME_NAMES[seed % FRAME_NAMES.length];
  const dials = { ...FRAMES[frame], ...(opts.dials || {}) };
  for (let attempt = 0; attempt < 40; attempt++) {
    const m = tryMap(seed, attempt, frame, dials, opts);
    if (m) return m;
  }
  throw new Error('map generation failed for seed ' + seed);
}

function tryMap(seed, attempt, frame, dials, opts) {
  const w = opts.w ?? 28, h = opts.h ?? 18, N = w * h;
  const rand = stream(seed * 977 + attempt);
  const elev = fbm(w, h, rand), wet = fbm(w, h, rand);
  const tiles = new Array(N).fill(T.OPEN);
  const mThr = quantile(elev, 1 - (0.03 + 0.17 * dials.relief));
  const lThr = quantile(elev, 0.02 + 0.16 * dials.water);
  const fThr = quantile(wet, 1 - (0.08 + 0.42 * dials.cover));
  for (let i = 0; i < N; i++) {
    if (elev[i] >= mThr) tiles[i] = T.MOUNTAIN;
    else if (elev[i] <= lThr) tiles[i] = T.LAKE;
    else if (wet[i] >= fThr) tiles[i] = T.FOREST;
  }
  // Warrens: spread out, off the edges, on open ground or forest.
  const want = opts.warrenCount ?? Math.round(5 + 4 * dials.warrens);
  const warrens = [];
  const cand = [];
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const t = tiles[y * w + x]; if (t === T.OPEN || t === T.FOREST) cand.push([x, y]);
  }
  for (let tries = 0; tries < 600 && warrens.length < want; tries++) {
    const [x, y] = cand[Math.floor(rand() * cand.length)];
    if (warrens.some(v => Math.abs(v.x - x) + Math.abs(v.y - y) < 6)) continue;
    warrens.push({ x, y });
  }
  if (warrens.length < Math.max(4, want - 1)) return null;
  // Kinds evenly dealt then shuffled; depths rolled.
  const kinds = warrens.map((_, i) => KINDS[i % 3]);
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  warrens.forEach((v, i) => {
    v.id = i; v.kind = kinds[i]; v.depth = DEPTHS[Math.floor(rand() * 3)];
    tiles[v.y * w + v.x] = T.OPEN; // a warren mouth is always ground you can stand on
    v.name = null; v.why = null;    // the weave fills these
  });
  // Roads: a minimum spanning tree over warrens, plus extra links by the roads dial,
  // laid along the cheapest overland route. Roads are fast and loud.
  const roadCost = i => tiles[i] === T.MOUNTAIN ? Infinity : tiles[i] === T.LAKE ? 12 : tiles[i] === T.FOREST ? 4 : 2;
  const edges = [];
  for (let a = 0; a < warrens.length; a++) for (let b = a + 1; b < warrens.length; b++)
    edges.push([Math.abs(warrens[a].x - warrens[b].x) + Math.abs(warrens[a].y - warrens[b].y), a, b]);
  edges.sort((p, q) => p[0] - q[0]);
  const parent = warrens.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const links = [];
  for (const [, a, b] of edges) {
    if (find(a) !== find(b)) { parent[find(a)] = find(b); links.push([a, b]); }
    else if (rand() < dials.roads * 0.25) links.push([a, b]);
  }
  const roadShare = dials.roads;
  for (const [a, b] of links) {
    if (rand() > 0.25 + 0.75 * roadShare) continue;
    const path = cheapestPath(w, h, roadCost, warrens[a].y * w + warrens[a].x, warrens[b].y * w + warrens[b].x);
    if (!path) continue;
    for (const i of path) if (tiles[i] === T.OPEN || tiles[i] === T.FOREST) tiles[i] = T.ROAD;
  }
  warrens.forEach(v => { if (tiles[v.y * w + v.x] === T.ROAD) tiles[v.y * w + v.x] = T.OPEN; });
  // Spawns: edge cells hunters can stand on.
  const spawns = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) spawns.push([x, y]);
  for (let y = 1; y < h - 1; y++) for (const x of [0, w - 1]) spawns.push([x, y]);
  const okSpawns = spawns.filter(([x, y]) => COST.hunter[tiles[y * w + x]] < Infinity);
  const map = {
    format: 'warren-map/1', seed, hand: { frame }, dials, w, h,
    tiles: Array.from({ length: h }, (_, y) => tiles.slice(y * w, y * w + w).join('')),
    warrens, spawns: okSpawns, weave: null,
  };
  if (!soundness(map)) return null;
  return map;
}

/** Every warren reachable by the troop from every other, and by hunters from the spawns. */
function soundness(map) {
  const tiles = flat(map);
  const { w, h } = map;
  const tf = costFn(tiles, 'troop'), hf = costFn(tiles, 'hunter');
  const d0 = dijkstra(w, h, tf, idx(map, map.warrens[0]));
  if (map.warrens.some(v => d0[idx(map, v)] === Infinity)) return false;
  if (map.spawns.length < 8) return false;
  // hunters need to reach most warrens (a warren hunters can't reach would be a fortress)
  const dh = dijkstra(w, h, hf, map.warrens.map(v => idx(map, v)));
  const reach = map.spawns.filter(([x, y]) => dh[y * w + x] < Infinity);
  if (reach.length < 8) return false;
  map.spawns = reach;
  for (const v of map.warrens) {
    const dv = dijkstra(w, h, hf, idx(map, v));
    if (!reach.some(([x, y]) => dv[y * w + x] < Infinity)) return false;
  }
  return true;
}

export const idx = (map, p) => p.y * map.w + p.x;
export function flat(map) { return map.tiles.join('').split(''); }
export function costFn(tiles, who) { const c = COST[who]; return i => c[tiles[i]]; }

/** Dijkstra from one or many sources; returns Float64Array of costs (cost of entering cells). */
export function dijkstra(w, h, cost, sources) {
  const N = w * h, dist = new Float64Array(N).fill(Infinity);
  // bucket queue: costs are small integers
  const buckets = [];
  const push = (d, i) => { (buckets[d] || (buckets[d] = [])).push(i); };
  for (const s of [].concat(sources)) { dist[s] = 0; push(0, s); }
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d]; if (!b) continue;
    for (let k = 0; k < b.length; k++) {
      const i = b[k]; if (dist[i] !== d) continue;
      const x = i % w, y = (i / w) | 0;
      if (x > 0) relax(i - 1); if (x < w - 1) relax(i + 1); if (y > 0) relax(i - w); if (y < h - 1) relax(i + w);
      function relax(j) { const c = cost(j); if (c === Infinity) return; const nd = d + c; if (nd < dist[j]) { dist[j] = nd; push(nd, j); } }
    }
    buckets[d] = null;
  }
  return dist;
}

export function cheapestPath(w, h, cost, from, to) {
  const d = dijkstra(w, h, cost, to);
  if (d[from] === Infinity) return null;
  const path = [from]; let cur = from;
  while (cur !== to) {
    const x = cur % w, y = (cur / w) | 0; let best = -1, bd = Infinity;
    for (const j of [x > 0 ? cur - 1 : -1, x < w - 1 ? cur + 1 : -1, y > 0 ? cur - w : -1, y < h - 1 ? cur + w : -1]) {
      if (j < 0) continue; const v = d[j] + (j === to ? 0 : 0);
      if (v < bd) { bd = v; best = j; }
    }
    if (best < 0 || bd >= d[cur]) return null;
    cur = best; path.push(cur);
  }
  return path;
}
