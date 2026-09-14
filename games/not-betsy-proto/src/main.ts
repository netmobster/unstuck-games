// Bad Monkeys — rough playable prototype, wearing CD's workbench design (design/HANDOFF.md).
// Three screens are the three STATES of a bargain (landed → away → verdict), not layout options.
// A session is { seed, options, actions[] }; the run is rebuilt by replaying actions through the
// deterministic sim, so reloads, real-time absence and bug reports all come for free.
import "./style.css";
import {
  CONTENT, DAYS_PER_STOP, GOALS, STOPS, advanceDay, fixWith, interestForAbsence, keepMutation, leave, newRun,
  sayWords, setGoal, targetSmudge, type GoalId, type LogEntry, type Mutation, type Run, type RunOptions, type Vec,
} from "./sim";

type Action =
  | { t: "fix"; id: string }
  | { t: "goal"; g: GoalId }
  | { t: "words"; id: string }
  | { t: "keep"; id: string | null }
  | { t: "leave"; at: number }
  | { t: "day" }
  | { t: "interest"; ms: number };

type Session = { seed: number; carriedId: string | null; opts: RunOptions; actions: Action[]; msPerDay: number };
type ArchiveEntry = { date: string; seed: number; band: string; classification: string; why: string; score: number };

const SESSION_KEY = "notbetsy:session";
const ARCHIVE_KEY = "notbetsy:archive";
const CARRY_KEY = "notbetsy:carry";
const SPEEDS: [string, number][] = [
  ["Manual (buttons only)", 0],
  ["1 day = 10 seconds", 10_000],
  ["1 day = 1 minute", 60_000],
  ["1 day = 1 real day (the spec)", 86_400_000],
];

const store = {
  get<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const randomSeed = () => (Math.random() * 2 ** 31) | 0;
const params = new URLSearchParams(location.search);

let lastMsPerDay = 0;
let session: Session = store.get<Session | null>(SESSION_KEY, null) ?? fresh();
if (params.has("seed")) session = fresh(Number(params.get("seed")));
let run = rebuild(session);

// UI-only state: never part of the session, never affects the sim
const ui = { sel: null as string | null, older: false, grime: null as number | null, debugOpen: false, ledger: false };

function fresh(seed = randomSeed(), opts?: RunOptions): Session {
  // a carried-forward mutation is consumed by the next run only
  const carriedId = store.get<string | null>(CARRY_KEY, null);
  store.set(CARRY_KEY, null);
  return { seed, carriedId, opts: opts ?? { persistParts: false }, actions: [], msPerDay: lastMsPerDay };
}

function rebuild(s: Session): Run {
  const carried = s.carriedId ? CONTENT.mutations.find((m) => m.id === s.carriedId) ?? null : null;
  const r = newRun(s.seed, carried, s.opts);
  for (const a of s.actions) applyAction(r, a);
  return r;
}

function applyAction(r: Run, a: Action) {
  switch (a.t) {
    case "fix": fixWith(r, a.id); break;
    case "goal": setGoal(r, a.g); break;
    case "words": sayWords(r, a.id); break;
    case "keep": keepMutation(r, a.id); break;
    case "leave": leave(r); break;
    case "day": advanceDay(r); break;
    case "interest": interestForAbsence(r, a.ms); break;
  }
}

function act(a: Action) {
  const before = run.phase;
  session.actions.push(a);
  applyAction(run, a);
  if (before !== "verdict" && run.phase === "verdict") onVerdict();
  if (before !== run.phase) { ui.older = false; ui.sel = null; scrollTo(0, 0); }
  save();
  render();
}

function save() { lastMsPerDay = session.msPerDay; store.set(SESSION_KEY, session); }

function onVerdict() {
  const v = run.verdict!;
  const archive = store.get<ArchiveEntry[]>(ARCHIVE_KEY, []);
  archive.unshift({ date: new Date().toISOString().slice(0, 10), seed: run.seed, band: v.band, classification: v.classification, why: v.why.sentence, score: v.score });
  store.set(ARCHIVE_KEY, archive.slice(0, 50));
  store.set(CARRY_KEY, v.carry ? `${v.carry.id}` : null);
}

// ---------- real-time absence ----------
function lastLeaveAt(): number | null {
  for (let i = session.actions.length - 1; i >= 0; i--) {
    const a = session.actions[i];
    if (a.t === "leave") return a.at;
    if (a.t !== "day" && a.t !== "interest") return null;
  }
  return null;
}

function tickRealTime() {
  if (run.phase !== "away" || !session.msPerDay) return;
  const leftAt = lastLeaveAt();
  if (leftAt == null) return;
  const due = Math.min(DAYS_PER_STOP, Math.floor((Date.now() - leftAt) / session.msPerDay));
  let advanced = false;
  while (run.phase === "away" && run.day < due) {
    const landingNext = run.day === DAYS_PER_STOP - 1;
    if (landingNext) act({ t: "interest", ms: Date.now() - leftAt });
    act({ t: "day" });
    advanced = true;
  }
  if (!advanced) renderClock();
}
setInterval(tickRealTime, 1000);

// ---------- helpers ----------
const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const vec = (v: Vec) => (["scrap", "power", "smudge"] as const).filter((k) => v[k]).map((k) => `${sign(v[k]!)} ${k}`).join(", ");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The Prestige's tolerance. At the verdict the sim's clock has run past the last day, so pin it to the end of stop 3. */
const target = () => (run.phase === "verdict" ? 3 + STOPS * DAYS_PER_STOP * 0.9 : targetSmudge(run));

// ---------- CD's systems: voices, tilts, kit-bashed modules, hardpoints ----------
/* FOUR VOICES = FOUR MATERIALS. Do not add a fifth without a new material. */
const VOICE: Record<LogEntry["who"], { label: string; bg: string; fg: string; meta: string; font: string; size: string; radius: string; tape: boolean }> = {
  "not-betsy": { label: "NOT BETSY", bg: "#f6efe2", fg: "#1c2026", meta: "#b8562e", font: "var(--fh)", size: "21px", radius: "2px", tape: true },
  prestige: { label: "THE PRESTIGE", bg: "#ffffff", fg: "#343a44", meta: "#5b6473", font: "var(--fm)", size: "12px", radius: "0", tape: false },
  jame: { label: "JAME", bg: "#ffe98a", fg: "#1c2026", meta: "#b8562e", font: "var(--fs)", size: "19px", radius: "0", tape: true },
  system: { label: "SYSTEM", bg: "rgba(0,0,0,.35)", fg: "#c9cfd8", meta: "#9aa3b0", font: "var(--fm)", size: "11px", radius: "999px", tape: false },
};
/* Nothing in this UI is perfectly straight. Cycled, not random, so the layout is stable across re-renders. */
const TILTS = ["-1.2deg", ".9deg", "-.6deg", "1.4deg", "-1deg", ".7deg", "-1.5deg"];
const ROTS = [-8, 12, -4, 6, -10, 3, -6, 9];
const SHAPES: Record<string, { d: string; acc: string }> = {
  defence: { d: "M-16,-14 h32 v16 q0,16 -16,20 q-16,-4 -16,-20z", acc: "M-7,-5 h14 M0,-5 v16" },
  repair: { d: "M-18,-7 h24 v14 h-24z M7,-14 a12,12 0 1,1 0,28 l-5,-7 v-14z", acc: "M-14,0 h16" },
  food: { d: "M-16,-5 h32 v16 q0,7 -7,7 h-18 q-7,0 -7,-7z", acc: "M-10,-5 v-10 h20 v10 M-5,-15 v-6 M5,-15 v-6" },
  comms: { d: "M-18,5 a18,18 0 0,1 36,0 z", acc: "M0,5 v-18 M-6,-14 h12" },
  power: { d: "M-16,-10 h30 v20 h-30z M14,-5 h5 v10 h-5z", acc: "M-10,-5 h7 M-1,0 h7 M-10,5 h7" },
  hull: { d: "M-18,-12 h36 v24 h-36z", acc: "M-14,-7 h3 M11,-7 h3 M-14,7 h3 M11,7 h3 M-18,0 h36" },
  propulsion: { d: "M-16,-12 h20 l14,12 l-14,12 h-20z", acc: "M-22,-6 h-7 M-22,0 h-10 M-22,6 h-7" },
};
/* EIGHT hardpoints. Parts beyond these go on the sled. */
const HP: [number, number][] = [[150, 112], [260, 96], [370, 112], [420, 190], [370, 268], [260, 284], [150, 268], [100, 190]];

function noteHtml(e: LogEntry, i: number) {
  const v = VOICE[e.who], tilt = TILTS[i % TILTS.length];
  return `<div class="note wear-sm torn-a" style="background:${v.bg};color:${v.fg};border-radius:${v.radius};transform:rotate(calc(${tilt} * (1 + var(--g) * .8)))">
    ${v.tape ? `<span class="tape" style="left:${20 + ((i * 37) % 60)}%;transform:rotate(${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg)"></span>` : ""}
    <div class="meta" style="color:${v.meta}"><span>${v.label}</span><span>STOP ${e.stop + 1} · DAY ${e.day}</span></div>
    <div class="body" style="font-family:${v.font};font-size:${v.size}">${esc(e.text)}</div>
  </div>`;
}

const fits = (m: Mutation) => m.solves.includes(run.planet.need);

// ---------- grime: one number, derived from the audit ----------
function grimeValue() {
  if (ui.grime !== null) return ui.grime; // playtest override
  return clamp((run.smudge - target()) / 2, 0, 5);
}
function applyGrime() {
  const g = grimeValue();
  const root = $("#root");
  root.style.setProperty("--g", g.toFixed(3));
  root.classList.toggle("twitch", g >= 3); // the layout only twitches once things are genuinely bad
}

// ---------- render ----------
function render() {
  applyGrime();
  renderTicker();
  const app = $("#app");
  if (run.phase === "landed") app.innerHTML = landedHtml();
  else if (run.phase === "away") app.innerHTML = awayHtml();
  else app.innerHTML = verdictHtml();
  renderDebug();
  renderClock();
}

function renderTicker() {
  const t = target();
  const max = Math.max(10, t * 2, run.smudge);
  const audit = String(store.get<ArchiveEntry[]>(ARCHIVE_KEY, []).length + (run.phase === "verdict" ? 0 : 1)).padStart(4, "0");
  const fronts = [
    { name: "VORIAN", desc: "Watches her whenever she is weirder than expected", on: run.fronts.vorian, of: 10 },
    { name: "TUBS", desc: "Flags irregular cargo", on: run.fronts.tubs, of: 6 },
    { name: "SYNTHESIS", desc: "Scheduled improvements", on: run.fronts.synthesis, of: 9 },
  ];
  $("#ticker").innerHTML = `
    <span class="tape tape-pink" style="left:24px;transform:rotate(-3deg)"></span>
    <span class="lbl">THE PRESTIGE · AUDIT ${audit}</span>
    <span class="grp">STOP <b>${Math.min(run.stop + 1, STOPS)} / ${STOPS}</b></span>
    <span class="grp">SMUDGE <b style="color:var(--rust)">${run.smudge}</b>
      <span class="bar"><i style="width:${Math.min(100, (run.smudge / max) * 100)}%"></i><u style="left:${(t / max) * 100}%"></u></span>
      <span style="color:var(--muted)">TARGET ${Math.round(t)}</span></span>
    <span class="res"><span>SCRAP <b>${run.scrap}</b></span><span>POWER <b>${run.power}</b></span></span>
    <span class="fronts">${fronts.map((f) => `<span class="front" title="${esc(f.desc)}">${f.name}
      <span class="clock">${Array.from({ length: f.of }, (_, i) => `<span style="background:${i < f.on ? "#5b6473" : "transparent"}"></span>`).join("")}</span></span>`).join("")}</span>`;
}

// ----- LANDED -----
function lastWordsSaid() {
  for (let i = run.ledger.length - 1; i >= 0; i--) {
    const l = run.ledger[i];
    if (l.kind === "leave") return CONTENT.words.find((w) => w.id === (l.detail as { words: string }).words) ?? null;
  }
  return null;
}

function landedHtml() {
  const returned = run.stop === 0 ? run.log.slice(0, run.landLogIndex) : run.returnLog;
  const arrival = run.log.slice(run.landLogIndex, run.landEndIndex);
  const newestFirst = [...returned, ...arrival].reverse();
  const shown = ui.older ? newestFirst : newestFirst.slice(0, 5);
  const hidden = newestFirst.length - 5;
  const said = lastWordsSaid();

  return `<main id="landed">
    <!-- COLUMN 1 — HER LOG. This is the content of the game. Read it first. -->
    <section class="col">
      <div class="hand" style="font-size:26px;transform:rotate(-2deg)">${run.stop === 0 ? "what she did before we set off" : "what she did while I was gone"}</div>
      ${said ? `<div class="said wear-sm torn-b">
        <span class="tape" style="left:50%;transform:translateX(-50%) rotate(2deg)"></span>
        <span class="k">I SAID, ON THE WAY OUT</span>“${esc(said.line)}”
        <span class="lit">she heard: ${esc(said.literal_reading)}</span>
      </div>` : ""}
      <div class="col">${shown.map(noteHtml).join("") || `<div class="empty">she logged nothing. that is its own kind of report.</div>`}</div>
      ${hidden > 0 ? `<button class="unfold" data-unfold>${ui.older ? "fold the older days away" : `she left ${hidden} ${hidden === 1 ? "entry" : "entries"} out. unfold ${hidden === 1 ? "it" : "them"} →`}</button>` : ""}
    </section>

    <!-- COLUMN 2 — THE SHIP, then TODAY'S PROBLEM. -->
    <section class="col" style="gap:18px">
      ${shipHtml()}
      ${orderHtml()}
    </section>

    <!-- COLUMN 3 — THE RIDICULOUS PART, then WHAT I'LL SAY. -->
    <section class="col" style="gap:20px">
      ${tagHtml()}
      ${postitHtml()}
    </section>
  </main>`;
}

/** Parts the Prestige took since the last time Jame stood here: shown dashed on the hull. */
function recentlyTidied() {
  const live = new Set(run.mutations.map((m) => m.id));
  return run.tidied.filter((t) => !live.has(t.id) && ((t.stop === run.stop - 1 && t.day > 0) || (t.stop === run.stop && t.day === 0)));
}

function selectedPart(): Mutation | null {
  if (!run.mutations.length) return null;
  const found = run.mutations.find((m) => m.id === ui.sel);
  if (found) return found;
  return run.mutations.find(fits) ?? run.mutations[0];
}

function shipHtml() {
  const onShip = run.mutations.slice(0, 8), sled = run.mutations.slice(8);
  const ghosts = recentlyTidied().slice(0, Math.max(0, 8 - onShip.length));
  const sel = selectedPart();
  const modules = onShip.map((m, i) => {
    const [x, y] = HP[i], sh = SHAPES[m.category] ?? SHAPES.hull;
    const isKept = m.id === run.keptId, paysOff = fits(m), isSel = m.id === sel?.id;
    const fill = paysOff ? "#ff5fa2" : "#5b6473";
    const stroke = isKept ? "#ffd02e" : "#1c2026";
    return `<g class="module" data-sel="${m.id}" transform="translate(${x} ${y}) rotate(${ROTS[i]})"><title>${esc(m.name)}</title>
      <circle r="30" fill="${isSel ? "rgba(255,95,162,.28)" : "transparent"}"/>
      <path d="${sh.d}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="${sh.acc}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="-10" cy="10" r="1.8" fill="#1c2026"/><circle cx="10" cy="10" r="1.8" fill="#1c2026"/>
      ${isKept ? `<text x="14" y="-14" font-size="16" fill="#ffd02e" stroke="#1c2026" stroke-width=".6">✦</text>` : ""}
      ${paysOff ? `<text x="-40" y="-22" font-family="Pacifico" font-size="13" fill="#ff5fa2" transform="rotate(-8)">this one!</text>` : ""}
    </g>`;
  }).join("");
  const ghostsSvg = ghosts.map((t, j) => {
    const i = onShip.length + j, [x, y] = HP[i], sh = SHAPES[t.category] ?? SHAPES.hull;
    return `<g transform="translate(${x} ${y}) rotate(${ROTS[i]})"><title>${esc(t.name)} (tidied away by the Prestige)</title>
      <path d="${sh.d}" fill="transparent" stroke="#1c2026" stroke-width="2.5" stroke-dasharray="4 3" opacity=".55"/>
      <path d="${sh.acc}" fill="none" stroke="#1c2026" stroke-width="2" opacity=".55"/></g>`;
  }).join("");
  // OVERFLOW: parts 9+ tow behind on a sled rather than crowding the hull.
  const sledSvg = sled.length ? `<g transform="translate(455 300)"><title>${esc(sled.map((m) => m.name).join(", "))}</title>
      <path d="M-70 -50 q30 10 50 40" fill="none" stroke="#e6e9ee" stroke-width="2" stroke-dasharray="4 4"/>
      <rect x="-22" y="-10" width="52" height="24" rx="6" fill="#e6e9ee" stroke="#1c2026" stroke-width="2.5"/>
      <text x="4" y="7" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="13" fill="#1c2026">+${sled.length}</text>
      <text x="4" y="32" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="14" fill="#f6efe2">on the sled</text>
    </g>` : "";
  const strays = run.strays.length;
  return `<div class="shipwrap">
    <div class="hand shiptitle">Not Betsy <small>· ${run.mutations.length} PARTS · ${strays} ${strays === 1 ? "STRAY" : "STRAYS"}</small></div>
    <svg class="shipsvg" viewBox="0 0 520 360">
      <defs><radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ff5fa2" stop-opacity=".45"/><stop offset="1" stop-color="#ff5fa2" stop-opacity="0"/>
      </radialGradient></defs>
      <ellipse cx="260" cy="190" rx="220" ry="140" fill="url(#glow)" style="opacity:calc(.3 + var(--g) * .4);animation:glowpulse 4s ease-in-out infinite"/>
      <ellipse cx="260" cy="330" rx="150" ry="12" fill="rgba(0,0,0,.35)"/>
      <g style="animation:hover 5s ease-in-out infinite;transform-origin:260px 190px">
        <ellipse cx="260" cy="190" rx="150" ry="88" fill="#e6e9ee" stroke="#1c2026" stroke-width="3"/>
        <path d="M120 200 q60 40 140 40 q80 0 140 -40" fill="none" stroke="#b8562e" stroke-width="7" stroke-linecap="round" stroke-dasharray="18 60" style="opacity:calc(var(--g) * .5)"/>
        <ellipse cx="260" cy="190" rx="150" ry="88" fill="none" stroke="#9aa3b0" stroke-width="1" stroke-dasharray="2 7"/>
        <path d="M140 150 l18 10 l-6 14 l22 8 M300 240 l14 -12 l10 14 M180 250 l12 -8 l14 10" fill="none" stroke="#b8562e" stroke-width="1.5" stroke-linecap="round" style="opacity:calc(var(--g) * .22)"/>
        <g fill="#b8562e" style="opacity:calc(var(--g) * .25)"><circle cx="128" cy="170" r="3"/><circle cx="392" cy="176" r="3"/><circle cx="240" cy="272" r="3"/><circle cx="330" cy="108" r="3"/><circle cx="170" cy="118" r="2.5"/></g>
        <ellipse cx="200" cy="230" rx="40" ry="10" fill="#7a3a1a" style="opacity:calc(var(--g) * .12)"/>
        <ellipse cx="308" cy="176" rx="28" ry="26" fill="#1c2026"/><ellipse cx="300" cy="168" rx="9" ry="8" fill="#5b6473"/>
        <text x="180" y="196" font-family="IBM Plex Mono" font-size="12" letter-spacing="4" fill="#9aa3b0">BETSY</text>
        <line x1="176" y1="192" x2="232" y2="192" stroke="#ff5fa2" stroke-width="3"/>
        <text x="172" y="222" font-family="Pacifico" font-size="22" fill="#ff5fa2" transform="rotate(-6 172 222)">not betsy</text>
        <g>${HP.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#9aa3b0" stroke-dasharray="2 3"/>`).join("")}</g>
        <g>${ghostsSvg}${modules}</g>
        <g>${sledSvg}</g>
      </g>
    </svg>
    <div class="aboard">
      ${run.strays.map((s) => `<span class="chip-stray" title="wants ${esc(s.want)}"><i></i>${esc(s.name)}, ${esc(s.what)}</span>`).join("")}
      ${run.habits.map((h) => `<span class="chip-habit">habit: ${esc(h.habit)}</span>`).join("")}
    </div>
  </div>`;
}

function orderHtml() {
  const tries = run.fixed.filter((f) => f.planet === run.planet.id);
  const last = tries[tries.length - 1];
  const status = !last ? "" : last.result === "solved" ? "solved!" : last.result === "partial" ? "partial…" : "failed";
  const color = status === "solved!" ? "var(--good)" : status === "partial…" ? "var(--rust)" : "var(--bolt)";
  const attempts = run.log.slice(run.landEndIndex);
  return `<div class="order wear-md torn-c">
    <span class="tape tape-pink" style="right:36px;transform:rotate(4deg)"></span>
    <div class="kick"><span>WORK ORDER · STOP ${run.stop + 1} / ${STOPS}</span><span style="color:var(--rust)">${esc(run.planet.need.toUpperCase())}</span><span>CUSTOMS: ${run.customsToday.toUpperCase()}</span></div>
    <h2>${esc(run.planet.name)}</h2>
    <p>${esc(run.planet.problem)}</p>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:6px">
      <div class="tries">tries left <span style="display:flex;gap:6px">${[0, 1].map((i) => `<i style="background:${i < run.fixesLeft ? "#1c2026" : "transparent"}"></i>`).join("")}</span></div>
      <div style="font-family:var(--fs);font-size:20px;transform:rotate(-3deg);color:${color}">${status}</div>
    </div>
    ${attempts.length ? `<div class="result">${attempts.map((e) => esc(e.text)).join(" ")}</div>` : ""}
    ${last ? `<div class="stamp">${last.result === "solved" ? "RESOLVED" : "NOTED"}</div>` : ""}
  </div>`;
}

function tagHtml() {
  const p = selectedPart();
  const godnote = run.keptId
    ? "GOD MODE · 00:41 LEFT · ONE PART SURVIVES THE SHED"
    : "GOD MODE · ONE AD = ONE HOUR · KEEP ONE PART";
  if (!p) return `<div class="hangwrap"><div class="string"></div><div class="hangtag wear-md torn-d"><span class="hole"></span>
    <h3 style="margin-top:14px">nothing bolted on</h3><div class="origin">she has nothing to try. that has never stopped Jame before.</div></div></div>`;
  const kept = run.keptId === p.id;
  const here = fits(p);
  const down = [vec(p.downside), ...p.downside.tags].filter(Boolean).join(", ");
  return `<div class="hangwrap">
    <div class="string"></div>
    <div class="hangtag wear-md torn-d sel">
      <span class="hole"></span>
      <div class="meta"><span>${p.category.toUpperCase()}</span><span style="color:var(--rust);font-size:13px;letter-spacing:1px">${"✶".repeat(p.absurdity)}</span></div>
      <h3>${esc(p.name)}</h3>
      <div class="origin">${esc(run.origins[p.id] ?? "nobody knows.")}</div>
      <div class="updown">
        <div class="up"><b>+</b><span>${esc(vec(p.upside) || "nothing measurable")}</span></div>
        <div class="down"><b>−</b><span>${esc(down || "nothing yet")}</span></div>
      </div>
      <div class="solves" style="color:${here ? "var(--good)" : "var(--muted)"}">solves: ${esc(p.solves.join(", "))}. ${here ? "that's this planet." : "not this planet."}</div>
      <div class="btnrow">
        <button class="btn btn-use" data-fix="${p.id}" ${run.fixesLeft > 0 ? "" : "disabled"}>Try it on the problem</button>
        <button class="btn btn-keep${kept ? " on" : ""}" data-keep="${kept ? "" : p.id}" title="God Mode: one part survives the shed">✦ ${kept ? "kept" : "keep past this stop"}</button>
      </div>
      <div class="godnote">${godnote}</div>
    </div>
  </div>`;
}

function postitHtml() {
  const ready = !!(run.goal && run.words);
  return `<div class="postit wear-md torn-d">
    <span class="tape" style="left:30px;transform:rotate(-3deg)"></span>
    <h3>before I go</h3>
    <div class="col" style="gap:6px">
      <div class="q">this week she should:</div>
      <div class="pickrow">${(Object.keys(GOALS) as GoalId[]).map((g) => `<button class="pick${run.goal === g ? " on" : ""}" data-goal="${g}">${esc(GOALS[g].label.toLowerCase())}</button>`).join("")}</div>
    </div>
    <div class="col" style="gap:6px">
      <div class="q">and on the way out I'll say… <small>(she'll take it literally)</small></div>
      <div class="wordlist">${run.hand.map((w) => `<button class="word${run.words?.id === w.id ? " on" : ""}" data-words="${w.id}"><span>“${esc(w.line)}”</span><em>she'll hear: ${esc(w.literal_reading.toLowerCase())}</em></button>`).join("")}</div>
    </div>
    <button class="btn-leave" data-leave ${ready ? "" : "disabled"}>Leave her for a week →</button>
    <div class="foot">${ready ? "" : "circle a goal and a line first. "}${run.opts.persistParts ? "she keeps her parts this bargain (playtest toggle)." : "she sheds everything at the end of the stop, except the one I keep."}</div>
  </div>`;
}

// ----- AWAY -----
type Rumour = { day: number; who: LogEntry["who"]; text: string };

/** What Jame can hear from here: one partial report per day, derived from the ledger. Unknown is not zero. */
function rumours(): Rumour[] {
  const out: Rumour[] = [];
  for (let d = 1; d <= run.day; d++) {
    const today = run.ledger.filter((l) => l.t === `${run.stop}.${d}`);
    const has = (kind: string, detail?: string) => today.find((l) => l.kind === kind && (detail === undefined || l.detail === detail));
    const tidy = has("tidy"), bolt = has("bolt");
    let r: Omit<Rumour, "day">;
    if (tidy) r = { who: "prestige", text: String(tidy.detail) };
    else if (bolt) {
      const m = CONTENT.mutations.find((x) => x.id === (bolt.detail as { id: string }).id);
      r = { who: "system", text: `An acquisition. Category: ${m?.category ?? "unknown"}. She is not saying which.` };
    } else if (has("encounter", "stray")) r = { who: "not-betsy", text: "We have a passenger. It has opinions." };
    else if (has("encounter", "habit")) r = { who: "system", text: "She has started doing something. Regularly." };
    else if (has("drift")) r = { who: "system", text: "Power ran out. She is waiting and wondering." };
    else if (has("encounter", "prestige")) r = { who: "prestige", text: "VORIAN HAS OPENED A FILE." };
    else if (has("encounter", "repair")) r = { who: "system", text: "Something was repaired. It is louder now." };
    else if (has("encounter", "trade")) r = { who: "system", text: "Something was traded. She sounded pleased." };
    else r = { who: "not-betsy", text: "Nothing happened. I logged the nothing." };
    out.push({ day: d, ...r });
  }
  return out;
}

function awayHtml() {
  const words = run.words;
  const acquired = run.ledger
    .filter((l) => l.kind === "bolt" && l.t.startsWith(`${run.stop}.`) && Number(l.t.split(".")[1]) > 0)
    .slice(-6);
  const spots: [number, number][] = [[110, 96], [250, 92], [290, 160], [120, 176], [200, 70], [230, 190]];
  const blips = acquired.map((l, i) => {
    const [x, y] = spots[i];
    const day = Number(l.t.split(".")[1]);
    const m = CONTENT.mutations.find((x) => x.id === (l.detail as { id: string }).id);
    const known = run.day - day >= 2; // blips resolve from dashed-unknown to solid-known as the week burns down
    return `<g transform="translate(${x} ${y})">
      <rect x="-13" y="-10" width="26" height="20" rx="4" fill="${known ? "#5b6473" : "transparent"}" stroke="#1c2026" stroke-width="2" stroke-dasharray="${known ? "0" : "4 3"}" opacity="${known ? 1 : 0.6}"/>
      <text y="28" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="13" fill="#f6efe2">${known ? esc(m?.category ?? "?") + "?" : "???"}</text></g>`;
  }).join("");
  const scribble = run.day >= DAYS_PER_STOP - 1 ? "she's back soon. brace." : run.day >= 3 ? "what did the idiot do" : "she's fine. probably.";

  return `<main id="away">
    <div class="side">
      <div class="hand" style="font-size:30px;transform:rotate(-2deg)">she's out there. I'm not.</div>
      <div class="daybig"><b>${run.day}</b><span>of ${DAYS_PER_STOP} days · stop ${run.stop + 1} → ${run.stop + 2 > STOPS ? "the audit" : `stop ${run.stop + 2}`}</span></div>
      <div class="daydots">${Array.from({ length: DAYS_PER_STOP }, (_, i) => `<i style="background:${i < run.day ? "var(--paper)" : "transparent"};transform:rotate(${(i % 2 ? 1 : -1) * ((i * 3) % 9)}deg)"></i>`).join("")}</div>
      <div class="brief">I told her: <b>${esc(run.goal ? GOALS[run.goal].label.toLowerCase() : "")}</b>. And on the way out I said <em>“${esc(words?.line ?? "")}”</em>. She heard it. All of it.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-pale" data-day>Let a day pass</button>
        <button class="btn-out" data-ff>Skip to landing</button>
      </div>
      <div class="aside">or close the tab. she keeps going without me. that's the point.</div>
      <div class="clockline" id="clock"></div>
    </div>
    <div class="col">
      <svg viewBox="0 0 360 260" style="width:100%;overflow:visible">
        <g style="animation:drift 7s ease-in-out infinite;transform-origin:180px 130px">
          <ellipse cx="180" cy="130" rx="110" ry="64" fill="#e6e9ee" stroke="#1c2026" stroke-width="3"/>
          <ellipse cx="214" cy="120" rx="20" ry="18" fill="#1c2026"/>
          <g>${blips}</g>
        </g>
        <text x="180" y="245" text-anchor="middle" font-family="Pacifico" font-size="20" fill="#ff5fa2" transform="rotate(-3 180 245)">${scribble}</text>
      </svg>
      <div class="col" style="gap:10px">
        <div class="hand" style="font-size:20px;transform:rotate(-1deg)">what I can hear from here</div>
        <div class="col" style="gap:10px">${rumours().map((r, i) => {
          const v = VOICE[r.who];
          return `<div class="rumour wear-sm torn-b" style="background:${v.bg};color:${v.fg};transform:rotate(${TILTS[(i + 2) % TILTS.length]})">
            <span class="d" style="color:${v.meta}">DAY ${r.day}</span>
            <span class="t" style="font-family:${v.font};font-size:${v.size}">${esc(r.text)}</span></div>`;
        }).join("") || `<div class="empty">nothing yet.</div>`}</div>
        <div class="aside" style="font-size:17px">she'll tell me the rest when I land. some of it.<span style="display:inline-block;width:7px;height:14px;background:var(--pink);margin-left:6px;vertical-align:-2px;animation:blink 1s steps(1) infinite"></span></div>
      </div>
    </div>
  </main>`;
}

// ----- VERDICT -----
function verdictHtml() {
  const v = run.verdict!;
  const t = target();
  const band = v.band.toUpperCase();
  const bandNote = v.band === "unclassifiable" ? "the form broke. she fits no field."
    : v.band === "deferred" ? "persistence detected. retry scheduled."
    : "subject deleted. one part retained, improved.";
  // Jame's correction to their classification: the thing she did most, in one word
  const correction = Object.entries(run.tags).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "hers";
  // the best thing they took from her
  const optimized = [...run.tidied].sort((a, b) => b.absurdity - a.absurdity || b.stop - a.stop)[0];
  const archive = store.get<ArchiveEntry[]>(ARCHIVE_KEY, []);
  const carry = v.carry ? `next Not Betsy starts with one "optimized" part: ${v.carry.name}.`
    : v.band === "archived" ? "nothing left of her to carry forward." : "she persists. retry scheduled.";
  return `<main id="verdict">
    <div class="hand" style="font-size:28px;transform:rotate(-2deg)">their report came. I wrote on it.</div>
    <div style="position:relative;transform:rotate(calc(-.8deg - var(--g) * .5deg))">
      <span class="tape tape-pink" style="left:40px;top:-10px;width:70px;height:18px;transform:rotate(-4deg);z-index:2"></span>
      <div class="report wear-lg torn-a">
        <div class="hd"><span>THE PRESTIGE · AUDIT REPORT</span><span>SEED ${run.seed}</span></div>
        <div class="rows">
          <span>SUBJECT</span><span style="font-weight:600">NOT BETSY</span>
          <span>STOPS</span><span>${STOPS} / ${STOPS} · SOLVED ${run.fixed.filter((f) => f.result === "solved").length}</span>
          <span>SMUDGE</span><span>${run.smudge} · TARGET ${Math.round(t)} · <span style="color:var(--rust)">${run.smudge >= t ? `+${Math.round(run.smudge - t)} OVER` : `${Math.round(t - run.smudge)} UNDER`}</span></span>
          <span>SCORE</span><span class="score">${v.score}</span>
          <span>BAND</span><span><span class="band">${band}</span> <span style="color:var(--bolt)">— ${bandNote}</span></span>
          <span>CLASSIFICATION</span><span style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="struck">${esc(v.classification)}</span><span class="mark">${esc(correction)}</span></span>
          <span>OPTIMIZED</span><span>${optimized ? `${esc(optimized.name)} <span class="tagpill">OPTIMIZED</span> <span style="font-family:var(--fh);font-size:17px;color:var(--rust)">${optimized.absurdity >= 2 ? "that was the best thing she had" : "she barely noticed"}</span>` : `NOTHING <span style="font-family:var(--fh);font-size:17px;color:var(--rust)">she hid everything</span>`}</span>
          <span>PURPOSE</span><span style="font-family:var(--fs);color:var(--pink);font-size:22px">yes</span>
        </div>
        <div class="bigstamp">${band}</div>
      </div>
      <!-- the one sentence the Archive keeps -->
      <div class="why">${esc(v.why.sentence)}</div>
    </div>
    <div class="aftermath">
      <div class="reg">register: ${esc(v.why.register)} · added to the archive<br>${esc(carry)}</div>
      <button class="btn-new" data-new>New bargain</button>
    </div>
    <div class="col" style="gap:10px;margin-top:8px">
      <div class="hand" style="font-size:22px;transform:rotate(-1deg)">the archive · every why so far</div>
      <div class="col" style="gap:10px">${archive.map((a, i) => `<div class="arow wear-sm torn-b" style="transform:rotate(${TILTS[i % TILTS.length]})">
        <span class="d">${esc(a.date)}</span><span class="b">${esc(a.band.toUpperCase())}</span><span class="w">${esc(a.why)}</span></div>`).join("")}</div>
    </div>
  </main>`;
}

// ---------- playtest drawer (replaces CD's dev panel; not part of the game) ----------
function renderDebug() {
  const g = grimeValue();
  $("#debug").innerHTML = `<details class="debug" ${ui.debugOpen ? "open" : ""}>
    <summary>PLAYTEST</summary>
    <div class="rows">
      <label>Time <select data-speed>${SPEEDS.map(([l, ms]) => `<option value="${ms}" ${session.msPerDay === ms ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Grime ${ui.grime === null ? `(from smudge) ${g.toFixed(2)}` : `(override) ${g.toFixed(2)}`}
        <input type="range" data-grime min="0" max="5" step="0.25" value="${g}"></label>
      <label><span><input type="checkbox" data-persist ${session.opts.persistParts ? "checked" : ""}> Parts persist between stops (new runs)</span></label>
      <div class="btns">
        ${ui.grime !== null ? `<button data-grime-reset>Grime from smudge</button>` : ""}
        <button data-auto>Autoplay to verdict</button>
        <button data-restart>Restart seed</button>
        <button data-newseed>New run</button>
        <button data-ledger>${ui.ledger ? "Hide" : "Show"} full log</button>
        <button data-copy>Copy session JSON</button>
      </div>
      ${ui.ledger ? `<pre>${esc(run.log.map((e) => `S${e.stop + 1}·D${e.day} ${VOICE[e.who].label}: ${e.text}`).join("\n"))}</pre>` : ""}
    </div>
  </details>`;
}

function renderClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  if (!session.msPerDay) { el.textContent = "time: manual (playtest drawer)."; return; }
  const leftAt = lastLeaveAt();
  if (leftAt == null) return;
  const nextDayAt = leftAt + (run.day + 1) * session.msPerDay;
  const secs = Math.max(0, Math.round((nextDayAt - Date.now()) / 1000));
  el.textContent = `next day in ${secs >= 3600 ? `${(secs / 3600).toFixed(1)} h` : `${secs} s`}.`;
}

// ---------- input ----------
document.addEventListener("click", (e) => {
  const el = e.target as Element;
  const mod = el.closest("[data-sel]") as HTMLElement | SVGElement | null;
  if (mod) { ui.sel = mod.getAttribute("data-sel"); render(); return; }
  const b = el.closest("button");
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.fix) act({ t: "fix", id: d.fix });
  else if (d.keep !== undefined) act({ t: "keep", id: d.keep || null });
  else if (d.goal) act({ t: "goal", g: d.goal as GoalId });
  else if (d.words) act({ t: "words", id: d.words });
  else if ("leave" in d) act({ t: "leave", at: Date.now() });
  else if ("day" in d) act({ t: "day" });
  else if ("ff" in d) { while (run.phase === "away") act({ t: "day" }); }
  else if ("unfold" in d) { ui.older = !ui.older; render(); }
  else if ("new" in d) { session = fresh(randomSeed(), session.opts); run = rebuild(session); save(); render(); scrollTo(0, 0); }
  else if ("grimeReset" in d) { ui.grime = null; render(); }
  else if ("ledger" in d) { ui.ledger = !ui.ledger; render(); }
  else if ("restart" in d) { session = { ...session, actions: [] }; run = rebuild(session); save(); render(); }
  else if ("newseed" in d) { session = fresh(randomSeed(), session.opts); run = rebuild(session); save(); render(); }
  else if ("auto" in d) autoplay();
  else if ("copy" in d) navigator.clipboard?.writeText(JSON.stringify(session)).then(() => { b.textContent = "Copied"; });
});

document.addEventListener("toggle", (e) => {
  if ((e.target as HTMLElement).classList?.contains("debug")) ui.debugOpen = (e.target as HTMLDetailsElement).open;
}, true);

document.addEventListener("input", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.grime !== undefined) { ui.grime = Number(t.value); applyGrime(); }
});

document.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.grime !== undefined) render();
  if (t.dataset.speed !== undefined) { session.msPerDay = Number(t.value); save(); render(); }
  if (t.dataset.persist !== undefined) { session.opts = { ...session.opts, persistParts: t.checked }; save(); }
});

function autoplay() {
  let guard = 0;
  while (run.phase !== "verdict" && guard++ < 200) {
    if (run.phase === "landed") {
      const fit = run.mutations.find(fits);
      if (fit && run.fixesLeft > 0) act({ t: "fix", id: fit.id });
      const goals = Object.keys(GOALS) as GoalId[];
      act({ t: "goal", g: goals[Math.floor(Math.random() * goals.length)] });
      act({ t: "words", id: run.hand[Math.floor(Math.random() * run.hand.length)].id });
      act({ t: "leave", at: Date.now() });
    } else act({ t: "day" });
  }
}

render();
