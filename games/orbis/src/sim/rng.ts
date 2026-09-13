/** Seeded PRNG (mulberry32). All sim randomness goes through this — never Math.random. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [-0.5, 0.5). */
  centered(): number {
    return this.next() - 0.5;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}
