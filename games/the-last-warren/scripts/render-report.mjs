// report.json -> an HTML page (artifact body, no skeleton). node scripts/render-report.mjs out.html
import { readFileSync, writeFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(new URL('../reports/report.json', import.meta.url), 'utf8'));
const NOTES = (() => { try { return JSON.parse(readFileSync(new URL('../reports/notes.json', import.meta.url), 'utf8')); } catch { return {}; } })();
const out = process.argv[2] || new URL('../reports/REPORT.body.html', import.meta.url);

const f2 = x => (x == null || Number.isNaN(x)) ? '—' : (+x).toFixed(2);
const pct = x => x == null ? '—' : Math.round(100 * x) + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ros = R.roster;
const order = Object.keys(ros).sort((a, b) => ros[b].meanNights - ros[a].meanNights);
const family = n => n === 'expert' ? 'expert' : n.startsWith('hybrid') || n.startsWith('scout') ? 'skilled' : 'rule';

// --- chart: survival curve, nights 1..8
function curveChart(series) {
  const W = 640, H = 260, L = 44, B = 34, T = 12, Rr = 120;
  const x = n => L + (n - 1) * (W - L - Rr) / 7, y = v => T + (1 - v) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of runs surviving each night">`;
  for (const v of [0, .25, .5, .75, 1]) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" class="ax" text-anchor="end">${v * 100}%</text>`;
  for (let n = 1; n <= 8; n++) s += `<text x="${x(n)}" y="${H - B + 18}" class="ax" text-anchor="middle">${n}</text>`;
  s += `<text x="${(L + W - Rr) / 2}" y="${H - 4}" class="ax" text-anchor="middle">nights survived, at least</text>`;
  const labels = [];
  for (const { name, curve, cls } of series) {
    s += `<polyline class="ln ${cls}" points="${curve.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')}"/>`;
    curve.forEach((v, i) => { if (i === 0) s += `<circle class="pt ${cls}" cx="${x(1)}" cy="${y(v)}" r="3"/>`; });
    labels.push({ name, cls, y: y(curve[2] ?? 0) });
  }
  labels.sort((a, b) => a.y - b.y); let last = -99;
  for (const l of labels) { const ly = Math.max(l.y, last + 13); last = ly; s += `<text x="${x(3) + 0}" dx="0" y="0" class="hidden"></text><text x="${W - Rr + 8}" y="${ly + 4}" class="lab ${l.cls}">${esc(l.name)}</text>`; }
  return s + '</svg>';
}
const pick = ['expert', R.verdict.best, R.verdict.bestSingle, 'always-stay', 'attack-always'].filter((v, i, a) => ros[v] && a.indexOf(v) === i);
const curveSvg = curveChart(pick.map(n => ({ name: n, curve: ros[n].curve, cls: n === 'expert' ? 'c-exp' : family(n) === 'skilled' ? 'c-sk' : n === R.verdict.bestSingle ? 'c-rule' : 'c-dim' })));

// --- bars: mean nights per policy
const maxN = Math.max(...order.map(n => ros[n].meanNights));
const bars = order.map(n => `<div class="bar ${family(n)}"><span class="bn">${esc(n)}</span><span class="bt"><span style="width:${100 * ros[n].meanNights / maxN}%"></span></span><span class="bv">${f2(ros[n].meanNights)}</span></div>`).join('');

// --- verdict
const checks = R.verdict.checks.map(c => `<tr class="${c.pen > 0.001 ? 'miss' : 'ok'}"><td>${c.pen > 0.001 ? '✕' : '✓'}</td><td>${esc(c.want)}</td><td class="num">${typeof c.got === 'number' ? (Math.abs(c.got) <= 1.0001 && !c.want.includes('night') && !c.want.includes('times') ? pct(c.got) : f2(c.got)) : c.got}</td></tr>`).join('');
const passed = R.verdict.checks.filter(c => c.pen <= 0.001).length;

// --- roster table
const rosterRows = order.map(n => { const a = ros[n]; return `<tr class="${family(n)}"><td>${esc(n)}</td><td class="num">${f2(a.meanNights)}</td><td class="num">${pct(a.reach1)}</td><td class="num">${pct(a.reach3)}</td><td class="num">${pct(a.reach5)}</td><td class="num">${pct(a.stayShare)}</td><td class="num">${f2(a.movesPerNight)}</td><td class="num">${f2(a.attacksPerNight)}</td><td class="num">${pct(a.deathShare.found)}</td><td class="num">${pct(a.deathShare.transit)}</td><td class="num">${pct(a.deathShare.attack)}</td><td class="num">${a.twin1 == null ? '—' : pct(a.twin1)}</td></tr>`; }).join('');

// --- toggles
const tg = R.toggles, tnames = Object.keys(tg), tpol = Object.keys(tg[tnames[0]]);
const toggleRows = tnames.map(t => { const base = tg['as tuned']; return `<tr${t === 'as tuned' ? ' class="base"' : ''}><td>${esc(t)}</td>${tpol.map(p => { const v = tg[t][p].mean, d = v - base[p].mean; return `<td class="num">${f2(v)}${t === 'as tuned' ? '' : `<small class="${d > 0.15 ? 'up' : d < -0.15 ? 'down' : ''}">${d >= 0 ? '+' : ''}${d.toFixed(2)}</small>`}</td>`; }).join('')}</tr>`; }).join('');

// --- sensitivity small multiples
function spark(k, rows) {
  const W = 200, H = 90, L = 8, Rr = 8, T = 8, B = 20;
  const ys = rows.flatMap(r => [r.skilled, r.single]); const lo = 0, hi = Math.max(1, ...ys) * 1.1;
  const x = i => L + i * (W - L - Rr) / (rows.length - 1 || 1), y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const cur = R.cfg[k] ?? null;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${k}">`;
  s += `<polyline class="ln c-sk" points="${rows.map((r, i) => `${x(i)},${y(r.skilled)}`).join(' ')}"/>`;
  s += `<polyline class="ln c-rule" points="${rows.map((r, i) => `${x(i)},${y(r.single)}`).join(' ')}"/>`;
  rows.forEach((r, i) => { s += `<text x="${x(i)}" y="${H - 5}" class="ax" text-anchor="middle"${String(r.v) === String(cur) ? ' font-weight="700"' : ''}>${r.v}</text>`; });
  return s + '</svg>';
}
const sens = Object.entries(R.sensitivity).map(([k, rows]) => `<figure><figcaption>${esc(k)}</figcaption>${spark(k, rows)}</figure>`).join('');

const cfgRows = Object.entries(R.cfg).map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('');
const notes = (NOTES.findings || []).map(n => `<li>${n}</li>`).join('');

const html = `<title>The Last Warren — Smoke</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500;62..125,800;62..125,900&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Martian+Mono:wght@400;600&display=swap">
<style>
:root{--paper:#e3e4d8;--paper2:#d5d8c6;--ink:#1c1f17;--dim:#5a604f;--line:#b5b9a4;--moss:#3d6a2b;--blood:#a2301f;--gold:#856a1c;--plum:#5b4a7a;
--display:'Archivo','Arial Narrow',Arial,sans-serif;--body:'Literata',Georgia,serif;--mono:'Martian Mono',ui-monospace,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--paper:#14170f;--paper2:#1d2117;--ink:#e3e6d4;--dim:#9aa08a;--line:#353a2b;--moss:#8fbf63;--blood:#e2654c;--gold:#c9a64b;--plum:#b7a2e0;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#14170f;--paper2:#1d2117;--ink:#e3e6d4;--dim:#9aa08a;--line:#353a2b;--moss:#8fbf63;--blood:#e2654c;--gold:#c9a64b;--plum:#b7a2e0;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.6}
.wrap{max-width:980px;margin:0 auto;padding-inline:20px;padding-block:0 60px}
h1,h2,h3{font-family:var(--display);margin:0;text-wrap:balance}
header{border-bottom:3px double var(--ink);padding-block:44px 22px}
.kick{font-family:var(--mono);font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--blood)}
h1{font-size:clamp(46px,10vw,92px);font-weight:900;font-stretch:62%;line-height:.88;text-transform:uppercase;margin:12px 0 10px}
h1 span{color:var(--moss)}
.sub{font-size:20px;font-style:italic;color:var(--dim);max-width:44ch}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:26px 0 0}
.kv div{border-top:2px solid var(--ink);padding-top:8px}.kv b{font-family:var(--display);font-weight:900;font-stretch:70%;font-size:34px;display:block;line-height:1}
.kv span{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase}
section{padding-block:28px;border-top:1px solid var(--line)}
h2{font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.24em;color:var(--blood);text-transform:uppercase;margin-bottom:8px}
h3{font-size:clamp(26px,4vw,36px);font-weight:800;font-stretch:72%;text-transform:uppercase;line-height:1.05;margin-bottom:12px}
p{margin:0 0 14px;max-width:70ch}.lede{font-style:italic;color:var(--dim)}
.find{padding-left:20px}.find li{margin-bottom:10px;max-width:72ch}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);text-align:left;border-bottom:2px solid var(--ink);padding:6px 8px 6px 0;white-space:nowrap}
td{padding:6px 8px 6px 0;border-bottom:1px solid var(--line);vertical-align:top}
td.num,th.num{text-align:right;font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
td small{display:block;font-size:10px;color:var(--dim)} td small.up{color:var(--moss)} td small.down{color:var(--blood)}
tr.expert td:first-child{color:var(--plum);font-weight:600} tr.skilled td:first-child{color:var(--moss)} tr.base td{font-weight:600}
.verdict tr.ok td:first-child{color:var(--moss);font-weight:700} .verdict tr.miss td:first-child{color:var(--blood);font-weight:700}
.verdict tr.miss td{background:color-mix(in srgb,var(--blood) 7%,transparent)}
svg{width:100%;height:auto;display:block}
svg .grid{stroke:var(--line);stroke-width:1} svg .ax{fill:var(--dim);font-family:var(--mono);font-size:10px} svg .hidden{display:none}
svg .ln{fill:none;stroke-width:2.5} svg .pt{stroke:none}
.c-exp{stroke:var(--plum);fill:var(--plum)} .c-sk{stroke:var(--moss);fill:var(--moss)} .c-rule{stroke:var(--blood);fill:var(--blood)} .c-dim{stroke:var(--dim);fill:var(--dim);opacity:.7}
svg .lab{font-family:var(--mono);font-size:10.5px;stroke:none}
.bars{display:grid;gap:4px;margin-top:10px}
.bar{display:grid;grid-template-columns:150px minmax(0,1fr) 44px;gap:10px;align-items:center;font-family:var(--mono);font-size:11px}
.bar .bt{height:12px;background:var(--paper2)} .bar .bt span{display:block;height:100%;background:var(--dim)}
.bar.skilled .bt span{background:var(--moss)} .bar.expert .bt span{background:var(--plum)} .bar.rule .bt span{background:var(--blood);opacity:.75}
.bar .bv{text-align:right;font-variant-numeric:tabular-nums}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--mono);font-size:10.5px;color:var(--dim);margin-top:8px}
.legend i{display:inline-block;width:14px;height:3px;margin-right:6px;vertical-align:3px}
.sens{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.sens figure{margin:0}.sens figcaption{font-family:var(--mono);font-size:11px;color:var(--ink);margin-bottom:4px}
.cfg{display:flex;flex-wrap:wrap;gap:4px 16px;font-family:var(--mono);font-size:11px;color:var(--dim)} .cfg b{color:var(--ink);font-weight:600}
footer{border-top:3px double var(--ink);margin-top:20px;padding-top:18px;font-size:14px;color:var(--dim)}
@media (max-width:640px){.bar{grid-template-columns:110px minmax(0,1fr) 40px}}
</style>
<div class="wrap">
<header>
  <div class="kick">Unstuck Games · Smoke report · The Last Warren</div>
  <h1><span>Is there</span><br>a game?</h1>
  <p class="sub">${esc(NOTES.answer || 'What the machines found when they played the loop.')}</p>
  <div class="kv">
    <div><b>${(R.games / 1000).toFixed(0)}k</b><span>games in this run</span></div>
    <div><b>${NOTES.tuneGames ? (NOTES.tuneGames / 1e6).toFixed(1) + 'M' : '—'}</b><span>games searching for rules</span></div>
    <div><b>${passed}/${R.verdict.checks.length}</b><span>targets met</span></div>
    <div><b>${f2(ros.expert?.meanNights)}</b><span>nights, the expert</span></div>
    <div><b>${f2(ros[R.verdict.bestSingle].meanNights)}</b><span>nights, best one-rule</span></div>
  </div>
</header>

<section><h2>What it found</h2><ul class="find">${notes}</ul></section>

<section>
  <h2>I · The verdict</h2><h3>The targets, as judged</h3>
  <p class="lede">The definition of "fun by the numbers", written before the search ran. The expert isn't in the judging pool; it's measured separately below.</p>
  <div class="scroll"><table class="verdict"><thead><tr><th></th><th>Target</th><th class="num">Got</th></tr></thead><tbody>${checks}</tbody></table></div>
</section>

<section>
  <h2>II · The curve</h2><h3>How far each kind of player gets</h3>
  ${curveSvg}
  <div class="legend"><span><i style="background:var(--plum)"></i>expert (lookahead)</span><span><i style="background:var(--moss)"></i>best hybrid</span><span><i style="background:var(--blood)"></i>best one-rule policy</span><span><i style="background:var(--dim)"></i>always stay / always attack</span></div>
  <div class="bars">${bars}</div>
</section>

<section>
  <h2>III · Every policy</h2><h3>${R.seeds.toLocaleString()} seeds each</h3>
  <p class="lede">Deaths split by cause. The twin column is the share of "found while staying" deaths that moving one tick earlier would have survived, measured by replaying the same world.</p>
  <div class="scroll"><table><thead><tr><th>Policy</th><th class="num">Nights</th><th class="num">≥1</th><th class="num">≥3</th><th class="num">≥5</th><th class="num">Stay</th><th class="num">Moves/n</th><th class="num">Attacks/n</th><th class="num">Found</th><th class="num">Transit</th><th class="num">Attack</th><th class="num">1 tick late</th></tr></thead><tbody>${rosterRows}</tbody></table></div>
</section>

<section>
  <h2>IV · The progression mechanics</h2><h3>Which ones bend the curve</h3>
  <p class="lede">Mean nights with each mechanic switched off in turn. The small number is the change from the tuned rules.</p>
  <div class="scroll"><table><thead><tr><th>Rules</th>${tpol.map(p => `<th class="num">${esc(p)}</th>`).join('')}</tr></thead><tbody>${toggleRows}</tbody></table></div>
</section>

<section>
  <h2>V · Sensitivity</h2><h3>One dial at a time</h3>
  <p class="lede">Green is the best hybrid, red the best one-rule policy, in mean nights. Where the lines are far apart, skill matters. The tuned value is in bold.</p>
  <div class="sens">${sens}</div>
</section>

<section><h2>VI · The tuned rules</h2><div class="cfg">${cfgRows}</div></section>

<footer>Generated ${esc(R.when)} · ${R.games.toLocaleString()} games in ${R.seconds}s · seeds 100000+ (the search used seeds 1–150, so this run is held out) · code: <code>games/the-last-warren/</code></footer>
</div>`;
writeFileSync(out, html);
console.log('wrote', String(out));
