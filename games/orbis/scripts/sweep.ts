// EXPERIENCE SWEEP — runs many seeds headless and reports the distribution of states.
// Not pass/fail. Machine time is free; point this at 10,000 seeds overnight.
//
//   bun run sweep --seeds 50 --minutes 20
//   bun run sweep --seeds 10000 --minutes 30 --grid       (all 3×3 dial settings)
//   bun run sweep --seeds 40 --minutes 12 --causal         (does touching a dial matter?)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONDITIONS, configFor, type Conditions } from "../src/sim/conditions";
import { runSeed, THRESHOLDS, type RunReport, type Sample } from "../src/sim/metrics";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const num = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};

const SEEDS = num("seeds", 30);
const MINUTES = num("minutes", 15);
const FIRST_SEED = num("from", 1);

const outDir = join(import.meta.dir, "..", "reports");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};
const mmss = (t: number | null) => (t == null || Number.isNaN(t) ? "—" : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`);

function sweepConditions(cond: Conditions): RunReport[] {
  const reports: RunReport[] = [];
  for (let i = 0; i < SEEDS; i++) {
    reports.push(runSeed({ seed: FIRST_SEED + i, conditions: cond, minutes: MINUTES }).report);
    if ((i + 1) % 10 === 0) process.stderr.write(`  env=${cond.environment} aff=${cond.affinity}: ${i + 1}/${SEEDS}\n`);
  }
  return reports;
}

function summarize(cond: Conditions, rs: RunReport[]): string {
  const n = rs.length;
  const deadRuns = rs.filter((r) => r.visuallyDeadSeconds >= 60).length;
  const stagnant = rs.filter((r) => r.stagnationPeriods > 0);
  const soupy = rs.filter((r) => r.soupSeconds >= 60).length;
  const runaway = rs.filter((r) => r.runawaySeconds >= 60).length;
  const surprise = rs.map((r) => r.firstSurpriseAt).filter((t): t is number => t != null);
  const mergesPerMin = median(rs.map((r) => r.eventsPerMinute.merge ?? 0));
  const collisionsPerMin = median(rs.map((r) => r.eventsPerMinute.collision ?? 0));
  const msStep = median(rs.map((r) => r.msPerStep));
  const NOTABLE = ["supernova", "singularity-burst", "shatter", "fusion", "binary", "merge"] as const;
  const texture = median(rs.map((r) => NOTABLE.reduce((s, k) => s + (r.eventsPerMinute[k] ?? 0), 0)));
  return [
    `| env ${cond.environment} · affinity ${cond.affinity} | ${n}`,
    pct(rs.filter((r) => r.extinctAt != null).length, n),
    pct(deadRuns, n),
    `${pct(stagnant.length, n)}${stagnant.length ? ` (median first at ${mmss(median(stagnant.map((r) => r.moments.find((m) => m.what.startsWith("stagnated"))?.t ?? NaN)))})` : ""}`,
    pct(soupy, n),
    pct(runaway, n),
    mmss(median(surprise)),
    texture.toFixed(1),
    mergesPerMin.toFixed(1),
    collisionsPerMin.toFixed(0),
    median(rs.map((r) => r.meanCount)).toFixed(0),
    `${msStep.toFixed(3)} |`,
  ].join(" | ");
}

function specimens(rs: RunReport[]): string[] {
  const lines: string[] = [];
  const pick = (label: string, r: RunReport | undefined, note: string) => {
    if (r) lines.push(`- **${label}** — seed ${r.seed} (env ${r.conditions.environment}, aff ${r.conditions.affinity}): ${note}`);
  };
  const by = <K extends keyof RunReport>(k: K, dir = -1) => [...rs].sort((a, b) => dir * ((a[k] as number) - (b[k] as number)))[0];
  const cascade = by("biggestCascade");
  pick("Biggest cascade", cascade, `${cascade?.biggestCascade} merges inside 10s`);
  const stag = by("longestStagnation");
  if (stag && stag.longestStagnation > 0) pick("Longest stagnation", stag, `${stag.longestStagnation}s quiet`);
  const lively = [...rs].filter((r) => r.stagnationPeriods === 0 && r.soupSeconds < 60 && r.visuallyDeadSeconds < 60)
    .sort((a, b) => (b.eventsPerMinute.merge ?? 0) - (a.eventsPerMinute.merge ?? 0))[0];
  pick("Liveliest without soup or stagnation", lively, `${lively?.eventsPerMinute.merge} merges/min for ${lively?.minutes} min`);
  const slowSurprise = [...rs].sort((a, b) => (b.firstSurpriseAt ?? 1e9) - (a.firstSurpriseAt ?? 1e9))[0];
  pick("Slowest to surprise", slowSurprise, `first surprise at ${mmss(slowSurprise?.firstSurpriseAt ?? null)}`);
  const extinct = rs.find((r) => r.extinctAt != null);
  pick("An extinction", extinct, `empty at ${mmss(extinct?.extinctAt ?? null)}`);
  return lines;
}

/** Same seed twice; at the probe minute one copy's dial moves. How different is the next minute? */
function causalProbe() {
  const probeAt = Math.max(1, Math.floor(MINUTES / 2)) * 60;
  const window = 60;
  const moves: { label: string; to: Partial<Conditions> }[] = [
    { label: "environment → 0 (still)", to: { environment: 0 } },
    { label: "environment → 1 (stormy)", to: { environment: 1 } },
    { label: "affinity → 0 (aloof)", to: { affinity: 0 } },
    { label: "affinity → 1 (clingy)", to: { affinity: 1 } },
  ];
  const minutes = (probeAt + window) / 60;
  const slice = (s: Sample[]) => s.slice(probeAt, probeAt + window);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const rows: string[] = [];
  for (const m of moves) {
    const dSpeed: number[] = [], dLively: number[] = [], dCount: number[] = [];
    for (let i = 0; i < SEEDS; i++) {
      const seed = FIRST_SEED + i;
      const control = slice(runSeed({ seed, conditions: DEFAULT_CONDITIONS, minutes }).samples);
      const moved = slice(runSeed({
        seed, conditions: DEFAULT_CONDITIONS, minutes,
        onSecond: (world, s) => { if (s === probeAt) world.cfg = configFor({ ...DEFAULT_CONDITIONS, ...m.to }); },
      }).samples);
      const rel = (a: number, b: number) => (a === 0 && b === 0 ? 0 : (b - a) / Math.max(1e-9, Math.abs(a)));
      dSpeed.push(rel(mean(control.map((x) => x.meanSpeed)), mean(moved.map((x) => x.meanSpeed))));
      dLively.push(rel(mean(control.map((x) => x.lively)), mean(moved.map((x) => x.lively))));
      dCount.push(rel(mean(control.map((x) => x.count)), mean(moved.map((x) => x.count))));
    }
    const fmt = (xs: number[]) => `${median(xs) >= 0 ? "+" : ""}${Math.round(100 * median(xs))}%`;
    rows.push(`| ${m.label} | ${fmt(dSpeed)} | ${fmt(dLively)} | ${fmt(dCount)} |`);
  }
  return [
    `## Causality probe — ${SEEDS} seeds, dial moved at ${mmss(probeAt)}, next ${window}s compared to an untouched twin`,
    "",
    "Median relative change vs control. Near 0% = the player can't perceive the dial.",
    "",
    "| Move | Mean speed | Liveliness (events/s) | Body count |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

const md: string[] = [
  `# Orbis sweep — ${stamp}`,
  "",
  `${SEEDS} seeds × ${MINUTES} sim-minutes. Thresholds (provisional): ${JSON.stringify(THRESHOLDS)}`,
  "",
];
const json: Record<string, unknown> = { seeds: SEEDS, minutes: MINUTES, thresholds: THRESHOLDS };

if (flag("causal")) {
  md.push(causalProbe());
} else {
  const grid: Conditions[] = flag("grid")
    ? [0, 0.5, 1].flatMap((environment) => [0, 0.5, 1].map((affinity) => ({ environment, affinity })))
    : [DEFAULT_CONDITIONS];
  md.push(
    "| Conditions | Runs | Extinct | Visually dead ≥60s | Stagnates | Soup ≥60s | Runaway ≥60s | First surprise (median) | Texture/min | Merges/min | Collisions/min | Mean bodies | ms/step |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  const all: RunReport[] = [];
  for (const cond of grid) {
    const rs = sweepConditions(cond);
    all.push(...rs);
    md.push(summarize(cond, rs));
  }
  md.push("", "## Specimens worth watching", "", ...specimens(all), "");
  json.runs = all;
}

const base = join(outDir, `sweep-${stamp}${flag("causal") ? "-causal" : ""}`);
writeFileSync(`${base}.md`, md.join("\n"));
writeFileSync(`${base}.json`, JSON.stringify(json, null, 2));
console.log(md.join("\n"));
console.log(`\nwrote ${base}.md / .json`);
