// Run a whole game headless with a policy. Shared by the sweep runner and the page's
// "watch a policy play" mode.

import { newGame, step, view, takeBoon } from './sim.js';
import { pickBoon, bestDestination } from './policies.js';
import { generateMap } from './map.js';

/**
 * @param seed     world seed (map + every roll)
 * @param cfg      config overrides
 * @param factory  policy factory: () => (view) => action
 * @param overrides optional { [globalTick]: 'move' } forced decisions (twin runs)
 */
export function runGame(seed, cfg, factory, overrides = null, map = null) {
  const g = newGame(seed, map ? { ...cfg, map } : cfg);
  const policy = factory();
  let guard = 0;
  while (!g.over && guard++ < 5000) {
    if (g.pendingDraft) takeBoon(g, pickBoon(g.pendingDraft));
    const v = view(g);
    let a = policy(v);
    const o = overrides && overrides[g.T + 1];
    if (o === 'move' && g.troop.warren != null) { const d = bestDestination(v); if (d) a = { type: 'move', to: d.id }; }
    step(g, a);
  }
  return g;
}

/** Summarise a finished game into a flat record for the sweeps. */
export function summarise(g) {
  const s = g.stats, d = s.death;
  return {
    nights: g.result.nights,
    survivedAll: !d,
    cause: d ? d.cause : 'survived',
    deathNight: d ? d.night : null,
    deathTick: d ? d.tick : null,
    deathT: d ? d.T : null,
    sizeAtEnd: g.troop.size,
    peak: s.peak,
    moves: s.moves, attacks: s.attacks, fights: s.fights, fightsWon: s.fightsWon,
    stayTicks: s.stayTicks, transitTicks: s.transitTicks,
    kindTicks: s.kindTicks, boons: s.boons,
    night1: s.nights[0]?.survived ?? false,
  };
}

/**
 * The twin test. For a troop found while staying, replay the same world with a forced
 * move k ticks before the fatal tick. Did it see dawn that night?
 */
export function twin(seed, cfg, factory, rec, k, map = null) {
  if (rec.cause !== 'found') return null;
  const T = rec.deathT - k;
  if (T < 1) return null;
  const g = runGame(seed, cfg, factory, { [T]: 'move' }, map);
  const n = rec.deathNight;
  return g.stats.nights[n - 1]?.survived === true;
}

export { generateMap };
