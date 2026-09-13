// Orbis sound. Ported from MusicControl.tsx + SfxControl.tsx.
//
// SACRED BEHAVIOUR (RULES.md #5) — preserved exactly:
//  - one looping music bed, volume = slider × 0.30 (default slider 0.20)
//  - SFX "voices" play a random 3–5s slice from within the first 60s of a full Suno track,
//    2s linear fade-in, sustain, 0.5s linear fade-out
//  - ≤5 voices per sound; a new trigger steals the oldest when full and ducks every other
//    playing voice ×0.9 (floor 0.4); ≥60ms between triggers of the same sound
//  - SFX volume = slider × 0.20 (default slider 0.30)
//  - event → sound mapping identical to the original (see soundFor)
//
// Implementation changes: 15 HTMLAudioElements seeking inside 4–9MB files → one Web Audio
// graph over three decoded 66s buffers. Music stays an <audio> element so it keeps playing
// when the tab is hidden or the phone is locked (sleep use).
import type { SimEvent } from "../sim/types";

const MUSIC_MAX = 0.3;
const SFX_MAX = 0.2;
const POOL_SIZE = 5;
const DUCK_STEP = 0.9;
const MIN_DUCK = 0.4;
const MIN_INTERVAL_MS = 60;
const MAX_OFFSET = 60;
const FADE_IN = 2.0;
const FADE_OUT = 0.5;
const MIN_PLAY = 3.0;
const MAX_PLAY = 5.0;

export type SfxKey = "merge" | "collision";

type Voice = { src: AudioBufferSourceNode; duck: GainNode; startedAt: number; endsAt: number };

/** Original mapping: merges, singularity bursts and binaries → merge; bounces and shatters → collision. */
export function soundFor(e: SimEvent): SfxKey | null {
  switch (e.kind) {
    case "merge":
    case "singularity-burst":
    case "binary":
      return "merge";
    case "collision":
    case "shatter":
      return "collision";
    default:
      return null;
  }
}

export class OrbisAudio {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private buffers: Partial<Record<SfxKey, AudioBuffer>> = {};
  private voices: Record<SfxKey, Voice[]> = { merge: [], collision: [] };
  private lastTrigger: Record<SfxKey, number> = { merge: 0, collision: 0 };
  private music: HTMLAudioElement | null = null;
  musicVolume = 0.2;
  sfxVolume = 0.3;
  musicMuted = false;
  sfxMuted = false;
  started = false;

  constructor(private base = "audio/") {}

  /** Begin buffering the music (10MB) so Begin plays promptly. Never called in ?embed. */
  prime() {
    if (this.music) return;
    this.music = new Audio(`${this.base}music.mp3`);
    this.music.loop = true;
    this.music.preload = "auto";
    this.applyVolumes();
  }

  /** Must be called from a user gesture. */
  async start() {
    if (this.started) return;
    this.started = true;
    this.prime();
    this.music!.play().catch(() => {});
    this.ctx = new AudioContext();
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.ctx.destination);
    this.applyVolumes();
    const load = async (key: SfxKey, file: string) => {
      const res = await fetch(`${this.base}${file}`);
      this.buffers[key] = await this.ctx!.decodeAudioData(await res.arrayBuffer());
    };
    await Promise.all([load("merge", "sfx-merge.mp3"), load("collision", "sfx-collision.mp3")]);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.ctx?.state === "suspended") this.ctx.resume();
    });
  }

  applyVolumes() {
    if (this.music) this.music.volume = this.musicMuted ? 0 : this.musicVolume * MUSIC_MAX;
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setTargetAtTime(this.sfxMuted ? 0 : this.sfxVolume * SFX_MAX, this.ctx.currentTime, 0.05);
    }
  }

  onEvents(events: SimEvent[]) {
    for (const e of events) {
      const key = soundFor(e);
      if (key) this.trigger(key);
    }
  }

  trigger(key: SfxKey) {
    const ctx = this.ctx, buf = this.buffers[key], bus = this.sfxBus;
    if (!ctx || !buf || !bus || ctx.state !== "running") return;
    const nowMs = performance.now();
    if (nowMs - this.lastTrigger[key] < MIN_INTERVAL_MS) return;
    this.lastTrigger[key] = nowMs;

    const now = ctx.currentTime;
    const pool = this.voices[key].filter((v) => v.endsAt > now);
    this.voices[key] = pool;
    if (pool.length >= POOL_SIZE) {
      // steal the oldest: quick fade so the cut doesn't click
      let oldest = pool[0];
      for (const v of pool) if (v.startedAt < oldest.startedAt) oldest = v;
      oldest.duck.gain.cancelScheduledValues(now);
      oldest.duck.gain.setValueAtTime(oldest.duck.gain.value, now);
      oldest.duck.gain.linearRampToValueAtTime(0, now + 0.03);
      oldest.src.stop(now + 0.04);
      oldest.endsAt = now;
      pool.splice(pool.indexOf(oldest), 1);
    }
    for (const v of pool) {
      const g = Math.max(MIN_DUCK, v.duck.gain.value * DUCK_STEP);
      v.duck.gain.setValueAtTime(g, now);
    }

    const playLen = MIN_PLAY + Math.random() * (MAX_PLAY - MIN_PLAY);
    const offset = Math.random() * Math.max(0, Math.min(MAX_OFFSET, buf.duration - playLen));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const env = ctx.createGain();
    const duck = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + FADE_IN);
    env.gain.setValueAtTime(1, now + playLen - FADE_OUT);
    env.gain.linearRampToValueAtTime(0, now + playLen);
    src.connect(env).connect(duck).connect(bus);
    src.start(now, offset, playLen + 0.05);
    const voice: Voice = { src, duck, startedAt: now, endsAt: now + playLen };
    src.onended = () => {
      src.disconnect();
      env.disconnect();
      duck.disconnect();
    };
    pool.push(voice);
  }

  activeVoices(): number {
    const now = this.ctx?.currentTime ?? 0;
    return this.voices.merge.filter((v) => v.endsAt > now).length + this.voices.collision.filter((v) => v.endsAt > now).length;
  }
}
