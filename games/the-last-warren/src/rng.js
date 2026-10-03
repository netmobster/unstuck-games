// Stateless, hashed randomness. Every roll is a pure function of (seed, ...tags), so a
// twin run that changes one player decision does not shift any other roll in the world.
// That is what makes "would moving one tick earlier have saved it?" an honest question.

function mix(h, k) {
  k = Math.imul(k, 0xcc9e2d51); k = (k << 15) | (k >>> 17); k = Math.imul(k, 0x1b873593);
  h ^= k; h = (h << 13) | (h >>> 19); return (Math.imul(h, 5) + 0xe6546b64) | 0;
}
function fin(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
const tagCache = new Map();
function tagNum(t) {
  if (typeof t === 'number') return t | 0;
  let v = tagCache.get(t);
  if (v === undefined) { v = 0; for (let i = 0; i < t.length; i++) v = mix(v, t.charCodeAt(i)); tagCache.set(t, v); }
  return v;
}

/** uint32 from a seed and any number of numeric/string tags */
export function hash(seed, ...tags) {
  let h = seed | 0;
  for (const t of tags) h = mix(h, tagNum(t));
  return fin(h);
}
/** float in [0,1) */
export function rnd(seed, ...tags) { return hash(seed, ...tags) / 4294967296; }

/** A sequential generator for map building, where order is fixed and nothing replays. */
export function stream(seed) {
  let s = hash(seed, 'stream') || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
