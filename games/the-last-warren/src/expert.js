// The expert: not a rule but a search. At every moment that matters it tries each option
// (stay, every attack in reach, the three best places to run) a dozen ticks ahead, twice,
// on dice it cannot see (the rollouts use salted seeds), and takes the best average.
// It is the skill ceiling the dumb policies are measured against.
import { step, view, cloneGame } from './sim.js';
import { POLICIES } from './policies.js';

const H = 14;
export function expert({ horizon = H, salts = [7, 13] } = {}) {
  return () => {
    const base = POLICIES.hybrid(5, 1.3);
    return v => {
      const g = v.g, t = g.troop;
      if (t.warren == null) return { type: 'stay' };
      const threat = v.nearestHunterTicks();
      if (threat > 12 && !t.besieged) return { type: 'stay' };
      const opts = [{ type: 'stay' }];
      for (const h of v.attackable()) opts.push({ type: 'attack', hunter: h.id });
      const ranked = g.warrens.filter(w => w.id !== t.warren && isFinite(v.troopTicksTo(w.i)))
        .map(w => ({ w, s: Math.min(v.hunterTicksTo(w.i), 30) - 1.3 * v.troopTicksTo(w.i) + (w.depth === 'deep' ? 2 : 0) }))
        .sort((a, b) => b.s - a.s).slice(0, 3);
      for (const { w } of ranked) opts.push({ type: 'move', to: w.id });
      let best = opts[0], bv = -Infinity;
      for (const o of opts) {
        let tot = 0;
        for (const salt of salts) {
          const c = cloneGame(g, salt), pol = base();
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
    };
  };
}
