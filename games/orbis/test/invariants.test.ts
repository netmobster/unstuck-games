// HARD INVARIANTS — must always pass. Balance/experience lives in scripts/sweep.ts.
import { describe, expect, test } from "bun:test";
import { configFor } from "../src/sim/conditions";
import { CHAOS_IDS, createWorld, digest, drainEvents, fireChaos, tick, SIM_DT, type World } from "../src/sim/world";

const W = 1280, H = 800;
const EXTREMES = [
  { environment: 0, affinity: 0 },
  { environment: 0, affinity: 1 },
  { environment: 0.5, affinity: 0.5 },
  { environment: 1, affinity: 0 },
  { environment: 1, affinity: 1 },
];

function run(world: World, seconds: number, each?: (w: World) => void) {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) {
    tick(world);
    drainEvents(world);
    each?.(world);
  }
}

function assertSane(world: World) {
  expect(world.bodies.length).toBeLessThanOrEqual(world.cfg.maxBodies);
  const ids = new Set<number>();
  for (const c of world.bodies) {
    for (const v of [c.x, c.y, c.vx, c.vy, c.mass, c.radius]) {
      if (!Number.isFinite(v)) throw new Error(`non-finite value on body ${c.id} at t=${world.t.toFixed(2)} seed=${world.seed}`);
    }
    if (c.mass <= 0) throw new Error(`non-positive mass ${c.mass} on body ${c.id} seed=${world.seed}`);
    // one step of slack for collision resolution nudging bodies past the wall
    if (c.x < -c.radius || c.x > W + c.radius || c.y < -c.radius || c.y > H + c.radius) {
      throw new Error(`body ${c.id} escaped bounds (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) seed=${world.seed}`);
    }
    if (Math.hypot(c.vx, c.vy) > 5000) throw new Error(`runaway velocity on body ${c.id} seed=${world.seed}`);
    if (ids.has(c.id)) throw new Error(`duplicate body id ${c.id} seed=${world.seed}`);
    ids.add(c.id);
  }
}

describe("determinism", () => {
  test("same seed → identical world after 2 sim-minutes", () => {
    const a = createWorld({ seed: 42, w: W, h: H });
    const b = createWorld({ seed: 42, w: W, h: H });
    run(a, 120);
    run(b, 120);
    expect(digest(a)).toBe(digest(b));
  });

  test("different seeds diverge", () => {
    const a = createWorld({ seed: 1, w: W, h: H });
    const b = createWorld({ seed: 2, w: W, h: H });
    run(a, 10);
    run(b, 10);
    expect(digest(a)).not.toBe(digest(b));
  });
});

describe("stability across dial extremes", () => {
  for (const cond of EXTREMES) {
    test(`env=${cond.environment} affinity=${cond.affinity}: 10 sim-minutes × 3 seeds stay sane`, () => {
      for (const seed of [7, 1001, 90210]) {
        const world = createWorld({ seed, w: W, h: H, cfg: configFor(cond) });
        let checked = 0;
        run(world, 600, (w) => {
          if (w.steps % 50 === 0) {
            assertSane(w);
            checked++;
          }
        });
        expect(checked).toBeGreaterThan(0);
      }
    }, 120_000);
  }
});

describe("population cap under pressure", () => {
  test("constant storms never exceed maxBodies", () => {
    const world = createWorld({ seed: 3, w: W, h: H, autoChaos: false });
    for (let s = 0; s < 120; s++) {
      fireChaos(world, "storm");
      run(world, 1);
      assertSane(world);
    }
  }, 60_000);
});

describe("every chaos agent can fire", () => {
  for (const id of CHAOS_IDS) {
    test(id, () => {
      const world = createWorld({ seed: 11, w: W, h: H, autoChaos: false });
      // give size-gated agents something to act on
      world.bodies[0].mass = 120;
      world.bodies[0].radius = Math.sqrt(120) * 4;
      if (id === "fusion") {
        const [a, b] = world.bodies;
        b.x = a.x + a.radius;
        b.y = a.y;
        b.mass = a.mass;
        b.radius = a.radius;
      }
      expect(fireChaos(world, id)).toBe(true);
      const kinds = drainEvents(world).map((e) => (e.kind === "chaos" ? `chaos:${e.detail}` : e.kind));
      expect(kinds).toContain(`chaos:${id}`);
      run(world, 6, assertSane);
    });
  }

  test("singularity completes its cycle and returns mass as fragments", () => {
    const world = createWorld({ seed: 5, w: W, h: H, autoChaos: false });
    world.bodies[0].mass = 200;
    world.bodies[0].radius = Math.sqrt(200) * 4;
    fireChaos(world, "singularity");
    const seen: string[] = [];
    for (let i = 0; i < Math.round(6 / SIM_DT); i++) {
      tick(world);
      for (const e of drainEvents(world)) seen.push(e.kind);
    }
    expect(seen).toContain("singularity-burst");
    expect(world.singularity).toBeNull();
  });
});
