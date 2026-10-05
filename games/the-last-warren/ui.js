// The page. Reads sim state, hands CD's "Burrow" renderer (board.js → window.LWBoard) a
// plain board state every animation frame, and turns clicks and keys into actions.
// No rules live here.
import { newGame, step, view, takeBoon, troopNoise, troopStrength, located, HUNTER_KINDS, BOONS, inTransit, holding, canSpend, sizeBuys, winChance, troopField } from './src/sim.js';
import { roster, bestDestination, pickBoon } from './src/policies.js';
import { KIND_NAME } from './src/map.js';
import { TUNED } from './src/tuned.js';
import { newLine, lineCfg, heirlooms, recordGeneration, describe, roman, heirSlots } from './src/lineage.js';

const $ = id => document.getElementById(id);
const LW = window.LWBoard;
const cv = $('board'), ctx = cv.getContext('2d');
const ROSTER = roster(true);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TRADE = { C: 'strong, loud', S: 'sees them, thin walls', D: 'holds, slow to leave', N: 'grows fast, loud' };
const GIFT = { C: '+30% strength in any fight', S: 'You see where they think you are', D: '+30% when they come in', N: '+1 extra person every tick' };
const KIND_COST = { C: 'Loud: noise ×1.4', S: 'Thin walls: no fortify bonus', D: 'Slow to leave: your first step out is slow', N: 'Loud: noise ×1.6' };
const DEPTH_NOTE = { deep: 'Deep: hides your noise well (×0.45)', mid: 'Mid: hides some noise (×0.7)', shallow: 'Shallow: hides nothing (×1)' };
const GROUND = { '.': 'open ground', '=': 'the road', 'f': 'the trees', '~': 'the water', '^': 'the rocks' };
const GROUND_CHIP = { '.': 'open: exposed', '=': 'road: fast and loud', 'f': 'forest: hidden and quiet', '~': 'lake: they can’t follow', '^': 'mountain' };
const TERRAIN_KIND = { '.': 'open', '=': 'road', 'f': 'forest', '~': 'lake', '^': 'mountain' };
for (const name of Object.keys(ROSTER)) { const o = document.createElement('option'); o.value = name; o.textContent = 'Bot: ' + name; $('watch').appendChild(o); }

let g, cs = 30, hover = -1, actions = [], timer = null, cfg, terrain = null, terrainKey = '';
let ringStart = null, rgFightAt = -1e9, logN = 0;

// ---------------------------------------------------------------- the line (kept in this browser)
const LKEY = 'lw.line.v1', AKEY = 'lw.lines.v1', RKEY = 'lw.run.v1';
function loadLine() { try { const l = JSON.parse(localStorage.getItem(LKEY)); if (l && l.v === 1) return l; } catch {} return null; }
function saveLine(l) { try { localStorage.setItem(LKEY, JSON.stringify(l)); } catch {} }
function archived() { try { return JSON.parse(localStorage.getItem(AKEY)) || []; } catch { return []; } }
function archive(l) { if (!l || !l.chronicle.length) return; try { const a = archived(); a.push(l); localStorage.setItem(AKEY, JSON.stringify(a.slice(-20))); } catch {} }
let line = loadLine();
if (!line || line.ended) { line = newLine(Date.now() % 100000 + 1); saveLine(line); }
const watching = () => !!$('watch').value;
let picks = [];
function saveRun() {
  if (watching() || !g || g.over) return;
  try { localStorage.setItem(RKEY, JSON.stringify({ v: 1, seed: g.seed, rules: $('cfgsel').value, founded: line.founded, gen: line.gen, actions: actions.map(x => x.a), picks })); } catch {}
}
function clearRun() { try { localStorage.removeItem(RKEY); } catch {} }
function loadRun() { try { const r = JSON.parse(localStorage.getItem(RKEY)); return r && r.v === 1 ? r : null; } catch { return null; } }

function cfgNow() { return { ...($('cfgsel').value === 'tuned' ? TUNED : {}), ...(watching() ? {} : lineCfg(line)) }; }
function start(seed) {
  clearInterval(timer); timer = null;
  cfg = cfgNow();
  g = newGame(seed, cfg); actions = []; picks = []; ringStart = null; terrainKey = '';
  if (!watching()) clearRun();
  $('log').innerHTML = ''; logN = 0;
  say(`Night 1. ${g.map.hand.frame.replace(/^The /, 'The ')}. ${g.hunters.length} hunters at the edges.`, 'gold');
  if (!watching()) say(`${line.name} ${roman(line.gen)}${line.heir ? ', ' + describe(line.heir) : ''}.`, 'gold');
  lineBar(); chronicle();
  layout(); panel();
  if (watching()) watchLoop();
  else if (clock.on) clockReset(performance.now() + period());   // a new night: two beats to read the board
}

// ---------------------------------------------------------------- the board: CD's renderer, fed live state
function layout() {
  const wrap = $('boardwrap').clientWidth || 640;
  cs = Math.max(8, Math.min(40, Math.floor(wrap / g.W)));
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(g.W * cs * dpr); cv.height = Math.round(g.H * cs * dpr);
  cv.style.width = g.W * cs + 'px'; cv.style.height = g.H * cs + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const key = `${g.seed}|${cs}|${dpr}|${g.warrens.length}`;
  if (key !== terrainKey) { terrainKey = key; terrain = LW.terrainLayer((x, y) => TERRAIN_KIND[g.tiles[y * g.W + x]], cs, dpr); }
}
function pathTo(dest) {
  const f = troopField(g, dest), out = [];
  let cur = g.troop.y * g.W + g.troop.x;
  out.push({ x: cur % g.W, y: (cur / g.W) | 0 });
  for (let k = 0; k < 200 && cur !== dest; k++) {
    let nb = -1, bd = f[cur]; for (const j of g.nb[cur]) if (f[j] < bd) { bd = f[j]; nb = j; }
    if (nb < 0) break; cur = nb; out.push({ x: cur % g.W, y: (cur / g.W) | 0 });
  }
  return out;
}
function placeWords(cell) {
  const w = g.warrenAt[cell];
  if (w != null) { const W = g.warrens[w]; return { short: `${KIND_NAME[W.kind]} · ${W.depth}`, long: `${KIND_NAME[W.kind]} (${TRADE[W.kind]}) · ${W.depth}`, warren: W }; }
  return { short: GROUND_CHIP[g.tiles[cell]], long: GROUND_CHIP[g.tiles[cell]] + ' · hold here', warren: null };
}
// the race, read as intent: is it safer there than here?
function verdict(v, cell) {
  const you = v.troopTicksTo(cell), them = v.hunterTicksTo(cell), here = v.nearestHunterTicks();
  if (!isFinite(them)) return { you, them, win: true, word: 'nobody can reach it' };
  if (them <= you) return { you, them, win: false, word: 'they’ll get there first' };
  if (them - you <= 2) return { you, them, win: true, word: 'risky' };
  if (them - you > here + 1) return { you, them, win: true, word: 'probably safer than here' };
  return { you, them, win: true, word: 'about as safe as here' };
}
let routeCache = { key: '', route: null };
function route(v) {
  const t = g.troop;
  if (g.over) return null;
  if (inTransit(t)) {
    const key = `t${g.T}|${t.destCell}`;
    if (routeCache.key !== key) {
      const pw = placeWords(t.destCell), left = Math.max(1, Math.round(v.troopTicksTo(t.destCell)));
      routeCache = { key, route: { path: pathTo(t.destCell), win: v.hunterTicksTo(t.destCell) > v.troopTicksTo(t.destCell), label: `${pw.short} · ${left}t` } };
    }
    return routeCache.route;
  }
  if (hover < 0 || hover === v.here || g.tCost(hover) === Infinity || watching()) return null;
  const key = `h${g.T}|${hover}`;
  if (routeCache.key !== key) {
    const vd = verdict(v, hover);
    if (!isFinite(vd.you)) { routeCache = { key, route: null }; return null; }
    const pw = placeWords(hover);
    routeCache = { key, route: { path: pathTo(hover), win: vd.win, label: `${pw.long} · you ${vd.you.toFixed(0)}t · them ${isFinite(vd.them) ? vd.them.toFixed(0) + 't' : '—'} · ${vd.word}` } };
  }
  return routeCache.route;
}
function boardState(now) {
  const t = g.troop, v = view(g), dead = g.over && !!g.stats.death;
  const here = t.y * g.W + t.x, loc = !dead && located(g);
  const ring = !dead && t.warren != null && loc;
  if (ring && ringStart == null) ringStart = now; if (!ring) ringStart = null;
  const reach = new Set(v.attackable().map(h => h.id));
  let heat = null;
  if (v.belief) { let mx = 0; for (const b of v.belief) mx = Math.max(mx, b); heat = new Float32Array(g.N); if (mx > 0) for (let i = 0; i < g.N; i++) heat[i] = v.belief[i] / mx; }
  const tracks = [];
  for (let i = 0; i < g.N; i++) { const age = g.T - g.tracks[i]; if (age < g.cfg.trackLife) tracks.push({ x: i % g.W, y: (i / g.W) | 0, age: age / g.cfg.trackLife }); }
  const dc = g.decoys[0], rg = g.rearguards[0];
  return {
    warrens: g.warrens.map(w => ({ x: w.x, y: w.y, k: w.kind, d: w.depth })),
    current: t.warren != null ? t.warren : -1,
    hover: hover >= 0 ? { x: hover % g.W, y: (hover / g.W) | 0 } : null,
    troop: { x: t.x, y: t.y, n: t.size, state: dead ? 'dead' : t.warren != null ? 'warren' : inTransit(t) ? 'transit' : g.tiles[here] === 'f' ? 'holdForest' : 'holdOpen', located: loc, besieged: !dead && t.besieged, watched: t.watch || 0 },
    hunters: g.hunters.map(h => ({ x: h.x, y: h.y, k: h.kind, reach: reach.has(h.id), trail: !!h.trail, muster: ring && !t.besieged && Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= g.cfg.musterDist + 1, ph: h.id * 1.7 })),
    ring, ringSolid: ring && t.besieged, ringAge: REDUCED ? 9 : ringStart == null ? 0 : (now - ringStart) / 1000,
    heat, tracks, route: route(v),
    decoy: dc ? { x: dc.x, y: dc.y, seen: !!dc.spotted } : null,
    rearguard: rg ? { x: rg.x, y: rg.y, n: rg.size, state: now - rgFightAt < 900 ? 'fighting' : 'waiting' } : null,
    light: { warm: loc, dark: dead, dawn: !dead && g.tick > g.cfg.nightLen - (g.cfg.retreatTicks || 3) },
  };
}
function frame(now) {
  if (g) clockTick(now);
  if (g && terrain && !$('tab-play').hidden) LW.draw(ctx, { cell: cs, terrain }, boardState(now), REDUCED ? 0 : now / 1000);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- the clock (a toggle)
// Manual waits for you; Auto does not. Each tick is still one sim step, so the twins, the
// saves and the tuning are untouched: Auto only stops waiting. Doing nothing is staying,
// acting restarts the count, and a dialog, another tab, the bot, a run between warrens (which
// steps itself) or a hidden page all hold it. A held clock never catches up afterwards.
// P switches between them; in Manual, STAY still steps, as it always has.
const CKEY = 'lw.clock.v1', SPEEDS = { slow: 1000, normal: 600, fast: 350 };
const clock = (() => { try { const c = JSON.parse(localStorage.getItem(CKEY)); if (c && SPEEDS[c.speed]) return { on: !!c.on, speed: c.speed }; } catch {} return { on: false, speed: 'normal' }; })();
let nextTickAt = 0, lastFrame = 0;
const period = () => SPEEDS[clock.speed];
function saveClock() { try { localStorage.setItem(CKEY, JSON.stringify({ on: clock.on, speed: clock.speed })); } catch {} }
function clockReset(from = performance.now()) { nextTickAt = from + period(); }
function clockHeld() { return !clock.on || !g || g.over || !!g.pendingDraft || watching() || inTransit(g.troop) || $('tab-play').hidden || !!document.querySelector('dialog[open]'); }
function clockTick(now) {
  if (now - lastFrame > 500) clockReset(now);
  lastFrame = now;
  if (clockHeld()) { clockReset(now); clockDraw(now); return; }
  if (now >= nextTickAt) { const k = g._spendNext; g._spendNext = null; act(k ? { type: k } : { type: 'stay' }); clockReset(now); }
  clockDraw(now);
}
function clockDraw(now) {
  if (!clock.on) return;
  const held = clockHeld(), left = Math.max(0, nextTickAt - now);
  $('clock-fill').style.width = held ? '100%' : (100 * (1 - left / period())).toFixed(1) + '%';
  $('clock-bar').classList.toggle('held', held);
  $('clock-left').textContent = held ? 'held' : (left / 1000).toFixed(1) + 's';
}
function clockUI() {
  $('clockline').dataset.mode = clock.on ? 'clock' : 'turns';
  $('clock-turns').setAttribute('aria-pressed', String(!clock.on));
  $('clock-clock').setAttribute('aria-pressed', String(clock.on));
  for (const s of Object.keys(SPEEDS)) $('clock-' + s).setAttribute('aria-pressed', String(clock.speed === s));
}
$('clock-turns').addEventListener('click', () => { clock.on = false; saveClock(); clockUI(); });
$('clock-clock').addEventListener('click', () => { clock.on = true; saveClock(); clockReset(); clockUI(); });
for (const s of Object.keys(SPEEDS)) $('clock-' + s).addEventListener('click', () => { clock.speed = s; saveClock(); clockReset(); clockUI(); });
clockUI();

// ---------------------------------------------------------------- panel
const HUNTER_D = {
  sweeper: 'M4 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5z',
  tracker: 'M8 2L14.5 13.5H1.5Z',
  listener: 'M8 2a6 6 0 1 0 0.01 0zm0 2.7a3.3 3.3 0 1 1-0.01 0z',
  hound: 'M8 1.2L14.8 8 8 14.8 1.2 8Z',
};
// warren glyphs, 24×24: outline by kind, line by depth (CD's app.js)
function warrenGlyphSVG(k, d) {
  const f = v => Math.round(v * 100) / 100;
  let out, inn = '', dots = '';
  if (k === 'C') { const pts = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 10 : 7.8; pts.push(`${f(12 + Math.cos(a) * rr)} ${f(12 + Math.sin(a) * rr)}`); } out = 'M' + pts.join('L') + 'Z'; const t = []; for (let i = 0; i <= 8; i++) t.push(`${f(7 + i * 1.25)} ${i % 2 ? 14.2 : 10}`); inn = 'M' + t.join('L'); }
  else if (k === 'S') { out = 'M1.5 12 Q12 1.5 22.5 12 Q12 22.5 1.5 12Z'; dots = 'M12 9.4a2.6 2.6 0 1 0 0.01 0z'; }
  else if (k === 'D') { out = 'M12 3a9 9 0 1 0 0.01 0z'; inn = 'M12 6.6a5.4 5.4 0 1 0 0.01 0z'; dots = 'M12 10a2 2 0 1 0 0.01 0z'; }
  else { out = 'M12 3a9 9 0 1 0 0.01 0z'; dots = [0, 1, 2].map(i => { const a = -Math.PI / 2 + i * Math.PI * 2 / 3, x = 12 + Math.cos(a) * 3.8, y = 12 + Math.sin(a) * 3.8; return `M${f(x)} ${f(y - 1.9)}a1.9 1.9 0 1 0 0.01 0z`; }).join(''); }
  const sw = { deep: 3, mid: 1.8, shallow: 1.3 }[d] || 1.8, dash = d === 'shallow' ? '2.2 2' : 'none';
  return `<path d="${out}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round"></path>` +
    (inn ? `<path d="${inn}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path>` : '') +
    (dots ? `<path d="${dots}" fill="currentColor"></path>` : '');
}
const pc = x => Math.round(100 * x) + '%';
function panel() {
  const t = g.troop, v = view(g), dead = g.over && !!g.stats.death;
  const here = t.y * g.W + t.x, w = t.warren != null ? g.warrens[t.warren] : null;
  $('night').textContent = g.night;
  $('dawn-len').textContent = g.cfg.nightLen;
  $('dawn-ticks').textContent = g.tick;
  $('dawn-fill').style.width = (100 * g.tick / g.cfg.nightLen) + '%';
  $('count').textContent = t.size; $('count').classList.toggle('dead', dead);
  $('where').textContent = dead ? 'the warren fell' : w ? `in a ${w.depth} ${KIND_NAME[w.kind]} warren` : inTransit(t) ? `running for ${t.dest != null ? `the ${g.warrens[t.dest].depth} ${KIND_NAME[g.warrens[t.dest].kind]} warren` : GROUND[g.tiles[t.destCell]]}` : `holding in ${GROUND[g.tiles[here]]}`;
  const st = $('status');
  const [txt, kind] = dead ? ['dead', 'ink'] : t.besieged ? ['besieged · not growing', 'them'] : located(g) ? ['located', 'them'] : inTransit(t) ? ['in transit', 'you'] : holding(t) ? [g.tiles[here] === 'f' ? 'holding · hidden' : 'holding · exposed', g.tiles[here] === 'f' ? 'you' : 'them'] : ['hidden', 'you'];
  st.textContent = txt; st.className = 'status ' + kind;
  $('strength').textContent = troopStrength(g, 'defend').toFixed(0);
  $('noise').textContent = troopNoise(g).toFixed(1);
  const settled = w ? (g.settled[w.id] || 0) : 0;
  const accel = g.cfg.accelAt ? g.cfg.accelAt.filter(a => settled >= a).length : 0;
  const nurs = w && w.kind === 'N' ? g.cfg.nurseryGrowth : 0;
  $('growing').textContent = !w ? '—' : t.besieged ? 'halted' : `+${g.cfg.growth + accel + nurs} a tick` + (g.cfg.accelAt && accel < g.cfg.accelAt.length ? ` · +${g.cfg.growth + accel + nurs + 1} in ${g.cfg.accelAt[accel] - settled}` : '') + (settled ? ` · settled ${settled}` : '');
  $('watched').textContent = t.watch ? `${t.watch} tick${t.watch === 1 ? '' : 's'}` : '—';
  $('reserve').textContent = g.reserve ? `${g.reserve} asleep` : '—';
  // odds everywhere: what your size buys where you are, and what an attack would do
  const sb = sizeBuys(g), tgt = v.attackable().sort((a, b) => a.str - b.str)[0];
  const where = w ? 'Holding here' : 'In the open';
  const holdLine = sb.beat ? `${where} you’d beat ${sb.beat} sweeper${sb.beat === 1 ? '' : 's'} (${pc(sb.pBeat)}), not ${sb.beat + 1} (${pc(sb.pNext)}).` : `${where} you wouldn’t beat even one sweeper (${pc(sb.pNext)}).`;
  const atk = tgt ? winChance(troopStrength(g, 'attack'), tgt.str) : null;
  $('odds').textContent = dead ? '' : (tgt ? `Attacking the ${HUNTER_KINDS[tgt.kind].label.toLowerCase()} you’d win (${pc(atk)}). ` : '') + holdLine;
  $('odds').hidden = dead;
  // this warren
  $('warren').hidden = !w;
  if (w) {
    $('warren-glyph').innerHTML = warrenGlyphSVG(w.kind, w.depth);
    $('warren-name').textContent = `${KIND_NAME[w.kind]} · ${w.depth}`;
    $('warren-gift').textContent = GIFT[w.kind]; $('warren-cost').textContent = KIND_COST[w.kind]; $('warren-depth').textContent = DEPTH_NOTE[w.depth];
  }
  // hunters
  const reach = new Set(v.attackable().map(h => h.id)), ring = t.warren != null && located(g);
  $('hunter-count').textContent = g.hunters.length;
  $('hunters').innerHTML = g.hunters.map(h => {
    const s = [reach.has(h.id) && 'in reach', h.trail && 'on your trail', ring && !t.besieged && Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= g.cfg.musterDist + 1 && 'mustering'].filter(Boolean).join(' · ');
    return `<div class="row"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="${HUNTER_D[h.kind]}" fill="var(--blood)" fill-rule="evenodd"></path></svg><span>${HUNTER_KINDS[h.kind].label}</span><span class="state">${s}</span><span class="n">${h.str.toFixed(0)}</span></div>`;
  }).join('');
  // verbs
  $('stay').disabled = g.over;
  $('attack').disabled = !tgt || g.over;
  $('attack-key').textContent = tgt ? `A · ${pc(atk)}` : 'A · NONE IN REACH';
  for (const k of ['decoy', 'rearguard', 'scout', 'dig']) $('sp-' + k).disabled = g.over || watching() || !canSpend(g, k);
}

// ---------------------------------------------------------------- the log: chronological, numbered, the latest in full
const LOG_SHOW = 9;
function say(text, k = 'ink') {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<span class="i">${++logN}</span><span class="${k}"></span>`; row.lastChild.textContent = text;
  $('log').appendChild(row);
  while ($('log').children.length > LOG_SHOW) $('log').firstChild.remove();
}
const dirWord = (dx, dy) => Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
function narrate(evs) {
  for (const e of evs) {
    if (e.t === 'arrive-warren') say(`Under. A ${g.warrens[e.id].depth} ${KIND_NAME[g.warrens[e.id].kind]} warren.`, 'you');
    else if (e.t === 'hold') say(e.forest ? 'In the trees. Hidden and quiet. Not growing.' : 'Holding in the open. Not growing, and easy to see.', e.forest ? 'you' : 'them');
    else if (e.t === 'spend') {
      if (e.kind === 'decoy') { const dc = g.decoys.at(-1); const tx = dc ? dc.target % g.W : g.troop.x, ty = dc ? (dc.target / g.W) | 0 : g.troop.y; say(`Decoy out. −${e.cost}. It breaks ${dirWord(tx - g.troop.x, ty - g.troop.y)}.`, 'you'); }
      else say({ rearguard: `Rearguard left behind. −${e.cost}.`, scout: `Scout out. −${e.cost}. Ten ticks of seeing what they think.`, dig: `Digging. −${e.cost}.` }[e.kind], 'you');
    }
    else if (e.t === 'dug') say(`A new ${KIND_NAME[e.kind]} warren, shallow, dug in the dark.`, 'you');
    else if (e.t === 'decoy-seen') say('They take it.', 'gold');
    else if (e.t === 'decoy-caught') say('The decoy is caught. They know now.', 'them');
    else if (e.t === 'decoy-gone') say('The decoy goes to ground.');
    else if (e.t === 'rearguard') { rgFightAt = performance.now(); say(e.won ? 'The rearguard held, loudly. They think you’re back there.' : 'The rearguard fell. It bought you time.', e.won ? 'you' : 'them'); }
    else if (e.t === 'seen') say('Seen.', 'them');
    else if (e.t === 'located') say(g.troop.warren != null ? 'Heard. They know which warren you’re in.' : 'They have you.', 'them');
    else if (e.t === 'siege') say('Besieged. Not growing.', 'them');
    else if (e.t === 'retreat') say(`Dawn in ${e.left}. They turn for the edges.`, 'gold');
    else if (e.t === 'arrive') say(`A ${HUNTER_KINDS[e.kind].label.toLowerCase()} arrives at the edge.`, 'them');
    else if (e.t === 'fight') say(e.won ? `${e.mode === 'attack' ? 'You went out and won' : 'They came in and lost'}: ${e.mine.toFixed(0)} against ${e.theirs.toFixed(0)}. ${e.lost} of yours lost.` : `${e.mine.toFixed(0)} against ${e.theirs.toFixed(0)}.`, e.won ? 'you' : 'them');
    else if (e.t === 'dusk') say(`Night ${e.night}. ${e.hunters} hunters at the edges.`, 'gold');
  }
}
// what you meant by a click, said before it happens
function intent(a) {
  const v = view(g);
  if (a.type === 'move') { const w = g.warrens[a.to], n = Math.round(v.troopTicksTo(w.i)); return `Running for the ${w.depth} ${KIND_NAME[w.kind]} warren. ${n} tick${n === 1 ? '' : 's'}.`; }
  if (a.type === 'go') { const n = Math.round(v.troopTicksTo(a.cell)), tl = g.tiles[a.cell]; return tl === 'f' ? `Making for the trees to hide. ${n} tick${n === 1 ? '' : 's'}.` : tl === '~' ? `Into the water, where they can’t follow. ${n} tick${n === 1 ? '' : 's'}.` : `Out into ${GROUND[tl]}. ${n} tick${n === 1 ? '' : 's'}.`; }
  return null;
}

// ---------------------------------------------------------------- acting
function act(a) {
  if (g.over || g.pendingDraft) return;
  const said = intent(a); if (said) say(said, 'you');
  actions.push({ T: g.T + 1, a });
  const night = g.night;
  const evs = step(g, a);
  narrate(evs);
  if (g.night !== night && !g.over) { say(`Dawn. Night ${night} survived.`, 'gold'); dawnDialog(night); }
  panel();
  saveRun();
  if (clock.on) clockReset();
  if (g.over) { clearRun(); endDialog(); }
  else if (inTransit(g.troop) && !timer && !watching()) { timer = setInterval(() => { if (!inTransit(g.troop) || g.over || g.pendingDraft) { clearInterval(timer); timer = null; return; } const k = g._spendNext; g._spendNext = null; act(k ? { type: k } : { type: 'stay' }); }, 220); }
}
function dawnDialog(n) {
  $('dn').textContent = n;
  $('remnantline').textContent = `${g.troop.size} of you wake for night ${g.night}. The rest go to ground: ${g.reserve} sleeping in the burrows, ready to be spent. The hunters remember where you hid.`;
  const offer = g.pendingDraft;
  if (!offer) return;
  if (watching()) { takeBoon(g, pickBoon(offer)); return; }
  $('boons').innerHTML = offer.map(id => { const b = BOONS.find(x => x.id === id); const [name, ...rest] = b.text.split('. '); return `<button type="button" data-b="${id}"><b>${name}</b><span>${rest.join('. ')}</span></button>`; }).join('');
  $('draft').showModal();
}
$('boons').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; takeBoon(g, b.dataset.b); picks.push(b.dataset.b); saveRun(); say(`Took ${b.dataset.b}.`, 'gold'); $('draft').close(); panel(); });

function endDialog() {
  clearInterval(timer); timer = null;
  const d = g.stats.death, s = g.stats;
  if (!d) { $('endline').textContent = `${g.cfg.maxNights} nights. The warren is still there.`; $('endmore').textContent = ''; }
  else {
    const w = g.troop.warren != null ? g.warrens[g.troop.warren] : null;
    const left = g.cfg.nightLen - d.tick;
    const NUM = ['a', 'a', 'two', 'three', 'four', 'five', 'six'];
    const parts = Object.entries(d.hunters.reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {})).map(([k, n]) => `${NUM[n] ?? n} ${HUNTER_KINDS[k].label.toLowerCase()}${n > 1 ? 's' : ''}`);
    const who = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0];
    const how = d.cause === 'found' ? `Found where you stayed, a ${w.depth} ${KIND_NAME[w.kind]} warren` : d.cause === 'transit' ? 'Caught in the open' : 'You went out to fight and did not come back';
    $('endline').textContent = `Night ${d.night}, ${left} tick${left === 1 ? '' : 's'} before dawn. ${how}, ${d.size} strong, by ${who}.`;
    $('endmore').textContent = `You moved ${s.moves} time${s.moves === 1 ? '' : 's'} and fought ${s.fights}. The most you ever were: ${s.peak}.` + twinLine(d);
    say($('endline').textContent, 'them');
  }
  $('working').textContent = working();
  heirPick();
  $('ending').showModal();
}

// ---------------------------------------------------------------- lineage at the end of a run
function lineBar() {
  $('linename').textContent = watching() ? 'watching' : `${line.name} ${roman(line.gen)}`;
  $('lineheir').textContent = watching() ? '' : '· ' + (line.heir ? describe(line.heir) : 'no heirloom');
}
function heirPick() {
  const box = $('heirs');
  if (watching()) { box.innerHTML = ''; $('again').hidden = false; $('next').hidden = false; return; }
  $('again').hidden = true; $('next').hidden = true;
  const sentence = $('endline').textContent;
  if ((g.result?.nights ?? 0) === 0) {
    const ended = recordGeneration(line, g, sentence, null);
    box.innerHTML = `<p class="lineend">${line.name} ${roman(line.gen)} never saw a dawn. The line of ${line.name} ends ${line.gen === 1 ? 'where it began' : `after ${line.gen} generations`}. That was the last warren.</p><button type="button" id="newline">Found a new line</button>`;
    line = ended; saveLine(line); archive(line); chronicle();
    $('newline').addEventListener('click', () => { line = newLine(Date.now() % 100000 + 1); saveLine(line); $('ending').close(); const s = g.seed + 1; $('seed').value = s; start(s); });
    return;
  }
  const opts = heirlooms(g), slots = heirSlots(g), chosen = new Set();
  box.innerHTML = `<div class="label">Who got away · what do they carry to ${line.name} ${roman(line.gen + 1)}?</div>` +
    opts.map((o, i) => `<button type="button" data-h="${i}" aria-pressed="false"><b>${o.label}</b><span>${o.text}</span></button>`).join('') +
    `<button type="button" id="passon" class="passon">Pass on nothing</button>` +
    `<p class="note">${g.result.nights} night${g.result.nights === 1 ? '' : 's'} survived: up to ${slots} heirloom${slots === 1 ? '' : 's'}. They replace whatever this generation inherited. The hunters will remember which warrens your family favours.</p>`;
  const pass = $('passon');
  box.querySelectorAll('button[data-h]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.h;
    if (chosen.has(i)) chosen.delete(i); else if (chosen.size < slots) chosen.add(i); else return;
    b.setAttribute('aria-pressed', String(chosen.has(i)));
    pass.textContent = chosen.size ? `Pass on ${chosen.size} of ${slots}` : 'Pass on nothing';
  }));
  pass.addEventListener('click', () => {
    line = recordGeneration(line, g, sentence, [...chosen].map(i => opts[i])); saveLine(line); chronicle();
    $('ending').close(); const s = g.seed + 1; $('seed').value = s; start(s);
  });
}
function chronicle() {
  const c = $('chronicle'); if (!c) return;
  const rows = [...line.chronicle].reverse();
  c.innerHTML = `<h2>The line of ${line.name}${line.ended ? ' · ended' : ''}</h2>` +
    `<p class="mute">${line.ended ? `It ran ${line.chronicle.length} generation${line.chronicle.length === 1 ? '' : 's'}.` : `Generation ${roman(line.gen)} is out there now${line.heir ? `, ${describe(line.heir)}` : ''}.`}</p>` +
    (rows.length ? `<ol class="gens">${rows.map(r => `<li><div class="gn">${r.name}<span>${r.nights} night${r.nights === 1 ? '' : 's'} · seed ${r.seed}</span></div><p>${r.sentence}</p>${r.inherited || r.passed ? `<p class="mute small">${r.inherited ? 'Born ' + r.inherited + '. ' : ''}${r.passed ? 'Passed on: ' + r.passed + '.' : ''}</p>` : ''}</li>`).join('')}</ol>` : '<p class="mute">No generation has fallen yet.</p>') +
    `<button type="button" id="abandon">Abandon this line and found a new one</button>` +
    (() => { const a = archived().filter(l => l.founded !== line.founded).reverse(); return a.length ? `<h3 class="earlier">Earlier lines</h3><ol class="gens">${a.map(l => `<li><div class="gn">The line of ${l.name}<span>${l.chronicle.length} generation${l.chronicle.length === 1 ? '' : 's'}${l.abandoned ? ' · abandoned' : ''}</span></div><p class="mute small">${l.chronicle.map(r => `${r.name}: ${r.nights} night${r.nights === 1 ? '' : 's'}`).join(' · ')}</p><p>${l.chronicle.at(-1).sentence}</p></li>`).join('')}</ol>` : ''; })();
  $('abandon').addEventListener('click', () => { if ($('abandon').dataset.armed) { archive({ ...line, ended: true, abandoned: true }); line = newLine(Date.now() % 100000 + 1); saveLine(line); chronicle(); lineBar(); start(+$('seed').value || 1); } else { $('abandon').dataset.armed = 1; $('abandon').textContent = 'Click again to abandon it'; } });
}
// The twin: same world, same choices, but run one tick before the end. Honest because
// every roll is hashed by (seed, tick), so nothing else in the world changes.
function twinLine(d) {
  if (d.cause !== 'found') return '';
  const saved = k => {
    const t = newGame(g.seed, cfg); const pol = ROSTER['hybrid-5-1.3']();
    const map = new Map(actions.map(x => [x.T, x.a]));
    while (!t.over && t.night <= d.night) {
      if (t.pendingDraft) takeBoon(t, picks[t.night - 2] && t.pendingDraft.includes(picks[t.night - 2]) ? picks[t.night - 2] : pickBoon(t.pendingDraft));
      const T = t.T + 1; let a;
      if (T < d.T - k) a = map.get(T) || { type: 'stay' };
      else if (T === d.T - k) { const dd = bestDestination(view(t)); a = dd ? { type: 'move', to: dd.id } : { type: 'stay' }; }
      else a = pol(view(t));
      step(t, a);
      if (t.stats.nights[d.night - 1]?.survived) return true;
    }
    return false;
  };
  return saved(1) ? ' Running one tick earlier would have seen dawn.' : saved(3) ? ' One tick earlier wasn’t enough. Three would have been.' : ' Running earlier would not have saved it.';
}
function working() {
  return `seed ${g.seed} · ${g.map.hand.frame} · rules: ${$('cfgsel').value}
night ${g.night}, tick ${g.tick} (global ${g.T}) · reserve ${g.reserve}
dials ${JSON.stringify(g.map.dials)}
boons ${g.stats.boons.join(', ') || 'none'} · spends ${JSON.stringify(g.stats.spends)}
fights ${g.stats.fights} (won ${g.stats.fightsWon}) · moves ${g.stats.moves} · attacks ${g.stats.attacks}
ticks staying ${g.stats.stayTicks} · in transit ${g.stats.transitTicks} · holding ${g.stats.holdTicks || 0}
by warren kind: C ${g.stats.kindTicks.C} · S ${g.stats.kindTicks.S} · D ${g.stats.kindTicks.D} · N ${g.stats.kindTicks.N || 0}
death ${JSON.stringify(g.stats.death)}
replay ${actions.filter(x => x.a.type !== 'stay').map(x => `${x.T}:${x.a.type[0]}${x.a.to ?? x.a.hunter ?? x.a.cell ?? ''}`).join(' ')}`;
}

function watchLoop() {
  clearInterval(timer);
  const pol = ROSTER[$('watch').value]();
  timer = setInterval(() => {
    if (g.over) { clearInterval(timer); timer = null; return; }
    if (g.pendingDraft) takeBoon(g, pickBoon(g.pendingDraft));
    const a = pol(view(g)); const night = g.night;
    narrate(step(g, a)); actions.push({ T: g.T, a });
    if (g.night !== night) say(`Dawn. Night ${night} survived.`, 'gold');
    panel(); if (g.over) endDialog();
  }, 140);
}

// ---------------------------------------------------------------- input
function cellAt(e) { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / cs), y = Math.floor((e.clientY - r.top) / cs); return x >= 0 && y >= 0 && x < g.W && y < g.H ? y * g.W + x : -1; }
cv.addEventListener('mousemove', e => { hover = cellAt(e); });
cv.addEventListener('mouseleave', () => { hover = -1; });
cv.addEventListener('click', e => {
  if (watching()) return;
  const c = cellAt(e); if (c < 0) return;
  const v = view(g);
  const h = v.attackable().find(h => h.y * g.W + h.x === c);
  if (h) return act({ type: 'attack', hunter: h.id });
  if (inTransit(g.troop)) return;
  const w = g.warrens.find(w => w.i === c);
  if (w && w.id !== g.troop.warren) return act({ type: 'move', to: w.id });
  if (!w && g.tCost(c) < Infinity && c !== v.here) return act({ type: 'go', cell: c });
});
const flash = el => { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 180); };
$('stay').addEventListener('click', () => act({ type: 'stay' }));
$('attack').addEventListener('click', () => { const h = view(g).attackable().sort((a, b) => a.str - b.str)[0]; if (h) act({ type: 'attack', hunter: h.id }); });
for (const k of ['decoy', 'rearguard', 'scout', 'dig']) $('sp-' + k).addEventListener('click', () => { if (canSpend(g, k)) { if (inTransit(g.troop)) g._spendNext = k; else act({ type: k }); } });
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select') || document.querySelector('dialog[open]') || $('tab-play').hidden) return;
  if (e.code === 'Space') { e.preventDefault(); flash($('stay')); act({ type: 'stay' }); return; }
  if (e.key.toLowerCase() === 'p') { $(clock.on ? 'clock-turns' : 'clock-clock').click(); return; }
  const id = { a: 'attack', d: 'sp-decoy', r: 'sp-rearguard', s: 'sp-scout', g: 'sp-dig' }[e.key.toLowerCase()];
  if (id && !$(id).disabled) { flash($(id)); $(id).click(); }
});
$('newrun').addEventListener('click', () => start(+$('seed').value || 1));
$('watch').addEventListener('change', () => start(+$('seed').value || 1));
$('cfgsel').addEventListener('change', () => start(+$('seed').value || 1));
$('again').addEventListener('click', () => { $('ending').close(); start(g.seed); });
$('next').addEventListener('click', () => { $('ending').close(); $('seed').value = g.seed + 1; start(g.seed + 1); });
$('working-toggle').addEventListener('click', () => { const open = $('workingbar').classList.toggle('open'); $('working-toggle').textContent = open ? 'Hide the working' : 'Show the working'; $('working-toggle').setAttribute('aria-expanded', String(open)); });
window.addEventListener('resize', () => { if (g) layout(); });
$('ending').addEventListener('cancel', e => { if (!watching()) e.preventDefault(); });

// tabs
document.querySelectorAll('.tab').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  document.querySelectorAll('.tab').forEach(x => x.toggleAttribute('aria-current', x === a));
  for (const id of ['play', 'chron', 'brief']) $('tab-' + id).hidden = id !== a.dataset.tab;
  if (a.dataset.tab === 'play') layout();
}));
document.querySelector('.tab[data-tab="play"]').setAttribute('aria-current', 'page');

function resume() {
  const r = loadRun();
  if (!r || r.founded !== line.founded || r.gen !== line.gen || !r.actions.length) return false;
  $('cfgsel').value = r.rules; $('seed').value = r.seed;
  start(r.seed);
  let pi = 0;
  for (const a of r.actions) {
    if (g.pendingDraft) { const id = r.picks[pi++]; if (!id) break; takeBoon(g, id); picks.push(id); }
    actions.push({ T: g.T + 1, a });
    step(g, a);
    if (g.over) break;
  }
  if (g.over) { clearRun(); return false; }
  $('log').innerHTML = ''; logN = 0;
  say(`Resumed ${line.name} ${roman(line.gen)}: night ${g.night}, tick ${g.tick}, ${g.troop.size} strong.`, 'gold');
  layout(); panel(); saveRun();
  if (g.pendingDraft) dawnDialog(g.night - 1);
  return true;
}
// ?watch[=bot]&seed=N: the site's "Watch a night" link. A bot plays; your line is not touched.
const qs = new URLSearchParams(location.search);
if (qs.has('watch')) { const b = qs.get('watch'); $('watch').value = ROSTER[b] ? b : 'hybrid-3-1.8'; const s = +qs.get('seed') || 1; $('seed').value = s; start(s); }
else if (!resume()) start(1);
requestAnimationFrame(frame);

// the CD brief: inlined in the artifact build; fetched next to the page when run locally
if ($('tab-brief').innerHTML.includes('<!--BRIEF-->')) fetch('cd-brief.html').then(r => r.ok ? r.text() : '').then(t => { if (t) $('tab-brief').innerHTML = t; }).catch(() => {});
// read-only handle for debugging and automated playtests (never used by the game itself)
window.__lw = { get g() { return g; }, get line() { return line; } };
