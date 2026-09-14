// SMOKE TEST — thousands of headless bargains under different player styles.
// Hard invariants fail loudly; everything else is a report on whether the ideas hold together.
//   bun run smoke --runs 2000
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT, GOALS, STOPS, advanceDay, fastForward, fixWith, keepMutation, leave, newRun, sayWords, setGoal,
  targetSmudge, type GoalId, type Run,
} from "../src/sim";
import { Rng } from "../src/rng";

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf("--runs") + 1]) || 2000;

type Policy = { name: string; persist?: boolean; play: (run: Run, r: Rng) => void };
const goalIds = Object.keys(GOALS) as GoalId[];

/** One landed stop, then away until the next landing/verdict. */
/** Red team rule to measure: no return should need more than ~30 s of reading before the player can act. */
export const READ_SECONDS: number[] = [];
const WPM = 200;
const words = (t: string) => t.split(/s+/).filter(Boolean).length;
function recordReadingLoad(run: Run) {
  const returned = run.stop === 0 ? run.log.slice(0, run.landLogIndex) : run.returnLog;
  const here = run.log.slice(run.landLogIndex);
  const w = [...returned, ...here].reduce((n, e) => n + words(e.text), 0) + words(run.planet.problem);
  READ_SECONDS.push((w / WPM) * 60);
}

function stopTurn(run: Run, r: Rng, opts: { fix: "smart" | "random" | "none"; keep: boolean; goal?: GoalId; dayByDay?: boolean }) {
  if (run.phase === "landed") recordReadingLoad(run);
  if (opts.fix !== "none") {
    while (run.fixesLeft > 0 && run.mutations.length) {
      const smart = run.mutations.find((m) => m.solves.includes(run.planet.need));
      const m = opts.fix === "smart" && smart ? smart : run.mutations[r.int(run.mutations.length)];
      fixWith(run, m.id);
    }
  }
  if (opts.keep && run.mutations.length) {
    const best = [...run.mutations].sort((a, b) => b.upside.smudge - a.upside.smudge)[0];
    keepMutation(run, best.id);
  }
  setGoal(run, opts.goal ?? goalIds[r.int(goalIds.length)]);
  sayWords(run, run.hand[r.int(run.hand.length)].id);
  leave(run);
  if (opts.dayByDay) while (run.phase === "away") advanceDay(run);
  else fastForward(run);
}

const POLICIES: Policy[] = [
  { name: "thoughtful", play: (run, r) => stopTurn(run, r, { fix: "smart", keep: true }) },
  { name: "random", play: (run, r) => stopTurn(run, r, { fix: "random", keep: false }) },
  { name: "absent", play: (run, r) => stopTurn(run, r, { fix: "none", keep: false }) },
  { name: "always-salvage", play: (run, r) => stopTurn(run, r, { fix: "smart", keep: false, goal: "salvage", dayByDay: true }) },
  { name: "thoughtful + persist parts", persist: true, play: (run, r) => stopTurn(run, r, { fix: "smart", keep: false }) },
  { name: "always-lie-low", play: (run, r) => stopTurn(run, r, { fix: "smart", keep: false, goal: "low" }) },
];

// ---------- invariants ----------
function check(run: Run, where: string) {
  const bad = (msg: string) => { throw new Error(`INVARIANT ${where} seed=${run.seed}: ${msg}`); };
  for (const k of ["scrap", "power", "smudge"] as const) if (!Number.isFinite(run[k]) || run[k] < 0) bad(`${k}=${run[k]}`);
  if (new Set(run.mutations.map((m) => m.id)).size !== run.mutations.length) bad("duplicate mutation");
  if (run.stop > STOPS) bad(`stop=${run.stop}`);
}

function playBargain(seed: number, policy: Policy) {
  const run = newRun(seed, null, { persistParts: !!policy.persist });
  const r = new Rng(seed ^ 0x9e3779b9);
  let guard = 0;
  while (run.phase !== "verdict") {
    policy.play(run, r);
    check(run, policy.name);
    if (++guard > 20) throw new Error(`INVARIANT no verdict after 20 turns seed=${seed} ${policy.name}`);
  }
  return run;
}

// determinism
for (const p of POLICIES) {
  const a = playBargain(424242, p), b = playBargain(424242, p);
  if (a.verdict!.why.id !== b.verdict!.why.id || a.verdict!.score !== b.verdict!.score || a.log.length !== b.log.length) {
    throw new Error(`INVARIANT determinism failed for ${p.name}`);
  }
}

// ---------- experience metrics ----------
const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] ?? NaN;
const jaccardDistance = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : 1 - inter / union;
};

const report: string[] = [`# Not Betsy prototype — smoke report`, "", `${RUNS} bargains per player style · placeholder content · ${new Date().toISOString().slice(0, 16)}`, ""];
const summary: Record<string, unknown> = {};
const whyUseAll = new Map<string, number>();

report.push(
  "| Player style | Archived | Deferred | Unclassifiable | Score p10 / p50 / p90 | Empty-handed landings | Could-solve landings | Solved stops | Dead weeks | Drift days | Tidies per run | Distinct whys | Top why share | ms/run |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
);

for (const p of POLICIES) {
  const bands = { archived: 0, deferred: 0, unclassifiable: 0 };
  const scores: number[] = [];
  let landings = 0, emptyLandings = 0, couldSolve = 0, solvedStops = 0, stops = 0;
  let absences = 0, deadWeeks = 0, driftDays = 0, tidies = 0;
  const whyUse = new Map<string, number>();
  const divergence: number[] = [];
  READ_SECONDS.length = 0;
  const t0 = performance.now();

  for (let i = 0; i < RUNS; i++) {
    const run = playBargain(1000 + i, p);
    const v = run.verdict!;
    bands[v.band]++;
    scores.push(v.score);
    whyUse.set(v.why.id, (whyUse.get(v.why.id) ?? 0) + 1);
    whyUseAll.set(v.why.id, (whyUseAll.get(v.why.id) ?? 0) + 1);

    // landings: what she arrived with
    for (const ids of run.history) {
      landings++;
      if (ids.length === 0) emptyLandings++;
    }
    for (let s = 1; s < run.history.length; s++) divergence.push(jaccardDistance(run.history[s - 1], run.history[s]));
    // per-stop outcomes from the ledger
    const landsAt = run.ledger.filter((e) => e.kind === "land");
    stops += landsAt.length;
    for (const land of landsAt) {
      const planetId = (land.detail as { planet: string }).planet;
      const planet = CONTENT.planets.find((x) => x.id === planetId)!;
      const idx = run.ledger.indexOf(land);
      const next = run.ledger.findIndex((e, j) => j > idx && e.kind === "leave");
      const slice = run.ledger.slice(idx, next === -1 ? undefined : next);
      if (slice.some((e) => e.kind === "fix" && (e.detail as { result: string }).result === "solved")) solvedStops++;
      const landIdx = landsAt.indexOf(land);
      const carried = run.history[landIdx] ?? [];
      if (carried.some((id) => CONTENT.mutations.find((m) => m.id === id)!.solves.includes(planet.need))) couldSolve++;
    }
    // absences: dead week = no bolt, stray, habit or tidy across the whole absence
    const leaves = run.ledger.map((e, j) => ({ e, j })).filter((x) => x.e.kind === "leave");
    for (const { j } of leaves) {
      absences++;
      const end = run.ledger.findIndex((e, k) => k > j && (e.kind === "land" || e.kind === "verdict"));
      const slice = run.ledger.slice(j, end === -1 ? undefined : end);
      if (!slice.some((e) => e.kind === "bolt" || e.kind === "tidy" || (e.kind === "encounter" && ["stray", "habit"].includes(e.detail as string)))) deadWeeks++;
      driftDays += slice.filter((e) => e.kind === "drift").length;
    }
    tidies += run.ledger.filter((e) => e.kind === "tidy").length;
  }

  scores.sort((a, b) => a - b);
  const q = (f: number) => scores[Math.floor(f * (scores.length - 1))];
  const topShare = Math.max(...whyUse.values()) / RUNS;
  const msPerRun = (performance.now() - t0) / RUNS;
  report.push(`| ${p.name} | ${pct(bands.archived, RUNS)} | ${pct(bands.deferred, RUNS)} | ${pct(bands.unclassifiable, RUNS)} | ${q(0.1)} / ${q(0.5)} / ${q(0.9)} | ${pct(emptyLandings, landings)} | ${pct(couldSolve, stops)} | ${pct(solvedStops, stops)} | ${pct(deadWeeks, absences)} | ${(driftDays / RUNS).toFixed(1)} | ${(tidies / RUNS).toFixed(1)} | ${whyUse.size} / ${CONTENT.whys.length} | ${pct(Math.round(topShare * 100), 100)} | ${msPerRun.toFixed(2)} |`);
  const reads = [...READ_SECONDS].sort((a, b) => a - b);
  const rq = (x: number) => Math.round(reads[Math.floor(x * (reads.length - 1))]);
  const over30 = reads.filter((x) => x > 30).length / Math.max(1, reads.length);
  summary[p.name] = { bands, score: { p10: q(0.1), p50: q(0.5), p90: q(0.9) }, divergenceMedian: median(divergence), reading: `median ${rq(0.5)} s · p90 ${rq(0.9)} s · max ${rq(1)} s · ${pct(Math.round(over30 * 100), 100)} of landings over 30 s` };
}

const never = CONTENT.whys.filter((w) => !whyUseAll.has(w.id));
const sortedWhys = [...whyUseAll.entries()].sort((a, b) => b[1] - a[1]);
const total = RUNS * POLICIES.length;
report.push(
  "",
  "## Whys",
  `- **Never chosen** (${never.length}): ${never.map((w) => `${w.id} (${w.verdict_band}/${w.register})`).join(", ") || "none"}`,
  `- **Most chosen:** ${sortedWhys.slice(0, 5).map(([id, n]) => `${id} ${pct(n, total)}`).join(" · ")}`,
  "",
  "## Divergence between consecutive landings (Jaccard distance of her parts; 1 = entirely different ship)",
  ...POLICIES.map((p) => `- ${p.name}: median ${(summary[p.name] as { divergenceMedian: number }).divergenceMedian.toFixed(2)}`),
  "",
  "## Reading load before the player can act (her log + landing entries + planet problem, at 200 wpm)",
  ...POLICIES.map((p) => `- ${p.name}: ${(summary[p.name] as { reading: string }).reading}`),
  "",
  "## Glossary",
  "- **Empty-handed landing:** she arrives with no parts, so Jame can't fix anything.",
  "- **Could-solve landing:** at least one part she brought matches the planet's need.",
  "- **Dead week:** a whole absence with no new part, stray, habit or Prestige tidy.",
  "- **Drift day:** power ran out; she waited and wondered.",
  `- **Target smudge** at the end of a bargain: ${targetSmudge({ stop: STOPS, day: 0 } as Run).toFixed(1)}`,
);

const outDir = join(import.meta.dir, "..", "reports");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `smoke-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`);
writeFileSync(file, report.join("\n"));
console.log(report.join("\n"));
console.log(`\ninvariants: PASS (non-negative resources, no duplicate parts, always reaches a verdict, deterministic)\nwrote ${file}`);
