// Game shell: fixed-step loop, world ownership, time skip, God Mode state.
import { configFor, DEFAULT_CONDITIONS, type Conditions } from "./sim/conditions";
import { createWorld, drainEvents, fireChaos, tick, SIM_DT, type ChaosId, type World } from "./sim/world";
import type { SimConfig, SimEvent } from "./sim/types";
import { Renderer, type Quality } from "./render/renderer";
import { Background } from "./render/background";
import { OrbisAudio } from "./audio/audio";

/** The original's sim clock ran 1.2× wall-clock: one SIM_DT step per 1/60s real. */
const REAL_SECONDS_PER_STEP = SIM_DT / 1.2;
const MAX_STEPS_PER_FRAME = 6;
const GOD_MODE_MS = 60 * 60 * 1000;
const GOD_KEY = "orbis:godModeUntil";

export const isPhone = () => window.matchMedia("(pointer: coarse)").matches;

export type Stats = { fps: number; frameMs: number; simMs: number; renderMs: number; bodies: number; eventsPerSec: number; voices: number };

export class Game {
  world: World;
  conditions: Conditions = { ...DEFAULT_CONDITIONS };
  /** God Mode overrides layered on top of the dial-derived config */
  overrides: Partial<SimConfig> = {};
  speed = 1;
  paused = false;
  readonly renderer: Renderer;
  readonly background: Background;
  readonly audio = new OrbisAudio();
  stats: Stats = { fps: 0, frameMs: 0, simMs: 0, renderMs: 0, bodies: 0, eventsPerSec: 0, voices: 0 };
  skipping: { target: number; done: number } | null = null;
  onChange: () => void = () => {};

  private acc = 0;
  private last = performance.now();
  private statAcc = { frames: 0, time: 0, frameMs: 0, simMs: 0, renderMs: 0, events: 0 };

  constructor(host: HTMLElement, quality: Quality, seed = (Math.random() * 2 ** 31) | 0) {
    this.background = new Background(host);
    this.renderer = new Renderer(host, quality);
    this.world = createWorld({ seed, ...viewport(), cfg: this.config() });
    this.renderer.resize(this.world.w, this.world.h);
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame((t) => this.frame(t));
  }

  config(): SimConfig {
    return { ...configFor(this.conditions), ...this.overrides };
  }

  setConditions(c: Partial<Conditions>) {
    this.conditions = { ...this.conditions, ...c };
    this.world.cfg = this.config();
  }

  setOverride(patch: Partial<SimConfig>) {
    this.overrides = { ...this.overrides, ...patch };
    this.world.cfg = this.config();
  }

  clearOverrides() {
    this.overrides = {};
    this.world.cfg = this.config();
  }

  reseed(seed: number) {
    this.world = createWorld({ seed, ...viewport(), cfg: this.config() });
    this.renderer.clearTrails();
    this.acc = 0;
    this.onChange();
  }

  private resize() {
    if (window.innerWidth < 1 || window.innerHeight < 1) return;
    const { w, h } = viewport();
    this.world.w = w;
    this.world.h = h;
    for (const c of this.world.bodies) {
      c.x = Math.min(Math.max(c.x, 10), w - 10);
      c.y = Math.min(Math.max(c.y, 10), h - 10);
      c.px = c.x;
      c.py = c.y;
    }
    this.renderer.resize(w, h);
  }

  // ---- God Mode ----
  godModeUntil(): number {
    try {
      return Number(localStorage.getItem(GOD_KEY)) || 0;
    } catch {
      return 0;
    }
  }
  godModeActive(): boolean {
    return this.godModeUntil() > Date.now();
  }
  grantGodMode(ms = GOD_MODE_MS) {
    try {
      localStorage.setItem(GOD_KEY, String(Date.now() + ms));
    } catch {
      /* private mode: session-only */
    }
    this.onChange();
  }
  endGodMode() {
    try {
      localStorage.removeItem(GOD_KEY);
    } catch {
      /* ignore */
    }
    this.clearOverrides();
    this.speed = 1;
    this.onChange();
  }

  chaos(id: ChaosId) {
    if (!this.godModeActive() && !debugEnabled()) return false;
    const ok = fireChaos(this.world, id);
    this.flushEvents(performance.now());
    return ok;
  }

  // ---- Time skip: real physics, spread over frames ----
  skip(minutes: number) {
    if (this.skipping) return;
    this.skipping = { target: Math.round((minutes * 60) / SIM_DT), done: 0 };
    this.onChange();
  }

  private runSkip() {
    const s = this.skipping!;
    const budgetEnd = performance.now() + 12;
    while (s.done < s.target && performance.now() < budgetEnd) {
      for (let i = 0; i < 25 && s.done < s.target; i++, s.done++) tick(this.world);
      drainEvents(this.world); // silent: nobody wants 60 minutes of merges at once
    }
    if (s.done >= s.target) {
      this.skipping = null;
      this.renderer.clearTrails();
      for (const c of this.world.bodies) {
        c.px = c.x;
        c.py = c.y;
      }
      this.onChange();
    }
  }

  private flushEvents(nowMs: number): number {
    const events: SimEvent[] = drainEvents(this.world);
    if (events.length) {
      this.renderer.onEvents(events, nowMs);
      this.audio.onEvents(events);
    }
    return events.length;
  }

  private frame(now: number) {
    // schedule first: one bad frame must never stop a sleepy app
    requestAnimationFrame((t) => this.frame(t));
    const realDt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const t0 = performance.now();
    let events = 0;

    if (this.skipping) {
      this.runSkip();
    } else if (!this.paused) {
      this.acc += realDt * this.speed;
      let steps = 0;
      while (this.acc >= REAL_SECONDS_PER_STEP && steps < MAX_STEPS_PER_FRAME * Math.max(1, this.speed)) {
        tick(this.world);
        this.acc -= REAL_SECONDS_PER_STEP;
        steps++;
      }
      if (this.acc > REAL_SECONDS_PER_STEP * 2) this.acc = 0; // fell behind: drop, don't spiral
      events = this.flushEvents(now);
    }
    const t1 = performance.now();
    this.background.draw(now);
    this.renderer.draw(this.world, now);
    const t2 = performance.now();

    const a = this.statAcc;
    a.frames++;
    a.time += realDt;
    a.simMs += t1 - t0;
    a.renderMs += t2 - t1;
    a.frameMs += t2 - t0;
    a.events += events;
    if (a.time >= 0.5) {
      this.stats = {
        fps: Math.round(a.frames / a.time),
        frameMs: +(a.frameMs / a.frames).toFixed(2),
        simMs: +(a.simMs / a.frames).toFixed(2),
        renderMs: +(a.renderMs / a.frames).toFixed(2),
        bodies: this.world.bodies.length,
        eventsPerSec: Math.round(a.events / a.time),
        voices: this.audio.activeVoices(),
      };
      this.statAcc = { frames: 0, time: 0, frameMs: 0, simMs: 0, renderMs: 0, events: 0 };
      if (this.godModeUntil() && !this.godModeActive() && Object.keys(this.overrides).length) this.endGodMode();
    }
  }
}

/** Some embedded/background tabs report a 0×0 viewport at load; never seed a world into that. */
const viewport = () => ({ w: window.innerWidth || 1280, h: window.innerHeight || 800 });

export const debugEnabled = () => new URLSearchParams(location.search).has("debug");
