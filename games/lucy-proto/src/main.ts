// Ferret Bowling: Bowling Optional Edition — rough prototype.
// CD's risograph dollhouse (design/cd-game-ui-template.html) drawn from the real sim, painted Lucy on top.
// States: pre-run (pack the cage) · in-run (whole house + rail, or zoomed close with the chrome gone) · post-run (lamps on).
// Prepare Lucy. Open the door. Get out of the way.
import "./style.css";
import { initMusic } from "./music";
import { initVoice, playVoice } from "./voice";
import { thoughtFor } from "./thoughts";
import { CAGE, DOORS, ROOMS, STASH, THINGS, W, H, type RoomId, type Tag } from "./house";
import {
  COMBOS, EVERYDAY_IDS, ITEMS, LEFTOVER_TEXT, comboKey, finishRun, replay, squeak, startRun, step, the, unlockedItems, unlockedRooms,
  type ItemId, type Placed, type Profile, type Run, type RunEvent, type RunSpec, type RunSummary,
} from "./sim";

// ---------- session ----------
type Session = { seed: number; runs: RunSpec[] };
const KEY = "lucy:session";
const load = (): Session => {
  try {
    const v = localStorage.getItem(KEY);
    if (v) {
      const s = JSON.parse(v) as Session;
      if (s.runs.every((r) => r.prep.every((i) => i in ITEMS))) return s;
      return { seed: s.seed, runs: [] }; // saved before a design change: start that Lucy over
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
let phase: Phase = "cage"; // "day" is the end-of-run modal; a reload lands back at the cage
let prep: ItemId[] = [];
let god = false;
let zoom = false;
let run: Run | null = null;
let last: RunSummary | null = profile.runs.at(-1) ?? null;
let speed = 1;
let prevPos = { x: CAGE.x, y: CAGE.y }, tickFrac = 0, facing = -Math.PI / 2;

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const T = 24; // house px per tile: the house is 864×528
const px = (tile: number) => tile * T + T / 2;

// ---------- CD's inks and paper ----------
const INK: Record<Tag, string> = { fabric: "#b98bbf", food: "#c67139", soft: "#7a8a5e", hide: "#c9a06a", noise: "#5b8fa8", shiny: "#ffd23f", water: "#5b8fa8", warm: "#d8352a", small: "#8a5a2b" };
const FLOOR: Record<RoomId, { bg: string; tex: string }> = {
  living: { bg: "#eadfc0", tex: "repeating-linear-gradient(91deg,rgba(138,90,43,.22) 0 2px,transparent 2px 25px)" },
  kitchen: { bg: "#e4e6cd", tex: "repeating-conic-gradient(rgba(122,138,94,.3) 0% 25%,transparent 0% 50%) 0 0/26px 26px" },
  bedroom: { bg: "#e7dbe2", tex: "radial-gradient(rgba(185,139,191,.25) 1px,transparent 1.5px) 0 0/14px 14px" },
  hall: { bg: "#e6dcc0", tex: "repeating-linear-gradient(89deg,rgba(138,90,43,.2) 0 2px,transparent 2px 22px)" },
  bathroom: { bg: "#dde6e2", tex: "linear-gradient(rgba(91,143,168,.18) 1px,transparent 1px) 0 0/18px 18px,linear-gradient(90deg,rgba(91,143,168,.18) 1px,transparent 1px) 0 0/18px 18px" },
  laundry: { bg: "#e5e1ea", tex: "repeating-linear-gradient(45deg,rgba(185,139,191,.14) 0 3px,transparent 3px 12px)" },
  entry: { bg: "#e9e1cb", tex: "repeating-linear-gradient(0deg,rgba(43,36,29,.08) 0 2px,transparent 2px 16px)" },
};
const MOOD_INK: Record<string, { ink: string; word: string }> = {
  none: { ink: "#7a8a5e", word: "content today" },
  hyper: { ink: "#ffd23f", word: "wired today" },
  sleepy: { ink: "#0f5c57", word: "dozy today" },
  grudgy: { ink: "#d8352a", word: "not speaking to you" },
  bath: { ink: "#b98bbf", word: "damp and delighted" },
};
/** hand-cut edges: asymmetric radii, seeded per element so a room keeps its shape forever */
const radii = (id: string, big = 11) => {
  let h = 2166136261;
  for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const r = (k: number) => 4 + ((h >>> (k * 5)) % (big - 3));
  return `${r(0)}px ${r(1)}px ${r(2)}px ${r(3)}px`;
};
const shortName = (n: string) => n.replace(/^(a|an|the|your|her|one) /i, "");

// ---------- the house (rebuilt when it changes, never per frame) ----------
function buildRooms() {
  const unlocked = run ? run.unlocked : unlockedRooms(profile);
  const known = profile.journal.size;
  let html = "";
  for (const r of ROOMS) {
    const open = unlocked.has(r.id);
    const style = `left:${r.x * T}px;top:${r.y * T}px;width:${r.w * T}px;height:${r.h * T}px;border-radius:${radii(r.id)};`;
    if (!open) {
      const left = r.unlockAt - known;
      html += `<div class="room locked" style="${style}"><div class="tex"></div><span class="lock">${esc(r.name.toLowerCase())}<small class="${phase === "day" && left <= 5 ? "close" : ""}">${phase === "day" ? `${left} more to go` : `opens at ${r.unlockAt} known`}</small></span></div>`;
      continue;
    }
    const f = FLOOR[r.id];
    html += `<div class="room" style="${style}background:${f.bg};"><div class="tex" style="background:${f.tex}"></div>${r.id === "living" ? `<div class="sun"></div><div class="dust" style="left:150px;top:30px"></div><div class="dust" style="left:210px;top:70px;animation-delay:3s"></div>` : ""}<div class="name">${esc(r.name.toUpperCase())}</div></div>`;
  }
  for (const d of DOORS) {
    if (!unlocked.has(d.to)) continue;
    const vertical = ROOMS.some((r) => r.id === "hall" && (d.y === r.y - 1 || d.y === r.y + r.h));
    const bg = FLOOR[d.to === "kitchen" && d.x === 15 ? "living" : "hall"].bg;
    html += vertical
      ? `<div class="door" style="left:${d.x * T + 3}px;top:${d.y * T - 4}px;width:${T - 6}px;height:${T + 8}px;background:${bg}"></div>`
      : `<div class="door" style="left:${d.x * T - 4}px;top:${d.y * T + 3}px;width:${T + 8}px;height:${T - 6}px;background:${bg}"></div>`;
  }
  $("#rooms").innerHTML = html;
}

function thingShape(t: Placed) {
  const ink = INK[t.tags[0]] ?? "#8a5a2b";
  if (t.stealable) return { w: 16, h: 10, css: `background:${ink};border-radius:5px 3px 4px 3px;` };
  if (t.drag) return { w: t.id === "runner" ? 110 : 52, h: t.id === "runner" ? 20 : 26, css: `background:${ink};border-radius:${radii(t.id, 9)};background-image:repeating-linear-gradient(45deg,rgba(242,234,211,.45) 0 4px,transparent 4px 11px);` };
  if (t.tags.includes("water")) return { w: 26, h: 14, css: `background:${ink};border-radius:0 0 13px 13px;` };
  if (t.id === "couch" || t.id === "bed") return { w: t.id === "bed" ? 70 : 84, h: t.id === "bed" ? 50 : 34, css: `background:${t.id === "bed" ? "#f2ead3" : "#c67139"};border-radius:${radii(t.id)};` };
  if (t.id === "fridge" || t.id === "dryer") return { w: 34, h: 44, css: `background:#f2ead3;border-radius:${radii(t.id, 7)};` };
  if (t.tip) return { w: 26, h: 30, css: `background:${ink};border-radius:2px 3px 7px 6px;` };
  return { w: 28, h: 24, css: `background:${ink};border-radius:${radii(t.id, 8)};` };
}

function buildThings() {
  const unlocked = run ? run.unlocked : unlockedRooms(profile);
  const things = run ? run.things : profile.things;
  const stash = run ? run.stash : profile.stash;
  const thisRun = run ? run.index : (last?.index ?? -1);
  let html = "";
  // dashed ghosts: where moved things were, and where stolen things used to live
  for (const t of things) if (t.origin && unlocked.has(t.room)) {
    const s = thingShape(t);
    html += `<div class="ghost" style="left:${px(t.origin.x)}px;top:${px(t.origin.y)}px;width:${s.w}px;height:${s.h}px;border-radius:${radii(t.id, 9)}"></div>`;
  }
  for (const st of stash) {
    const home = THINGS.find((o) => o.id === st.id);
    if (!home || !unlocked.has(home.room)) continue;
    html += `<div class="ghost" style="left:${px(home.x)}px;top:${px(home.y)}px;width:16px;height:10px;border-radius:5px 3px 4px 3px"></div><div class="thing" style="left:${px(home.x)}px;top:${px(home.y) + 2}px"><div class="label red">${esc(shortName(home.name))}: gone</div></div>`;
  }
  for (const t of things) {
    if (!unlocked.has(t.room)) continue;
    const s = thingShape(t);
    const fresh = t.arrivedRun !== undefined && t.arrivedRun >= thisRun - 1;
    const label = t.knocked ? `${shortName(t.name)}: knocked over` : t.origin ? `↖ she dragged this` : t.id === "shoe" ? "HER shoe" : t.id === "bathtowel" ? "HER towel" : shortName(t.name);
    const cls = t.knocked || t.origin ? "red" : fresh ? "teal" : "";
    html += `<div class="thing${t.knocked ? " knocked" : ""}${fresh ? " new" : ""}" style="left:${px(t.x)}px;top:${px(t.y)}px"><div class="shape" style="width:${s.w}px;height:${s.h}px;${s.css}"></div><div class="label ${cls}">${esc(label)}${fresh ? " — new!" : ""}</div></div>`;
  }
  // the cage, with her mood as the blanket
  const moodKey = run?.mood.bath || (!run && prep.includes("bath")) ? "bath" : (run ? run.leftover : profile.leftover)?.kind ?? "none";
  const m = MOOD_INK[moodKey];
  html += `<div class="cage" style="left:${px(CAGE.x) - 31}px;top:${px(CAGE.y) - 30}px"><div class="bars"></div><div class="blanket" style="background:${m.ink}"></div><div class="blanket2" style="background:repeating-linear-gradient(90deg,#d8352a 0 5px,transparent 5px 13px)"></div></div>
    <div class="cage-label" style="left:${px(CAGE.x) - 36}px;top:${px(CAGE.y) + 30}px">cage — <span>${esc(m.word)}</span></div>`;
  // the hoard under the couch
  const shown = stash.slice(0, 6);
  html += `<div class="hoard" style="left:${px(STASH.x) - 34}px;top:${px(STASH.y) - 4}px">${shown.map((t) => `<i style="width:${12 + (t.name.length % 6)}px;height:${7 + (t.name.length % 4)}px;background:${INK[t.tags[0]] ?? "#8a5a2b"}"></i>`).join("")}</div>
    ${stash.length ? `<div class="hoard-label" style="left:${px(STASH.x) - 40}px;top:${px(STASH.y) + 10}px">her treasures ×${stash.length}</div>` : ""}`;
  $("#things").innerHTML = html;
}

// ---------- Lucy (painted, top-down sheet) ----------
type Pose = "idle" | "walk" | "zoom" | "swim" | "sniff" | "notice" | "wardance" | "hide" | "curl" | "nap";
const FRAMES: Record<string, string[]> = {
  walk: ["walk_1", "walk_2", "walk_3", "walk_4"], zoom: ["zoom_1", "zoom_2", "zoom_3", "zoom_4"],
  sniff: ["sniff_1", "sniff_2"], wardance: ["wardance_1", "wardance_2", "wardance_3"], curl: ["curl_1", "curl_2"], hide: ["hide"],
};
for (const names of Object.values(FRAMES)) for (const n of names) { const i = new Image(); i.src = `./sprites/top_${n}.png`; }

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
    case "play": case "roll": case "come": case "knock": return "wardance";
    case "hide": case "sulk": return "hide";
    case "doze": return "curl";
    case "glare": return "idle";
    default: return "sniff";
  }
}

function drawLucy(now: number) {
  const el = $("#lucy"), img = $<HTMLImageElement>("#lucyImg");
  let x: number, y: number, pose: Pose;
  if (run) {
    const f = Math.min(1, tickFrac);
    x = (prevPos.x + (run.x - prevPos.x) * f) * T + T / 2;
    y = (prevPos.y + (run.y - prevPos.y) * f) * T + T / 2;
    if (run.x !== prevPos.x || run.y !== prevPos.y) facing = Math.atan2(run.y - prevPos.y, run.x - prevPos.x);
    pose = poseFor(run);
  } else {
    x = px(CAGE.x) + 18; y = px(CAGE.y) + 4; facing = -Math.PI / 2;
    pose = phase === "day" ? "nap" : "idle";
  }
  const sheet = pose === "idle" ? "walk" : pose === "notice" ? "sniff" : pose === "swim" ? "zoom" : pose === "nap" ? "curl" : pose;
  // tired Lucy (no bar): she moves slower and her frames drag
  const tired = run && run.energy < 30 ? 1.8 : 1;
  const ms = (sheet === "zoom" ? 70 : sheet === "walk" ? 120 : sheet === "wardance" ? 110 : sheet === "curl" ? 900 : 320) * tired;
  const still = pose === "idle" || pose === "notice" || pose === "hide";
  const frames = FRAMES[sheet];
  const src = `./sprites/top_${frames[still ? 0 : Math.floor(now / ms) % frames.length]}.png`;
  if (!img.src.endsWith(src.slice(1))) img.src = src;
  let rot = 0, sx = 1, sy = 1;
  if (sheet === "walk" || sheet === "zoom" || sheet === "hide") rot = facing + Math.PI / 2;
  else if (sheet === "sniff") rot = facing - Math.PI / 2;
  else if (sheet === "wardance" && Math.cos(facing) < 0) sx = -1;
  if (pose === "swim") { sx *= 1.25; sy = 0.85; }
  el.style.transform = `translate(${x}px,${y}px)`;
  img.style.transform = `rotate(${rot}rad) scale(${sx},${sy})`;
  el.classList.toggle("asleep", pose === "nap" || pose === "curl");
  el.classList.toggle("notice", pose === "notice");
  drawCarry(pose);
}

/** What she has in her mouth. The sim takes a stolen thing out of the room the moment she
    grabs it, so without this it simply vanished and reappeared as a line of text. Now it
    rides along at the front of her, the same shape and ink it had on the floor. */
let carriedId: string | null = null;
function drawCarry(pose: Pose) {
  const c = $("#carry");
  const held = run?.carrying ?? null;
  if ((held?.id ?? null) !== carriedId) {
    carriedId = held?.id ?? null;
    if (held) {
      const s = thingShape(held);
      const k = Math.min(1, 20 / Math.max(s.w, s.h)); // mouth-sized
      c.innerHTML = `<div class="shape" style="width:${Math.round(s.w * k)}px;height:${Math.round(s.h * k)}px;${s.css}"></div>`;
    } else c.innerHTML = "";
  }
  if (!held || pose === "nap" || pose === "curl") { c.style.display = "none"; return; }
  c.style.display = "block";
  c.style.transform = `translate(${Math.cos(facing) * 22}px,${Math.sin(facing) * 22}px) rotate(${facing}rad)`;
}

function drawRoute() {
  const trail = run ? run.trail : last?.trail ?? [];
  $("#routeLine").setAttribute("points", trail.map(([tx, ty]) => `${px(tx)},${px(ty)}`).join(" "));
}

// ---------- camera: one house, two distances ----------
function placeHouse() {
  const frame = $("#frame"), house = $("#house");
  const fw = frame.clientWidth, fh = frame.clientHeight;
  const fit = Math.min(fw / 864, fh / 528);
  if (!zoom || !run) { house.style.transform = `translate(${(fw - 864 * fit) / 2}px,${(fh - 528 * fit) / 2}px) scale(${fit})`; return; }
  const z = Math.max(fit * 2.6, fw / 864);
  const f = Math.min(1, tickFrac);
  const lx = (prevPos.x + (run.x - prevPos.x) * f) * T + T / 2, ly = (prevPos.y + (run.y - prevPos.y) * f) * T + T / 2;
  const tx = Math.min(0, Math.max(fw - 864 * z, fw / 2 - lx * z));
  const ty = Math.min(0, Math.max(fh - 528 * z, fh / 2 - ly * z));
  house.style.transform = `translate(${tx}px,${ty}px) scale(${z})`;
}

// ---------- alerts: only the outrageous, and rationed ----------
let lastAlert = -1e9;
function alertFor(e: RunEvent): string | null {
  const n = e.target ? shortName((run?.things.concat(run.stash).find((t) => t.id === e.target)?.name) ?? e.target).toUpperCase() : "";
  if (e.verb === "steal") return e.target === "slipper" ? "SHE HAS YOUR SLIPPER" : `SHE HAS THE ${n}`;
  if (e.verb === "knock") return `THE ${n} IS DOWN`;
  if (e.verb === "drag") return `THE ${n} HAS MOVED`;
  if (e.verb === "gift") return "YOU ARE FORGIVEN";
  if (e.verb === "startle") return `AMBUSHED BY THE ${n}`;
  if (e.cause.startsWith("ritual:")) return "THAT'S A HABIT NOW";
  return null;
}
function maybeAlert(e: RunEvent) {
  const text = alertFor(e);
  const now = performance.now();
  if (!text || now - lastAlert < 12000 / Math.max(1, speed / 2)) return;
  lastAlert = now;
  $("#alert").innerHTML = `<div class="slam"><i>${esc(text)}</i><span>${esc(text)}</span></div>`;
}

// ---------- loop ----------
let acc = 0, lastT = performance.now(), seenEvents = 0;
function frame(now: number) {
  const dt = Math.min(250, now - lastT); lastT = now;
  if (phase === "run" && run && !run.done) {
    acc += dt;
    const period = 100 / speed;
    let changed = false;
    while (acc >= period && !run.done) {
      acc -= period;
      prevPos = { x: run.x, y: run.y };
      step(run);
      if (run.events.length !== seenEvents) changed = true;
    }
    tickFrac = acc / period;
    if (changed) onEvents();
    renderStatus();
    drawRoute();
    if (run.done) endRun();
  }
  drawLucy(now);
  placeHouse();
  requestAnimationFrame(frame);
}

function onEvents() {
  if (!run) return;
  const fresh = run.events.slice(seenEvents);
  seenEvents = run.events.length;
  if (fresh.some((e) => ["steal", "stash", "drag", "knock", "gift"].includes(e.verb))) buildThings();
  const stashed = fresh.find((e) => e.verb === "stash" && e.target);
  if (stashed) {
    const pop = document.createElement("div");
    pop.className = "plusone"; pop.textContent = "+1";
    pop.style.left = `${px(STASH.x) + 20}px`; pop.style.top = `${px(STASH.y) - 16}px`;
    $("#things").appendChild(pop);
  }
  for (const e of fresh) { playVoice(e.voice); maybeAlert(e); }
  renderFeed();
}

// ---------- rail + footline ----------
function renderCounters(delta = 0) {
  const h = profile.habits;
  const habits = [h.favNap, h.favRoom, h.nemesis, h.routine].filter(Boolean).length;
  const stashN = run ? run.stash.length : profile.stash.length;
  $("#counters").innerHTML = `<span>runs <b>${profile.runs.length}</b></span><span>known <b>${profile.journal.size}</b>${delta ? ` <em>+${delta}</em>` : ""}</span><span>treasures <b class="red">${stashN}</b></span><span>habits <b>${habits}</b></span>`;
}

function nowText(r: Run) {
  const a = r.action;
  if (r.done) return "Asleep";
  if (!a) return "Deciding";
  const target = a.target ? shortName(a.target.name) : "";
  if (a.notice) return `Noticed the ${target || "something"}`;
  if (a.path.length) return target ? `Heading for the ${target}` : "Going somewhere, apparently";
  const verbs: Record<string, string> = { sniff: "Sniffing", steal: "Taking", hide: "Hiding in", sulk: "Sulking behind", play: "Playing with", fish: "Fishing in", roll: "Rolling on", stash: "Checking her treasures", come: "Coming for the squeak", gift: "Bringing you something", drag: "Dragging", knock: "Knocking over", doze: "Dozing in", glare: "Glaring at", wander: "Wandering", startle: "Recovering from", nap: "Asleep on" };
  return `${verbs[a.verb] ?? "Busy with"} ${a.verb === "stash" || a.verb === "come" || a.verb === "wander" ? "" : `the ${target}`}`.trim();
}

function controlsHtml(r: Run) {
  return `<button class="squeak" data-squeak ${r.squeakedAt !== null ? "disabled" : ""}>${r.squeakedAt !== null ? "SQUEAKED" : "SQUEAK ×1"}</button>
    ${[1, 4, 16].map((s) => `<button class="chip${speed === s ? " on" : ""}" data-speed="${s}">${s}×</button>`).join("")}
    <button class="chip" data-skip>NAP →</button>`;
}

function renderStatus() {
  if (!run) return;
  const st = document.getElementById("statusWhat");
  if (st) {
    st.textContent = nowText(run);
    $("#statusWhen").textContent = `out of your hands · ${Math.round(run.tick / 10)}s`;
  }
  const cap = document.getElementById("zoomWhen");
  if (cap) cap.textContent = `${ROOMS.find((x) => x.id === (run!.rooms.size ? [...run!.rooms].at(-1) : "living"))?.name ?? ""} · ${Math.round(run.tick / 10)}s · treasures ${run.stash.length}`;
}

function renderFeed() {
  if (!run) return;
  const latest = run.events.slice(-4).reverse();
  const feed = document.getElementById("feed");
  if (feed) feed.innerHTML = latest.map((e) => `<div class="entry">${esc(e.text)}<div class="why">because: ${esc(e.cause.replace("ritual:", "habit: "))}</div></div>`).join("");
  const ritual = [...run.events].reverse().find((e) => e.cause.startsWith("ritual:"));
  const hc = document.getElementById("habitcard");
  if (hc) hc.innerHTML = ritual ? `<div class="habitcard"><div class="tape"></div><div class="head">that's a habit now</div><div class="body">${esc(ritual.text)}</div></div>` : "";
  const cap = document.getElementById("zoomCap");
  if (cap && latest[0]) cap.innerHTML = `${esc(latest[0].text)}<small>because: ${esc(latest[0].cause.replace("ritual:", "habit: "))}</small>`;
}

function renderRail() {
  const rail = $("#rail"), foot = $("#footline");
  if (phase === "run" && run) {
    rail.innerHTML = `<div class="status"><div class="when" id="statusWhen"></div><div class="what" id="statusWhat"></div></div>
      <div class="controls">${controlsHtml(run)}</div>
      <div class="box"><div class="head">she is doing things</div><div class="feed" id="feed"></div></div>
      <div id="habitcard"></div>`;
    foot.innerHTML = zoom
      ? `<div class="cap" id="zoomCap"></div><div class="right"><span class="hand" id="zoomWhen"></span>${controlsHtml(run)}<button class="chip teal" data-zoom>← BACK OUT</button></div>`
      : `<div class="note">whole house · everything at once</div><div class="right"><span class="hand">get closer →</span><button class="chip on" data-zoom>ZOOM</button></div>`;
    renderStatus(); renderFeed();
    return;
  }
  // pre-run and post-run share the rail: what happened, her treasures, and packing the cage
  const s = last;
  const jOpen = (document.getElementById("journal") as HTMLDetailsElement | null)?.open;
  const { pose, says } = moodPose();
  const stash = profile.stash;
  const stolenThisRun = new Set(s ? s.events.filter((e) => e.verb === "steal").map((e) => e.target) : []);
  const open = unlockedItems(profile);
  const k = comboKey(prep);
  const known = k && profile.journal.has(`combo:${k}`) ? `known combo: ${COMBOS[k].name}` : k && COMBOS[k] ? "something might happen with these two…" : "pick two. she does the rest.";
  const left = profile.leftover;
  const nextRun = profile.runs.length + 1;
  rail.innerHTML = `${s ? `<div class="sentence"><div class="when">run ${s.index + 1} · ${Math.round(s.ticks / 10)} seconds${s.god ? " · god mode" : ""}</div><div class="text">${esc(s.sentence)}</div></div>` : ""}
    <div class="box"><div class="head">her treasures — under the couch</div>
      ${stash.length ? `<div class="treasures">${stash.map((t) => `<div class="${stolenThisRun.has(t.id) ? "new" : ""}"><i style="background:${INK[t.tags[0]] ?? "#8a5a2b"}"></i>${esc(shortName(t.name))}${stolenThisRun.has(t.id) ? " new" : ""}</div>`).join("")}</div>` : `<div class="mood">nothing yet. give it a run.</div>`}
    </div>
    <div class="box"><div class="head">pack the cage for run ${nextRun}</div>
      <div class="cagemood"><img src="./sprites/mood_${pose}.png" alt="Lucy, ${pose}"><span>${esc(says)}</span></div>
      <div class="mood" style="margin-bottom:8px">${left ? `she is <b>${esc(LEFTOVER_TEXT[left.kind])}</b> (${esc(left.why)}). your prep only goes so far today.` : "she is in a perfectly ordinary mood."}</div>
      <div class="picks">${EVERYDAY_IDS.map((id) => {
        const locked = !open.includes(id);
        const isNew = s?.unlockedNow.some((u) => u.includes(ITEMS[id].name.toLowerCase()));
        return `<button class="pick${prep.includes(id) ? " on" : ""}" data-item="${id}" ${locked ? "disabled" : ""}>${esc(ITEMS[id].name.replace(/^A (handful of |wound-up |whispered )?/i, "").toLowerCase())}${locked ? ` <small>at ${ITEMS[id].unlockAt} known</small>` : isNew ? " <small>new</small>" : ""}</button>`;
      }).join("")}
        <button class="pick god${god ? " on" : ""}" data-god>god mode</button>
        ${god ? `<button class="pick god${prep.includes("bath") ? " on" : ""}" data-item="bath">a bath${left ? " <small>washes the mood away</small>" : ""}</button>` : ""}
      </div>
      <div class="hint">${esc(known)}</div>
    </div>
    <button class="go" data-open>OPEN THE DOOR →</button>
    <details class="journal" id="journal"${jOpen ? " open" : ""}>${journalHtml()}</details>`;
  foot.innerHTML = phase === "day" && s
    ? `<div class="note">run ${s.index + 1} is over · she is asleep${s.returned.length ? ` · you put back ${esc(s.returned.map(shortName).join(", "))}` : ""}${s.arrived ? ` · new in the house: ${esc(shortName(s.arrived))}` : ""}</div>`
    : `<div class="note">the door is closed · she is waiting</div>`;
}

// ---------- post-run: the end-of-run modal, the journal ----------
function renderCards() {
  $("#cards").innerHTML = ""; // findings live in the end-of-run modal now
}

/** The post-run portrait: one of Lucy's seven moods, chosen from what the run actually did. */
type MoodPose = "curious" | "wired" | "dozy" | "grudgy" | "damp" | "asleep" | "proud";
function moodPose(): { pose: MoodPose; says: string } {
  const top = profile.stash[profile.stash.length - 1];
  if (phase === "day" && last) {
    const achieved = last.comboFired || last.newEntries.some((e) => e.kind === "combo" || e.kind === "habit");
    if (achieved) return { pose: "proud", says: last.comboFired ? `She did ${COMBOS[last.comboFired].name}. She knows.` : "She has a new habit and she is proud of it." };
    if (last.prep.includes("bath")) return { pose: "damp", says: "Damp. Delighted. Refusing a towel she already used." };
    const out = last.leftoverOut?.kind;
    if (out === "hyper") return { pose: "wired", says: "She is still going. The run is over. Nobody told her." };
    if (out === "sleepy") return { pose: "dozy", says: "She is barely awake and would like you to stop looking." };
    if (out === "grudgy") return { pose: "grudgy", says: "She remembers. She will remember tomorrow." };
    return { pose: "asleep", says: top ? `She is full of ${shortName(top.name)} and asleep.` : "She is asleep. Do not move her." };
  }
  if (prep.includes("bath")) return { pose: "damp", says: "Bath first. She has opinions about it." };
  const k = profile.leftover?.kind;
  if (k === "hyper") return { pose: "wired", says: "She is ready. She was ready an hour ago." };
  if (k === "sleepy") return { pose: "dozy", says: "She is up. Technically." };
  if (k === "grudgy") return { pose: "grudgy", says: "She is not speaking to you." };
  return { pose: "curious", says: "She is waiting. She knows." };
}

/** The eye: nobody decided this. Only shown after the door has closed, so it can
    never be used to steer a run — read it as forensics, not as a dashboard. */
let eyeOpen = false;

/** The end-of-run card has two faces: the day, and everything she has ever taken. */
let face: "day" | "hoard" = "day";

type HoardRow = { t: Placed; state: "here" | "gave" | "gone"; when?: number };

/** Everything she has ever taken, oldest first — including what left the hoard, because
    she remembers what you took off her. */
function hoardRows(): HoardRow[] {
  const rows: HoardRow[] = [
    ...profile.stash.filter((t) => t.took).map((t) => ({ t, state: "here" as const })),
    ...profile.things.filter((t) => t.took && t.gave !== undefined).map((t) => ({ t, state: "gave" as const, when: t.gave })),
    ...profile.gone.filter((t) => t.took).map((t) => ({ t: t as Placed, state: "gone" as const, when: t.goneRun })),
  ];
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.t.took!.run - b.r.t.took!.run || a.i - b.i).map((x) => x.r);
}

function hoardHtml(s: RunSummary) {
  const rows = hoardRows();
  const here = rows.filter((r) => r.state === "here").length;
  const said: string[] = [];
  const thoughts = rows.map((r, i) => { const line = thoughtFor(r.t, session.seed, i === 0, said.slice(-2)) ?? ""; said.push(line); return line; });
  if (!rows.length) return `<div class="hoard-face"><p class="hoard-empty">Nothing under the couch yet. She is working on it.</p></div>`;
  return `<div class="hoard-face">
    <div class="hoard-sum">${here} under the couch${rows.length > here ? ` · ${rows.length - here} she lost` : ""}</div>
    <ol class="hoard-list">${rows.map((r, i) => {
      const k = r.t.took!;
      const fresh = k.run === s.index && r.state === "here";
      const note = r.state === "gave" ? `gave it back · run ${r.when! + 1}` : r.state === "gone" ? `tidied away · run ${r.when! + 1}` : fresh ? "new today" : `run ${k.run + 1}`;
      return `<li class="${r.state}${fresh ? " fresh" : ""}">
        <i style="background:${INK[r.t.tags[0]] ?? "#8a5a2b"}"></i>
        <div><b>${esc(shortName(r.t.name))}</b><span class="thought">${esc(thoughts[i])}</span></div>
        <small>${esc(note)}</small>
      </li>`;
    }).join("")}</ol>
  </div>`;
}

function workingHtml(s: RunSummary) {
  const near = s.shortlist?.near ?? [];
  const causes = s.events.filter((e) => e.cause && e.verb !== "wander").slice(-8).reverse();
  const replay = JSON.stringify({ seed: session.seed, run: s.index + 1, prep: s.prep, squeakAt: s.squeakAt });
  return `<div class="working">
    <div class="wk-head">NOBODY DECIDED THIS<small>seeded dice and tag weights · no AI in here</small></div>
    <div class="wk-grid">
      <div><b>${session.seed}</b><span>world seed</span></div>
      <div><b>${s.decisions}</b><span>decisions</span></div>
      <div><b>${s.rolls}</b><span>rolls</span></div>
      <div><b>${s.squeakAt === null ? "—" : Math.round(s.squeakAt / 10) + "s"}</b><span>you squeaked</span></div>
    </div>
    ${near.length ? `<div class="wk-sec">her last decision, and what she nearly did instead</div>
      <div class="wk-near">${near.map((n) => `<div${n.what === s.shortlist!.picked ? ' class="on"' : ""}>
        <i style="width:${Math.max(3, Math.round(n.weight * 100))}%"></i>
        <span>${esc(n.what)}</span><em>${esc(n.why.replace("ritual:", "habit: "))}</em><b>${Math.round(n.weight * 100)}%</b></div>`).join("")}</div>` : ""}
    <div class="wk-sec">what she did, and why the sim said so</div>
    <ol class="wk-log">${causes.map((e) => `<li><span>${Math.round(e.tick / 10)}s</span>${esc(e.verb)}${e.target ? " · " + esc(shortName(e.target)) : ""}<em>${esc(e.cause.replace("ritual:", "habit: "))}</em></li>`).join("")}</ol>
    <div class="wk-replay"><code>${esc(replay)}</code><button class="chip" data-copyrun>COPY REPLAY</button></div>
  </div>`;
}

/** End of run: a big portrait of the mood she ended in, what happened, then back to the cage. */
function renderModal() {
  const m = $("#endModal");
  if (phase !== "day" || !last) { m.hidden = true; m.innerHTML = ""; return; }
  const s = last;
  const { pose, says } = moodPose();
  const moodKey = s.prep.includes("bath") ? "bath" : s.leftoverOut?.kind ?? "none";
  const took = s.events.filter((e) => e.verb === "steal" && e.target).map((e) => profile.stash.find((t) => t.id === e.target)).filter(Boolean) as Placed[];
  const entries = [...s.newEntries].sort((a, b) => (b.kind !== "behaviour" ? 1 : 0) - (a.kind !== "behaviour" ? 1 : 0));
  const notes = [
    ...s.unlockedNow.map((u) => `unlocked: ${u}`),
    ...(s.returned.length ? [`you put back ${s.returned.map(shortName).join(", ")}`] : []),
    ...(s.arrived ? [`new in the house: ${shortName(s.arrived)}`] : []),
  ];
  const out = s.leftoverOut;
  m.hidden = false;
  m.innerHTML = `<div class="sheetmodal" role="dialog" aria-modal="true" aria-label="How the run went">
    <div class="portrait">
      <div class="bars"></div><div class="blanket" style="background:${MOOD_INK[moodKey].ink}"></div>
      <img src="./sprites/mood_${pose}.png" alt="Lucy, ${pose}">
      ${pose === "asleep" ? `<span class="z1">z</span><span class="z2">z</span>` : ""}
      <div class="stamp">${pose.toUpperCase()}</div>
      <div class="says">${esc(says)}</div>
    </div>
    <div class="told">
      <div class="faces" role="tablist">
        <button role="tab" data-face="day" aria-selected="${face === "day"}">THE DAY</button>
        <button role="tab" data-face="hoard" aria-selected="${face === "hoard"}">INSPECT HER HOARD · ${profile.stash.length}</button>
      </div>
      <div class="when">${face === "hoard" ? `<button class="eye" data-eye title="Show the working" aria-pressed="${eyeOpen}">◉</button>` : ""}run ${s.index + 1} · ${Math.round(s.ticks / 10)} seconds${s.god ? " · god mode" : ""}${s.prep.length ? ` · ${s.prep.map((i) => ITEMS[i].name.replace(/^A (handful of |wound-up |whispered )?/i, "").toLowerCase()).join(" + ")}` : ""}</div>
      ${face === "hoard" ? `${hoardHtml(s)}${eyeOpen ? workingHtml(s) : ""}` : `
      <h2 id="endSentence">${esc(s.sentence)}</h2>
      <div class="head">what you learned${entries.length ? ` · ${entries.length} new` : ""}</div>
      <ul class="learned">${entries.map((e) => `<li class="${e.kind}">${e.kind !== "behaviour" ? `<b>${e.kind.toUpperCase()}</b> ` : ""}${esc(e.text)}</li>`).join("") || `<li>nothing new. she did her usual. she is very consistent.</li>`}</ul>
      ${took.length ? `<div class="head">she took</div><div class="treasures">${took.map((t) => `<div class="new"><i style="background:${INK[t.tags[0]] ?? "#8a5a2b"}"></i>${esc(shortName(t.name))}</div>`).join("")}</div>` : ""}
      ${notes.length ? `<div class="notes">${notes.map((n) => `<span>${esc(n)}</span>`).join("")}</div>` : ""}
      <div class="tomorrow">${out ? `tomorrow she'll be <b>${esc(LEFTOVER_TEXT[out.kind])}</b> · ${esc(out.why)}` : s.prep.includes("bath") ? "the bath washed the mood away. clean slate." : "tomorrow she'll be her ordinary self."}</div>
      `}
      <button class="go" data-cage>BACK TO THE CAGE →</button>
    </div>
  </div>`;
  (m.querySelector("[data-cage]") as HTMLButtonElement | null)?.focus();
}

function journalHtml() {
  const entries = [...profile.journal.values()].reverse();
  return `<summary>THE JOURNAL · ${profile.journal.size} THINGS YOU KNOW</summary>
    <ol>${entries.map((e) => `<li><span class="kind ${e.kind}">${e.kind}</span>${esc(e.text)}</li>`).join("") || "<li>nothing yet. open the door.</li>"}</ol>`;
}

function renderSubline() {
  $("#subline").textContent = phase === "run" && run
    ? `Bowling Optional Edition — run ${run.index + 1}${run.prep.length ? `, ${run.prep.map((i) => ITEMS[i].name.replace(/^A (handful of |wound-up |whispered )?/i, "").toLowerCase()).join(" + ")}` : ""}`
    : phase === "day" && last ? `Bowling Optional Edition — run ${last.index + 1} is over, she is asleep` : "Bowling Optional Edition — the door is closed";
}

function renderAll(delta = 0) {
  document.body.dataset.state = phase === "run" ? "in-run" : phase === "day" ? "post-run" : "pre-run";
  document.body.dataset.zoom = zoom && phase === "run" ? "on" : "off";
  renderSubline(); renderCounters(delta); buildRooms(); buildThings(); drawRoute(); renderRail(); renderCards(); renderModal();
  if (phase !== "run") $("#alert").innerHTML = "";
}

// ---------- actions ----------
function openDoor() {
  run = startRun(profile, prep);
  prevPos = { x: run.x, y: run.y }; acc = 0; seenEvents = 0; lastAlert = -1e9;
  phase = "run";
  renderAll();
  onEvents();
}
function endRun() {
  if (!run) return;
  const spec: RunSpec = { prep: run.prep, ...(run.squeakedAt !== null ? { squeakAt: run.squeakedAt } : {}) };
  last = finishRun(profile, run);
  session.runs.push(spec); persist();
  run = null; phase = "day"; zoom = false;
  prep = prep.filter((i) => !ITEMS[i].godMode || god);
  renderAll(last.newEntries.length);
}
function backToCage() {
  if (phase !== "day") return;
  eyeOpen = false;
  face = "day";
  phase = "cage";
  renderAll();
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") backToCage(); });
function autoplay(n: number) {
  for (let i = 0; i < n; i++) {
    const open = unlockedItems(profile);
    const a = open[Math.floor(Math.random() * open.length)];
    let b = open[Math.floor(Math.random() * open.length)];
    if (b === a) b = open[(open.indexOf(a) + 1) % open.length];
    const p: ItemId[] = Math.random() < 0.7 ? [a, b] : [a];
    const squeakAt = Math.random() < 0.35 ? 60 + Math.floor(Math.random() * 500) : undefined;
    const rr = startRun(profile, p);
    while (!rr.done) { if (squeakAt !== undefined && rr.tick === squeakAt) squeak(rr); step(rr); }
    last = finishRun(profile, rr);
    session.runs.push({ prep: p, ...(squeakAt !== undefined && rr.squeakedAt !== null ? { squeakAt } : {}) });
  }
  persist(); phase = "day"; run = null; zoom = false; renderAll(last?.newEntries.length ?? 0);
}
function newLucy(seed: number) {
  session = { seed, runs: [] }; persist(); profile = replay(seed, []); last = null; run = null; phase = "cage"; prep = []; zoom = false; renderAll();
}

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
    renderRail(); buildThings();
  } else if ("god" in d) { god = !god; if (!god) prep = prep.filter((x) => !ITEMS[x].godMode); renderRail(); buildThings(); }
  else if ("open" in d) openDoor();
  else if ("cage" in d) backToCage();
  else if ("eye" in d) { eyeOpen = !eyeOpen; renderModal(); }
  else if (d.face) { face = d.face === "hoard" ? "hoard" : "day"; renderModal(); }
  else if ("copyrun" in d) {
    const s = last;
    if (s) navigator.clipboard?.writeText(JSON.stringify({ seed: session.seed, run: s.index + 1, prep: s.prep, squeakAt: s.squeakAt }))
      .then(() => { b.textContent = "COPIED"; });
  }
  else if ("squeak" in d && run) { squeak(run); renderRail(); onEvents(); }
  else if (d.speed) { speed = Number(d.speed); renderRail(); }
  else if ("skip" in d && run) { while (!run.done) { prevPos = { x: run.x, y: run.y }; step(run); } endRun(); }
  else if ("zoom" in d) { zoom = !zoom; document.body.dataset.zoom = zoom ? "on" : "off"; renderRail(); }
  else if (d.auto) autoplay(Number(d.auto));
  else if ("newsession" in d) newLucy((Math.random() * 2 ** 31) | 0);
  else if ("restart" in d) newLucy(session.seed);
  else if ("copy" in d) navigator.clipboard?.writeText(JSON.stringify(session)).then(() => { b.textContent = "Copied"; });
});
window.addEventListener("resize", placeHouse);

$("#debug").innerHTML = `<summary>playtest tools (not the game)</summary>
  <div class="row"><button data-auto="1">Autoplay 1 run</button><button data-auto="5">Autoplay 5 runs</button><button data-newsession>New Lucy</button><button data-restart>Restart this seed</button><button data-copy>Copy session JSON</button></div>
  <p>Seed ${session.seed}. Autoplay picks 1–2 random unlocked items and squeaks sometimes, like the smoke-test explorer.</p>`;

renderAll();
requestAnimationFrame(frame);
initMusic();
initVoice();

// The alpha notice: shown once per browser. It is the only thing in here that
// interrupts, so it says what is broken, what is Lucy, and where to complain.
{
  const dlg = document.getElementById("alphaDlg") as HTMLDialogElement | null;
  const go = document.getElementById("alphaGo");
  if (dlg && go) {
    go.addEventListener("click", () => { try { dlg.close(); } catch { dlg.removeAttribute("open"); } });
    try {
      if (!localStorage.getItem("lucy:seen-alpha")) {
        localStorage.setItem("lucy:seen-alpha", "1");
        try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); }
      }
    } catch { /* private window: skip it */ }
  }
}

void W; void H;
