// Turn piles of game summaries into distributions, and distributions into a verdict.
import { SINGLE_RULE } from '../src/policies.js';

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

export function aggregate(recs) {
  const n = recs.length, nightsPlayed = recs.map(r => r.nights + (r.survivedAll ? 0 : 1));
  const causes = {}; for (const r of recs) causes[r.cause] = (causes[r.cause] || 0) + 1;
  const kinds = { C: 0, S: 0, D: 0, N: 0 }; for (const r of recs) for (const k in kinds) kinds[k] += r.kindTicks[k] || 0;
  const kt = kinds.C + kinds.S + kinds.D + kinds.N || 1;
  const reach = k => recs.filter(r => r.nights >= k).length / n;
  const ticks = recs.reduce((a, r) => a + r.stayTicks + r.transitTicks, 0) || 1;
  const found = recs.filter(r => r.cause === 'found' && r.twin1 != null);
  return {
    n,
    meanNights: mean(recs.map(r => r.nights)), medianNights: median(recs.map(r => r.nights)),
    reach1: reach(1), reach2: reach(2), reach3: reach(3), reach5: reach(5), reachAll: recs.filter(r => r.survivedAll).length / n,
    causes, deathShare: Object.fromEntries(Object.entries(causes).filter(([k]) => k !== 'survived').map(([k, v]) => [k, v / Math.max(1, n - (causes.survived || 0))])),
    movesPerNight: mean(recs.map((r, i) => r.moves / nightsPlayed[i])),
    attacksPerNight: mean(recs.map((r, i) => r.attacks / nightsPlayed[i])),
    fightsPerNight: mean(recs.map((r, i) => r.fights / nightsPlayed[i])),
    stayShare: recs.reduce((a, r) => a + r.stayTicks, 0) / ticks,
    peak: mean(recs.map(r => r.peak)),
    sizeAtDeath: mean(recs.filter(r => !r.survivedAll).map(r => r.sizeAtEnd)),
    kindShare: { C: kinds.C / kt, S: kinds.S / kt, D: kinds.D / kt, N: kinds.N / kt },
    twin1: found.length ? found.filter(r => r.twin1).length / found.length : null,
    twin2: found.length ? found.filter(r => r.twin2).length / found.length : null,
    twin3: found.length ? found.filter(r => r.twin3).length / found.length : null,
    twinN: found.length,
  };
}

/** The targets. Lower is better; 0 means every target is met. Returns { score, checks }. */
export function judge(agg, { attack = true, strict = false } = {}) {
  const names = Object.keys(agg);
  const best = names.reduce((a, b) => agg[a].meanNights >= agg[b].meanNights ? a : b);
  const singles = names.filter(n => SINGLE_RULE.includes(n));
  const bestSingle = singles.reduce((a, b) => agg[a].meanNights >= agg[b].meanNights ? a : b);
  const B = agg[best], S = agg[bestSingle];
  const skilled = names.filter(n => n.startsWith('hybrid') || n.startsWith('scout'));
  const allDeaths = {}; let dn = 0;
  for (const n of skilled) for (const [k, v] of Object.entries(agg[n].causes)) if (k !== 'survived') { allDeaths[k] = (allDeaths[k] || 0) + v; dn += v; }
  const transitShare = (allDeaths.transit || 0) / Math.max(1, dn);
  const checks = [
    { id: 'no-dominant-rule', want: 'best one-rule policy reaches night 3 in <= 45% of runs', got: S.reach3, pen: Math.max(0, S.reach3 - 0.45) * 4 },
    { id: 'skill-pays', want: 'best player beats best one-rule policy by >= 0.8 nights', got: B.meanNights - S.meanNights, pen: Math.max(0, 0.8 - (B.meanNights - S.meanNights)) * 2 },
    { id: 'night-1-learnable', want: 'best player survives night 1 in 85-97% of runs', got: B.reach1, pen: Math.max(0, 0.85 - B.reach1) * 3 + Math.max(0, B.reach1 - 0.97) * 3 },
    { id: 'curve', want: 'best player averages 2.5-5 nights', got: B.meanNights, pen: Math.max(0, 2.5 - B.meanNights) + Math.max(0, B.meanNights - 5) },
    { id: 'stay-matters', want: 'best player stays 55-92% of ticks', got: B.stayShare, pen: Math.max(0, 0.55 - B.stayShare) * 3 + Math.max(0, B.stayShare - 0.92) * 3 },
    { id: 'move-matters', want: 'best player moves >= 0.8 times a night', got: B.movesPerNight, pen: Math.max(0, 0.8 - B.movesPerNight) * 2 },
    { id: 'transit-is-risk', want: 'transit is 20-60% of skilled deaths', got: transitShare, pen: Math.max(0, 0.2 - transitShare) * 2 + Math.max(0, transitShare - 0.6) * 2 },
    { id: 'stay-not-safe', want: 'always-stay averages <= 1.5 nights', got: agg['always-stay']?.meanNights ?? 0, pen: Math.max(0, (agg['always-stay']?.meanNights ?? 0) - 1.5) },
    { id: 'kinds-differ', want: 'no warren kind takes > 55% of the best player\'s ticks', got: Math.max(...Object.values(B.kindShare)), pen: Math.max(0, Math.max(...Object.values(B.kindShare)) - 0.55) * 2 },
  ];
  if (attack) {
    checks.push({ id: 'attack-matters', want: 'best player attacks 0.4-6 times a night', got: B.attacksPerNight, pen: Math.max(0, 0.4 - B.attacksPerNight) * 2 + Math.max(0, B.attacksPerNight - 6) * 0.3 });
    checks.push({ id: 'attack-not-dominant', want: 'attack-always is >= 1 night behind the best', got: B.meanNights - (agg['attack-always']?.meanNights ?? 0), pen: Math.max(0, 1 - (B.meanNights - (agg['attack-always']?.meanNights ?? 0))) * 1.5 });
  }
  if (strict) {
    const pols = names.filter(n => n !== 'random' && n !== 'always-stay');
    const spread = Math.max(...['C', 'S', 'D', 'N'].map(k => Math.max(...pols.map(n => agg[n].kindShare[k])) - Math.min(...pols.map(n => agg[n].kindShare[k]))));
    checks.push({ id: 'kinds-matter', want: 'how players split time by warren kind differs by >= 15 points between strategies', got: spread, pen: Math.max(0, 0.15 - spread) * 3 });
    checks.push({ id: 'curve-n3', want: 'best player reaches night 3 in 40-70% of runs', got: B.reach3, pen: Math.max(0, 0.4 - B.reach3) * 3 + Math.max(0, B.reach3 - 0.7) * 3 });
    checks.push({ id: 'curve-n5', want: 'best player reaches night 5 in 10-30% of runs', got: B.reach5, pen: Math.max(0, 0.1 - B.reach5) * 3 + Math.max(0, B.reach5 - 0.3) * 3 });
    checks.push({ id: 'skill-pays-1', want: 'best player beats best one-rule policy by >= 1 night', got: B.meanNights - S.meanNights, pen: Math.max(0, 1 - (B.meanNights - S.meanNights)) * 2 });
    if (attack) checks.push({ id: 'attack-earns', want: 'best player attacks >= 0.5 times a night', got: B.attacksPerNight, pen: Math.max(0, 0.5 - B.attacksPerNight) * 3 });
    if (B.twin1 != null) checks.push({ id: 'one-tick-late', want: '>= 25% of the best player’s found-deaths are saved by moving one tick earlier', got: B.twin1, pen: Math.max(0, 0.25 - B.twin1) * 3 });
  }
  return { score: checks.reduce((a, c) => a + c.pen, 0), checks, best, bestSingle };
}
