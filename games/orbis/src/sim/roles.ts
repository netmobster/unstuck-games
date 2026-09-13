// Ported from lumina-orbits src/lib/orbis/roles.ts (sim-seconds instead of ms).
import type { Body } from "./types";
import { emit } from "./physics";
import type { World } from "./world";

const DRIFTER_MAX_MASS = 8;
const WANDERER_MAX_MASS = 40;
const ANCHOR_MIN_MASS = 40;
const ANCHOR_MAX_SPEED = 8;
const ANCHOR_STILL_SECONDS = 10;
const ELDER_MIN_AGE = 90;
const ELDER_MIN_MERGES = 4;

/** Drifter = small feedstock, Wanderer = fast disruptor, Anchor = settled well, Elder = long lineage (overrides). */
export function classifyArchetypes(bodies: Body[], t: number, dtSinceLastCall: number): void {
  const n = bodies.length;
  if (n === 0) return;
  const speeds = new Float64Array(n);
  for (let i = 0; i < n; i++) speeds[i] = Math.hypot(bodies[i].vx, bodies[i].vy);
  const median = Float64Array.from(speeds).sort()[n >> 1] || 0;
  const wandererSpeed = median * 1.5;

  for (let i = 0; i < n; i++) {
    const c = bodies[i];
    const speed = speeds[i];
    c.stillFor = c.mass >= ANCHOR_MIN_MASS && speed < ANCHOR_MAX_SPEED ? c.stillFor + dtSinceLastCall : 0;
    if (t - c.bornAt >= ELDER_MIN_AGE && c.mergeCount >= ELDER_MIN_MERGES) c.archetype = "elder";
    else if (c.mass < DRIFTER_MAX_MASS) c.archetype = "drifter";
    else if (c.mass >= ANCHOR_MIN_MASS && c.stillFor >= ANCHOR_STILL_SECONDS) c.archetype = "anchor";
    else if (c.mass < WANDERER_MAX_MASS && speed > wandererSpeed) c.archetype = "wanderer";
    else c.archetype = undefined;
  }
}

const BIND_SECONDS = 20;
const BIND_RADIUS_MULT = 1.2;
const VARIANCE_TOLERANCE = 0.15;
const SAMPLE_WINDOW = 30;

export type PairState = { samples: number[]; firstSeen: number; lastSeen: number };

/** Two similar-mass bodies in close, low-variance orbit for BIND_SECONDS become a binary. */
export function stepBinaries(world: World): void {
  const { bodies, t } = world;
  const pairs = world.binaryPairs;
  const byId = new Map<number, Body>();
  for (const c of bodies) byId.set(c.id, c);
  const seen = new Set<string>();

  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (a.binaryWith != null && a.binaryWith !== b.id) continue;
      if (b.binaryWith != null && b.binaryWith !== a.id) continue;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > (a.radius + b.radius) * BIND_RADIUS_MULT * 2) continue;
      if (Math.min(a.mass, b.mass) / Math.max(a.mass, b.mass) < 0.33) continue;
      const k = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
      seen.add(k);
      let st = pairs.get(k);
      if (!st) pairs.set(k, (st = { samples: [], firstSeen: t, lastSeen: t }));
      st.lastSeen = t;
      st.samples.push(d);
      if (st.samples.length > SAMPLE_WINDOW) st.samples.shift();

      if (a.binaryWith == null && b.binaryWith == null && t - st.firstSeen >= BIND_SECONDS && st.samples.length >= SAMPLE_WINDOW) {
        const mean = st.samples.reduce((s, v) => s + v, 0) / st.samples.length;
        let varSum = 0;
        for (const v of st.samples) varSum += (v - mean) ** 2;
        const cv = mean > 0 ? Math.sqrt(varSum / st.samples.length) / mean : 1;
        if (cv < VARIANCE_TOLERANCE) {
          a.binaryWith = b.id;
          b.binaryWith = a.id;
          a.binarySince = t;
          b.binarySince = t;
          emit(world, "binary", (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      }
    }
  }

  for (const [k, st] of pairs) if (!seen.has(k) && t - st.lastSeen > 1) pairs.delete(k);
  for (const c of bodies) {
    if (c.binaryWith != null && !byId.has(c.binaryWith)) {
      c.binaryWith = undefined;
      c.binarySince = undefined;
    }
  }
}
