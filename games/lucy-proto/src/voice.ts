/* Lucy's voice.

   One 17-second recording of a real ferret, cut into 17 whole phrases by
   scripts/ferret-slices.py and played back a phrase at a time. The sim decides whether
   she makes a noise and which one — see voiceFor() — so her voice is part of the run's
   record and a seed reproduces it exactly, same as everything else she does.

   This is the one place Web Audio earns its keep. Playing 150ms out of the middle of a
   file, with a gain envelope on each hit, is precisely what an <audio> element cannot
   do; the music, which is one long track played start to finish, uses <audio> and is
   better for it.

   Sound: "Ferret" by J. Zazvurek, CC BY 4.0. See PRE-ADS.md. */

import { SLICES } from "./voice-slices";
import { soundOn, soundLevel } from "./music";
import voiceUrl from "./lucy-voice.wav?url";

const IN = 0.012;    // fade in: short, so the attack of a dook survives
const OUT = 0.05;    // fade out: longer, because a cut tail is what clicks
const LEVEL = 0.6;   // her voice sits above the music, but not by much (Jay: 20% down from 0.75)
const FLOOR = 220;   // ms between noises — she is chatty, not a machine gun

let ctx: AudioContext | null = null;
let buf: AudioBuffer | null = null;
let loading = false;
let lastAt = -1e9;

/** Decode once, on the first gesture. Before that a browser will not give us a running
    context anyway, so there is nothing to gain by being early. */
async function wake() {
  if (loading || buf) { void ctx?.resume(); return; }
  loading = true;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    const res = await fetch(voiceUrl);
    buf = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    buf = null; // no voice this session; the game does not care
  } finally {
    loading = false;
  }
}

/** Play one phrase. `i` is an index into SLICES, straight from the event record. */
export function playVoice(i: number | undefined) {
  if (i === undefined || !soundOn()) return;
  const s = SLICES[i];
  if (!s || !ctx || !buf || ctx.state !== "running") return;

  const now = performance.now();
  if (now - lastAt < FLOOR) return; // two events in the same instant: she only has one mouth
  lastAt = now;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Quieter phrases were quieter because she was calmer, and that is worth keeping —
  // but the range in the tape is extreme, so pull it towards the middle rather than
  // letting one excited run at 14 seconds dwarf everything else.
  const g = ctx.createGain();
  const level = soundLevel() * LEVEL * (0.55 + 0.45 * Math.sqrt(s.peak));

  const t = ctx.currentTime;
  const end = t + s.len;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + Math.min(IN, s.len / 3));
  g.gain.setValueAtTime(level, Math.max(t + IN, end - OUT));
  g.gain.linearRampToValueAtTime(0, end);

  src.connect(g).connect(ctx.destination);
  src.start(t, s.at, s.len);
  src.stop(end + 0.02);
}

export function initVoice() {
  // Same idea as window.fbMusic: a way to hear one phrase on demand and see whether the
  // context is actually running, without waiting for her to do something loud.
  (window as unknown as Record<string, unknown>).fbVoice = {
    state: () => ({ context: ctx?.state ?? "none", loaded: !!buf, seconds: buf?.duration ?? null, phrases: SLICES.length }),
    play: (i: number) => { lastAt = -1e9; playVoice(i); },
  };

  const go = () => { void wake(); };
  document.addEventListener("pointerdown", go);
  document.addEventListener("keydown", go);
}
