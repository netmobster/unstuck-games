// The expert: not a rule but a search. At every moment that matters it tries each option
// a dozen ticks ahead, twice, on dice it cannot see (the rollouts use salted seeds), and
// takes the best average. It is the skill ceiling the dumb policies are measured against.
// verbs: 'v4' = stay / move / attack only. 'all' adds v5's verbs: decoy, rearguard, scout
// party, hide in forest, dig. The gap between the two is what the new verbs are worth.
import { step, view, cloneGame, inTransit, holding } from './sim.js';
import { POLICIES, bestDestination } from './policies.js';

const H = 14;

// the continuation the rollouts play: the hybrid, plus "if you're holding in the open, go home when it gets hot"
function baseFactory() {
  const hyb = POLICIES.hybrid(5, 1.3)();
  return v => {
    if (holding(v.troop)) {
      if (v.nearestHunterTicks() <= 5) { const d = bestDestination(v); return d ? { type: 'move', to: d.id } : { type: 'stay' }; }
      return { type: 'stay' };
    }
    return hyb(v);
  };
}

function hideCell(v) {
  // the forest cell within reach that the hunters will take longest to get to
  const g = v.g, t = v.troop;
  let best = -1, bs = -Infinity;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const x = t.x + dx, y = t.y + dy;
    if (x < 0 || y < 0 || x >= g.W || y >= g.H || Math.abs(dx) + Math.abs(dy) > 5) continue;
    const i = y * g.W + x;
    if (g.tiles[i] !== 'f' || g.warrenAt[i] != null) continue;
    const go = v.troopTicksTo(i); if (!isFinite(go)) continue;
    const s = Math.min(v.hunterTicksTo(i), 30) - 1.3 * go;
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}

export function expert({ horizon = H, salts = [7, 13], verbs = 'all' } = {}) {
  return () => {
    return v => {
      const g = v.g, t = g.troop;
      if (inTransit(t)) {
        // mid-run, the only choices are throwing something behind you
        if (verbs !== 'all' || g.hunters.every(h => Math.abs(h.x - t.x) + Math.abs(h.y - t.y) > 4)) return { type: 'stay' };
        return choose(g, [{ type: 'stay' }, ...(v.canSpend('decoy') ? [{ type: 'decoy' }] : []), ...(v.canSpend('rearguard') ? [{ type: 'rearguard' }] : [])], horizon, salts);
      }
      const threat = v.nearestHunterTicks();
      if (threat > 12 && !t.besieged && !holding(t)) {
        // quiet moments: worth scouting?
        if (verbs === 'all' && !v.scouting && v.canSpend('scout') && threat > 8 && t.size > 20) return choose(g, [{ type: 'stay' }, { type: 'scout' }], horizon, salts);
        return { type: 'stay' };
      }
      const opts = [{ type: 'stay' }];
      for (const h of v.attackable()) opts.push({ type: 'attack', hunter: h.id });
      const ranked = g.warrens.filter(w => w.id !== t.warren && isFinite(v.troopTicksTo(w.i)))
        .map(w => ({ w, s: Math.min(v.hunterTicksTo(w.i), 30) - 1.3 * v.troopTicksTo(w.i) + (w.depth === 'deep' ? 2 : 0) }))
        .sort((a, b) => b.s - a.s).slice(0, 3);
      for (const { w } of ranked) opts.push({ type: 'move', to: w.id });
      if (verbs === 'all') {
        for (const k of ['decoy', 'rearguard', 'scout', 'dig']) if (v.canSpend(k)) opts.push({ type: k });
        const hc = hideCell(v); if (hc >= 0) opts.push({ type: 'go', cell: hc });
      }
      return choose(g, opts, horizon, salts);
    };
  };
}

function choose(g, opts, horizon, salts) {
  let best = opts[0], bv = -Infinity;
  for (const o of opts) {
    let tot = 0;
    for (const salt of salts) {
      const c = cloneGame(g, salt), pol = baseFactory();
      const night = c.night;
      step(c, o);
      let k = 0;
      while (!c.over && c.night === night && k++ < horizon) step(c, pol(view(c)));
      if (c.over && c.stats.death) tot += -1000 + k;
      else if (c.night !== night) tot += 200 + c.troop.size;
      else tot += c.troop.size * (c.troop.besieged ? 0.6 : 1) - (c.troop.warren == null ? 3 : 0);
    }
    if (tot > bv) { bv = tot; best = o; }
  }
  return best;
}
