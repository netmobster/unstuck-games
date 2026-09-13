// The two free-player dials, defined by causal role (see RULES.md).
// PROVISIONAL mappings — the sweep decides whether each dial is perceptible.
import { DEFAULT_CONFIG, type SimConfig } from "./types";

export type Conditions = {
  /** ENVIRONMENT — the space itself. 0 = still, 1 = stormy. */
  environment: number;
  /** RELATIONSHIPS — how bodies treat each other. 0 = aloof, 1 = clingy. */
  affinity: number;
};

export const DEFAULT_CONDITIONS: Conditions = { environment: 0.5, affinity: 0.5 };

/** Piecewise-linear so the dial's midpoint is exactly the original Orbis value. */
const dial = (v: number, lo: number, mid: number, hi: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x < 0.5 ? lo + (mid - lo) * (x / 0.5) : mid + (hi - mid) * ((x - 0.5) / 0.5);
};

export function configFor(c: Conditions, base: SimConfig = DEFAULT_CONFIG): SimConfig {
  return {
    ...base,
    // environment: friction, how often the sky does something, arrivals
    // sweep 1: still end (0.18 / 0.998 / 60 / 150) stagnated 100% by ~2min; stormy end (8 / 15) was 100% soup
    // sweep 2: (0.26 / 0.9992 / 36 / 100) still stagnated 60% at ~6min; (0.6 / 12 / 40) soup 30–60%
    damping: dial(c.environment, 0.9994, base.damping, 1.0),
    autoChaosInterval: dial(c.environment, 30, base.autoChaosInterval, 15),
    spawnInterval: dial(c.environment, 90, base.spawnInterval, 55),
    // affinity: how hard bodies pull on each other, who sticks instead of bouncing, how much contact it takes to fuse
    // sweep 3: aloof end (0.9 / 80) → 0.2 merges/min, 30–50% stagnation
    // causal probe 1: sticky + merge alone → aloof changed nothing in 60s. Gravity moved here from environment.
    // causal probe 2: G 0.2 at aloof still ~0% change → aloof end is gentle mutual repulsion
    G: dial(c.affinity, -0.12, base.G, 0.6),
    stickyRatio: dial(c.affinity, 0.78, base.stickyRatio, 0.3),
    mergeThreshold: dial(c.affinity, 48, base.mergeThreshold, 12),
  };
}
