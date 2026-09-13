// Ported from lumina-orbits src/lib/orbis/sim.ts. Behaviour preserved; changes:
// seeded rng, sim-time instead of performance.now(), events instead of DOM
// CustomEvents, collision-free grid keys, enemy/infection code removed.
import { blendColor, randomPaletteColor, rgbOf } from "./palette";
import { radiusOf, type Body, type BodyColor, type SimEventKind } from "./types";
import type { World } from "./world";

export type StepOpts = {
  gravityMultiplier: number;
  /** -1 = repulsive */
  gravitySign: number;
  extraAttractor: { x: number; y: number; mass: number } | null;
  /** high-velocity crashes between big bodies shatter both */
  shatterActive: boolean;
  /** small-vs-small pairs merge at half threshold */
  coalesceActive: boolean;
};

const MIN_DIST = 4;

export function emit(world: World, kind: SimEventKind, x: number, y: number, detail?: string) {
  world.events.push({ t: world.t, kind, x, y, detail });
}

export function makeBody(
  world: World,
  o: { x: number; y: number; mass: number; vx?: number; vy?: number; color?: BodyColor; flashFor?: number },
): Body {
  const color = o.color ?? randomPaletteColor(world.rng);
  return {
    id: world.nextId++,
    x: o.x,
    y: o.y,
    px: o.x,
    py: o.y,
    vx: o.vx ?? 0,
    vy: o.vy ?? 0,
    mass: o.mass,
    radius: radiusOf(o.mass),
    color,
    rgb: rgbOf(color.core),
    flashUntil: o.flashFor ? world.t + o.flashFor : 0,
    sticky: new Set(),
    bornAt: world.t,
    mergeCount: 0,
    stillFor: 0,
  };
}

export function seedBodies(world: World): Body[] {
  const { rng, w, h, cfg } = world;
  const n = 8 + rng.int(5);
  const out: Body[] = [];
  for (let i = 0; i < n; i++) {
    out.push(makeBody(world, { x: 80 + rng.next() * (w - 160), y: 80 + rng.next() * (h - 160), mass: 3 + rng.next() * 55 }));
  }
  // velocity perpendicular to direction from center
  const cx = w / 2, cy = h / 2;
  for (const c of out) {
    const dx = c.x - cx, dy = c.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    // |G|: the Aloof dial makes G negative, and a repulsive world still needs starting motion
    const orbitalSpeed = Math.sqrt((Math.abs(cfg.G) * 30 * 8) / dist) * 60;
    const dir = rng.next() > 0.5 ? 1 : -1;
    c.vx = (-dy / dist) * orbitalSpeed * dir + rng.centered() * 5;
    c.vy = (dx / dist) * orbitalSpeed * dir + rng.centered() * 5;
  }
  return out;
}

function edgePoint(world: World) {
  const { rng, w, h } = world;
  const side = rng.int(4);
  if (side === 0) return { x: rng.next() * w, y: 10 };
  if (side === 1) return { x: w - 10, y: rng.next() * h };
  if (side === 2) return { x: rng.next() * w, y: h - 10 };
  return { x: 10, y: rng.next() * h };
}

export function spawnFromEdge(world: World): Body {
  const { rng, w, h } = world;
  const { x, y } = edgePoint(world);
  const dx = w / 2 - x, dy = h / 2 - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 15 + rng.next() * 10;
  const jitter = 0.4;
  return makeBody(world, {
    x,
    y,
    vx: (dx / len) * speed + rng.centered() * speed * jitter,
    vy: (dy / len) * speed + rng.centered() * speed * jitter,
    mass: 5 + rng.next() * 7,
  });
}

export function spawnComet(world: World): Body {
  const { rng, w, h } = world;
  const { x, y } = edgePoint(world);
  const tx = w / 2 + rng.centered() * w * 0.4;
  const ty = h / 2 + rng.centered() * h * 0.4;
  const dx = tx - x, dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 180 + rng.next() * 60;
  return makeBody(world, { x, y, vx: (dx / len) * speed, vy: (dy / len) * speed, mass: 25 + rng.next() * 20, flashFor: 0.4 });
}

/** One burst of small fast bodies from the edges. */
export function spawnAsteroidBurst(world: World, n: number): Body[] {
  const out: Body[] = [];
  for (let i = 0; i < n; i++) {
    const c = spawnFromEdge(world);
    c.vx *= 2.5;
    c.vy *= 2.5;
    c.mass = 2 + world.rng.next() * 3;
    c.radius = radiusOf(c.mass);
    out.push(c);
  }
  return out;
}

/** Uniform-grid broad phase. Keys are exact (no hash collisions → no double-visited buckets). */
function buildGrid(bodies: Body[]) {
  const n = bodies.length;
  let maxR = 8;
  for (let i = 0; i < n; i++) if (bodies[i].radius > maxR) maxR = bodies[i].radius;
  const cell = Math.max(32, maxR * 4);
  const buckets = new Map<number, number[]>();
  const coords = new Int32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(bodies[i].x / cell);
    const cy = Math.floor(bodies[i].y / cell);
    coords[i * 2] = cx;
    coords[i * 2 + 1] = cy;
    const k = cellKey(cx, cy);
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = []));
    b.push(i);
  }
  return { buckets, coords };
}

const cellKey = (cx: number, cy: number) => cx * 65536 + cy;

export function physicsStep(world: World, dt: number, opts: StepOpts): void {
  const { cfg, rng, w, h } = world;
  const bodies = world.bodies;
  const n = bodies.length;
  const Geff = cfg.G * opts.gravityMultiplier * opts.gravitySign;

  for (let i = 0; i < n; i++) bodies[i].sticky.clear();

  // forces (neighbouring cells only, as in the original)
  const g1 = buildGrid(bodies);
  for (let i = 0; i < n; i++) {
    const cx = g1.coords[i * 2], cy = g1.coords[i * 2 + 1];
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = g1.buckets.get(cellKey(cx + ox, cy + oy));
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const j = bucket[k];
          if (j <= i) continue;
          const a = bodies[i], b = bodies[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = Math.max(dx * dx + dy * dy, MIN_DIST * MIN_DIST);
          const d = Math.sqrt(d2);
          let f = (Geff * a.mass * b.mass) / d2;
          if (f > cfg.maxForce) f = cfg.maxForce;
          else if (f < -cfg.maxForce) f = -cfg.maxForce;
          const fx = (f * dx) / d, fy = (f * dy) / d;
          a.vx += (fx / a.mass) * dt;
          a.vy += (fy / a.mass) * dt;
          b.vx -= (fx / b.mass) * dt;
          b.vy -= (fy / b.mass) * dt;
        }
      }
    }
  }

  // extra attractor (black hole / singularity) — always attractive
  const att = opts.extraAttractor;
  if (att) {
    const Gatt = cfg.G * opts.gravityMultiplier;
    for (let i = 0; i < n; i++) {
      const c = bodies[i];
      const dx = att.x - c.x, dy = att.y - c.y;
      const d2 = Math.max(dx * dx + dy * dy, MIN_DIST * MIN_DIST);
      const d = Math.sqrt(d2);
      let f = (Gatt * att.mass * c.mass) / d2;
      if (f > cfg.maxForce * 4) f = cfg.maxForce * 4;
      c.vx += ((f * dx) / d / c.mass) * dt;
      c.vy += ((f * dy) / d / c.mass) * dt;
    }
  }

  // integrate + damping + edges
  const dampPerFrame = Math.pow(cfg.damping, dt * 60);
  for (let i = 0; i < n; i++) {
    const c = bodies[i];
    c.vx *= dampPerFrame;
    c.vy *= dampPerFrame;
    // soft random kick when nearly still
    if (Math.hypot(c.vx, c.vy) < 2) {
      c.vx += rng.centered() * 8;
      c.vy += rng.centered() * 8;
    }
    // mass-based speed cap — big lumbers, small zips
    const maxSpeed = 80 / Math.sqrt(c.mass);
    const spd = Math.hypot(c.vx, c.vy);
    if (spd > maxSpeed) {
      c.vx = (c.vx / spd) * maxSpeed;
      c.vy = (c.vy / spd) * maxSpeed;
    }
    c.px = c.x;
    c.py = c.y;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const r = c.radius;
    if (c.x < r) { c.x = r; c.vx = -c.vx * 0.7; }
    else if (c.x > w - r) { c.x = w - r; c.vx = -c.vx * 0.7; }
    if (c.y < r) { c.y = r; c.vy = -c.vy * 0.7; }
    else if (c.y > h - r) { c.y = h - r; c.vy = -c.vy * 0.7; }
  }

  // collisions
  const removed = new Set<number>();
  const added: Body[] = [];
  const g2 = buildGrid(bodies);
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    if (removed.has(a.id)) continue;
    const cx = g2.coords[i * 2], cy = g2.coords[i * 2 + 1];
    let consumed = false;
    for (let ox = -1; ox <= 1 && !consumed; ox++) {
      for (let oy = -1; oy <= 1 && !consumed; oy++) {
        const bucket = g2.buckets.get(cellKey(cx + ox, cy + oy));
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const j = bucket[k];
          if (j <= i) continue;
          const b = bodies[j];
          if (removed.has(b.id)) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const ra = a.radius, rb = b.radius;
          if (d >= ra + rb) continue;
          const nx = dx / d, ny = dy / d;
          const overlap = ra + rb - d;
          const ratio = Math.min(a.mass, b.mass) / Math.max(a.mass, b.mass);
          if (ratio >= cfg.stickyRatio) {
            a.sticky.add(b.id);
            b.sticky.add(a.id);
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;
            // gentle damp on relative velocity so they clump
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
            a.vx += rvx * 0.05;
            a.vy += rvy * 0.05;
            b.vx -= rvx * 0.05;
            b.vy -= rvy * 0.05;
            const bothSmall = opts.coalesceActive && a.mass < 5 && b.mass < 5;
            const threshold = bothSmall ? cfg.mergeThreshold * 0.5 : cfg.mergeThreshold;
            if (a.mass + b.mass >= threshold) {
              removed.add(a.id);
              removed.add(b.id);
              added.push(mergeBodies(world, a, b));
              consumed = true;
              break;
            }
          } else {
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
            const velAlongNormal = rvx * nx + rvy * ny;
            if (velAlongNormal >= 0) continue;
            if (opts.shatterActive && a.mass >= 8 && b.mass >= 8 && -velAlongNormal >= 60) {
              removed.add(a.id);
              removed.add(b.id);
              for (const f of shatterBody(world, a, 3)) added.push(f);
              for (const f of shatterBody(world, b, 3)) added.push(f);
              emit(world, "shatter", (a.x + b.x) / 2, (a.y + b.y) / 2);
              consumed = true;
              break;
            }
            const e = 0.6;
            const jImp = (-(1 + e) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
            const ix = jImp * nx, iy = jImp * ny;
            a.vx -= ix / a.mass;
            a.vy -= iy / a.mass;
            b.vx += ix / b.mass;
            b.vy += iy / b.mass;
            emit(world, "collision", (a.x + b.x) / 2, (a.y + b.y) / 2);
          }
        }
      }
    }
  }

  if (removed.size > 0) world.bodies = bodies.filter((c) => !removed.has(c.id)).concat(added);
}

/** Break a body into n outward-flung fragments. Conserves 98% of mass. */
export function shatterBody(world: World, c: Body, n: number): Body[] {
  const { rng } = world;
  const m = (c.mass * 0.98) / n;
  const r = radiusOf(m);
  const out: Body[] = [];
  const baseAng = rng.next() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ang = baseAng + (i / n) * Math.PI * 2 + rng.centered() * 0.4;
    const kick = 70 + rng.next() * 70;
    out.push(
      makeBody(world, {
        x: c.x + Math.cos(ang) * (c.radius + r + 1),
        y: c.y + Math.sin(ang) * (c.radius + r + 1),
        vx: c.vx * 0.4 + Math.cos(ang) * kick,
        vy: c.vy * 0.4 + Math.sin(ang) * kick,
        mass: m,
        color: c.color,
        flashFor: 0.3,
      }),
    );
  }
  return out;
}

/** Eject fragments radially from a point — singularity payoff. */
export function ejectFragments(world: World, x: number, y: number, totalMass: number, n: number, color?: BodyColor): Body[] {
  const { rng } = world;
  const m = Math.max(0.5, totalMass / n);
  const out: Body[] = [];
  const baseAng = rng.next() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ang = baseAng + (i / n) * Math.PI * 2 + rng.centered() * 0.5;
    const sp = 120 + rng.next() * 60;
    out.push(
      makeBody(world, {
        x: x + Math.cos(ang) * 10,
        y: y + Math.sin(ang) * 10,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        mass: m,
        color,
        flashFor: 0.45,
      }),
    );
  }
  return out;
}

export function mergeBodies(world: World, a: Body, b: Body, efficiency = 0.98): Body {
  const totalMass = a.mass + b.mass;
  const newMass = totalMass * efficiency;
  const x = (a.x * a.mass + b.x * b.mass) / totalMass;
  const y = (a.y * a.mass + b.y * b.mass) / totalMass;
  // conserve momentum + small outward burst
  const burst = 5 + world.rng.next() * 10;
  const ang = world.rng.next() * Math.PI * 2;
  const color = blendColor(a.color, b.color, a.mass, b.mass);
  const merged = makeBody(world, {
    x,
    y,
    vx: (a.vx * a.mass + b.vx * b.mass) / newMass + Math.cos(ang) * burst,
    vy: (a.vy * a.mass + b.vy * b.mass) / newMass + Math.sin(ang) * burst,
    mass: newMass,
    color,
    flashFor: 0.22,
  });
  // lineage: elder birth + deepest merge chain + 1
  merged.bornAt = Math.min(a.bornAt, b.bornAt);
  merged.mergeCount = Math.max(a.mergeCount, b.mergeCount) + 1;
  emit(world, "merge", x, y);
  return merged;
}

/** Delete the largest body and replace it with 8–13 outward fragments. */
export function triggerSupernova(world: World): boolean {
  const bodies = world.bodies;
  if (!bodies.length) return false;
  let big = bodies[0];
  for (const c of bodies) if (c.mass > big.mass) big = c;
  if (big.mass < 3) return false;
  const { rng } = world;
  const n = 8 + rng.int(6);
  const fragMass = (big.mass * 0.95) / n;
  const out: Body[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng.next() * 0.3;
    const r = radiusOf(fragMass) + 2;
    const sp = 156 + rng.next() * 104;
    out.push(
      makeBody(world, {
        x: big.x + Math.cos(ang) * r,
        y: big.y + Math.sin(ang) * r,
        vx: big.vx + Math.cos(ang) * sp,
        vy: big.vy + Math.sin(ang) * sp,
        mass: fragMass,
        color: big.color,
        flashFor: 0.4,
      }),
    );
  }
  emit(world, "supernova", big.x, big.y);
  world.bodies = bodies.filter((c) => c.id !== big.id).concat(out);
  return true;
}

/** Merge clusters of similarly-sized nearby bodies. Greedy from largest. */
export function fusionCascade(
  world: World,
  bodies: Body[],
  opts: { massRatio?: number; reachMultiplier?: number } = {},
): Body[] {
  if (bodies.length < 2) return bodies;
  const minRatio = opts.massRatio ?? 0.8;
  const reachMul = opts.reachMultiplier ?? 2;
  const sorted = [...bodies].sort((a, b) => b.mass - a.mass);
  const consumed = new Set<number>();
  const newOnes: Body[] = [];
  for (const a of sorted) {
    if (consumed.has(a.id) || a.binaryWith != null) continue;
    const reach2 = (a.radius * reachMul) ** 2;
    const group: Body[] = [];
    for (const b of sorted) {
      if (b.id === a.id || consumed.has(b.id) || b.binaryWith != null) continue;
      if (Math.min(a.mass, b.mass) / Math.max(a.mass, b.mass) < minRatio) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy > reach2) continue;
      group.push(b);
    }
    if (group.length === 0) continue;
    consumed.add(a.id);
    let merged = a;
    let cx = a.x * a.mass, cy = a.y * a.mass, mTot = a.mass;
    for (const b of group) {
      consumed.add(b.id);
      cx += b.x * b.mass;
      cy += b.y * b.mass;
      mTot += b.mass;
      merged = mergeBodies(world, merged, b);
    }
    newOnes.push(merged);
    emit(world, "fusion", cx / mTot, cy / mTot);
  }
  if (consumed.size === 0) return bodies;
  return bodies.filter((c) => !consumed.has(c.id)).concat(newOnes);
}

/** Smallest first, merge into nearest partner ≥2× its mass (else plain nearest). */
function forcedNearestMerge(world: World, bodies: Body[]): Body[] {
  if (bodies.length < 2) return bodies;
  const sorted = [...bodies].sort((a, b) => a.mass - b.mass);
  const consumed = new Set<number>();
  const newOnes: Body[] = [];
  for (const a of sorted) {
    if (consumed.has(a.id) || a.binaryWith != null) continue;
    let bestBig: Body | null = null, bestBigD2 = Infinity;
    let bestAny: Body | null = null, bestAnyD2 = Infinity;
    for (const b of sorted) {
      if (b.id === a.id || consumed.has(b.id) || b.binaryWith != null) continue;
      const d2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (d2 < bestAnyD2) { bestAnyD2 = d2; bestAny = b; }
      if (b.mass >= a.mass * 2 && d2 < bestBigD2) { bestBigD2 = d2; bestBig = b; }
    }
    const best = bestBig ?? bestAny;
    if (!best) continue;
    consumed.add(a.id);
    consumed.add(best.id);
    newOnes.push(mergeBodies(world, a, best));
  }
  if (consumed.size === 0) return bodies;
  return bodies.filter((c) => !consumed.has(c.id)).concat(newOnes);
}

/** Giants eat up to 6 nearest small neighbours, losslessly. */
function accretionMerge(world: World, bodies: Body[]): Body[] {
  if (bodies.length < 2) return bodies;
  const sorted = [...bodies].sort((a, b) => b.mass - a.mass);
  const consumed = new Set<number>();
  const grown: Body[] = [];
  for (const giantOrig of sorted) {
    if (consumed.has(giantOrig.id) || giantOrig.binaryWith != null) continue;
    let giant = giantOrig;
    const smallCap = giant.mass * 0.4;
    const reach2 = (giant.radius * 6) ** 2;
    const candidates: { c: Body; d2: number }[] = [];
    for (const b of sorted) {
      if (b.id === giantOrig.id || consumed.has(b.id) || b.binaryWith != null) continue;
      if (b.mass > smallCap) continue;
      const d2 = (b.x - giant.x) ** 2 + (b.y - giant.y) ** 2;
      if (d2 > reach2) continue;
      candidates.push({ c: b, d2 });
    }
    if (candidates.length === 0) continue;
    candidates.sort((p, q) => p.d2 - q.d2);
    const eatN = Math.min(candidates.length, 6);
    for (let i = 0; i < eatN; i++) {
      consumed.add(candidates[i].c.id);
      giant = mergeBodies(world, giant, candidates[i].c, 1.0);
    }
    consumed.add(giantOrig.id);
    grown.push(giant);
    emit(world, "accretion", giant.x, giant.y);
  }
  if (consumed.size === 0) return bodies;
  return bodies.filter((c) => !consumed.has(c.id)).concat(grown);
}

/**
 * Hard population cap. Ladder: accretion → strict fusion → loose fusion → forced
 * nearest merge. Targets cap/2, up to 4 passes, bails if no progress.
 */
export function enforcePopulationCap(world: World): void {
  const cap = world.cfg.maxBodies;
  if (world.bodies.length <= cap) return;
  const target = Math.floor(cap * 0.5);
  let cur = world.bodies;
  for (let pass = 0; pass < 4 && cur.length > target; pass++) {
    const before = cur.length;
    cur = accretionMerge(world, cur);
    if (cur.length <= target) break;
    cur = fusionCascade(world, cur, { massRatio: 0.8, reachMultiplier: 2 });
    if (cur.length <= target) break;
    cur = fusionCascade(world, cur, { massRatio: 0.5, reachMultiplier: 4 });
    if (cur.length <= target) break;
    cur = forcedNearestMerge(world, cur);
    if (cur.length >= before) break;
  }
  world.bodies = cur;
}
