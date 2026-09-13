// Bodies, trails, overlays, pulses. Ported from lumina-orbits src/lib/orbis/render.ts.
// Same look; changes: per-body gradients → cached sprites, capped DPR, trail buffer at a
// configurable resolution scale, pulses driven by sim events, enemy drawing removed.
import type { Body, SimEvent } from "../sim/types";
import type { World } from "../sim/world";

export type Visuals = {
  trailLength: number;
  trailOpacity: number;
  glowSoftness: number;
  tailFadeRate: number;
};

export const DEFAULT_VISUALS: Visuals = { trailLength: 550, trailOpacity: 100, glowSoftness: 3.2, tailFadeRate: 1.5 };

export type Quality = {
  trails: boolean;
  /** trail buffer resolution relative to the main canvas */
  trailScale: number;
  /** main canvas device-pixel-ratio cap */
  dprCap: number;
  /** false = original per-frame gradients (for profiling comparison) */
  sprites: boolean;
};

type PulseKind = "ring" | "singularity-charge" | "singularity-burst";
type Pulse = { x: number; y: number; born: number; kind: PulseKind };

const SPRITE = 96;

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trail: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private pulses: Pulse[] = [];
  private glowSprites = new Map<string, HTMLCanvasElement>();
  private discSprites = new Map<string, HTMLCanvasElement>();
  private w = 0;
  private h = 0;
  visuals: Visuals = { ...DEFAULT_VISUALS };
  quality: Quality;

  constructor(host: HTMLElement, quality: Quality) {
    this.quality = quality;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "sim-canvas";
    this.ctx = this.canvas.getContext("2d")!;
    this.trail = document.createElement("canvas");
    this.tctx = this.trail.getContext("2d")!;
    host.appendChild(this.canvas);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // keep existing trails: mobile address bars fire resize constantly
    const old = document.createElement("canvas");
    old.width = this.trail.width;
    old.height = this.trail.height;
    if (old.width > 1 && old.height > 1) old.getContext("2d")!.drawImage(this.trail, 0, 0);
    const ts = dpr * this.quality.trailScale;
    this.trail.width = Math.max(1, Math.round(w * ts));
    this.trail.height = Math.max(1, Math.round(h * ts));
    this.tctx.setTransform(1, 0, 0, 1, 0, 0);
    if (old.width > 1 && old.height > 1) this.tctx.drawImage(old, 0, 0, this.trail.width, this.trail.height);
    this.tctx.setTransform(ts, 0, 0, ts, 0, 0);
  }

  clearTrails() {
    this.tctx.clearRect(0, 0, this.w, this.h);
  }

  /** Map sim events to visual ring pulses (same mapping the original pushed). */
  onEvents(events: SimEvent[], nowMs: number) {
    for (const e of events) {
      if (e.kind === "shatter" || e.kind === "fusion" || e.kind === "accretion" || e.kind === "binary") {
        this.pulses.push({ x: e.x, y: e.y, born: nowMs, kind: "ring" });
      } else if (e.kind === "singularity-charge" || e.kind === "singularity-burst") {
        this.pulses.push({ x: e.x, y: e.y, born: nowMs, kind: e.kind });
      }
    }
    if (this.pulses.length > 120) this.pulses.splice(0, this.pulses.length - 120);
  }

  draw(world: World, nowMs: number) {
    const { ctx, w, h, visuals: v } = this;
    const bodies = world.bodies;
    const t = world.t;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // ---- trails: persistent buffer, faded each frame ----
    if (this.quality.trails) {
      const tctx = this.tctx;
      const fadeAlpha = Math.min(0.25, Math.max(0.005, (v.tailFadeRate * 0.022) / Math.max(0.4, v.trailLength / 550)));
      tctx.globalCompositeOperation = "destination-out";
      tctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      tctx.fillRect(0, 0, w, h);
      tctx.globalCompositeOperation = "lighter";
      tctx.lineCap = "round";
      const userMul = v.trailOpacity / 100;
      for (const c of bodies) {
        const dx = c.x - c.px, dy = c.y - c.py;
        const segLen = Math.hypot(dx, dy);
        if (segLen < 0.05 || segLen > 80) continue;
        const speedFactor = Math.min(1, Math.hypot(c.vx, c.vy) / 60);
        const headAlpha = 0.45 * (0.35 + speedFactor * 0.65) * userMul;
        if (headAlpha < 0.005) continue;
        const coreW = Math.max(0.8, c.radius * 0.55 * (0.5 + speedFactor * 0.5));
        tctx.strokeStyle = `rgba(${c.rgb},${headAlpha * 0.22})`;
        tctx.lineWidth = coreW * v.glowSoftness;
        tctx.beginPath();
        tctx.moveTo(c.px, c.py);
        tctx.lineTo(c.x, c.y);
        tctx.stroke();
        tctx.strokeStyle = `rgba(${c.rgb},${headAlpha})`;
        tctx.lineWidth = coreW;
        tctx.beginPath();
        tctx.moveTo(c.px, c.py);
        tctx.lineTo(c.x, c.y);
        tctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(this.trail, 0, 0, w, h);
    }

    // ---- sticky arcs ----
    ctx.globalCompositeOperation = "lighter";
    const byId = new Map<number, Body>();
    for (const c of bodies) byId.set(c.id, c);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(180, 220, 220, ${0.15 + 0.1 * Math.sin(nowMs / 400)})`;
    ctx.beginPath();
    for (const c of bodies) {
      for (const otherId of c.sticky) {
        if (otherId < c.id) continue;
        const o = byId.get(otherId);
        if (!o) continue;
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(o.x, o.y);
      }
    }
    ctx.stroke();

    // ---- glow ----
    for (const c of bodies) {
      const r = c.radius;
      const glowR = r * 1.9;
      const alpha = Math.min(0.28, 0.15 + r / 200);
      if (r < 6) {
        ctx.fillStyle = `rgba(${c.rgb},${alpha})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.quality.sprites) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.glowSprite(c), c.x - glowR, c.y - glowR, glowR * 2, glowR * 2);
        ctx.globalAlpha = 1;
      } else {
        const grad = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, glowR);
        grad.addColorStop(0, `rgba(${c.rgb},${alpha})`);
        grad.addColorStop(0.5, hexA(c.color.shadow, alpha * 0.5));
        grad.addColorStop(1, hexA(c.color.shadow, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- solid discs ----
    ctx.globalCompositeOperation = "source-over";
    for (const c of bodies) {
      const r = c.radius;
      if (r < 6) {
        ctx.fillStyle = c.color.core;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.quality.sprites) {
        ctx.drawImage(this.discSprite(c), c.x - r, c.y - r, r * 2, r * 2);
      } else {
        const inner = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
        inner.addColorStop(0, c.color.core);
        inner.addColorStop(1, c.color.shadow);
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.flashUntil > t) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (c.flashUntil - t) / 0.22) * 0.9})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- archetype overlays: elder halo, anchor motes, binary bond ----
    ctx.globalCompositeOperation = "lighter";
    for (const c of bodies) {
      const r = c.radius;
      if (c.archetype === "elder") {
        const ringR = r * 1.6 * (0.85 + 0.15 * Math.sin(nowMs / 1400 + c.id));
        const grad = ctx.createRadialGradient(c.x, c.y, r * 0.9, c.x, c.y, ringR);
        grad.addColorStop(0, `rgba(${c.rgb},0)`);
        grad.addColorStop(0.6, `rgba(${c.rgb},0.12)`);
        grad.addColorStop(1, `rgba(${c.rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, ringR, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.archetype === "anchor") {
        ctx.fillStyle = `rgba(${c.rgb},0.35)`;
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + nowMs / 1800 + c.id * 0.3;
          const wob = 0.6 + 0.4 * Math.sin(nowMs / 1200 + i + c.id);
          ctx.beginPath();
          ctx.arc(c.x + Math.cos(ang) * r * 1.9 * wob, c.y + Math.sin(ang) * r * 1.9 * wob, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (c.binaryWith != null && c.binaryWith > c.id) {
        const p = byId.get(c.binaryWith);
        if (p) {
          const dx = p.x - c.x, dy = p.y - c.y;
          const a2 = Math.hypot(dx, dy) / 2 + Math.max(c.radius, p.radius) * 1.2;
          const b2 = (c.radius + p.radius) * 0.9;
          ctx.save();
          ctx.translate((c.x + p.x) / 2, (c.y + p.y) / 2);
          ctx.rotate(Math.atan2(dy, dx));
          ctx.strokeStyle = `rgba(${c.rgb},${0.18 * (0.9 + 0.1 * Math.sin(nowMs / 900))})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, a2, b2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    this.drawPulses(nowMs);
    if (world.singularity) this.drawSingularity(world, nowMs);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawPulses(nowMs: number) {
    const ctx = this.ctx;
    let keep = 0;
    for (const p of this.pulses) {
      const age = nowMs - p.born;
      if (p.kind === "ring") {
        if (age > 600) continue;
        const k = age / 600;
        const radius = 10 + k * 110;
        ctx.strokeStyle = `rgba(255, 240, 220, ${(1 - k) * 0.9})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 140, 60, ${(1 - k) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "singularity-charge") {
        if (age > 1500) continue;
        const k = age / 1500;
        ctx.strokeStyle = `rgba(220, 74, 74, ${0.4 + 0.4 * k})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 90 * (1 - k), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        if (age > 900) continue;
        const k = age / 900;
        const radius = 15 + k * 320;
        ctx.strokeStyle = `rgba(240, 250, 255, ${(1 - k) * 0.95})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(120, 210, 255, ${(1 - k) * 0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.pulses[keep++] = p;
    }
    this.pulses.length = keep;
  }

  private drawSingularity(world: World, nowMs: number) {
    const ctx = this.ctx;
    const s = world.singularity!;
    ctx.save();
    if (s.phase === "charge") {
      const prog = Math.max(0, Math.min(1, 1 - (s.chargeUntil - world.t) / 1.5));
      const r = 20 + prog * 6;
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, "rgba(20, 0, 0, 0.95)");
      g.addColorStop(1, "rgba(20, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(220, 74, 74, ${0.6 * (0.5 + 0.5 * Math.sin(nowMs / 80))})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const coreR = 18;
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, coreR * 2.5);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.55, "rgba(10, 0, 10, 0.7)");
      g.addColorStop(1, "rgba(10, 0, 10, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, coreR * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      const rim = 0.7 + 0.3 * Math.sin(nowMs / 60);
      ctx.strokeStyle = `rgba(255, 120, 220, ${0.55 * rim})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, coreR + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(120, 200, 255, ${0.35 * rim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, coreR + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Glow gradient (alpha applied at draw time via globalAlpha). Merged colors are continuous → quantize the cache key. */
  private glowSprite(c: Body): HTMLCanvasElement {
    const key = quantKey(c.color.core, c.color.shadow);
    let s = this.glowSprites.get(key);
    if (s) return s;
    if (this.glowSprites.size > 400) this.glowSprites.clear();
    s = document.createElement("canvas");
    s.width = s.height = SPRITE;
    const x = s.getContext("2d")!;
    const R = SPRITE / 2;
    const g = x.createRadialGradient(R, R, R * (0.2 / 1.9), R, R, R);
    g.addColorStop(0, hexA(c.color.core, 1));
    g.addColorStop(0.5, hexA(c.color.shadow, 0.5));
    g.addColorStop(1, hexA(c.color.shadow, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, SPRITE, SPRITE);
    this.glowSprites.set(key, s);
    return s;
  }

  private discSprite(c: Body): HTMLCanvasElement {
    const key = quantKey(c.color.core, c.color.shadow);
    let s = this.discSprites.get(key);
    if (s) return s;
    if (this.discSprites.size > 400) this.discSprites.clear();
    s = document.createElement("canvas");
    s.width = s.height = SPRITE;
    const x = s.getContext("2d")!;
    const R = SPRITE / 2;
    const g = x.createRadialGradient(R - R * 0.3, R - R * 0.3, R * 0.1, R, R, R);
    g.addColorStop(0, c.color.core);
    g.addColorStop(1, c.color.shadow);
    x.fillStyle = g;
    x.beginPath();
    x.arc(R, R, R, 0, Math.PI * 2);
    x.fill();
    this.discSprites.set(key, s);
    return s;
  }
}

function quantKey(core: string, shadow: string) {
  const q = (hex: string) => (parseInt(hex.slice(1), 16) & 0xf8f8f8).toString(16);
  return `${q(core)}|${q(shadow)}`;
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
