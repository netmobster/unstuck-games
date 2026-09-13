// The deterministic Orbis world: same seed + same inputs → same world.
// Ported orchestration from lumina-orbits OrbisCanvas.tsx (auto-chaos, chaos
// agents, singularity state machine, population cap, archetypes, binaries).
import { Rng } from "./rng";
import { DEFAULT_CONFIG, type Body, type BodyColor, type SimConfig, type SimEvent } from "./types";
import {
  emit, ejectFragments, enforcePopulationCap, fusionCascade, physicsStep, seedBodies,
  spawnAsteroidBurst, spawnComet, spawnFromEdge, triggerSupernova,
} from "./physics";
import { classifyArchetypes, stepBinaries, type PairState } from "./roles";

/** Fixed step: the original ran 60Hz frames at 1.2× wall-clock. */
export const SIM_DT = 0.02;
const ROLES_EVERY = 30;

export const CHAOS_IDS = [
  "supernova", "blackhole", "pulse", "storm", "comet",
  "inversion", "shatter", "coalesce", "fusion", "singularity",
] as const;
export type ChaosId = (typeof CHAOS_IDS)[number];

const AUTO_CHAOS_POOL: { id: ChaosId; weight: number }[] = [
  { id: "storm", weight: 3 },
  { id: "comet", weight: 3 },
  { id: "pulse", weight: 3 },
  { id: "shatter", weight: 3 },
  { id: "coalesce", weight: 3 },
  { id: "supernova", weight: 1 },
  { id: "blackhole", weight: 1 },
  { id: "fusion", weight: 2 },
  { id: "inversion", weight: 1 },
  { id: "singularity", weight: 1 },
];
const SPAWN_AGENTS = new Set<ChaosId>(["storm", "comet", "shatter"]);
const COLLAPSE_AGENTS = new Set<ChaosId>(["fusion", "singularity", "blackhole"]);

export type Singularity = {
  x: number;
  y: number;
  absorbed: number;
  color: BodyColor;
  phase: "charge" | "suck";
  chargeUntil: number;
  suckUntil: number;
};

export type World = {
  seed: number;
  rng: Rng;
  t: number;
  steps: number;
  w: number;
  h: number;
  cfg: SimConfig;
  bodies: Body[];
  nextId: number;
  events: SimEvent[];
  effects: {
    gravityPulseUntil: number;
    inversionUntil: number;
    blackHoleUntil: number;
    blackHole: { x: number; y: number } | null;
    shatterUntil: number;
    coalesceUntil: number;
  };
  singularity: Singularity | null;
  spawnAcc: number;
  nextAutoChaosAt: number;
  /** false = auto-chaos off (debug / tests) */
  autoChaos: boolean;
  /** sim-times of queued asteroid bursts */
  pendingStorm: number[];
  binaryPairs: Map<string, PairState>;
};

export function createWorld(opts: { seed: number; w: number; h: number; cfg?: Partial<SimConfig>; autoChaos?: boolean }): World {
  const world: World = {
    seed: opts.seed,
    rng: new Rng(opts.seed),
    t: 0,
    steps: 0,
    w: opts.w,
    h: opts.h,
    cfg: { ...DEFAULT_CONFIG, ...opts.cfg },
    bodies: [],
    nextId: 1,
    events: [],
    effects: { gravityPulseUntil: 0, inversionUntil: 0, blackHoleUntil: 0, blackHole: null, shatterUntil: 0, coalesceUntil: 0 },
    singularity: null,
    spawnAcc: 0,
    nextAutoChaosAt: 0,
    autoChaos: opts.autoChaos ?? true,
    pendingStorm: [],
    binaryPairs: new Map(),
  };
  world.bodies = seedBodies(world);
  return world;
}

/** Advance exactly one fixed step. Events accumulate in world.events until drained. */
export function tick(world: World): void {
  const dt = SIM_DT;
  const { cfg } = world;

  world.spawnAcc += dt;
  if (world.spawnAcc >= cfg.spawnInterval) {
    world.spawnAcc = 0;
    const b = spawnFromEdge(world);
    world.bodies.push(b);
    emit(world, "spawn", b.x, b.y);
  }

  world.t += dt;
  world.steps++;
  const t = world.t;

  if (world.autoChaos) {
    if (world.nextAutoChaosAt === 0) world.nextAutoChaosAt = t + cfg.autoChaosInterval;
    if (t >= world.nextAutoChaosAt) {
      fireChaos(world, pickAutoChaos(world));
      const interval = cfg.autoChaosInterval;
      world.nextAutoChaosAt = t + interval + (world.rng.next() * 0.4 - 0.2) * interval;
    }
  }

  while (world.pendingStorm.length && world.pendingStorm[0] <= t) {
    world.pendingStorm.shift();
    for (const b of spawnAsteroidBurst(world, 5)) world.bodies.push(b);
  }

  // mass safety valve — runaway megabodies collapse into a singularity
  if (!world.singularity) {
    for (const c of world.bodies) {
      if (c.mass >= cfg.singularityMass) {
        fireChaos(world, "singularity");
        break;
      }
    }
  }

  const fx = world.effects;
  const sing = world.singularity;
  let extraAttractor: { x: number; y: number; mass: number } | null = null;
  if (sing && sing.phase === "suck" && t < sing.suckUntil) {
    extraAttractor = { x: sing.x, y: sing.y, mass: Math.max(300, sing.absorbed * 1.5) };
  } else if (t < fx.blackHoleUntil && fx.blackHole) {
    extraAttractor = { x: fx.blackHole.x, y: fx.blackHole.y, mass: 1040 };
  }

  physicsStep(world, dt, {
    gravityMultiplier: t < fx.gravityPulseUntil ? 6.5 : 1,
    gravitySign: t < fx.inversionUntil ? -1 : 1,
    extraAttractor,
    shatterActive: t < fx.shatterUntil,
    coalesceActive: t < fx.coalesceUntil,
  });

  if (world.bodies.length > cfg.maxBodies) enforcePopulationCap(world);

  if (world.steps % ROLES_EVERY === 0) {
    classifyArchetypes(world.bodies, t, ROLES_EVERY * dt);
    stepBinaries(world);
  }

  if (sing) stepSingularity(world, sing);
}

function stepSingularity(world: World, sing: Singularity) {
  const t = world.t;
  if (sing.phase === "charge" && t >= sing.chargeUntil) {
    sing.phase = "suck";
    sing.suckUntil = t + 2.5;
  }
  if (sing.phase !== "suck") return;
  const kept: Body[] = [];
  for (const c of world.bodies) {
    if (Math.hypot(c.x - sing.x, c.y - sing.y) < 30) sing.absorbed += c.mass;
    else kept.push(c);
  }
  if (kept.length !== world.bodies.length) world.bodies = kept;
  if (t >= sing.suckUntil) {
    const n = Math.max(8, Math.min(24, Math.round(sing.absorbed / 8)));
    for (const f of ejectFragments(world, sing.x, sing.y, sing.absorbed * 0.9, n, sing.color)) world.bodies.push(f);
    emit(world, "singularity-burst", sing.x, sing.y);
    world.singularity = null;
  }
}

function pickAutoChaos(world: World): ChaosId {
  const crowded = world.bodies.length > world.cfg.maxBodies * 0.85;
  const pool = AUTO_CHAOS_POOL.map((p) => {
    if (crowded && SPAWN_AGENTS.has(p.id)) return { ...p, weight: 0 };
    if (crowded && COLLAPSE_AGENTS.has(p.id)) return { ...p, weight: p.weight * 3 };
    return p;
  });
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = world.rng.next() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p.id;
  }
  return pool[0].id;
}

/**
 * Fire a chaos agent. Auto-chaos uses this; God Mode will too.
 * Returns false when the agent had nothing to act on (e.g. no body big enough).
 */
export function fireChaos(world: World, id: ChaosId): boolean {
  const { w, h, t } = world;
  const fx = world.effects;
  switch (id) {
    case "supernova":
      if (!triggerSupernova(world)) return false;
      break;
    case "blackhole":
      fx.blackHole = { x: w / 2, y: h / 2 };
      fx.blackHoleUntil = t + 3.9;
      break;
    case "pulse":
      fx.gravityPulseUntil = t + 2.6;
      break;
    case "storm":
      for (const b of spawnAsteroidBurst(world, 5)) world.bodies.push(b);
      world.pendingStorm.push(t + 0.4, t + 0.8);
      break;
    case "comet":
      world.bodies.push(spawnComet(world));
      break;
    case "inversion":
      fx.inversionUntil = t + 2;
      break;
    case "shatter":
      fx.shatterUntil = t + 4;
      break;
    case "coalesce":
      fx.coalesceUntil = t + 6;
      break;
    case "fusion": {
      const before = world.bodies.length;
      world.bodies = fusionCascade(world, world.bodies);
      if (world.bodies.length === before) return false;
      break;
    }
    case "singularity": {
      if (world.singularity) return false;
      let big: Body | null = null;
      for (const c of world.bodies) if (!big || c.mass > big.mass) big = c;
      if (!big || big.mass < 60) return false;
      world.singularity = {
        x: big.x, y: big.y, absorbed: big.mass, color: big.color,
        phase: "charge", chargeUntil: t + 1.5, suckUntil: t + 4,
      };
      const gone = big.id;
      world.bodies = world.bodies.filter((c) => c.id !== gone);
      emit(world, "singularity-charge", big.x, big.y);
      break;
    }
  }
  emit(world, "chaos", w / 2, h / 2, id);
  return true;
}

export function drainEvents(world: World): SimEvent[] {
  const out = world.events;
  world.events = [];
  return out;
}

/** Order-sensitive digest of world state — equal digests ⇒ identical replay. */
export function digest(world: World): string {
  let hsh = 2166136261;
  const mix = (v: number) => {
    hsh ^= Math.round(v * 1000) | 0;
    hsh = Math.imul(hsh, 16777619);
  };
  mix(world.t);
  mix(world.bodies.length);
  for (const c of world.bodies) {
    mix(c.id); mix(c.x); mix(c.y); mix(c.vx); mix(c.vy); mix(c.mass);
  }
  return (hsh >>> 0).toString(16);
}
