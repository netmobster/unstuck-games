// Experience metrics. Never pass/fail — these describe the distribution of states.
// Thresholds are PROVISIONAL and live here so they can be argued about in one place.
import { configFor, type Conditions } from "./conditions";
import { createWorld, drainEvents, tick, SIM_DT, type World } from "./world";
import type { SimEventKind } from "./types";

export const THRESHOLDS = {
  /** a second is "quiet" with no merge/shatter/fusion/chaos/binary and mean speed below this */
  quietSpeed: 12,
  /** this many consecutive quiet seconds = stagnation */
  stagnationSeconds: 60,
  /** body count at or above cap × this = soup */
  soupFraction: 0.85,
  /** largest body holding at least this share of total mass = runaway clustering */
  runawayShare: 0.6,
  /** at or below this many bodies = visually dead */
  deadCount: 3,
};

const LIVELY: SimEventKind[] = ["merge", "shatter", "fusion", "chaos", "binary", "supernova", "singularity-burst"];
const SURPRISE: SimEventKind[] = ["supernova", "singularity-burst", "shatter", "fusion", "binary"];

export type Moment = { t: number; what: string };

export type RunReport = {
  seed: number;
  conditions: Conditions;
  minutes: number;
  extinctAt: number | null;
  visuallyDeadSeconds: number;
  stagnationPeriods: number;
  longestStagnation: number;
  soupSeconds: number;
  runawaySeconds: number;
  firstSurpriseAt: number | null;
  eventsPerMinute: Partial<Record<SimEventKind, number>>;
  meanCount: number;
  maxCount: number;
  meanSpeed: number;
  /** max merges inside any 10s window */
  biggestCascade: number;
  msPerStep: number;
  moments: Moment[];
};

export type Sample = { t: number; count: number; meanSpeed: number; largestShare: number; lively: number };

export function sample(world: World, lively: number): Sample {
  const b = world.bodies;
  let speed = 0, mass = 0, largest = 0;
  for (const c of b) {
    speed += Math.hypot(c.vx, c.vy);
    mass += c.mass;
    if (c.mass > largest) largest = c.mass;
  }
  return {
    t: world.t,
    count: b.length,
    meanSpeed: b.length ? speed / b.length : 0,
    largestShare: mass > 0 ? largest / mass : 0,
    lively,
  };
}

/**
 * Run one seed headless. `onSecond` lets callers intervene at a sim-time
 * (the causality probe changes conditions mid-run).
 */
export function runSeed(opts: {
  seed: number;
  conditions: Conditions;
  minutes: number;
  w?: number;
  h?: number;
  onSecond?: (world: World, second: number) => void;
}): { report: RunReport; samples: Sample[] } {
  const world = createWorld({ seed: opts.seed, w: opts.w ?? 1280, h: opts.h ?? 800, cfg: configFor(opts.conditions) });
  const stepsPerSecond = Math.round(1 / SIM_DT);
  const totalSeconds = Math.round(opts.minutes * 60);
  const counts: Partial<Record<SimEventKind, number>> = {};
  const mergesPerSecond: number[] = [];
  const samples: Sample[] = [];
  const moments: Moment[] = [];
  let extinctAt: number | null = null;
  let firstSurpriseAt: number | null = null;
  let quietRun = 0, stagnationPeriods = 0, longestStagnation = 0;
  let soup = 0, runaway = 0, dead = 0;
  let sumCount = 0, maxCount = 0, sumSpeed = 0;
  const started = performance.now();

  for (let s = 0; s < totalSeconds; s++) {
    opts.onSecond?.(world, s);
    let lively = 0, merges = 0;
    for (let k = 0; k < stepsPerSecond; k++) {
      tick(world);
      for (const e of drainEvents(world)) {
        counts[e.kind] = (counts[e.kind] ?? 0) + 1;
        if (LIVELY.includes(e.kind)) lively++;
        if (e.kind === "merge") merges++;
        if (firstSurpriseAt === null && SURPRISE.includes(e.kind)) {
          firstSurpriseAt = e.t;
          moments.push({ t: e.t, what: `first surprise: ${e.kind}` });
        }
        if (e.kind === "singularity-burst" || e.kind === "supernova") moments.push({ t: e.t, what: e.kind });
      }
    }
    mergesPerSecond.push(merges);
    const smp = sample(world, lively);
    samples.push(smp);
    sumCount += smp.count;
    sumSpeed += smp.meanSpeed;
    if (smp.count > maxCount) maxCount = smp.count;
    if (smp.count === 0 && extinctAt === null) {
      extinctAt = smp.t;
      moments.push({ t: smp.t, what: "extinct" });
    }
    if (smp.count <= THRESHOLDS.deadCount) dead++;
    if (smp.count >= world.cfg.maxBodies * THRESHOLDS.soupFraction) soup++;
    if (smp.largestShare >= THRESHOLDS.runawayShare) runaway++;

    const quiet = lively === 0 && smp.meanSpeed < THRESHOLDS.quietSpeed;
    if (quiet) {
      quietRun++;
    } else {
      if (quietRun >= THRESHOLDS.stagnationSeconds) {
        stagnationPeriods++;
        moments.push({ t: smp.t - quietRun, what: `stagnated ${quietRun}s` });
      }
      longestStagnation = Math.max(longestStagnation, quietRun);
      quietRun = 0;
    }
  }
  if (quietRun >= THRESHOLDS.stagnationSeconds) {
    stagnationPeriods++;
    moments.push({ t: world.t - quietRun, what: `stagnated ${quietRun}s (to end)` });
  }
  longestStagnation = Math.max(longestStagnation, quietRun);

  let biggestCascade = 0, win = 0;
  for (let i = 0; i < mergesPerSecond.length; i++) {
    win += mergesPerSecond[i];
    if (i >= 10) win -= mergesPerSecond[i - 10];
    if (win > biggestCascade) biggestCascade = win;
  }

  const eventsPerMinute: Partial<Record<SimEventKind, number>> = {};
  for (const [k, v] of Object.entries(counts)) eventsPerMinute[k as SimEventKind] = +(v! / opts.minutes).toFixed(2);

  return {
    samples,
    report: {
      seed: opts.seed,
      conditions: opts.conditions,
      minutes: opts.minutes,
      extinctAt,
      visuallyDeadSeconds: dead,
      stagnationPeriods,
      longestStagnation,
      soupSeconds: soup,
      runawaySeconds: runaway,
      firstSurpriseAt,
      eventsPerMinute,
      meanCount: +(sumCount / totalSeconds).toFixed(1),
      maxCount,
      meanSpeed: +(sumSpeed / totalSeconds).toFixed(2),
      biggestCascade,
      msPerStep: +((performance.now() - started) / world.steps).toFixed(4),
      moments,
    },
  };
}
