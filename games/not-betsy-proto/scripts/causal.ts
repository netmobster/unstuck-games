// CAUSALITY PROBE (lifted from Orbis's sweep --causal): do Jame's choices visibly change what she does?
// Twin runs share a seed and every choice except ONE, made at the first stop. We compare what happened
// during that first absence and at the verdict.
//   bun run scripts/causal.ts --runs 2000
import { CONTENT, GOALS, advanceDay, fixWith, leave, newRun, sayWords, setGoal, type GoalId, type Run } from "../src/sim";

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf("--runs") + 1]) || 2000;
const goals = Object.keys(GOALS) as GoalId[];

type Choice = { goal: GoalId; wordsIdx: number };

/** Play one bargain. The first stop uses `first`; later stops use fixed default choices so only the first differs. */
function play(seed: number, first: Choice) {
  const run = newRun(seed);
  let stop = 0;
  const firstAbsence: string[] = [];
  const encounters: Record<string, number> = {};
  while (run.phase !== "verdict") {
    const fit = run.mutations.find((m) => m.solves.includes(run.planet.need));
    if (fit) fixWith(run, fit.id);
    const c = stop === 0 ? first : { goal: "salvage" as GoalId, wordsIdx: 0 };
    setGoal(run, c.goal);
    sayWords(run, run.hand[c.wordsIdx % run.hand.length].id);
    const logStart = run.ledger.length;
    leave(run);
    while (run.phase === "away") advanceDay(run);
    if (stop === 0) {
      for (const e of run.ledger.slice(logStart)) {
        if (e.kind === "bolt") firstAbsence.push((e.detail as { id: string }).id);
        if (e.kind === "encounter") encounters[e.detail as string] = (encounters[e.detail as string] ?? 0) + 1;
      }
    }
    stop++;
  }
  return { run, firstAbsence, encounters };
}

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : 1 - [...A].filter((x) => B.has(x)).length / union;
};
const encDistance = (a: Record<string, number>, b: Record<string, number>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let d = 0;
  for (const k of keys) d += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return d / 2; // number of the 7 days that went differently
};
const median = (xs: number[]) => [...xs].sort((x, y) => x - y)[xs.length >> 1];
const pct = (n: number) => `${Math.round(n * 100)}%`;

function probe(label: string, a: Choice, b: Choice) {
  const parts: number[] = [], days: number[] = [], verdictDiff: number[] = [];
  let bandChanged = 0, whyChanged = 0;
  for (let i = 0; i < RUNS; i++) {
    const seed = 5000 + i;
    const x = play(seed, a), y = play(seed, b);
    parts.push(jaccard(x.firstAbsence, y.firstAbsence));
    days.push(encDistance(x.encounters, y.encounters));
    verdictDiff.push(Math.abs(x.run.verdict!.score - y.run.verdict!.score));
    if (x.run.verdict!.band !== y.run.verdict!.band) bandChanged++;
    if (x.run.verdict!.why.id !== y.run.verdict!.why.id) whyChanged++;
  }
  return `| ${label} | ${median(parts).toFixed(2)} | ${median(days)} of 7 | ${median(verdictDiff)} | ${pct(bandChanged / RUNS)} | ${pct(whyChanged / RUNS)} |`;
}

const rows = [
  // same goal, different last words (same hand, different card)
  probe("Last words: card 1 vs card 2 (goal fixed)", { goal: "salvage", wordsIdx: 0 }, { goal: "salvage", wordsIdx: 1 }),
  probe("Last words: card 1 vs card 3 (goal fixed)", { goal: "salvage", wordsIdx: 0 }, { goal: "salvage", wordsIdx: 2 }),
  // same words, different goals
  probe("Goal: salvage vs keep your head down", { goal: "salvage", wordsIdx: 0 }, { goal: "low", wordsIdx: 0 }),
  probe("Goal: salvage vs find crew", { goal: "salvage", wordsIdx: 0 }, { goal: "crew", wordsIdx: 0 }),
  // control: identical choices (should be all zeros — proves determinism)
  probe("Control: identical choices", { goal: "salvage", wordsIdx: 0 }, { goal: "salvage", wordsIdx: 0 }),
];

const out = [
  `## Causality probe — ${RUNS} twin bargains per row`,
  "",
  "Twins share a seed and every choice except one, made at the first stop.",
  "",
  "| One different choice | Parts she came back with (distance, 1 = all different) | Days of the week that went differently (median) | Verdict score change (median) | Verdict band changed | Why changed |",
  "|---|---|---|---|---|---|",
  ...rows,
  "",
  `Note: the whole run shares one RNG stream, so any choice that changes what's rolled also reshuffles everything after it. "Why changed" partly measures that butterfly effect, not only the choice itself.`,
];
console.log(out.join("\n"));
void CONTENT;
