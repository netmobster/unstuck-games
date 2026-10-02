import { newGame, step, view } from './src/sim.js';
import { dijkstra } from './src/map.js';
import { TUNED } from './src/tuned.js';
const g = newGame(1, TUNED);
for (let i = 0; i < 9; i++) step(g, { type: 'stay' });
const v = view(g);
console.log('troop', g.troop.x, g.troop.y, 'size', g.troop.size, 'warren', g.troop.warren);
for (const hw of g.warrens) {
  const t0 = Date.now();
  const f = dijkstra(g.W, g.H, g.tCost, hw.i);
  let cur = v.here, k = 0;
  for (; k < 200 && cur !== hw.i; k++) { let nb = -1, bd = f[cur]; for (const j of g.nb[cur]) if (f[j] < bd) { bd = f[j]; nb = j; } if (nb < 0) break; cur = nb; }
  const you = v.troopTicksTo(hw.i), them = v.hunterTicksTo(hw.i);
  console.log(hw.id, hw.kind, hw.x, hw.y, 'steps', k, 'you', you, 'them', them, (Date.now() - t0) + 'ms');
}
