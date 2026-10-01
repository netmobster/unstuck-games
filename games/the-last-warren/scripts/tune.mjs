// Search the config space for the region where the game exists.
// Random search, then local refinement around the best, each candidate judged on the
// same seeds by every policy. Writes reports/tune-<round>.json.
//   node scripts/tune.mjs [rounds=300] [seeds=120]
import { makePool, evaluate } from './pool.mjs';
import { aggregate, judge } from './metrics.mjs';
import { roster } from '../src/policies.js';
import { DEFAULTS } from '../src/sim.js';
import { TUNED } from '../src/tuned.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROUNDS = +(process.argv[2] || 300), SEEDS = +(process.argv[3] || 120), STRICT = process.argv.includes('--strict'), FROM = (process.argv.find(a => a.startsWith('--from=')) || '').slice(7);
const SPACE = {
  hunterBase: [5, 11], hunterNightScale: [0.15, 0.55], hunterStart: [1, 3, 'int'], hunterPerNight: [0, 2, 'int'],
  reinforceEvery: [7, 16, 'int'], aggression: [0.6, 1.4], fortify: [1.0, 1.6], ambush: [0.8, 1.3],
  attackRange: [1, 2, 'int'], lossK: [0.3, 1.0], transitSpeed: [2, 3, 'int'], hearK: [0.7, 1.7],
  remnant: [0.25, 0.6], carryDecay: [0.85, 0.97], diffusion: [0.06, 0.2], respawnDelay: [5, 20, 'int'],
  transit: ['exposed', 'tracks', 'bleed'],
  combatNoise: [1.0, 1.8], defenseDepart: [0, 6, 'int'], watchReact: [0, 1.2], watchCap: [2, 10, 'int'],
  growth: [1, 1, 'int'],
};
let rs = 12345; const R = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return (rs >>> 0) / 4294967296; };
function sample() {
  const c = {};
  for (const [k, v] of Object.entries(SPACE)) {
    if (typeof v[0] === 'string') c[k] = v[Math.floor(R() * v.length)];
    else { const x = v[0] + R() * (v[1] - v[0]); c[k] = v[2] === 'int' ? Math.round(x) : +x.toFixed(3); }
  }
  return c;
}
function nudge(base, scale) {
  const c = { ...base };
  for (const [k, v] of Object.entries(SPACE)) {
    if (R() > 0.35) continue;
    if (typeof v[0] === 'string') { if (R() < 0.3) c[k] = v[Math.floor(R() * v.length)]; continue; }
    const x = Math.min(v[1], Math.max(v[0], c[k] + (R() - 0.5) * scale * (v[1] - v[0])));
    c[k] = v[2] === 'int' ? Math.round(x) : +x.toFixed(3);
  }
  return c;
}

const pool = makePool();
const policies = Object.keys(roster(true));
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
const results = [];
async function score(cfg) {
  const raw = await evaluate(pool, cfg, policies, SEEDS, { twins: STRICT });
  const agg = Object.fromEntries(Object.entries(raw).map(([p, r]) => [p, aggregate(r)]));
  const j = judge(agg, { strict: STRICT });
  return { cfg, score: +j.score.toFixed(3), best: j.best, bestSingle: j.bestSingle, checks: j.checks.map(c => ({ id: c.id, got: +(+c.got).toFixed(3), pen: +c.pen.toFixed(3) })), summary: Object.fromEntries(Object.entries(agg).map(([p, a]) => [p, { mean: +a.meanNights.toFixed(2), reach1: +a.reach1.toFixed(2), reach3: +a.reach3.toFixed(2), moves: +a.movesPerNight.toFixed(2), attacks: +a.attacksPerNight.toFixed(2), stay: +a.stayShare.toFixed(2) }])) };
}

const t0 = Date.now();
const startCfg = FROM ? JSON.parse((await import('node:fs')).readFileSync(FROM, 'utf8')).top[0].cfg : Object.fromEntries(Object.keys(SPACE).map(k => [k, k in TUNED ? TUNED[k] : DEFAULTS[k]]));
results.push(await score(startCfg));
console.log(FROM ? 'start' : 'defaults', results[0].score, JSON.stringify(results[0].checks.filter(c => c.pen > 0)));
let best = results[0];
for (let r = 0; r < ROUNDS; r++) {
  const explore = !FROM && !process.argv.includes('--refine') && r < ROUNDS * 0.45;
  const cfg = explore ? sample() : nudge(best.cfg, r < ROUNDS * 0.8 ? 0.35 : 0.15);
  const res = await score(cfg);
  results.push(res);
  if (res.score < best.score) { best = res; console.log(`#${r} ${explore ? 'explore' : 'refine'} score ${res.score} best=${res.best} single=${res.bestSingle}`, JSON.stringify(res.checks.filter(c => c.pen > 0).map(c => c.id + ':' + c.got))); }
}
results.sort((a, b) => a.score - b.score);
writeFileSync(new URL(`../reports/tune-${STRICT ? 'strict' : 'loose'}-${Date.now()}.json`, import.meta.url), JSON.stringify({ seeds: SEEDS, rounds: ROUNDS, games: (ROUNDS + 1) * SEEDS * policies.length, defaults: DEFAULTS, top: results.slice(0, 25), all: results.map(r => ({ cfg: r.cfg, score: r.score })) }, null, 1));
console.log('BEST', best.score, JSON.stringify(best.cfg));
console.log(JSON.stringify(best.checks)); console.log(JSON.stringify(best.summary));
console.log('games', (ROUNDS + 1) * SEEDS * policies.length, 'in', ((Date.now() - t0) / 1000).toFixed(0) + 's');
await pool.close();
