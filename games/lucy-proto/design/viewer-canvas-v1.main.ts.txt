// Lucy — rough playable prototype. Top-down house plan (placeholder), real deterministic sim underneath.
// Prepare Lucy. Open the door. Get out of the way.
import "./style.css";
import { CAGE, DOORS, H, ROOMS, STASH, W, type RoomId } from "./house";
import {
  COMBOS, EVERYDAY_IDS, ITEMS, LEFTOVER_TEXT, comboKey, finishRun, replay, squeak, startRun, step, the, unlockedItems, unlockedRooms,
  type ItemId, type Profile, type Run, type RunSpec, type RunSummary,
} from "./sim";

type Session = { seed: number; runs: RunSpec[] };
const KEY = "lucy:session";
const load = (): Session => {
  try {
    const v = localStorage.getItem(KEY);
    if (v) {
      const s = JSON.parse(v) as Session;
      // sessions saved before a design change (e.g. the old warm-towel item) can't replay; start that Lucy over
      if (s.runs.every((r) => r.prep.every((i) => i in ITEMS))) return s;
      return { seed: s.seed, runs: [] };
    }
  } catch { /* private mode */ }
  return { seed: (Math.random() * 2 ** 31) | 0, runs: [] };
};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private mode */ } };

let session = load();
const params = new URLSearchParams(location.search);
if (params.has("seed")) session = { seed: Number(params.get("seed")), runs: [] };
let profile: Profile = replay(session.seed, session.runs);

type Phase = "cage" | "run" | "day";
let phase: Phase = "cage";
let prep: ItemId[] = [];
let god = false; // God Mode preview: no ads in the prototype
let run: Run | null = null;
let last: RunSummary | null = null;
let speed = 1; // ticks per 100ms
let prevPos = { x: CAGE.x, y: CAGE.y }, tickFrac = 0;

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// ---------- canvas ----------
const cv = $<HTMLCanvasElement>("#plan");
const ctx = cv.getContext("2d")!;
const T = 22;
const TAG_COLOR: Record<string, string> = { fabric: "#c98bb0", food: "#e0a44a", soft: "#b9c7a3", hide: "#8f8a7c", noise: "#7aa6c9", shiny: "#e7c948", water: "#6fb7d4", warm: "#e08466", small: "#c7a17a" };

// three states: before the run the whole house; during the run the camera stays close on Lucy and the UI
// gets out of the way; after the nap it pulls back out to the whole house for the day card
const cam = { x: (W * T) / 2, y: (H * T) / 2, z: 1 };
const RUN_ZOOM = 2.6;
function updateCamera() {
  const base = cv.width / (W * T);
  let tx = (W * T) / 2, ty = (H * T) / 2, tz = 1;
  if (phase === "run" && run) {
    const f = Math.min(1, tickFrac);
    tx = (prevPos.x + (run.x - prevPos.x) * f) * T + T / 2;
    ty = (prevPos.y + (run.y - prevPos.y) * f) * T + T / 2;
    tz = RUN_ZOOM;
    const halfW = (W * T) / (2 * tz), halfH = (H * T) / (2 * tz); // keep the house on screen
    tx = Math.max(halfW, Math.min(W * T - halfW, tx));
    ty = Math.max(halfH, Math.min(H * T - halfH, ty));
  }
  const k = phase === "run" ? 0.12 : 0.07;
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
  const s = base * cam.z;
  ctx.setTransform(s, 0, 0, s, cv.width / 2 - cam.x * s, cv.height / 2 - cam.y * s);
}

function draw(now: number) {
  const unlocked = run ? run.unlocked : unlockedRooms(profile);
  const things = run ? run.things : profile.things;
  const stashN = run ? run.stash.length : profile.stash.length;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fbf8ef"; ctx.fillRect(0, 0, cv.width, cv.height);
  updateCamera();
  ctx.fillStyle = "#fbf8ef"; ctx.fillRect(0, 0, W * T, H * T);

  for (const r of ROOMS) {
    const open = unlocked.has(r.id);
    ctx.fillStyle = open ? r.floor : "#d9d4c8";
    ctx.fillRect(r.x * T, r.y * T, r.w * T, r.h * T);
    if (!open) {
      ctx.save(); ctx.beginPath(); ctx.rect(r.x * T, r.y * T, r.w * T, r.h * T); ctx.clip();
      ctx.strokeStyle = "rgba(27,26,23,.18)"; ctx.lineWidth = 2;
      for (let k = -r.h * T; k < r.w * T; k += 12) { ctx.beginPath(); ctx.moveTo(r.x * T + k, r.y * T + r.h * T); ctx.lineTo(r.x * T + k + r.h * T, r.y * T); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = "#1b1a17"; ctx.lineWidth = 3; ctx.strokeRect(r.x * T, r.y * T, r.w * T, r.h * T);
    ctx.fillStyle = open ? "rgba(27,26,23,.55)" : "rgba(27,26,23,.7)";
    ctx.font = "700 11px 'Courier Prime', monospace";
    ctx.fillText(open ? r.name.toUpperCase() : `${r.name.toUpperCase()} · OPENS AT ${r.unlockAt} JOURNAL ENTRIES`, r.x * T + 6, r.y * T + 14);
  }
  for (const d of DOORS) {
    const open = unlocked.has(d.to);
    ctx.fillStyle = open ? "#efe3cf" : "#8a5a2b";
    ctx.fillRect(d.x * T + 2, d.y * T + 2, T - 4, T - 4);
  }
  // cage
  ctx.strokeStyle = "#1b1a17"; ctx.lineWidth = 2;
  ctx.strokeRect((CAGE.x - 1) * T + 4, (CAGE.y - 1) * T + 4, T * 2 - 8, T * 2 - 8);
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo((CAGE.x - 1) * T + 4 + i * 9, (CAGE.y - 1) * T + 4); ctx.lineTo((CAGE.x - 1) * T + 4 + i * 9, (CAGE.y + 1) * T - 4); ctx.stroke(); }
  label("cage", (CAGE.x - 1) * T + 4, (CAGE.y + 1) * T + 10);
  // stash
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(STASH.x * T + T / 2, STASH.y * T + T / 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  label(`treasure ×${stashN}`, STASH.x * T - 10, STASH.y * T + T + 8);

  // things
  for (const t of things) {
    if (!unlocked.has(t.room)) continue;
    const x = t.x * T + T / 2, y = t.y * T + T / 2;
    ctx.fillStyle = TAG_COLOR[t.tags[0]] ?? "#bbb";
    ctx.strokeStyle = "#1b1a17"; ctx.lineWidth = 1.5;
    if (t.stealable) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.roundRect(x - 9, y - 7, 18, 14, 3); ctx.fill(); ctx.stroke(); }
    label(t.name.replace(/^(a|an|the|your|one) /i, ""), x - 20, y + 17, t.arrivedRun !== undefined ? "#d8352a" : "rgba(27,26,23,.75)");
  }

  if (!run) {
    drawLucy(CAGE.x + 0.6, CAGE.y + 0.2, -Math.PI / 2, now, phase === "day" ? "nap" : "idle");
    return;
  }
  // trail: CD's dashed red route
  ctx.strokeStyle = "rgba(216,53,42,.55)"; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
  ctx.beginPath();
  run.trail.slice(-160).forEach(([tx, ty], i) => { const px = tx * T + T / 2, py = ty * T + T / 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.stroke(); ctx.setLineDash([]);

  const f = Math.min(1, tickFrac);
  const lx = prevPos.x + (run.x - prevPos.x) * f, ly = prevPos.y + (run.y - prevPos.y) * f;
  if (run.x !== prevPos.x || run.y !== prevPos.y) facing = Math.atan2(run.y - prevPos.y, run.x - prevPos.x);
  drawLucy(lx, ly, facing, now, poseFor(run));
}

function label(s: string, x: number, y: number, color = "rgba(27,26,23,.75)") {
  ctx.font = "700 9.5px 'Courier Prime', monospace"; ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// ---------- Lucy's sprites (red team v1 sheet, sliced by scripts/slice_sprites.py) ----------
// Painted Lucy on a code-drawn house: the duality is the joke. Cells are 512px, sprites face north.
type Pose = "idle" | "walk" | "zoom" | "swim" | "sniff" | "notice" | "wardance" | "hide" | "curl" | "nap";
const FRAMES: Record<string, string[]> = {
  walk: ["walk_1", "walk_2", "walk_3", "walk_4"], zoom: ["zoom_1", "zoom_2", "zoom_3", "zoom_4"],
  sniff: ["sniff_1", "sniff_2"], wardance: ["wardance_1", "wardance_2", "wardance_3"], curl: ["curl_1", "curl_2"], hide: ["hide"],
};
const SPRITES = new Map<string, HTMLImageElement>();
for (const names of Object.values(FRAMES)) for (const n of names) {
  const img = new Image(); img.src = `./sprites/top_${n}.png`; SPRITES.set(n, img);
}
const spritesReady = () => [...SPRITES.values()].every((i) => i.complete && i.naturalWidth > 0);
let facing = -Math.PI / 2;

/** Which animation a moment of the sim gets. Every sim verb maps to one of six sheets. */
function poseFor(r: Run): Pose {
  if (r.done) return "nap";
  const a = r.action;
  if (!a) return "idle";
  if (a.notice > 0) return "notice";
  if (a.path.length) {
    if (r.mood.swim && a.verb === "wander") return "swim";
    if (a.verb === "come" || a.cause === "startled" || r.mood.speed >= 1.35 || r.leftover?.kind === "hyper" || (r.mood.bath && r.rolls < 2)) return "zoom";
    return "walk";
  }
  switch (a.verb) {
    case "play": case "roll": case "come": return "wardance";
    case "hide": case "sulk": return "hide";
    case "doze": return "curl";
    case "glare": return "idle";
    default: return "sniff"; // sniff, fish, steal, stash, gift
  }
}

function drawLucy(tx: number, ty: number, ang: number, now: number, pose: Pose) {
  const x = tx * T + T / 2, y = ty * T + T / 2;
  const sleeping = pose === "nap" || pose === "curl";
  // soft shadow drawn in code (sprites ship without one)
  ctx.fillStyle = "rgba(27,26,23,.22)";
  ctx.beginPath(); ctx.ellipse(x + 2, y + 4, sleeping ? 15 : 12, sleeping ? 11 : 7, 0, 0, Math.PI * 2); ctx.fill();

  if (spritesReady()) {
    const sheet = pose === "idle" ? "walk" : pose === "notice" ? "sniff" : pose === "swim" ? "zoom" : pose === "nap" ? "curl" : pose;
    const frames = FRAMES[sheet];
    const ms = sheet === "zoom" ? 70 : sheet === "walk" ? 120 : sheet === "wardance" ? 110 : sheet === "curl" ? 900 : 320;
    const still = pose === "idle" || pose === "notice" || pose === "hide";
    const img = SPRITES.get(frames[still ? 0 : Math.floor(now / ms) % frames.length])!;
    const size = 64; // a 512 cell drawn at 64px: walking Lucy is ~2.5 tiles nose to tail
    ctx.save(); ctx.translate(x, y);
    if (sheet === "walk" || sheet === "zoom" || sheet === "hide") ctx.rotate(ang + Math.PI / 2); // sheet faces north
    else if (sheet === "sniff") ctx.rotate(ang - Math.PI / 2); // the sniff frames face south
    else if (sheet === "wardance" && Math.cos(ang) < 0) ctx.scale(-1, 1); // hops toward where she was heading
    if (pose === "swim") ctx.scale(1.25, 0.85); // flat as a pancake, doing the breaststroke
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "#6b4a33"; ctx.strokeStyle = "#1b1a17"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, sleeping ? 10 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  ctx.font = "16px 'Alfa Slab One', serif"; ctx.fillStyle = "#d8352a";
  if (pose === "notice") ctx.fillText("!", x - 3, y - 22);
  if (sleeping) { ctx.fillStyle = "#0f5c57"; ctx.fillText("z", x + 12 + Math.sin(now / 500) * 2, y - 14); ctx.font = "11px 'Alfa Slab One', serif"; ctx.fillText("z", x + 21, y - 24 + Math.sin(now / 400) * 2); }
}

// ---------- loop ----------
let acc = 0, lastT = performance.now();
function frame(now: number) {
  const dt = Math.min(250, now - lastT); lastT = now;
  if (phase === "run" && run && !run.done) {
    acc += dt;
    const period = 100 / speed;
    while (acc >= period && !run.done) {
      acc -= period;
      prevPos = { x: run.x, y: run.y };
      const before = run.events.length;
      step(run);
      if (run.events.length !== before) renderFeed();
    }
    tickFrac = acc / period;
    renderNow();
    if (run.done) endRun();
  }
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- side panel ----------
function renderStats() {
  const h = profile.habits;
  const habits = [h.favNap && "a nap spot", h.favRoom && "a territory", h.nemesis && "a nemesis", h.routine && "a routine"].filter(Boolean);
  $("#stats").innerHTML = `<span>RUNS <b>${profile.runs.length}</b></span><span>JOURNAL <b>${profile.journal.size}</b></span><span>TREASURES <b>${profile.stash.length}</b></span><span>HABITS <b>${habits.length}</b></span><span>SEED ${session.seed}</span>`;
}

function renderSide() {
  renderStats();
  const side = $("#side");
  if (phase === "cage") {
    const open = unlockedItems(profile);
    const k = comboKey(prep);
    const left = profile.leftover;
    const mood = left
      ? `<div class="mood ${left.kind}"><b>Lucy is ${esc(LEFTOVER_TEXT[left.kind])}</b><span>(${esc(left.why)}). Your prep only goes about ${Math.round(100 - left.strength * 100)}% as far today${left.kind === "grudgy" ? ", and she may ignore the squeak" : ""}.</span></div>`
      : `<div class="mood"><b>Lucy is in a perfectly ordinary mood.</b><span>Your prep will land as intended. Probably.</span></div>`;
    const known = k && profile.journal.has(`combo:${k}`) ? `Known combo: ${COMBOS[k].name}` : k && COMBOS[k] ? "Something might happen with these two…" : "";
    side.innerHTML = `<div class="panel">
      <span class="tag">1 · PREP THE CAGE · UP TO TWO</span>
      <h2>What goes in with Lucy?</h2>
      ${mood}
      <div class="items">${EVERYDAY_IDS.map((id) => {
        const locked = !open.includes(id), on = prep.includes(id);
        return `<button class="item${on ? " on" : ""}" data-item="${id}" ${locked ? "disabled" : ""}><span><b>${esc(ITEMS[id].name)}</b></span><small>${locked ? `journal ${ITEMS[id].unlockAt}` : esc(ITEMS[id].blurb)}</small></button>`;
      }).join("")}</div>
      <div class="combo">${esc(known)}</div>
      <div class="god">
        <label><input type="checkbox" data-god ${god ? "checked" : ""}> <b>God Mode</b> <small>(one ad = one hour; free in the prototype)</small></label>
        ${god ? `<button class="item${prep.includes("bath") ? " on" : ""}" data-item="bath"><span><b>${esc(ITEMS.bath.name)}</b></span><small>${esc(ITEMS.bath.blurb)}</small></button>` : ""}
      </div>
      <button class="go" data-open>Open the door →</button>
      <span class="tag">SHE ALWAYS COMES BACK. SHE ALWAYS NAPS.</span>
    </div>
    ${last ? dayCard(last) : ""}`;
  } else if (phase === "run" && run) {
    side.innerHTML = "";
    const bar = $("#runbar");
    bar.innerHTML = `<button class="squeak" data-squeak ${run.squeakedAt !== null ? "disabled" : ""}>${run.squeakedAt !== null ? "Squeaked" : "Squeak"}</button>
      ${[1, 4, 16].map((s) => `<button class="chip${speed === s ? " on" : ""}" data-speed="${s}">${s}×</button>`).join("")}<button class="chip" data-skip>skip to nap</button>`;
    renderFeed();
  } else if (phase === "day" && last) {
    side.innerHTML = `${dayCard(last)}<button class="go" data-back>Back to the cage</button>`;
  }
}

/** In-run, the only words on screen: her latest line, and why. */
function renderFeed() {
  const el = $("#caption");
  if (!run || !run.events.length) { el.hidden = true; return; }
  const e = run.events[run.events.length - 1];
  el.hidden = false;
  el.className = "caption" + (e.cause.startsWith("ritual:") ? " ritual" : "");
  el.innerHTML = `${esc(e.text)}<span>because: ${esc(e.cause.replace("ritual:", "habit ritual: "))}</span>`;
}

function setState() {
  document.body.dataset.state = phase === "run" ? "in-run" : phase === "day" ? "post-run" : "pre-run";
  $("#runbar").hidden = phase !== "run";
  if (phase !== "run") $("#caption").hidden = true;
}

function renderNow() {
  if (!run) return;
  const a = run.action;
  const what = run.done ? "asleep" : !a ? "deciding" : a.notice ? `noticed ${a.target ? the(a.target.name) : "something"}` : a.path.length ? `heading for ${a.target ? the(a.target.name) : "somewhere"}` : `${a.verb}ing ${a.target ? the(a.target.name) : ""}`;
  $("#now").textContent = `Lucy is ${what} · energy ${Math.max(0, Math.round(run.energy))} · ${(run.tick / 10).toFixed(0)}s`;
}

function dayCard(s: RunSummary) {
  const extras = [...s.returned.map((n) => `You found ${the(n)} and put it back.`), ...(s.arrived ? [`Something new turned up in the house: ${s.arrived}.`] : []), ...s.unlockedNow];
  return `<div class="day">
    <span class="tag">${s.god ? "GOD MODE · " : ""}RUN ${s.index + 1} · ${s.prep.length ? s.prep.map((i) => ITEMS[i].name.toLowerCase()).join(" + ") : "nothing in the cage"} · ${(s.ticks / 10).toFixed(0)}s</span>
    <div class="sentence">${esc(s.sentence)}</div>
    ${s.newEntries.length ? `<span class="tag">NEW IN THE JOURNAL</span><ul class="new">${s.newEntries.map((e) => `<li><span class="kind ${e.kind}">${e.kind}</span>${esc(e.text)}</li>`).join("")}</ul>` : `<span class="tag">NOTHING NEW. SHE WAS VERY HERSELF.</span>`}
    ${s.leftoverOut ? `<div class="mood ${s.leftoverOut.kind}"><b>Next time she'll be ${esc(LEFTOVER_TEXT[s.leftoverOut.kind])}</b><span>(${esc(s.leftoverOut.why)})</span></div>` : ""}
    ${extras.length ? `<ul class="new">${extras.map((x) => `<li style="background:var(--lino)">${esc(x)}</li>`).join("")}</ul>` : ""}
  </div>`;
}

function renderBook() {
  const entries = [...profile.journal.values()].reverse();
  const h = profile.habits;
  const name = (id: string | null) => (id ? the(profile.things.concat(profile.stash).find((t) => t.id === id)?.name ?? id) : null);
  const roomName = (id: RoomId | null) => (id ? ROOMS.find((r) => r.id === id)!.name.toLowerCase() : null);
  $("#book").innerHTML = `
    <div class="panel"><span class="tag">THE JOURNAL · ${profile.journal.size} THINGS YOU'VE LEARNED ABOUT LUCY</span>
      <ol>${entries.map((e) => `<li><span class="kind ${e.kind}">${e.kind}</span>${esc(e.text)}</li>`).join("") || "<li>Nothing yet. Open the door.</li>"}</ol></div>
    <div class="panel"><span class="tag">HER TREASURES · UNDER THE COUCH</span>
      <ul>${profile.stash.map((t) => `<li>${esc(t.name)}</li>`).join("") || "<li>Empty. For now.</li>"}</ul>
      <span class="tag">HABITS</span>
      <ul>${[h.favNap && `Her spot: ${name(h.favNap)}`, h.favRoom && `Her territory: the ${roomName(h.favRoom)}`, h.nemesis && `Her nemesis: ${name(h.nemesis)}`, h.routine && "Routine: checks her treasures first"].filter(Boolean).map((x) => `<li>${esc(x as string)}</li>`).join("") || "<li>None yet. Habits take a few runs.</li>"}</ul></div>
    <div class="panel"><span class="tag">HER DAYS</span>
      <ol reversed>${[...profile.runs].reverse().map((r) => `<li>${esc(r.sentence)}</li>`).join("") || "<li>No days yet.</li>"}</ol></div>`;
}

function renderDebug() {
  $("#debug").innerHTML = `<summary>PLAYTEST TOOLS</summary>
    <div class="row">
      <button data-auto="1">Autoplay 1 run</button><button data-auto="5">Autoplay 5 runs</button>
      <button data-newsession>New Lucy (new seed)</button><button data-restart>Restart this seed</button><button data-copy>Copy session JSON</button>
    </div>
    <p>Autoplay picks 1–2 random unlocked items and squeaks sometimes, like the smoke-test "explorer".</p>`;
}

// ---------- actions ----------
function openDoor() {
  run = startRun(profile, prep);
  prevPos = { x: run.x, y: run.y }; acc = 0;
  phase = "run";
  setState(); renderSide();
}
function endRun() {
  if (!run) return;
  const spec: RunSpec = { prep: run.prep, ...(run.squeakedAt !== null ? { squeakAt: run.squeakedAt } : {}) };
  last = finishRun(profile, run);
  session.runs.push(spec); persist();
  run = null; phase = "day";
  $("#now").textContent = "";
  setState(); renderSide(); renderBook();
}
function autoplay(n: number) {
  for (let i = 0; i < n; i++) {
    const open = unlockedItems(profile);
    const r = Math.random();
    const a = open[Math.floor(Math.random() * open.length)];
    let b = open[Math.floor(Math.random() * open.length)];
    if (b === a) b = open[(open.indexOf(a) + 1) % open.length];
    const p: ItemId[] = r < 0.7 ? [a, b] : [a];
    if (profile.leftover?.kind === "grudgy" && Math.random() < 0.3) p.push("bath");
    const squeakAt = Math.random() < 0.35 ? 60 + Math.floor(Math.random() * 500) : undefined;
    const rr = startRun(profile, p);
    while (!rr.done) { if (squeakAt !== undefined && rr.tick === squeakAt) squeak(rr); step(rr); }
    last = finishRun(profile, rr);
    session.runs.push({ prep: p, ...(squeakAt !== undefined && rr.squeakedAt !== null ? { squeakAt } : {}) });
  }
  persist(); phase = "day"; run = null; setState(); renderSide(); renderBook();
}

document.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.god !== undefined) { god = t.checked; if (!god) prep = prep.filter((x) => !ITEMS[x].godMode); renderSide(); }
});

document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.item) {
    const id = d.item as ItemId;
    if (ITEMS[id].godMode) prep = prep.includes(id) ? prep.filter((x) => x !== id) : [...prep, id];
    else {
      const everyday = prep.filter((x) => !ITEMS[x].godMode), extra = prep.filter((x) => ITEMS[x].godMode);
      prep = [...(everyday.includes(id) ? everyday.filter((x) => x !== id) : [...everyday, id].slice(-2)), ...extra];
    }
    renderSide();
  } else if ("open" in d) openDoor();
  else if ("squeak" in d && run) { squeak(run); renderSide(); }
  else if (d.speed) { speed = Number(d.speed); renderSide(); }
  else if ("skip" in d && run) { while (!run.done) { prevPos = { x: run.x, y: run.y }; step(run); } endRun(); }
  else if ("back" in d) { phase = "cage"; setState(); renderSide(); }
  else if (d.auto) autoplay(Number(d.auto));
  else if ("newsession" in d) { session = { seed: (Math.random() * 2 ** 31) | 0, runs: [] }; persist(); profile = replay(session.seed, []); last = null; run = null; phase = "cage"; prep = []; setState(); renderSide(); renderBook(); }
  else if ("restart" in d) { session = { seed: session.seed, runs: [] }; persist(); profile = replay(session.seed, []); last = null; run = null; phase = "cage"; prep = []; setState(); renderSide(); renderBook(); }
  else if ("copy" in d) navigator.clipboard?.writeText(JSON.stringify(session)).then(() => { b.textContent = "Copied"; });
});

setState(); renderSide(); renderBook(); renderDebug();
void W; void H;
