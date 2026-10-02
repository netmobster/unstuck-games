// The page. Reads sim state, draws it, turns clicks into actions. No rules live here.
import { newGame, step, view, takeBoon, troopNoise, troopStrength, located, HUNTER_KINDS, BOONS, DEFAULTS, inTransit, holding, canSpend, sizeBuys, winChance } from './src/sim.js';
import { roster, bestDestination, pickBoon } from './src/policies.js';
import { KIND_NAME, dijkstra } from './src/map.js';
import { TUNED } from './src/tuned.js';
import { newLine, lineCfg, heirlooms, recordGeneration, describe, roman } from './src/lineage.js';

const $ = id => document.getElementById(id);
const cv = $('board'), ctx = cv.getContext('2d');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = {}; for (const k of ['bg', 'ink', 'dim', 'moss', 'blood', 'gold', 'open', 'road', 'forest', 'forestdot', 'lake', 'mtn', 'line']) C[k] = css('--' + k);
const ROSTER = roster(true);
const TRADE = { C: 'strong, loud', S: 'sees them, thin walls', D: 'holds, slow to leave', N: 'grows fast, loud' };
const GIFT = { C: '+30% strength in any fight', S: 'You see where they think you are', D: '+30% when they come in', N: '+1 extra person every tick' };
const COST = { C: 'Loud: noise ×1.4', S: 'Thin walls: no fortify bonus', D: 'Slow to leave: you lose your first tick climbing out', N: 'Loud: noise ×1.5' };
const TERRAIN = { '.': 'open ground: seen and heard', '=': 'road: fast and loud', 'f': 'forest: hidden and quiet', '~': 'lake: slow swim, they can’t follow', '^': 'mountain' };
for (const name of Object.keys(ROSTER)) { const o = document.createElement('option'); o.value = name; o.textContent = 'Watch: ' + name; $('watch').appendChild(o); }

let g, cs = 30, hover = -1, actions = [], timer = null, cfg;

// ---------------------------------------------------------------- the line (kept in this browser)
const LKEY = 'lw.line.v1';
function loadLine() { try { const l = JSON.parse(localStorage.getItem(LKEY)); if (l && l.v === 1) return l; } catch {} return null; }
function saveLine(l) { try { localStorage.setItem(LKEY, JSON.stringify(l)); } catch {} }
const AKEY = 'lw.lines.v1';
function archived() { try { return JSON.parse(localStorage.getItem(AKEY)) || []; } catch { return []; } }
function archive(l) { if (!l || !l.chronicle.length) return; try { const a = archived(); a.push(l); localStorage.setItem(AKEY, JSON.stringify(a.slice(-20))); } catch {} }
let line = loadLine();
if (!line || line.ended) { line = newLine(Date.now() % 100000 + 1); saveLine(line); }
const watching = () => !!$('watch').value;

function cfgNow() { return { ...($('cfgsel').value === 'tuned' ? TUNED : {}), ...(watching() ? {} : lineCfg(line)) }; }
function start(seed) {
  clearInterval(timer); timer = null;
  cfg = cfgNow();
  g = newGame(seed, cfg); actions = [];
  $('log').innerHTML = '';
  if (!watching()) say(`${line.name} ${roman(line.gen)}${line.heir ? ', ' + describe(line.heir) : ''}.`, 'gold');
  say(`Night 1. ${g.map.hand.frame}. ${g.hunters.length} hunters at the edges.`, 'gold');
  lineBar(); chronicle();
  layout(); draw(); panel();
  if ($('watch').value) watchLoop();
}
function layout() {
  const wrap = cv.parentElement.clientWidth;
  cs = Math.max(8, Math.floor(wrap / g.W));
  const dpr = window.devicePixelRatio || 1;
  cv.width = g.W * cs * dpr; cv.height = g.H * cs * dpr;
  cv.style.width = g.W * cs + 'px'; cv.style.height = g.H * cs + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------------------------------------------------------------- drawing
function cellRnd(i, k) { let h = (i * 2654435761 + k * 40503) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h % 1000) / 1000; }
function draw() {
  const { W, H } = g;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W * cs, H * cs);
  for (let i = 0; i < g.N; i++) {
    const x = (i % W) * cs, y = ((i / W) | 0) * cs, t = g.tiles[i];
    ctx.fillStyle = t === '~' ? C.lake : t === '^' ? C.mtn : t === 'f' ? C.forest : t === '=' ? C.road : C.open;
    ctx.fillRect(x, y, cs, cs);
    if (t === 'f') { ctx.fillStyle = C.forestdot; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + cs * (0.2 + 0.6 * cellRnd(i, k)), y + cs * (0.2 + 0.6 * cellRnd(i, k + 7)), cs * 0.13, 0, 7); ctx.fill(); } }
    if (t === '^') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(x + cs * .15, y + cs * .85); ctx.lineTo(x + cs * .5, y + cs * .18); ctx.lineTo(x + cs * .85, y + cs * .85); ctx.fill(); }
    if (t === '~') { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x + cs * .2, y + cs * .55); ctx.quadraticCurveTo(x + cs * .5, y + cs * .35, x + cs * .8, y + cs * .55); ctx.stroke(); }
  }
  // what they believe (only if you are scouting)
  const v = view(g);
  if (v.belief) {
    let mx = 0; for (let i = 0; i < g.N; i++) mx = Math.max(mx, v.belief[i]);
    for (let i = 0; i < g.N; i++) { const b = v.belief[i] / (mx || 1); if (b < 0.04) continue; ctx.fillStyle = `rgba(210,176,82,${0.12 + 0.55 * b})`; ctx.fillRect((i % W) * cs + 1, ((i / W) | 0) * cs + 1, cs - 2, cs - 2); }
  }
  // your own tracks
  for (let i = 0; i < g.N; i++) { const age = g.T - g.tracks[i]; if (age < g.cfg.trackLife) { ctx.fillStyle = `rgba(143,191,99,${0.35 * (1 - age / g.cfg.trackLife)})`; ctx.beginPath(); ctx.arc((i % W + .5) * cs, ((i / W | 0) + .5) * cs, cs * .1, 0, 7); ctx.fill(); } }
  // warrens
  for (const w of g.warrens) {
    const x = (w.x + .5) * cs, y = (w.y + .5) * cs, r = cs * .4;
    ctx.fillStyle = '#0c0e09'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.lineWidth = w.depth === 'deep' ? 3.5 : w.depth === 'mid' ? 2 : 1;
    ctx.strokeStyle = w.id === g.troop.warren ? C.moss : C.ink; ctx.setLineDash(w.depth === 'shallow' ? [2, 2] : []);
    ctx.stroke(); ctx.setLineDash([]);
    if (!(w.x === g.troop.x && w.y === g.troop.y)) { ctx.fillStyle = C.ink; ctx.font = `600 ${Math.round(cs * .36)}px ${css('--mono')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.kind, x, y + 1); }
  }
  // route preview to the hovered warren
  const hwW = g.warrens.find(w => w.i === hover);
  const hw = hwW || (hover >= 0 && g.tCost(hover) < Infinity ? { i: hover, x: hover % W, y: (hover / W) | 0, open: true } : null);
  if (hw && !inTransit(g.troop) && hw.i !== v.here && !g.over && isFinite(v.troopTicksTo(hw.i))) {
    const f = dijkstra(g.W, g.H, g.tCost, hw.i);
    let cur = v.here; ctx.strokeStyle = C.moss; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo((cur % W + .5) * cs, ((cur / W | 0) + .5) * cs);
    for (let k = 0; k < 200 && cur !== hw.i; k++) {
      let nb = -1, bd = f[cur]; for (const j of g.nb[cur]) if (f[j] < bd) { bd = f[j]; nb = j; }
      if (nb < 0) break; cur = nb; ctx.lineTo((cur % W + .5) * cs, ((cur / W | 0) + .5) * cs);
    }
    ctx.stroke(); ctx.setLineDash([]);
    const you = v.troopTicksTo(hw.i), them = v.hunterTicksTo(hw.i);
    const what = hw.open ? TERRAIN[g.tiles[hw.i]] + ' · hold here' : `${KIND_NAME[hw.kind]} (${TRADE[hw.kind]}) · ${hw.depth}`;
    label((hw.x + .5) * cs, (hw.y - .6) * cs, `${what} · you ${you.toFixed(0)}t · them ${isFinite(them) ? them.toFixed(0) + 't' : '—'}`, them <= you ? C.blood : C.moss);
  }
  // the ring, once they know where you are
  if (g.troop.warren != null && located(g)) {
    ctx.strokeStyle = C.blood; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5;
    const R = g.cfg.musterDist; const x = (g.troop.x + .5) * cs, y = (g.troop.y + .5) * cs;
    ctx.beginPath(); ctx.moveTo(x, y - (R + .5) * cs); ctx.lineTo(x + (R + .5) * cs, y); ctx.lineTo(x, y + (R + .5) * cs); ctx.lineTo(x - (R + .5) * cs, y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  }
  // your decoys (running, loud) and rearguards (left behind, waiting)
  for (const dc of g.decoys) { const x = (dc.x + .5) * cs, y = (dc.y + .5) * cs; ctx.strokeStyle = C.moss; ctx.setLineDash([2, 3]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, cs * .3, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.moss; ctx.font = `600 ${Math.round(cs * .3)}px ${css('--mono')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('d', x, y + 1); }
  for (const rg of g.rearguards) { const x = (rg.x + .5) * cs, y = (rg.y + .5) * cs, r = cs * .26; ctx.fillStyle = C.moss; ctx.globalAlpha = .75; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.globalAlpha = 1; ctx.fillStyle = C.bg; ctx.font = `700 ${Math.round(cs * .3)}px ${css('--mono')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(rg.size, x, y + 1); }
  // hunters
  const inReach = new Set(v.attackable().map(h => h.id));
  for (const h of g.hunters) {
    const x = (h.x + .5) * cs, y = (h.y + .5) * cs, r = cs * .3;
    ctx.fillStyle = C.blood; ctx.strokeStyle = C.blood; ctx.lineWidth = 2; ctx.beginPath();
    if (h.kind === 'sweeper') ctx.rect(x - r, y - r, 2 * r, 2 * r);
    else if (h.kind === 'tracker') { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y + r); ctx.lineTo(x - r * 1.1, y + r); ctx.closePath(); }
    else if (h.kind === 'hound') { ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r * 1.1, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r * 1.1, y); ctx.closePath(); }
    else { ctx.arc(x, y, r, 0, 7); }
    if (h.kind === 'listener') ctx.stroke(); else ctx.fill();
    if (inReach.has(h.id)) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.stroke(); }
    if (h.trail) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x + r, y - r, 3, 0, 7); ctx.fill(); }
  }
  // the troop
  const tx = (g.troop.x + .5) * cs, ty = (g.troop.y + .5) * cs;
  ctx.fillStyle = g.over && g.stats.death ? C.blood : C.moss;
  ctx.beginPath(); ctx.arc(tx, ty, cs * .46, 0, 7);
  if (g.troop.warren == null) { ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.moss; ctx.lineWidth = 2.5; if (inTransit(g.troop)) ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.moss; }
  else ctx.fill(), ctx.fillStyle = C.bg;
  ctx.font = `800 ${Math.round(cs * .42)}px ${css('--mono')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(g.troop.size, tx, ty + 1);
}
function label(x, y, text, color) {
  ctx.font = `600 11px ${css('--mono')}`; const w = ctx.measureText(text).width + 12;
  const lx = Math.min(Math.max(4, x - w / 2), g.W * cs - w - 4), ly = Math.max(4, y - 18);
  ctx.fillStyle = 'rgba(12,14,9,.92)'; ctx.fillRect(lx, ly, w, 20); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(lx, ly, w, 20);
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, lx + 6, ly + 10);
}

// ---------------------------------------------------------------- panel
function panel() {
  const t = g.troop, v = view(g);
  $('night').textContent = g.night;
  $('ticks').textContent = `${g.tick} / ${g.cfg.nightLen}`;
  $('dawnfill').style.width = (100 * g.tick / g.cfg.nightLen) + '%';
  $('size').textContent = t.size;
  const w = t.warren != null ? g.warrens[t.warren] : null;
  $('where').textContent = w ? `in a ${w.depth} ${KIND_NAME[w.kind]} warren` : inTransit(t) ? (t.dest != null ? `running → ${KIND_NAME[g.warrens[t.dest].kind]} warren` : 'running → open ground') : `holding · ${TERRAIN[g.tiles[t.y * g.W + t.x]]}`;
  if (w) {
    $('wcard').hidden = false;
    $('wkind').textContent = `${KIND_NAME[w.kind]} · ${w.depth}`;
    $('wgift').textContent = GIFT[w.kind];
    $('wcost').textContent = COST[w.kind];
    $('wdepth').textContent = { deep: 'Deep: hides your noise well (×0.45)', mid: 'Mid: hides some noise (×0.7)', shallow: 'Shallow: hides nothing (×1)' }[w.depth];
  } else $('wcard').hidden = true;
  const sb = sizeBuys(g), pc = x => Math.round(100 * x) + '%';
  $('buys').textContent = holding(t) || inTransit(t) ? 'No walls out here: anything that reaches you fights you.' : sb.beat ? `Holding here you’d beat ${sb.beat} sweeper${sb.beat === 1 ? '' : 's'} (${pc(sb.pBeat)}), not ${sb.beat + 1} (${pc(sb.pNext)}).` : `You wouldn’t beat even one sweeper (${pc(sb.pNext)}).`;
  for (const k of ['decoy', 'rearguard', 'scout', 'dig']) $('sp-' + k).disabled = g.over || !canSpend(g, k);
  $('sdef').textContent = troopStrength(g, 'defend').toFixed(0);
  $('noise').textContent = troopNoise(g).toFixed(1);
  const accel = g.cfg.accelAt ? g.cfg.accelAt.filter(a => (t.stayRun || 0) >= a).length : 0;
  $('growth').textContent = t.warren == null ? 'not while moving' : t.besieged ? 'halted (siege)' : `+${g.cfg.growth + accel} a tick` + (g.cfg.accelAt && accel < g.cfg.accelAt.length ? ` · +${g.cfg.growth + accel + 1} in ${g.cfg.accelAt[accel] - (t.stayRun || 0)}` : '');
  $('watched').textContent = t.watch ? `${t.watch} tick${t.watch === 1 ? '' : 's'}: they'll react faster` : '—';
  $('watched').style.color = t.watch ? C.blood : '';
  $('status').textContent = g.over ? 'gone' : t.besieged ? 'SIEGE · not growing' : located(g) ? 'located' : t.warren == null ? 'running' : 'hidden';
  $('status').style.color = t.besieged || located(g) ? C.blood : '';
  $('spec').innerHTML = ['C', 'S', 'D'].map(k => `<div class="s"><span>${KIND_NAME[k]}</span><div class="t"><div style="width:${100 * Math.max(t.spec[k], w && w.kind === k ? 1 : 0)}%"></div></div><span>+${Math.round(100 * g.cfg.warrenBonus * Math.max(t.spec[k], w && w.kind === k ? 1 : 0))}%</span></div>`).join('');
  $('hcount').textContent = `· ${g.hunters.length}`;
  $('hunters').innerHTML = g.hunters.map(h => `<div class="h"><i style="${h.kind === 'listener' ? 'background:none;border:2px solid ' + C.blood + ';border-radius:50%' : h.kind === 'tracker' ? 'clip-path:polygon(50% 0,100% 100%,0 100%)' : h.kind === 'hound' ? 'clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)' : ''}"></i><span>${HUNTER_KINDS[h.kind].label}${h.trail ? ' · on your trail' : ''}</span><b>${h.str.toFixed(0)}</b></div>`).join('');
  const tgt = v.attackable().sort((a, b) => a.str - b.str)[0];
  $('attackbtn').disabled = !tgt || g.over;
  $('attackodds').textContent = tgt ? `${Math.round(100 * winChance(troopStrength(g, 'attack'), tgt.str))}% vs ${HUNTER_KINDS[tgt.kind].label.toLowerCase()}` : 'A';
  $('stay').disabled = g.over;
  $('scout-note')?.remove();
}

const LOG_MAX = 60;
function say(text, cls = '') { const li = document.createElement('li'); li.textContent = text; if (cls) li.className = cls; $('log').prepend(li); while ($('log').children.length > LOG_MAX) $('log').lastChild.remove(); }
function narrate(evs) {
  for (const e of evs) {
    if (e.t === 'move') say(`Run for the ${KIND_NAME[g.warrens[e.to].kind]} warren.`);
    else if (e.t === 'go') say('Out into the open.');
    else if (e.t === 'hold') say(e.forest ? 'Still, in the trees. Not growing.' : 'Holding in the open. Not growing, and easy to see.', e.forest ? 'good' : 'bad');
    else if (e.t === 'spend') say({ decoy: `${e.cost} of you break away loud, the other way.`, rearguard: `${e.cost} of you stay behind.`, scout: `${e.cost} of you go to look.`, dig: `${e.cost} of you dig.` }[e.kind], 'gold');
    else if (e.t === 'dug') say(`A new ${KIND_NAME[e.kind]} warren, shallow, dug in the dark.`, 'good');
    else if (e.t === 'decoy-seen') say('They’ve seen the decoy. They think it’s you.', 'good');
    else if (e.t === 'decoy-caught') say('The decoy is caught. They know now.', 'bad');
    else if (e.t === 'decoy-gone') say('The decoy goes to ground.');
    else if (e.t === 'rearguard') say(e.won ? 'The rearguard held, and loudly. They think you’re back there.' : 'The rearguard fell. It bought you time.', e.won ? 'good' : 'bad');
    else if (e.t === 'arrive-warren') say(`Under again: a ${g.warrens[e.id].depth} ${KIND_NAME[g.warrens[e.id].kind]} warren.`, 'good');
    else if (e.t === 'seen') say('Seen.', 'bad');
    else if (e.t === 'located') say(g.troop.warren != null ? 'Heard. They know which warren you’re in.' : 'They have you.', 'bad');
    else if (e.t === 'siege') say('They know where you are. The ring is forming.', 'bad');
    else if (e.t === 'arrive') say(`A ${HUNTER_KINDS[e.kind].label.toLowerCase()} arrives at the edge.`);
    else if (e.t === 'fight') say(e.won ? `${e.mode === 'attack' ? 'You went out and won' : 'They came in and lost'}: ${e.mine.toFixed(0)} against ${e.theirs.toFixed(0)}. ${e.lost} of yours lost.` : `${e.mine.toFixed(0)} against ${e.theirs.toFixed(0)}.`, e.won ? 'good' : 'bad');
    else if (e.t === 'dusk') say(`Night ${e.night}. ${e.hunters} hunters at the edges.`, 'gold');
  }
}

// ---------------------------------------------------------------- acting
function act(a) {
  if (g.over || g.pendingDraft) return;
  actions.push({ T: g.T + 1, a });
  const night = g.night;
  const evs = step(g, a);
  narrate(evs);
  if (g.night !== night && !g.over) dawnDialog(night);
  draw(); panel();
  if (g.over) endDialog();
  else if (inTransit(g.troop) && !timer && !$('watch').value) { timer = setInterval(() => { if (!inTransit(g.troop) || g.over || g.pendingDraft) { clearInterval(timer); timer = null; return; } const k = g._spendNext; g._spendNext = null; act(k ? { type: k } : { type: 'stay' }); }, 220); }
}
function dawnDialog(n) {
  $('dn').textContent = n;
  $('remnantline').textContent = g.cfg.remnant > 0 ? `${g.troop.size} of you go into night ${g.night}. Hunters remember where you hid.` : '';
  const offer = g.pendingDraft;
  if (!offer) return;
  if ($('watch').value) { takeBoon(g, pickBoon(offer)); return; }
  $('boons').innerHTML = offer.map(id => { const b = BOONS.find(x => x.id === id); const [name, ...rest] = b.text.split('. '); return `<button type="button" data-b="${id}"><b>${name}</b>${rest.join('. ')}</button>`; }).join('');
  $('draft').showModal();
}
$('boons').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; takeBoon(g, b.dataset.b); say(`Took ${b.dataset.b}.`, 'gold'); $('draft').close(); draw(); panel(); });

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
    const how = d.cause === 'found' ? `Found where you stayed, a ${w.depth} ${KIND_NAME[w.kind]} warren` : d.cause === 'transit' ? 'Caught in the open between warrens' : 'You went out to fight and did not come back';
    $('endline').textContent = `Night ${d.night}, ${left} tick${left === 1 ? '' : 's'} before dawn. ${how}, ${d.size} strong, by ${who}.`;
    $('endmore').textContent = `You moved ${s.moves} time${s.moves === 1 ? '' : 's'} and fought ${s.fights}. The most you ever were: ${s.peak}.` + twinLine(d);
  }
  $('working').textContent = working();
  heirPick();
  $('ending').showModal();
}

// ---------------------------------------------------------------- lineage at the end of a run
function lineBar() {
  $('linename').textContent = watching() ? 'watching' : `${line.name} ${roman(line.gen)}`;
  $('lineheir').textContent = watching() ? '' : line.heir ? describe(line.heir) : 'no heirloom';
}
function heirPick() {
  const box = $('heirs');
  if (watching()) { box.innerHTML = ''; $('again').hidden = false; $('next').hidden = false; return; }
  $('again').hidden = true; $('next').hidden = true;
  const sentence = $('endline').textContent;
  const failed = (g.result?.nights ?? 0) === 0;
  if (failed) {
    const ended = recordGeneration(line, g, sentence, null);
    box.innerHTML = `<p class="lineend">${line.name} ${roman(line.gen)} never saw a dawn. The line of ${line.name} ends ${line.gen === 1 ? 'where it began' : `after ${line.gen} generations`}. That was the last warren.</p><button type="button" id="newline">Found a new line</button>`;
    line = ended; saveLine(line); archive(line); chronicle();
    $('newline').addEventListener('click', () => { line = newLine(Date.now() % 100000 + 1); saveLine(line); $('ending').close(); const s = g.seed + 1; $('seed').value = s; start(s); });
    return;
  }
  const opts = heirlooms(g);
  box.innerHTML = `<div class="lbl">WHO GOT AWAY · WHAT DO THEY CARRY TO ${line.name.toUpperCase()} ${roman(line.gen + 1)}?</div>` +
    opts.map((o, i) => `<button type="button" data-h="${i}"><b>${o.label}</b>${o.text}</button>`).join('') +
    `<p class="dim small">One heirloom only, and it replaces the last. The hunters will remember which warrens your family favours.</p>`;
  box.querySelectorAll('button[data-h]').forEach(b => b.addEventListener('click', () => {
    line = recordGeneration(line, g, sentence, opts[+b.dataset.h]); saveLine(line); chronicle();
    $('ending').close(); const s = g.seed + 1; $('seed').value = s; start(s);
  }));
}
function chronicle() {
  const c = $('chronicle'); if (!c) return;
  const rows = [...line.chronicle].reverse();
  c.innerHTML = `<h2>The line of ${line.name}${line.ended ? ' <span class="dim">· ended</span>' : ''}</h2>` +
    `<p class="dim">${line.ended ? `It ran ${line.chronicle.length} generation${line.chronicle.length === 1 ? '' : 's'}.` : `Generation ${roman(line.gen)} is out there now${line.heir ? `, ${describe(line.heir)}` : ''}.`}</p>` +
    (rows.length ? `<ol class="gens">${rows.map(r => `<li><div class="gn">${r.name}<span>${r.nights} night${r.nights === 1 ? '' : 's'} · seed ${r.seed}</span></div><p>${r.sentence}</p>${r.inherited || r.passed ? `<p class="dim small">${r.inherited ? 'Born ' + r.inherited + '. ' : ''}${r.passed ? 'Passed on: ' + r.passed + '.' : ''}</p>` : ''}</li>`).join('')}</ol>` : '<p class="dim">No generation has fallen yet.</p>') +
    `<button type="button" id="abandon">Abandon this line and found a new one</button>` +
    (() => { const a = archived().filter(l => l.founded !== line.founded).reverse(); return a.length ? `<h3 class="earlier">Earlier lines</h3><ol class="gens">${a.map(l => `<li><div class="gn">The line of ${l.name}<span>${l.chronicle.length} generation${l.chronicle.length === 1 ? '' : 's'}${l.abandoned ? ' · abandoned' : ''}</span></div><p class="dim small">${l.chronicle.map(r => `${r.name}: ${r.nights} night${r.nights === 1 ? '' : 's'}`).join(' · ')}</p><p>${l.chronicle.at(-1).sentence}</p></li>`).join('')}</ol>` : ''; })();
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
      if (t.pendingDraft) takeBoon(t, g.stats.boons[t.night - 1] && t.pendingDraft.includes(g.stats.boons[t.night - 1]) ? g.stats.boons[t.night - 1] : pickBoon(t.pendingDraft));
      const T = t.T + 1; let a;
      if (T < d.T - k) a = map.get(T) || { type: 'stay' };
      else if (T === d.T - k) { const dd = bestDestination(view(t)); a = dd ? { type: 'move', to: dd.id } : { type: 'stay' }; }
      else a = pol(view(t));
      step(t, a);
      if (t.stats.nights[d.night - 1]?.survived) return true;
    }
    return false;
  };
  const s1 = saved(1);
  return s1 ? ' Running one tick earlier would have seen dawn.' : saved(3) ? ' One tick earlier wasn\'t enough. Three would have been.' : ' Running earlier would not have saved it.';
}
function working() {
  return `seed ${g.seed} · ${g.map.hand.frame} · rules: ${$('cfgsel').value}
night ${g.night}, tick ${g.tick} (global ${g.T})
dials ${JSON.stringify(g.map.dials)}
boons ${g.stats.boons.join(', ') || 'none'}
fights ${g.stats.fights} (won ${g.stats.fightsWon}) · moves ${g.stats.moves} · attacks ${g.stats.attacks}
ticks staying ${g.stats.stayTicks} · in transit ${g.stats.transitTicks}
by warren kind: C ${g.stats.kindTicks.C} · S ${g.stats.kindTicks.S} · D ${g.stats.kindTicks.D}
death ${JSON.stringify(g.stats.death)}
replay ${actions.filter(x => x.a.type !== 'stay').map(x => `${x.T}:${x.a.type[0]}${x.a.to ?? x.a.hunter ?? ''}`).join(' ')}`;
}

function watchLoop() {
  clearInterval(timer);
  const pol = ROSTER[$('watch').value]();
  timer = setInterval(() => {
    if (g.over) { clearInterval(timer); timer = null; return; }
    if (g.pendingDraft) takeBoon(g, pickBoon(g.pendingDraft));
    const a = pol(view(g)); const night = g.night;
    narrate(step(g, a)); actions.push({ T: g.T, a });
    if (g.night !== night) say(`Dawn. Night ${night} survived.`, 'good');
    draw(); panel(); if (g.over) endDialog();
  }, 140);
}

// ---------------------------------------------------------------- input
function cellAt(e) { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / cs), y = Math.floor((e.clientY - r.top) / cs); return x >= 0 && y >= 0 && x < g.W && y < g.H ? y * g.W + x : -1; }
cv.addEventListener('mousemove', e => { const c = cellAt(e); if (c !== hover) { hover = c; draw(); } });
cv.addEventListener('mouseleave', () => { hover = -1; draw(); });
cv.addEventListener('click', e => {
  if ($('watch').value) return;
  const c = cellAt(e); if (c < 0) return;
  const v = view(g);
  const h = v.attackable().find(h => h.y * g.W + h.x === c);
  if (h) return act({ type: 'attack', hunter: h.id });
  if (inTransit(g.troop)) return;
  const w = g.warrens.find(w => w.i === c);
  if (w && w.id !== g.troop.warren) return act({ type: 'move', to: w.id });
  if (!w && g.tCost(c) < Infinity && c !== v.here) return act({ type: 'go', cell: c });
});
$('stay').addEventListener('click', () => act({ type: 'stay' }));
for (const k of ['decoy', 'rearguard', 'scout', 'dig']) $('sp-' + k).addEventListener('click', () => { if (canSpend(g, k)) { const was = inTransit(g.troop); if (was) { g._spendNext = k; } else act({ type: k }); } });
$('attackbtn').addEventListener('click', () => { const h = view(g).attackable().sort((a, b) => a.str - b.str)[0]; if (h) act({ type: 'attack', hunter: h.id }); });
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select') || document.querySelector('dialog[open]')) return;
  if (e.code === 'Space') { e.preventDefault(); act({ type: 'stay' }); }
  if (e.key === 'a' || e.key === 'A') $('attackbtn').click();
  const sk = { d: 'decoy', r: 'rearguard', s: 'scout', g: 'dig' }[e.key.toLowerCase()];
  if (sk) $('sp-' + sk).click();
});
$('newrun').addEventListener('click', () => start(+$('seed').value || 1));
$('watch').addEventListener('change', () => start(+$('seed').value || 1));
$('cfgsel').addEventListener('change', () => start(+$('seed').value || 1));
$('again').addEventListener('click', () => { $('ending').close(); start(g.seed); });
$('next').addEventListener('click', () => { $('ending').close(); $('seed').value = g.seed + 1; start(g.seed + 1); });
window.addEventListener('resize', () => { layout(); draw(); });
start(1);

// ---------------------------------------------------------------- tabs, and the ending can't be dismissed without a choice
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  for (const id of ['play', 'chron', 'brief']) $('tab-' + id).hidden = id !== b.dataset.tab;
  $('tab-play').style.display = b.dataset.tab === 'play' ? '' : 'none';
  document.querySelector('.tools').style.display = b.dataset.tab === 'play' ? '' : 'none';
  if (b.dataset.tab === 'play') { layout(); draw(); }
}));
$('ending').addEventListener('cancel', e => { if (!watching()) e.preventDefault(); });
// the CD brief: inlined in the artifact build; fetched next to the page when run locally
if ($('tab-brief').innerHTML.includes('<!--BRIEF-->')) fetch('cd-brief.html').then(r => r.ok ? r.text() : '').then(t => { if (t) $('tab-brief').innerHTML = t; }).catch(() => {});
// read-only handle for debugging and automated playtests (never used by the game itself)
window.__lw = { get g() { return g; }, get line() { return line; } };
