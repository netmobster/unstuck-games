export type BodyColor = { core: string; shadow: string };

export type Archetype = "drifter" | "wanderer" | "anchor" | "elder";

/** All times are sim-seconds (world.t), never wall-clock. */
export type Body = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** previous-step position — renderer draws one trail segment px,py → x,y */
  px: number;
  py: number;
  mass: number;
  /** cached radiusOf(mass) — recompute on mass change */
  radius: number;
  color: BodyColor;
  /** cached "r,g,b" of color.core */
  rgb: string;
  flashUntil: number;
  /** ids touching at sticky ratio this step; rebuilt every step */
  sticky: Set<number>;
  bornAt: number;
  mergeCount: number;
  /** sim-seconds spent heavy and slow (anchor classification) */
  stillFor: number;
  archetype?: Archetype;
  binaryWith?: number;
  binarySince?: number;
};

export type SimConfig = {
  /** gravitational constant */
  G: number;
  /** per-60Hz-frame velocity retention */
  damping: number;
  /** combined mass at which touching sticky bodies fuse */
  mergeThreshold: number;
  /** smaller/larger mass ratio at or above which touching bodies stick instead of bounce */
  stickyRatio: number;
  /** sim-seconds between edge spawns */
  spawnInterval: number;
  /** cap on pairwise force */
  maxForce: number;
  /** mean sim-seconds between auto-fired chaos agents */
  autoChaosInterval: number;
  /** hard population cap; exceeding it collapses bodies into bigger ones */
  maxBodies: number;
  /** any body at or above this mass collapses into a singularity */
  singularityMass: number;
};

/** Orbis "orbit" preset — the defaults the live game shipped with. */
export const DEFAULT_CONFIG: SimConfig = {
  G: 0.35,
  damping: 0.9995,
  mergeThreshold: 30,
  stickyRatio: 0.6,
  spawnInterval: 75,
  maxForce: 120,
  autoChaosInterval: 20,
  maxBodies: 220,
  singularityMass: 250,
};

export const radiusOf = (mass: number) => Math.sqrt(mass) * 4;

export type SimEventKind =
  | "spawn"
  | "merge"
  | "collision"
  | "shatter"
  | "fusion"
  | "accretion"
  | "binary"
  | "supernova"
  | "singularity-charge"
  | "singularity-burst"
  | "chaos";

/** Emitted by the sim instead of DOM events. Renderer maps these to pulses + SFX; sweep counts them. */
export type SimEvent = { t: number; kind: SimEventKind; x: number; y: number; detail?: string };
