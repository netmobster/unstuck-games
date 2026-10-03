// The big one: take a config, run everything against it at scale, and write the evidence.
//   node scripts/report.mjs <tune-json|-> [seeds=2000]
// Writes reports/report.json, which reports/REPORT.html is built from.
import { makePool, evaluate } from './pool.mjs';
import { aggregate, judge } from './metrics.mjs';
import { roster } from '../src/policies.js';
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2], SEEDS = +(process.argv[3] || 2000);
const cfg = src && src !== '-' ? JSON.parse(readFileSync(src, 'utf8')).top[0].cfg : {};
const pool = makePool();
const t0 = Date.now(); let games = 0;
const all = Object.keys(roster(true));
const SKILLED = ['hybrid-3-1.8', 'hybrid-5-1.3', 'scout-3-1.3', 'expert'];

async function study(c, policies, seeds, twins = false) {
  const raw = await evaluate(pool, c, policies, seeds, { twins, seed0: 100000 });
  for (const r of Object.values(raw)) games += r.length;
  return Object.fromEntries(Object.entries(raw).map(([p, r]) => [p, { ...aggregate(r), curve: curve(r) }]));
}
function curve(recs) { const out = []; for (let n = 1; n <= 8; n++) out.push(recs.filter(r => r.nights >= n).length / recs.length); return out; }

const out = { cfg, seeds: SEEDS, when: new Date().toISOString() };

// 1. every policy, at scale, with twins
console.log('1. roster'); out.roster = await study(cfg, all, SEEDS, true);
console.log('   expert'); Object.assign(out.roster, await study(cfg, ['expert'], Math.min(SEEDS, 600), true));
out.verdict = judge(Object.fromEntries(Object.entries(out.roster).filter(([k]) => k !== 'expert')), { strict: true });
console.log('   verdict', out.verdict.score.toFixed(3), out.verdict.best);

// 2. which progression mechanics bend the curve: each one off in turn
console.log('2. toggles');
const toggles = {
  'as tuned': {}, 'no remnant': { remnant: 0 }, 'no draft': { draft: false }, 'no learning': { learn: false },
  'no new kinds': { kinds: false }, 'no attack': { attack: false }, 'no siege halt': { siegeHaltsGrowth: false },
  'transit: exposed': { transit: 'exposed' }, 'transit: tracks': { transit: 'tracks' }, 'transit: bleed': { transit: 'bleed' },
};
out.toggles = {};
for (const [name, t] of Object.entries(toggles)) {
  const r = await study({ ...cfg, ...t }, ['always-stay', 'move-at-3', 'move-at-5', 'attack-always', 'hybrid-3-1.8', 'hybrid-5-1.3', 'scout-3-1.3'], Math.round(SEEDS / 3));
  out.toggles[name] = Object.fromEntries(Object.entries(r).map(([p, a]) => [p, { mean: a.meanNights, curve: a.curve, moves: a.movesPerNight, attacks: a.attacksPerNight, deaths: a.deathShare }]));
  console.log('  ', name, Object.entries(out.toggles[name]).map(([p, a]) => p + ' ' + a.mean.toFixed(2)).join(' | '));
}

// 3. sensitivity: one dial at a time
console.log('3. sensitivity');
const dials = {
  hunterBase: [5, 6, 7, 8, 9, 10], reinforceEvery: [8, 10, 12, 14, 16], aggression: [0.7, 0.85, 1, 1.15, 1.3],
  transitSpeed: [2, 3], warrenBonus: [0, 0.15, 0.3, 0.45, 0.6], hearK: [0.8, 1.0, 1.2, 1.4, 1.6], nightLen: [30, 38, 45, 52, 60],
};
out.sensitivity = {};
for (const [k, vals] of Object.entries(dials)) {
  out.sensitivity[k] = [];
  for (const v of vals) {
    const r = await study({ ...cfg, [k]: v }, ['always-stay', 'move-at-3', 'attack-always', 'hybrid-3-1.8', 'hybrid-5-1.3'], Math.round(SEEDS / 5));
    const single = Math.max(r['always-stay'].meanNights, r['move-at-3'].meanNights, r['attack-always'].meanNights);
    const skilled = Math.max(r['hybrid-3-1.8'].meanNights, r['hybrid-5-1.3'].meanNights);
    out.sensitivity[k].push({ v, single, skilled, gap: skilled - single, stay: r['always-stay'].meanNights, attack: r['attack-always'].meanNights, run: r['move-at-3'].meanNights });
  }
  console.log('  ', k, out.sensitivity[k].map(x => `${x.v}:${x.skilled.toFixed(2)}/${x.single.toFixed(2)}`).join(' '));
}

out.games = games; out.seconds = Math.round((Date.now() - t0) / 1000);
writeFileSync(new URL('../reports/report.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('games', games, 'in', out.seconds + 's');
await pool.close();
