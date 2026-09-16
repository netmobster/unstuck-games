/* Nocturnal Drift — the house's ambience.

   The track is looped by hand because it cannot be looped any other way. It is a VBR
   mp3 with a Xing header and no LAME gapless tags, so `<audio loop>` would splice the
   encoder's own padding into the seam as silence — and the piece does not land its
   outro on its intro in the first place. Two players overlapping for three seconds
   fixes both at once: the tail of one pass plays underneath the head of the next, so
   there is no seam left to land on.

   Deliberately not an audio system. One track, one toggle, one slider, no Web Audio.
   The sound effects are a different problem and get their own answer. */

import trackUrl from "./nocturnal-drift.mp3?url";

const XFADE = 3;     // seconds the two passes overlap at the seam
const RISE = 2.5;    // fade in, and fade out when switched off
const CEIL = 0.5;    // what the slider's 100% actually means — atmosphere, not content
const STEP = 50;     // ms between volume updates
const KEY = "fb.music";

type Prefs = { on: boolean; vol: number };

let prefs: Prefs = { on: true, vol: 0.7 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) prefs = { ...prefs, ...(JSON.parse(raw) as Partial<Prefs>) };
} catch {
  /* a browser with storage switched off still gets music, just not a memory of it */
}

const pair: HTMLAudioElement[] = [];
let live = 0;        // which of the two is carrying the track right now
let master = 0;      // the ramp, chased towards `aim()` every tick
let running = false; // has a user gesture let us start at all

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* fine */ }
}

/* One switch governs everything that makes a noise. Splitting music and Lucy into two
   controls would be more configurable and worse: nobody wants the ferret without the
   room, and "off" should mean off. */
export const soundOn = () => prefs.on && !document.hidden;
export const soundLevel = () => prefs.vol;

/** Where the master volume is heading. Zero while hidden: nobody wants a tab they
    cannot see making noise. */
function aim() {
  if (!prefs.on || document.hidden) return 0;
  return prefs.vol * CEIL;
}

function tick() {
  const want = aim();
  const per = STEP / 1000 / RISE;
  if (master < want) master = Math.min(want, master + per);
  else if (master > want) master = Math.max(want, master - per);

  const a = pair[live];
  const b = pair[1 - live];

  if (master <= 0.0001) {
    // Silent and staying silent: stop the decoders rather than play to nobody.
    if (want === 0) pair.forEach((p) => { if (!p.paused) p.pause(); });
    pair.forEach((p) => { p.volume = 0; });
    return;
  }

  if (a.paused) { a.play().catch(() => { /* the gesture will come */ }); }

  const d = a.duration;
  const left = d && isFinite(d) ? d - a.currentTime : Infinity;
  if (left <= XFADE) {
    // Hand over. The outgoing pass keeps playing to its own end underneath.
    if (b.paused) { b.currentTime = 0; b.play().catch(() => {}); }
    // Equal power, not equal gain. The two passes are uncorrelated audio, so their
    // levels add as squares — ramping them linearly would sag about 3dB in the middle
    // of every seam, which is audible as a small breath once a minute. Square roots
    // keep the sum flat.
    const k = Math.max(0, Math.min(1, left / XFADE));
    a.volume = master * Math.sqrt(k);
    b.volume = master * Math.sqrt(1 - k);
  } else {
    a.volume = master;
  }
}

/** Build the two players. Called once, before any gesture — loading early means the
    fade-in is not also a buffering wait. */
function build() {
  for (let i = 0; i < 2; i++) {
    const el = new Audio(trackUrl);
    el.preload = "auto";
    el.volume = 0;
    el.addEventListener("ended", () => {
      el.pause();
      el.currentTime = 0;
      if (pair[live] === el) live = 1 - live; // the other one has been carrying it for 3s
    });
    pair.push(el);
  }
  setInterval(tick, STEP);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
}

/** Autoplay policy: nothing sounds until the player has touched something. Opening the
    cage door is the gesture, and it is also the right moment for the house to start. */
function start() {
  if (!prefs.on) return;
  running = true;
  const a = pair[live];
  if (a.paused && !document.hidden) a.play().catch(() => {});
}

function icon(on: boolean) {
  const waves = on
    ? '<path d="M11 5.5a4.5 4.5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M13.4 3a7.6 7.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>'
    : '<path d="M11.5 6.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 18 18" aria-hidden="true" width="18" height="18">' +
    '<path d="M2 6.6h2.6L8 3.4v11.2L4.6 11.4H2z" fill="currentColor"/>' + waves + "</svg>";
}

export function initMusic() {
  const btn = document.getElementById("musicBtn") as HTMLButtonElement | null;
  const vol = document.getElementById("musicVol") as HTMLInputElement | null;
  if (!btn || !vol) return;

  build();

  const paint = () => {
    btn.innerHTML = icon(prefs.on);
    btn.setAttribute("aria-pressed", String(prefs.on));
    btn.title = prefs.on ? "Sound on" : "Sound off";
    vol.value = String(Math.round(prefs.vol * 100));
    vol.disabled = !prefs.on;
  };
  paint();

  btn.addEventListener("click", () => {
    prefs.on = !prefs.on;
    save();
    paint();
    if (prefs.on) start();
  });
  vol.addEventListener("input", () => {
    prefs.vol = Math.max(0, Math.min(1, Number(vol.value) / 100));
    save();
    // Dragging the slider is a direct instruction about loudness, so follow it now
    // rather than easing towards it — the ramp is for starting and stopping.
    if (running) master = aim();
  });

  // A handle on the two players. The crossfade is three seconds long and happens once
  // every ninety, so without this the only way to check it is to sit and listen.
  (window as unknown as Record<string, unknown>).fbMusic = {
    state: () => ({
      on: prefs.on, vol: prefs.vol, master: Number(master.toFixed(3)), live,
      at: pair.map((p) => Number(p.currentTime.toFixed(2))),
      gain: pair.map((p) => Number(p.volume.toFixed(3))),
      paused: pair.map((p) => p.paused),
      dur: pair[0]?.duration ?? null,
    }),
    seek: (t: number) => { pair.forEach((p) => { if (!p.paused) p.currentTime = t; }); },
  };

  // The first touch anywhere is the permission we need.
  const wake = () => { start(); };
  document.addEventListener("pointerdown", wake, { once: true });
  document.addEventListener("keydown", wake, { once: true });
}
