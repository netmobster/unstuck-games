// Player UI. Free: Environment, Affinity, Breathe, time skip, sound.
// God Mode (one fake ad → 1 hour, or pretend subscription): chaos agents + every advanced knob.
import { CHAOS_IDS, type ChaosId } from "./sim/world";
import type { SimConfig } from "./sim/types";
import { DEFAULT_VISUALS, type Visuals } from "./render/renderer";
import { debugEnabled, isPhone, type Game } from "./game";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const CHAOS_LABELS: Record<ChaosId, string> = {
  supernova: "Supernova", blackhole: "Black hole", pulse: "Gravity pulse", storm: "Asteroids", comet: "Comet",
  inversion: "Inversion", shatter: "Shatter", coalesce: "Coalesce", fusion: "Fusion cascade", singularity: "Singularity",
};

// Structure + voice from lumina-orbits src/routes/index.tsx; content updated to what Orbis is now
// (enemies/Defend cut, dials + time skip + God Mode added).
const SPLASH_HTML = `
  <h1 class="sr-only">ORBIS — Meditative Idle Orbiter</h1>
  <main>
    <div class="topbar fade-up d1">
      <div class="left"><span class="dot"></span><span>System alive</span></div>
      <div class="right"><span>v 0.2 — slow build</span><span class="sep"></span><span>An Unstuck game</span></div>
    </div>

    <section class="hero">
      <div class="mark fade-up d2">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="50" cy="50" rx="42" ry="22" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8" />
          <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" stroke-width="1.2" />
          <circle cx="50" cy="50" r="9" fill="currentColor" fill-opacity="0.15" />
          <g class="orbit-spin">
            <circle cx="92" cy="50" r="4" fill="currentColor" />
            <circle cx="92" cy="50" r="6.5" fill="currentColor" fill-opacity="0.22" />
          </g>
        </svg>
        <p class="wordmark">ORBIS</p>
      </div>
      <p class="tagline fade-up d3">Meditative &nbsp;·&nbsp; Idle &nbsp;·&nbsp; Orbiter</p>
      <p class="description fade-up d4">Let your little world grow. Change the conditions, skip ahead, watch what it becomes. Or just let it grow.</p>
    </section>

    <section class="cards">
      <article class="card fade-up d5">
        <div class="num">01 / Cycle</div>
        <div class="icon">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="22" cy="30" r="14" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.10" />
            <circle cx="38" cy="30" r="14" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.10" />
            <ellipse cx="30" cy="30" rx="20" ry="14" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.35" stroke-dasharray="2 3" />
          </svg>
        </div>
        <h3>Grow</h3>
        <p>Circles drift, attract, and merge. Your ecosystem builds itself, slowly, while you do other things.</p>
      </article>
      <article class="card fade-up d6">
        <div class="num">02 / Cycle</div>
        <div class="icon">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="10" y1="22" x2="50" y2="22" stroke="currentColor" stroke-width="1" stroke-opacity="0.45" stroke-linecap="round" />
            <circle cx="22" cy="22" r="5" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.2" />
            <line x1="10" y1="40" x2="50" y2="40" stroke="currentColor" stroke-width="1" stroke-opacity="0.45" stroke-linecap="round" />
            <circle cx="38" cy="40" r="5" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.2" />
          </svg>
        </div>
        <h3>Tune</h3>
        <p>Two dials, nothing to win. Still or stormy. Aloof or clingy. Change the conditions and see what the world does with them.</p>
      </article>
      <article class="card fade-up d7">
        <div class="num">03 / Cycle</div>
        <div class="icon">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle class="breath-ring r3" cx="30" cy="30" r="26" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.6" fill="none" />
            <circle class="breath-ring r2" cx="30" cy="30" r="19" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.6" fill="none" />
            <circle class="breath-ring" cx="30" cy="30" r="12" stroke="currentColor" stroke-width="1" stroke-opacity="0.6" fill="none" />
            <circle cx="30" cy="30" r="6" fill="currentColor" />
            <circle cx="30" cy="30" r="9" fill="currentColor" fill-opacity="0.25" />
          </svg>
        </div>
        <h3>Breathe</h3>
        <p>Leave it running. Check in. It's always doing something, even when you aren't looking. Or skip ahead and meet what it became.</p>
      </article>
    </section>

    <section class="notes">
      <div class="note fade-up d8">
        <div class="note-kicker">Sound</div>
        <p>The music and the collisions are one composition. Every merge pulls a fragment of a song into the mix, so it never plays the same way twice. Made to fall asleep to.</p>
      </div>
      <div class="note god fade-up d8">
        <div class="note-kicker">✦ God Mode</div>
        <p>Supernovae, black holes, singularities, comets, and every knob under the hood. One ad buys an hour. Orbis is the whole game without it.</p>
      </div>
    </section>

    <section class="cta">
      <h2 class="cta-heading fade-up d8">Live in your <em>world</em>.</h2>
      <button class="begin fade-up d8">Begin</button>
      <p class="micro fade-up d8">No install <span>◦</span> No account <span>◦</span> Best with sound</p>
    </section>
  </main>

  <div class="signature">
    <div class="row">ORBIS <span class="sep"></span> A quiet place to leave running</div>
    <div class="row">
      Built with
      <svg class="heart" width="11" height="10" viewBox="0 0 24 22" fill="currentColor" aria-label="love" role="img">
        <path d="M12 21s-7.5-4.6-10-9.5C0.5 8 2 3.5 6 3c2.4-.3 4.4 1 6 3 1.6-2 3.6-3.3 6-3 4 .5 5.5 5 4 8.5C19.5 16.4 12 21 12 21z" />
      </svg>
      by <a href="https://echofiles.substack.com" target="_blank" rel="noopener noreferrer">Jeremy Wright</a>
    </div>
  </div>`;

export function mountUI(game: Game, root: HTMLElement) {
  // ---- splash (original Orbis homepage content, over the live world; Begin = audio-unlock gesture) ----
  const title = el("div", "splash");
  title.innerHTML = SPLASH_HTML;
  root.appendChild(title);
  title.querySelector<HTMLButtonElement>(".begin")!.onclick = () => {
    game.audio.start();
    title.classList.add("gone");
    setTimeout(() => title.remove(), 900);
    dock.classList.remove("hidden");
    wake();
  };

  // ---- dock ----
  const dock = el("div", "dock hidden");
  root.appendChild(dock);

  const dial = (label: string, lo: string, hi: string, get: () => number, set: (v: number) => void) => {
    const wrap = el("label", "dial");
    wrap.appendChild(el("span", "dial-label", label));
    const row = el("div", "dial-row");
    row.appendChild(el("span", "dial-end", lo));
    const input = el("input");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.01";
    input.value = String(get());
    input.oninput = () => set(Number(input.value));
    row.appendChild(input);
    row.appendChild(el("span", "dial-end", hi));
    wrap.appendChild(row);
    return wrap;
  };

  const dials = el("div", "dials");
  dials.appendChild(dial("Environment", "Still", "Stormy", () => game.conditions.environment, (v) => game.setConditions({ environment: v })));
  dials.appendChild(dial("Affinity", "Aloof", "Clingy", () => game.conditions.affinity, (v) => game.setConditions({ affinity: v })));
  dock.appendChild(dials);

  const actions = el("div", "actions");
  const breathe = el("button", "pill", "Breathe");
  breathe.title = "Hide everything. Tap anywhere to come back.";
  breathe.onclick = (e) => {
    e.stopPropagation();
    document.body.classList.add("breathing");
  };
  actions.appendChild(breathe);

  const skipWrap = el("div", "skip");
  skipWrap.appendChild(el("span", "skip-label", "Skip ahead"));
  for (const m of isPhone() ? [10, 30] : [10, 30, 60]) {
    const b = el("button", "pill small", `${m}m`);
    b.onclick = () => game.skip(m);
    skipWrap.appendChild(b);
  }
  actions.appendChild(skipWrap);

  const sound = el("div", "sound");
  /** Mute toggle + level slider. Muting keeps the level; moving the slider unmutes. */
  const volume = (label: string, level: { get: () => number; set: (v: number) => void }, muted: { get: () => boolean; set: (v: boolean) => void }) => {
    const wrap = el("div", "volume");
    const btn = el("button", "pill small", label);
    btn.setAttribute("aria-label", `Mute ${label.toLowerCase()}`);
    const input = el("input");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.01";
    input.setAttribute("aria-label", `${label} volume`);
    const sync = () => {
      input.value = String(level.get());
      btn.classList.toggle("off", muted.get());
      btn.setAttribute("aria-pressed", String(muted.get()));
    };
    btn.onclick = () => {
      muted.set(!muted.get());
      game.audio.applyVolumes();
      sync();
    };
    input.oninput = () => {
      level.set(Number(input.value));
      muted.set(false);
      game.audio.applyVolumes();
      sync();
    };
    wrap.appendChild(btn);
    wrap.appendChild(input);
    volumeSyncs.push(sync);
    sync();
    return wrap;
  };
  const volumeSyncs: (() => void)[] = [];
  sound.appendChild(volume(
    "Music",
    { get: () => game.audio.musicVolume, set: (v) => (game.audio.musicVolume = v) },
    { get: () => game.audio.musicMuted, set: (v) => (game.audio.musicMuted = v) },
  ));
  sound.appendChild(volume(
    "Sounds",
    { get: () => game.audio.sfxVolume, set: (v) => (game.audio.sfxVolume = v) },
    { get: () => game.audio.sfxMuted, set: (v) => (game.audio.sfxMuted = v) },
  ));
  actions.appendChild(sound);

  const godBtn = el("button", "pill god", "✦ God Mode");
  godBtn.onclick = () => (game.godModeActive() ? godPanel.classList.toggle("hidden") : offer.classList.remove("hidden"));
  actions.appendChild(godBtn);
  dock.appendChild(actions);

  // ---- skip overlay ----
  const skipOverlay = el("div", "skip-overlay hidden");
  skipOverlay.innerHTML = `<div class="skip-card"><div class="skip-title">Time passes…</div><div class="bar"><div></div></div></div>`;
  root.appendChild(skipOverlay);

  // ---- God Mode offer (the Unstuck ad model, fake) ----
  const offer = el("div", "modal hidden");
  offer.innerHTML = `
    <div class="modal-card">
      <div class="kicker">GOD MODE</div>
      <h2>The magnifying glass and the stick.</h2>
      <p>Orbis is the whole game without this. God Mode lets you interfere: supernovae, black holes,
      singularities, and every knob under the hood.</p>
      <div class="offer-row">
        <button class="pill primary watch">Watch one ad → 1 hour</button>
        <button class="pill sub">I subscribe ($5/mo)</button>
      </div>
      <div class="ad hidden"><div class="ad-label">A very short, very fake ad…</div><div class="bar"><div></div></div></div>
      <p class="fine">Nothing is real yet. No ad plays, nothing is charged. One ad, one hour, nothing else to sell you.</p>
      <button class="close">Not now</button>
    </div>`;
  root.appendChild(offer);
  offer.querySelector<HTMLButtonElement>(".close")!.onclick = () => offer.classList.add("hidden");
  offer.querySelector<HTMLButtonElement>(".sub")!.onclick = () => {
    game.grantGodMode(30 * 24 * 3600 * 1000);
    offer.classList.add("hidden");
    godPanel.classList.remove("hidden");
  };
  offer.querySelector<HTMLButtonElement>(".watch")!.onclick = () => {
    const ad = offer.querySelector<HTMLDivElement>(".ad")!;
    const fill = ad.querySelector<HTMLDivElement>(".bar div")!;
    ad.classList.remove("hidden");
    let p = 0;
    const iv = setInterval(() => {
      p += 4;
      fill.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(iv);
        ad.classList.add("hidden");
        fill.style.width = "0";
        game.grantGodMode();
        offer.classList.add("hidden");
        godPanel.classList.remove("hidden");
      }
    }, 120);
  };

  // ---- God Mode panel ----
  const godPanel = el("div", "god-panel hidden");
  root.appendChild(godPanel);
  const godHead = el("div", "god-head");
  const godClock = el("span", "god-clock");
  godHead.appendChild(el("span", "kicker", "GOD MODE"));
  godHead.appendChild(godClock);
  const godClose = el("button", "x", "×");
  godClose.onclick = () => godPanel.classList.add("hidden");
  godHead.appendChild(godClose);
  godPanel.appendChild(godHead);

  const chaosGrid = el("div", "chaos-grid");
  for (const id of CHAOS_IDS) {
    const b = el("button", "chaos", CHAOS_LABELS[id]);
    b.onclick = () => {
      const ok = game.chaos(id);
      b.classList.add(ok ? "fired" : "fizzled");
      setTimeout(() => b.classList.remove("fired", "fizzled"), 500);
    };
    chaosGrid.appendChild(b);
  }
  godPanel.appendChild(chaosGrid);

  const knobs = el("details", "knobs");
  knobs.appendChild(el("summary", undefined, "Under the hood"));
  godPanel.appendChild(knobs);
  const knob = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void) => {
    const row = el("label", "knob");
    const val = el("span", "knob-val");
    const input = el("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const sync = () => {
      input.value = String(get());
      val.textContent = (+get().toFixed(4)).toString();
    };
    input.oninput = () => {
      set(Number(input.value));
      val.textContent = (+Number(input.value).toFixed(4)).toString();
    };
    row.appendChild(el("span", "knob-label", label));
    row.appendChild(input);
    row.appendChild(val);
    knobSyncs.push(sync);
    sync();
    return row;
  };
  const knobSyncs: (() => void)[] = [];
  const simKnob = (label: string, key: keyof SimConfig, min: number, max: number, step: number) =>
    knob(label, min, max, step, () => game.world.cfg[key], (v) => game.setOverride({ [key]: v }));
  const visKnob = (label: string, key: keyof Visuals, min: number, max: number, step: number) =>
    knob(label, min, max, step, () => game.renderer.visuals[key], (v) => (game.renderer.visuals[key] = v));

  knobs.appendChild(knob("Time speed", 0, 10, 0.1, () => game.speed, (v) => (game.speed = v)));
  knobs.appendChild(simKnob("Gravity", "G", 0, 1.5, 0.01));
  knobs.appendChild(simKnob("Damping", "damping", 0.99, 1, 0.0001));
  knobs.appendChild(simKnob("Merge threshold", "mergeThreshold", 5, 100, 1));
  knobs.appendChild(simKnob("Sticky ratio", "stickyRatio", 0.1, 1, 0.01));
  knobs.appendChild(simKnob("Max force", "maxForce", 20, 400, 5));
  knobs.appendChild(simKnob("Spawn every (s)", "spawnInterval", 1, 150, 1));
  knobs.appendChild(simKnob("Chaos every (s)", "autoChaosInterval", 3, 120, 1));
  knobs.appendChild(visKnob("Trail length", "trailLength", 50, 1500, 10));
  knobs.appendChild(visKnob("Trail visibility", "trailOpacity", 0, 200, 1));
  knobs.appendChild(visKnob("Glow softness", "glowSoftness", 1, 8, 0.1));
  knobs.appendChild(visKnob("Tail fade rate", "tailFadeRate", 0.2, 5, 0.1));
  knobs.appendChild(knob("Aura intensity", 0, 10, 0.1, () => game.background.intensity, (v) => (game.background.intensity = v)));
  knobs.appendChild(knob("Ribbon drift", 0, 5, 0.1, () => game.background.drift, (v) => (game.background.drift = v)));
  const reset = el("button", "pill small", "Reset knobs");
  reset.onclick = () => {
    game.clearOverrides();
    game.speed = 1;
    game.renderer.visuals = { ...DEFAULT_VISUALS };
    game.background.intensity = 5;
    game.background.drift = 1;
    knobSyncs.forEach((s) => s());
  };
  knobs.appendChild(reset);

  // ---- idle fade + breathe ----
  let idleTimer = 0;
  const wake = () => {
    document.body.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!dock.matches(":hover") && !godPanel.matches(":hover")) document.body.classList.add("idle");
    }, 4000);
  };
  window.addEventListener("pointermove", wake, { passive: true });
  window.addEventListener("pointerdown", () => {
    if (document.body.classList.contains("breathing")) document.body.classList.remove("breathing");
    wake();
  });
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === " ") {
      e.preventDefault();
      game.paused = !game.paused;
    } else if (e.key === "b" || e.key === "B") {
      document.body.classList.toggle("breathing");
    } else if (e.key === "m" || e.key === "M") {
      game.audio.musicMuted = !game.audio.musicMuted;
      game.audio.applyVolumes();
      volumeSyncs.forEach((s) => s());
    }
    wake();
  });

  // ---- state sync ----
  const sync = () => {
    const god = game.godModeActive() || debugEnabled();
    godBtn.classList.toggle("active", god);
    if (!god) godPanel.classList.add("hidden");
    skipOverlay.classList.toggle("hidden", !game.skipping);
    knobSyncs.forEach((s) => s());
  };
  game.onChange = sync;
  setInterval(() => {
    if (game.skipping) {
      skipOverlay.querySelector<HTMLDivElement>(".bar div")!.style.width = `${(100 * game.skipping.done) / game.skipping.target}%`;
    }
    const until = game.godModeUntil();
    const left = until - Date.now();
    godClock.textContent = left > 0 ? (left > 2 * 3600e3 ? "subscribed" : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} left`) : debugEnabled() ? "debug" : "";
    if (godBtn.classList.contains("active") !== (game.godModeActive() || debugEnabled())) sync();
  }, 250);
  sync();
}
