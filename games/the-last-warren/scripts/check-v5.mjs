// v5: do the new verbs add decisions? The dumb policies don't know them, so their numbers
// show whether the base game moved; the two experts differ only in knowing the new verbs.
//   node scripts/check-v5.mjs [seeds=1000] [expertSeeds=300]
import { makePool, evaluate } from './pool.mjs';
import { aggregate } from './metrics.mjs';
import { TUNED } from '../src/tuned.js';
const SEEDS = +(process.argv[2] || 1000), ES = +(process.argv[3] || 300);
const pool = makePool();
const DUMB = ['always-stay', 'move-at-3', 'attack-always', 'hybrid-3-1.8', 'hybrid-5-1.3'];
const raw = { ...(await evaluate(pool, TUNED, DUMB, SEEDS, { seed0: 400000 })), ...(await evaluate(pool, TUNED, ['expert-v4', 'expert'], ES, { seed0: 400000, chunk: 10 })) };
const out = {};
for (const [p, r] of Object.entries(raw)) {
  const a = aggregate(r);
  const sp = { decoy: 0, scout: 0, dig: 0, rearguard: 0 }; let hold = 0, ticks = 0;
  for (const x of r) { for (const k in sp) sp[k] += x.spends?.[k] || 0; hold += x.holdTicks || 0; ticks += x.stayTicks + x.transitTicks + (x.holdTicks || 0); }
  const nights = r.reduce((s, x) => s + x.nights + 1, 0);
  out[p] = { mean: +a.meanNights.toFixed(2), reach3: +a.reach3.toFixed(2), reach5: +a.reach5.toFixed(2), kinds: Object.fromEntries(Object.entries(a.kindShare).map(([k, v]) => [k, +v.toFixed(2)])), holdShare: +(hold / ticks).toFixed(3), spendsPerNight: Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, +(v / nights).toFixed(2)])), deaths: Object.fromEntries(Object.entries(a.deathShare).map(([k, v]) => [k, +v.toFixed(2)])) };
  console.log(p.padEnd(14), JSON.stringify(out[p]));
}
(await import('node:fs')).writeFileSync(new URL('../reports/check-v5.json', import.meta.url), JSON.stringify(out, null, 1));
await pool.close();
