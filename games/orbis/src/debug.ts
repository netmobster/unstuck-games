// ?debug — developer console. Perf overlay, quality toggles for profiling, seed replay,
// dial readout. Exposes window.orbis so automated browser checks can drive the game.
import { configFor } from "./sim/conditions";
import type { Game } from "./game";

export function mountDebug(game: Game, root: HTMLElement) {
  const panel = document.createElement("div");
  panel.className = "debug";
  root.appendChild(panel);

  const stats = document.createElement("pre");
  panel.appendChild(stats);

  const row = (label: string, input: HTMLElement) => {
    const l = document.createElement("label");
    l.textContent = label + " ";
    l.appendChild(input);
    panel.appendChild(l);
  };
  const check = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const i = document.createElement("input");
    i.type = "checkbox";
    i.checked = get();
    i.onchange = () => set(i.checked);
    row(label, i);
  };
  const select = (label: string, options: number[], get: () => number, set: (v: number) => void) => {
    const s = document.createElement("select");
    for (const o of options) s.add(new Option(String(o), String(o), false, o === get()));
    s.onchange = () => set(Number(s.value));
    row(label, s);
  };

  const q = game.renderer.quality;
  check("trails", () => q.trails, (v) => (q.trails = v));
  check("sprites", () => q.sprites, (v) => (q.sprites = v));
  check("background", () => game.background.enabled, (v) => (game.background.enabled = v));
  select("trail scale", [0.35, 0.5, 0.75, 1], () => q.trailScale, (v) => {
    q.trailScale = v;
    game.renderer.resize(window.innerWidth, window.innerHeight);
  });
  select("dpr cap", [1, 1.5, 2, 3], () => q.dprCap, (v) => {
    q.dprCap = v;
    game.renderer.resize(window.innerWidth, window.innerHeight);
  });

  const seed = document.createElement("input");
  seed.type = "number";
  seed.value = String(game.world.seed);
  seed.style.width = "8em";
  const go = document.createElement("button");
  go.textContent = "replay seed";
  go.onclick = () => game.reseed(Number(seed.value));
  row("seed", seed);
  panel.appendChild(go);

  setInterval(() => {
    const s = game.stats, w = game.world, cfg = w.cfg;
    const d = configFor(game.conditions);
    stats.textContent = [
      `fps ${s.fps}  frame ${s.frameMs}ms (sim ${s.simMs} / render ${s.renderMs})`,
      `bodies ${s.bodies}  events/s ${s.eventsPerSec}  voices ${s.voices}`,
      `t ${w.t.toFixed(0)}s  seed ${w.seed}`,
      `env ${game.conditions.environment.toFixed(2)} aff ${game.conditions.affinity.toFixed(2)}`,
      `G ${cfg.G.toFixed(3)} damp ${cfg.damping.toFixed(4)} merge ${cfg.mergeThreshold.toFixed(1)}`,
      `sticky ${cfg.stickyRatio.toFixed(2)} spawn ${cfg.spawnInterval.toFixed(0)}s chaos ${cfg.autoChaosInterval.toFixed(0)}s`,
      Object.keys(game.overrides).length ? `overrides ${JSON.stringify(game.overrides)}` : `(dial config G ${d.G.toFixed(2)})`,
    ].join("\n");
  }, 250);

  (window as unknown as { orbis: Game }).orbis = game;
}
