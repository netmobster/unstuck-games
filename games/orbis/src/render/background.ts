// Aurora background. The original used 9 full-viewport DOM ribbons with filter: blur(70px)
// + mix-blend-mode + an animated SVG feTurbulence/feDisplacementMap caustic layer + SVG grain.
// Here: the same ribbons painted as soft gradients into a tiny canvas, upscaled by CSS
// (bilinear upscaling *is* the blur). Vignette + grain are static CSS layers.

type Ribbon = {
  color: string;
  w: number; h: number; top: number; left: number; // fractions of viewport
  dx: number; dy: number; rot0: number; rot1: number; sx: number; // keyframe peak
  duration: number; depth: number;
};

// Colors, sizes, placement, durations and keyframe peaks ported from BackgroundAura.tsx.
const RIBBONS: Ribbon[] = [
  { color: "#1d9e75", w: 1.2, h: 0.3, top: -0.05, left: -0.1, dx: 40, dy: 20, rot0: -3, rot1: 2, sx: 1.05, duration: 62, depth: 8 },
  { color: "#534ab7", w: 1.0, h: 0.2, top: 0.2, left: 0.3, dx: -50, dy: 30, rot0: 2, rot1: -4, sx: 1.08, duration: 78, depth: 14 },
  { color: "#993c1d", w: 1.1, h: 0.15, top: 0.5, left: -0.2, dx: 60, dy: -25, rot0: -1, rot1: 4, sx: 1.1, duration: 54, depth: 20 },
  { color: "#0f6e56", w: 1.3, h: 0.25, top: 0.7, left: 0.4, dx: -30, dy: -40, rot0: 3, rot1: -2, sx: 1.04, duration: 88, depth: 26 },
  { color: "#ba7517", w: 0.9, h: 0.12, top: 0.1, left: 0.6, dx: 25, dy: 35, rot0: -5, rot1: 3, sx: 1.07, duration: 47, depth: 18 },
  { color: "#3c3489", w: 1.15, h: 0.22, top: 0.4, left: -0.05, dx: -45, dy: 15, rot0: 4, rot1: -3, sx: 1.06, duration: 71, depth: 12 },
  { color: "#7be3c4", w: 1.0, h: 0.18, top: 0.35, left: 0.1, dx: 55, dy: -20, rot0: -2, rot1: 3, sx: 1.08, duration: 58, depth: 22 },
  { color: "#a8e8d4", w: 0.95, h: 0.14, top: 0.6, left: 0.5, dx: -35, dy: 40, rot0: 1, rot1: -3, sx: 1.06, duration: 66, depth: 16 },
  { color: "#f4faf7", w: 1.05, h: 0.16, top: 0.25, left: -0.15, dx: 30, dy: -30, rot0: -2, rot1: 2, sx: 1.05, duration: 82, depth: 10 },
];

const BG = "#080d12";
const TEX_W = 192;

export class Background {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mouse = { x: 0, y: 0 };
  private mouseTarget = { x: 0, y: 0 };
  private lastDraw = -1;
  intensity = 5;
  drift = 1;
  enabled = true;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "bg-canvas";
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    host.appendChild(this.canvas);
    const vignette = document.createElement("div");
    vignette.className = "bg-vignette";
    host.appendChild(vignette);
    const grain = document.createElement("div");
    grain.className = "bg-grain";
    grain.style.backgroundImage = `url(${grainTile()})`;
    host.appendChild(grain);
    window.addEventListener("pointermove", (e) => {
      this.mouseTarget.x = e.clientX / window.innerWidth - 0.5;
      this.mouseTarget.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    const aspect = window.innerHeight / Math.max(1, window.innerWidth);
    this.canvas.width = TEX_W;
    this.canvas.height = Math.max(64, Math.round(TEX_W * aspect));
    this.lastDraw = -1;
  }

  /** ~30Hz is plenty: the fastest ribbon cycle is 47s. */
  draw(nowMs: number) {
    if (this.lastDraw >= 0 && nowMs - this.lastDraw < 33) return;
    this.lastDraw = nowMs;
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (!this.enabled || window.innerWidth < 1 || window.innerHeight < 1) return;

    // mouse parallax eases like the original's 600ms transform transition
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * 0.08;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pxToTex = W / vw;
    // original: opacity 0.025×intensity on a solid ellipse under blur(40 + intensity×6 px)
    const alpha = Math.min(1, 0.025 * this.intensity);
    const blurPx = 40 + this.intensity * 6;
    const t = nowMs / 1000;

    ctx.globalCompositeOperation = "screen";
    ctx.filter = "blur(3px)"; // smooths texture banding; ignored where unsupported
    for (const r of RIBBONS) {
      const period = r.duration / Math.max(this.drift, 0.01);
      // CSS keyframes 0→50%→100% ease-in-out, alternate ≈ raised cosine
      const p = this.drift <= 0.01 ? 0 : (1 - Math.cos((2 * Math.PI * t) / period)) / 2;
      // a gaussian blur of σ spreads a hard edge ~2σ each way
      const rw = r.w * vw * (1 + (r.sx - 1) * p) + blurPx * 4;
      const rh = r.h * vh + blurPx * 4;
      const cx = (r.left * vw + (r.w * vw) / 2 + r.dx * p + this.mouse.x * r.depth) * pxToTex;
      const cy = (r.top * vh + (r.h * vh) / 2 + r.dy * p + this.mouse.y * r.depth) * pxToTex;
      const rot = ((r.rot0 + (r.rot1 - r.rot0) * p) * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, rh / rw);
      const rad = (rw / 2) * pxToTex;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, withAlpha(r.color, alpha));
      g.addColorStop(0.5, withAlpha(r.color, alpha * 0.8));
      g.addColorStop(0.8, withAlpha(r.color, alpha * 0.3));
      g.addColorStop(1, withAlpha(r.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.filter = "none";

    // caustics: slow wandering mint light in place of the animated turbulence filter
    const causticAlpha = (0.04 + this.intensity * 0.025) * 0.35;
    for (let i = 0; i < 3; i++) {
      const ang = t / (14 + i * 5) + i * 2.1;
      const cx = W * (0.5 + 0.22 * Math.cos(ang) + this.mouse.x * 0.02);
      const cy = H * (0.5 + 0.18 * Math.sin(ang * 1.3));
      const rad = W * (0.35 + 0.08 * Math.sin(t / 9 + i));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(123,227,196,${causticAlpha})`);
      g.addColorStop(0.55, `rgba(29,158,117,${causticAlpha * 0.5})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
  }
}

function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function grainTile(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}
