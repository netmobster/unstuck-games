// Not Betsy — rough playable prototype. Functional UI only (CD designs later).
// A session is { seed, options, actions[] }; the run is rebuilt by replaying actions through the
// deterministic sim, so reloads, real-time absence and bug reports all come for free.
import "./style.css";
import {
  CONTENT, DAYS_PER_STOP, GOALS, STOPS, advanceDay, fixWith, interestForAbsence, keepMutation, leave, newRun,
  sayWords, setGoal, targetSmudge, type GoalId, type LogEntry, type Mutation, type Run, type RunOptions,
} from "./sim";

type Action =
  | { t: "fix"; id: string }
  | { t: "goal"; g: GoalId }
  | { t: "words"; id: string }
  | { t: "keep"; id: string | null }
  | { t: "leave"; at: number }
  | { t: "day" }
  | { t: "interest"; ms: number };

type Layout = "panels" | "ship" | "log";
type Session = { seed: number; carriedId: string | null; opts: RunOptions; actions: Action[]; msPerDay: number; layout?: Layout };
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
let showLedger = false;
if (params.has("layout")) session.layout = params.get("layout") as Layout;

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

// ---------- rendering ----------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const app = document.getElementById("app")!;
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const vec = (v: { scrap?: number; power?: number; smudge?: number }) =>
  (["scrap", "power", "smudge"] as const).filter((k) => v[k]).map((k) => `${sign(v[k]!)} ${k}`).join(", ") || "nothing";

function logHtml(entries: LogEntry[], empty: string) {
  if (!entries.length) return `<p class="dim">${empty}</p>`;
  return `<ol class="log">${entries.map((e) => `<li class="who-${e.who}"><span class="when">${e.who === "system" ? "" : `S${e.stop + 1}·D${e.day}`}</span> ${esc(e.text)}</li>`).join("")}</ol>`;
}

function partHtml(m: Mutation) {
  const canFix = run.phase === "landed" && run.fixesLeft > 0;
  const kept = run.keptId === m.id;
  const fits = m.solves.includes(run.planet.need);
  return `<li class="part${kept ? " kept" : ""}">
    <div class="part-head"><b>${esc(m.name)}</b> <span class="dim">${m.category} · ${"✶".repeat(m.absurdity)}</span></div>
    <div class="part-body">
      <span class="up">upside: ${vec(m.upside)}</span> · <span class="down">downside: ${vec(m.downside)}${m.downside.tags.length ? ` (${m.downside.tags.join(", ")})` : ""}</span><br>
      <span class="dim">solves: ${m.solves.join(", ")}${showLedger && fits ? " ◀ fits this planet" : ""}</span>
    </div>
    ${run.phase === "landed" ? `<div class="part-actions">
      <button data-fix="${m.id}" ${canFix ? "" : "disabled"}>Use on the problem</button>
      <button data-keep="${kept ? "" : m.id}" class="god">${kept ? "✦ Kept (God Mode)" : "✦ Keep past this stop"}</button>
    </div>` : ""}
  </li>`;
}

function rust() {
  const t = Math.max(1, targetSmudge(run));
  return Math.max(0, Math.min(1, run.smudge / (t * 1.6)));
}

function render() {
  document.body.style.setProperty("--rust", rust().toFixed(3));
  document.body.style.setProperty("--tidy", Math.min(1, (run.fronts.vorian + run.fronts.tubs + run.fronts.synthesis) / 18).toFixed(3));
  document.body.dataset.phase = run.phase;

  const clock = (n: number, max: number, label: string) =>
    `<span class="clock" title="${label}">${label} <i>${"■".repeat(Math.min(n, max))}${"□".repeat(Math.max(0, max - n))}</i></span>`;

  const header = `<header>
    <div class="title">BAD MONKEYS <span class="dim">rough prototype · placeholder content</span></div>
    <div class="meta">Stop ${Math.min(run.stop + 1, STOPS)}/${STOPS} ${run.phase === "away" ? `· away, day ${run.day}/${DAYS_PER_STOP}` : ""} · seed ${run.seed}</div>
    <div class="res"><span>Scrap <b>${run.scrap}</b></span><span>Power <b>${run.power}</b></span><span>Smudge <b>${run.smudge}</b> <span class="dim">(target ${targetSmudge(run).toFixed(0)})</span></span></div>
    <div class="fronts">${clock(run.fronts.vorian, 10, "Vorian")}${clock(run.fronts.tubs, 6, "Tubs")}${clock(run.fronts.synthesis, 9, "Synthesis")}</div>
  </header>`;

  let body = "";
  document.body.dataset.layout = session.layout ?? "panels";
  if (run.phase === "landed") body = session.layout === "ship" ? landedShipHtml() : session.layout === "log" ? landedLogHtml() : landedHtml();
  else if (run.phase === "away") body = awayHtml();
  else body = verdictHtml();

  app.innerHTML = header + body + debugHtml();
  renderClock();
}

function landedHtml() {
  const returned = run.stop === 0 ? run.log.slice(0, run.landLogIndex) : run.returnLog;
  const here = run.log.slice(run.landLogIndex);
  const goal = run.goal;
  return `<main class="grid">
    <section class="panel">
      <h2>${run.stop === 0 ? "Her log (before you set off)" : "Her log, while you were away"}</h2>
      ${logHtml(returned, "She logged nothing. That is its own kind of report.")}
    </section>
    <section class="panel planet">
      <h2>${esc(run.planet.name)} <span class="tag">${run.planet.need}</span> ${run.customsToday !== "none" ? `<span class="tag prestige">customs: ${run.customsToday}</span>` : ""}</h2>
      <p>${esc(run.planet.problem)}</p>
      ${logHtml(here, "")}
      <p class="dim">Fix attempts left: ${run.fixesLeft}</p>
    </section>
    <section class="panel">
      <h2>What she's got (${run.mutations.length})</h2>
      <ul class="parts">${run.mutations.map(partHtml).join("") || `<li class="dim">No parts.</li>`}</ul>
      <h3>Strays</h3><p>${run.strays.map((s) => `<b>${esc(s.name)}</b> <span class="dim">(${esc(s.what)}; wants ${esc(s.want)})</span>`).join("<br>") || `<span class="dim">none</span>`}</p>
      <h3>Habits</h3><p>${run.habits.map((h) => esc(h.habit)).join(" · ") || `<span class="dim">none yet</span>`}</p>
    </section>
    <section class="panel leave">
      <h2>Before you go</h2>
      <h3>Goal</h3>
      <div class="choices">${(Object.keys(GOALS) as GoalId[]).map((g) => `<button data-goal="${g}" class="${goal === g ? "on" : ""}">${GOALS[g].label}</button>`).join("")}</div>
      <h3>Last words <span class="dim">(draw 3, say 1; she takes it literally)</span></h3>
      <div class="choices words">${run.hand.map((w) => `<button data-words="${w.id}" class="${run.words?.id === w.id ? "on" : ""}">“${esc(w.line)}”</button>`).join("")}</div>
      <button class="primary" data-leave ${goal && run.words ? "" : "disabled"}>Leave Not Betsy for a week</button>
      ${run.opts.persistParts ? "" : `<p class="dim">She sheds everything at the end of the stop (except the one you keep).</p>`}
    </section>
  </main>`;
}

function awayHtml() {
  return `<main class="grid away">
    <section class="panel">
      <h2>Away · day ${run.day} of ${DAYS_PER_STOP}</h2>
      <p class="dim">Jame said: “${esc(run.words?.line ?? "")}” · Goal: ${run.goal ? GOALS[run.goal].label : ""}</p>
      <div class="choices">
        <button data-day>Next day</button>
        <button class="primary" data-ff>Fast-forward to the next landing</button>
      </div>
      <p id="clock" class="dim"></p>
      <p class="dim">In the real game you'd close the tab here. What she's doing is hidden until you land; this prototype shows it so you can watch the machine.</p>
      ${logHtml(run.returnLog, "Nothing yet.")}
    </section>
  </main>`;
}

function verdictHtml() {
  const v = run.verdict!;
  const archive = store.get<ArchiveEntry[]>(ARCHIVE_KEY, []);
  return `<main class="verdict">
    <section class="report">
      <div class="report-head">THE PRESTIGE · AUDIT COMPLETE</div>
      <table>
        <tr><td>Subject</td><td>NOT BETSY (FORMERLY: ESCAPE POD)</td></tr>
        <tr><td>Un-optimizability score</td><td>${v.score}</td></tr>
        <tr><td>Verdict</td><td>${v.band.toUpperCase()}</td></tr>
        <tr><td>Classification</td><td>${esc(v.classification)}</td></tr>
        <tr><td>Carried forward</td><td>${v.carry ? `${esc(v.carry.name)} (to be "optimized")` : "—"}</td></tr>
      </table>
    </section>
    <section class="why">
      <div class="why-label">What the Archive kept</div>
      <p class="why-text">${esc(v.why.sentence)}</p>
      <div class="dim">${v.why.id} · ${v.why.verdict_band} / ${v.why.register}</div>
    </section>
    <div class="choices"><button class="primary" data-new>Take out a new Not Betsy</button><button data-new-persist>New run, parts persist between stops</button></div>
    <section class="panel">
      <h2>The Archive of whys</h2>
      <ol class="archive">${archive.map((a) => `<li><b>${esc(a.why)}</b> <span class="dim">${a.date} · ${a.band} · ${esc(a.classification)} · seed ${a.seed}</span></li>`).join("")}</ol>
    </section>
    <section class="panel"><h2>Full log</h2>${logHtml(run.log, "")}</section>
  </main>`;
}

function debugHtml() {
  return `<details class="debug" ${showLedger ? "open" : ""}>
    <summary>Playtest controls</summary>
    <div class="choices">
      <label>Time: <select data-speed>${SPEEDS.map(([l, ms]) => `<option value="${ms}" ${session.msPerDay === ms ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Layout: <select data-layout>${([["panels", "A · Panels"], ["ship", "B · Ship cutaway"], ["log", "C · Log-first (phone)"]] as const).map(([v, l]) => `<option value="${v}" ${(session.layout ?? "panels") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label><input type="checkbox" data-persist ${session.opts.persistParts ? "checked" : ""}> Parts persist between stops (spec question; applies to new runs)</label>
      <button data-reveal>${showLedger ? "Hide" : "Show"} hints + ledger</button>
      <button data-auto>Autoplay random choices to the verdict</button>
      <button data-restart>Restart this seed</button>
      <button data-newseed>New random run</button>
      <button data-copy>Copy session JSON (for bug reports)</button>
    </div>
    ${showLedger ? `<pre class="ledger">${esc(JSON.stringify(run.ledger.slice(-60), null, 1))}</pre>` : ""}
  </details>`;
}

function renderClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  if (!session.msPerDay) { el.textContent = "Time: manual. Use the buttons."; return; }
  const leftAt = lastLeaveAt();
  if (leftAt == null) return;
  const nextDayAt = leftAt + (run.day + 1) * session.msPerDay;
  const secs = Math.max(0, Math.round((nextDayAt - Date.now()) / 1000));
  el.textContent = `Real time: next day in ${secs >= 3600 ? `${(secs / 3600).toFixed(1)} h` : `${secs} s`}. You can close this tab.`;
}

// ---------- alternate layouts (starting points for CD; placeholder art generated in code) ----------
// Asset/layer names below match ASSET-MANIFEST.md so CD's SVGs can replace these shapes 1:1.
// fill order spreads parts around the hull: top, nose, belly, tail, then corners (labels never collide)
const HARDPOINTS: [number, number][] = [[300, 78], [490, 180], [300, 284], [110, 180], [205, 100], [395, 262], [395, 100], [205, 262]];
const CATEGORY_COLOR: Record<string, string> = {
  food: "#d08a2e", propulsion: "#c4502a", hull: "#6d7a86", comms: "#3f7fb0", defence: "#7a5aa6", power: "#c9a227", repair: "#4f8a5b",
};

function moduleGlyph(m: Mutation, x: number, y: number, kept: boolean) {
  const c = CATEGORY_COLOR[m.category] ?? "#888";
  const stroke = kept ? "#c9a227" : "#1b1d1c";
  const sw = kept ? 3 : 1.5;
  const shapes: Record<string, string> = {
    food: `<circle cx="${x}" cy="${y}" r="15" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`,
    propulsion: `<path d="M${x - 16} ${y - 12} L${x + 16} ${y} L${x - 16} ${y + 12} Z" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`,
    hull: `<rect x="${x - 18}" y="${y - 11}" width="36" height="22" rx="3" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`,
    comms: `<g stroke="${stroke}" stroke-width="${sw}"><line x1="${x}" y1="${y + 12}" x2="${x}" y2="${y - 14}"/><path d="M${x - 12} ${y - 6} Q${x} ${y - 22} ${x + 12} ${y - 6}" fill="${c}"/></g>`,
    defence: `<polygon points="${[0, 60, 120, 180, 240, 300].map((a) => `${x + 15 * Math.cos((a * Math.PI) / 180)},${y + 15 * Math.sin((a * Math.PI) / 180)}`).join(" ")}" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`,
    power: `<polygon points="${x},${y - 16} ${x + 12},${y} ${x},${y + 16} ${x - 12},${y}" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`,
    repair: `<g fill="${c}" stroke="${stroke}" stroke-width="${sw}"><rect x="${x - 4}" y="${y - 16}" width="8" height="32"/><rect x="${x - 16}" y="${y - 4}" width="32" height="8"/></g>`,
  };
  const label = m.name.length > 22 ? `${m.name.slice(0, 21)}…` : m.name;
  const ly = y < 180 ? y - 24 : y + 32;
  return `<g class="module" data-layer="module:${m.category}">${shapes[m.category] ?? shapes.hull}<text x="${x}" y="${ly}" text-anchor="middle">${esc(label)}</text></g>`;
}

function shipSvg() {
  const amber = run.smudge > targetSmudge(run);
  const modules = run.mutations.slice(0, HARDPOINTS.length).map((m, i) => moduleGlyph(m, HARDPOINTS[i][0], HARDPOINTS[i][1], run.keptId === m.id)).join("");
  const strays = run.strays.map((s, i) => `<g data-layer="stray"><circle cx="${270 + i * 30}" cy="182" r="11" fill="#fbf3e6" stroke="#1b1d1c"/><text x="${270 + i * 30}" y="186" text-anchor="middle" class="initial">${esc(s.name.replace(/^The /, "")[0])}</text></g>`).join("");
  const habits = run.habits.map((_, i) => `<circle data-layer="habit" cx="${250 + i * 12}" cy="222" r="3" fill="#b5541c"/>`).join("");
  return `<svg class="ship" viewBox="0 0 600 360" role="img" aria-label="Not Betsy, cutaway">
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#f4a13a" stop-opacity=".55"/><stop offset="1" stop-color="#f4a13a" stop-opacity="0"/></radialGradient>
      <pattern id="grime" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.6" fill="#6b3a17"/><circle cx="10" cy="11" r="1.1" fill="#6b3a17"/></pattern>
    </defs>
    ${amber ? `<ellipse data-layer="glow" cx="300" cy="180" rx="250" ry="140" fill="url(#glow)"/>` : ""}
    <g data-layer="hull">
      <rect x="150" y="110" width="300" height="140" rx="70" fill="#f7f8f5" stroke="#1b1d1c" stroke-width="2"/>
      <rect x="150" y="110" width="300" height="140" rx="70" fill="url(#grime)" opacity="${rust().toFixed(2)}" data-layer="grime"/>
      <circle cx="390" cy="160" r="20" fill="#dfe6ea" stroke="#1b1d1c" stroke-width="2" data-layer="window"/>
      <text x="300" y="150" text-anchor="middle" class="hull-name">NOT BETSY</text>
    </g>
    ${modules}${strays}${habits}
    ${run.mutations.length > HARDPOINTS.length ? `<text x="300" y="350" text-anchor="middle" class="initial">+${run.mutations.length - HARDPOINTS.length} more bolted on somewhere</text>` : ""}
  </svg>`;
}

function leaveControlsHtml() {
  return `<h3>Goal</h3>
    <div class="choices">${(Object.keys(GOALS) as GoalId[]).map((g) => `<button data-goal="${g}" class="${run.goal === g ? "on" : ""}">${GOALS[g].label}</button>`).join("")}</div>
    <h3>Last words</h3>
    <div class="choices words">${run.hand.map((w) => `<button data-words="${w.id}" class="${run.words?.id === w.id ? "on" : ""}">“${esc(w.line)}”</button>`).join("")}</div>
    <button class="primary" data-leave ${run.goal && run.words ? "" : "disabled"}>Leave Not Betsy for a week</button>`;
}

function landedShipHtml() {
  const returned = run.stop === 0 ? run.log.slice(0, run.landLogIndex) : run.returnLog;
  return `<main class="layout-ship">
    <section class="stage">
      ${shipSvg()}
      <ul class="parts grid-parts">${run.mutations.map(partHtml).join("") || `<li class="dim">No parts.</li>`}</ul>
    </section>
    <aside class="side">
      <section class="panel planet">
        <h2>${esc(run.planet.name)} <span class="tag">${run.planet.need}</span>${run.customsToday !== "none" ? ` <span class="tag prestige">customs: ${run.customsToday}</span>` : ""}</h2>
        <p>${esc(run.planet.problem)}</p>
        ${logHtml(run.log.slice(run.landLogIndex), "")}
        <p class="dim">Fix attempts left: ${run.fixesLeft}</p>
      </section>
      <details class="panel" ${run.stop > 0 ? "open" : ""}><summary><b>Her log while you were away (${returned.length})</b></summary>${logHtml(returned, "Nothing logged.")}</details>
      <section class="panel leave">${leaveControlsHtml()}</section>
    </aside>
  </main>`;
}

function landedLogHtml() {
  const returned = run.stop === 0 ? run.log.slice(0, run.landLogIndex) : run.returnLog;
  const bubble = (e: LogEntry) => `<div class="bubble from-${e.who}"><span class="bwho">${e.who === "not-betsy" ? "Not Betsy" : e.who === "prestige" ? "The Prestige" : e.who === "jame" ? "Jame" : ""}</span>${esc(e.text)}</div>`;
  return `<main class="layout-log">
    <div class="thread">
      <div class="thread-label">${run.stop === 0 ? "Before you set off" : "While you were away"}</div>
      ${returned.map(bubble).join("") || `<div class="bubble from-system">Nothing logged.</div>`}
      <div class="thread-label">Landed</div>
      <div class="card planet-card">
        <div class="kicker">${esc(run.planet.need)}${run.customsToday !== "none" ? ` · customs: ${run.customsToday}` : ""}</div>
        <h2>${esc(run.planet.name)}</h2>
        <p>${esc(run.planet.problem)}</p>
      </div>
      ${run.log.slice(run.landLogIndex).filter((e) => !e.text.startsWith("LANDED")).map(bubble).join("")}
      <div class="thread-label">What she's got · fix attempts left: ${run.fixesLeft}</div>
      <ul class="swipe">${run.mutations.map(partHtml).join("") || `<li class="dim">No parts.</li>`}</ul>
      ${run.strays.length || run.habits.length ? `<div class="chips">${run.strays.map((s) => `<span class="chip">${esc(s.name)}</span>`).join("")}${run.habits.map((h) => `<span class="chip habit">${esc(h.habit)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="sheet">${leaveControlsHtml()}</div>
  </main>`;
}

// ---------- input ----------
app.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.fix) act({ t: "fix", id: d.fix });
  else if (d.keep !== undefined) act({ t: "keep", id: d.keep || null });
  else if (d.goal) act({ t: "goal", g: d.goal as GoalId });
  else if (d.words) act({ t: "words", id: d.words });
  else if ("leave" in d) act({ t: "leave", at: Date.now() });
  else if ("day" in d) act({ t: "day" });
  else if ("ff" in d) { while (run.phase === "away") act({ t: "day" }); }
  else if ("new" in d || "newPersist" in d) {
    session = fresh(randomSeed(), { persistParts: "newPersist" in d });
    run = rebuild(session); save(); render(); scrollTo(0, 0);
  } else if ("reveal" in d) { showLedger = !showLedger; render(); }
  else if ("restart" in d) {
    session = { ...session, actions: [], carriedId: session.carriedId };
    run = rebuild(session); save(); render();
  } else if ("newseed" in d) {
    session = fresh(randomSeed(), session.opts);
    run = rebuild(session); save(); render();
  } else if ("auto" in d) autoplay();
  else if ("copy" in d) navigator.clipboard?.writeText(JSON.stringify(session)).then(() => { b.textContent = "Copied"; });
});

app.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.layout !== undefined) { session.layout = t.value as Layout; save(); render(); }
  if (t.dataset.speed !== undefined) { session.msPerDay = Number(t.value); save(); render(); }
  if (t.dataset.persist !== undefined) { session.opts = { ...session.opts, persistParts: t.checked }; save(); }
});

function autoplay() {
  let guard = 0;
  while (run.phase !== "verdict" && guard++ < 200) {
    if (run.phase === "landed") {
      const fit = run.mutations.find((m) => m.solves.includes(run.planet.need));
      if (fit && run.fixesLeft > 0) act({ t: "fix", id: fit.id });
      const goals = Object.keys(GOALS) as GoalId[];
      act({ t: "goal", g: goals[Math.floor(Math.random() * goals.length)] });
      act({ t: "words", id: run.hand[Math.floor(Math.random() * run.hand.length)].id });
      act({ t: "leave", at: Date.now() });
    } else act({ t: "day" });
  }
}

render();
