// Dumb players. Not AI: each is a one-line rule, so if one of them dominates, the
// mechanic is the problem, not the opponent. Every policy is (view) => action, plus a
// boon preference for the dawn draft.

import { rnd } from './rng.js';

/** Where to run: the warren the hunters will take longest to reach, net of how long it
 * takes us to get there. Deep warrens are worth a little extra. */
export function bestDestination(v, opts = {}) {
  const { warrens, troop } = v;
  const prefer = opts.prefer; // optional kind preference
  let best = null, bs = -Infinity;
  for (const w of warrens) {
    if (w.id === troop.warren) continue;
    const go = v.troopTicksTo(w.i);
    if (!isFinite(go)) continue;
    const them = v.hunterTicksTo(w.i);
    // arrive before them, and arrive somewhere they'll take a while to reach
    let s = Math.min(them, 30) - 1.3 * go;
    if (w.depth === 'deep') s += 2; else if (w.depth === 'shallow') s -= 1.5;
    if (prefer && w.kind === prefer) s += 3;
    if (v.belief) s -= 40 * v.belief[w.i];  // a scout knows where they'll look
    if (s > bs) { bs = s; best = w; }
  }
  if (best) best = Object.assign(Object.create(best), { margin: bs });
  return best;
}
// Run only if somewhere is worth running to (they won't be there first).
const MOVE = (v, o) => { const d = bestDestination(v, o); return d && d.margin > -2 ? { type: 'move', to: d.id } : { type: 'stay' }; };
const STAY = { type: 'stay' };

function weakestAttackable(v, margin) {
  const mine = v.strength('attack');
  const opts = v.attackable().filter(h => mine >= margin * h.str).sort((a, b) => a.str - b.str);
  return opts[0] || null;
}

export const POLICIES = {
  stay: () => () => () => STAY,

  every: (N) => () => {
    let since = 0;
    return v => { if (v.troop.warren == null) return STAY; since++; if (since >= N) { since = 0; return MOVE(v); } return STAY; };
  },

  near: (X) => () => v => (v.troop.warren != null && v.nearestHunterTicks() <= X ? MOVE(v) : STAY),

  grow: (X) => () => v => {
    if (v.troop.warren == null) return STAY;
    if (v.troop.size < X) return STAY;
    return v.nearestHunterTicks() <= 3 ? MOVE(v) : STAY;
  },

  attack: () => () => v => { const h = v.attackable()[0]; return h ? { type: 'attack', hunter: h.id } : STAY; },

  // stay; fight what you can beat; run from what you can't
  hybrid: (X, margin = 1.3) => () => v => {
    if (v.troop.warren == null) return STAY;
    const h = weakestAttackable(v, margin);
    if (h) return { type: 'attack', hunter: h.id };
    const near = v.hunters.filter(x => v.g && Math.abs(x.x - v.troop.x) + Math.abs(x.y - v.troop.y) <= X + 2);
    const threat = near.reduce((a, x) => a + x.str, 0);
    if (v.nearestHunterTicks() <= X && threat * margin > v.strength('defend')) return MOVE(v);
    return STAY;
  },

  // the hybrid, plus: when scouting, also move when they are about to look here
  scout: (X, margin = 1.3, B = 0.25) => () => {
    const base = POLICIES.hybrid(X, margin)();
    return v => {
      const a = base(v);
      if (a.type !== 'stay' || v.troop.warren == null) return a;
      if (v.belief && v.belief[v.here] > B && v.nearestHunterTicks() <= X * 2.5) return MOVE(v, { prefer: 'S' });
      // go and scout when nobody's close and we don't know what they think
      if (!v.belief && v.tick % 15 === 0 && v.nearestHunterTicks() > 8) return MOVE(v, { prefer: 'S' });
      return a;
    };
  },

  random: () => () => v => {
    if (v.troop.warren == null) return STAY;
    const r = rnd(v.g.seed, 'rp', v.g.T);
    const h = v.attackable()[0];
    if (h && r < 0.5) return { type: 'attack', hunter: h.id };
    return r < 0.1 ? MOVE(v) : STAY;
  },
};

// Boon taste: the same for everyone unless a policy has a reason to differ.
export const BOON_ORDER = ['hush', 'brood', 'walls', 'deepen', 'teeth', 'legs', 'scatter', 'dig'];
export function pickBoon(offer, order = BOON_ORDER) {
  return [...offer].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
}

/** Named roster for sweeps: name -> factory */
export function roster(attackOn = true) {
  const r = {
    'always-stay': POLICIES.stay(),
    'move-every-6': POLICIES.every(6), 'move-every-10': POLICIES.every(10), 'move-every-16': POLICIES.every(16),
    'move-at-3': POLICIES.near(3), 'move-at-5': POLICIES.near(5), 'move-at-8': POLICIES.near(8),
    'grow-to-15': POLICIES.grow(15), 'grow-to-30': POLICIES.grow(30),
    'random': POLICIES.random(),
  };
  if (attackOn) r['attack-always'] = POLICIES.attack();
  for (const X of [3, 5, 8]) for (const m of [1.0, 1.3, 1.8]) r[`hybrid-${X}-${m}`] = POLICIES.hybrid(X, m);
  for (const X of [3, 5]) for (const m of [1.3, 1.8]) r[`scout-${X}-${m}`] = POLICIES.scout(X, m);
  return r;
}
export const SINGLE_RULE = ['always-stay', 'move-every-6', 'move-every-10', 'move-every-16', 'move-at-3', 'move-at-5', 'move-at-8', 'grow-to-15', 'grow-to-30', 'attack-always', 'random'];
