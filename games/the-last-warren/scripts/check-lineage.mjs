// Does a longer night, an heirloom, or the family's memory break the balance?
//   node scripts/check-lineage.mjs [seeds=600]
import { makePool, evaluate } from './pool.mjs';
import { aggregate } from './metrics.mjs';
import { TUNED } from '../src/tuned.js';
const SEEDS = +(process.argv[2] || 600);
const pool = makePool();
const P = ['always-stay', 'move-at-3', 'attack-always', 'hybrid-3-1.8', 'hybrid-5-1.3'];
const V = {
  'night 45 (old)': { ...TUNED, nightLen: 45 },
  'night 54 (new)': { ...TUNED },
  'heir: Combat-born': { ...TUNED, heir: { attune: 'C' } },
  'heir: Scout-born': { ...TUNED, heir: { attune: 'S' } },
  'heir: Defense-born': { ...TUNED, heir: { attune: 'D' } },
  'heir: hush': { ...TUNED, heir: { boon: 'hush' } },
  'heir: brood': { ...TUNED, heir: { boon: 'brood' } },
  'heir: walls': { ...TUNED, heir: { boon: 'walls' } },
  'family: Combat-heavy': { ...TUNED, lineage: { C: 600, S: 150, D: 250 } },
  'heir Combat-born + Combat family': { ...TUNED, heir: { attune: 'C' }, lineage: { C: 600, S: 150, D: 250 } },
};
console.log('variant'.padEnd(34), P.map(p => p.padStart(13)).join(''), '  gap');
for (const [name, cfg] of Object.entries(V)) {
  const raw = await evaluate(pool, cfg, P, SEEDS, { seed0: 300000 });
  const a = Object.fromEntries(Object.entries(raw).map(([p, r]) => [p, aggregate(r).meanNights]));
  const gap = Math.max(a['hybrid-3-1.8'], a['hybrid-5-1.3']) - Math.max(a['always-stay'], a['move-at-3'], a['attack-always']);
  console.log(name.padEnd(34), P.map(p => a[p].toFixed(2).padStart(13)).join(''), gap.toFixed(2).padStart(6));
}
await pool.close();
