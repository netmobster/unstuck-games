/* <lw-board theme="diary" scene="located" cell="16" still="true|false"> — the board renderer for the diary site (and the game's art reference).
   Plain canvas 2D, no dependencies. Themes: diary (graphite on cream, lines shiver) · room · burrow · notebook · page · scope.
   Cartographic symbology instead of blobs: hachured mountains, ruled water, stippled forest, cased roads, ink tokens.
   room = ink on bone paper under a lamp · burrow = faint glow on black · notebook = graphite on kraft with a 3-frame boil. */
(function () {
  const W = 28, H = 18;
  const MAP = [
    'llllllll.....ff......mm.....',
    'llllllll....ffff.....mm...ff',
    'lllllll....fffff......f...ff',
    'lllllllll..ffffff....ff.....',
    '...llllll..fffff....fff.....',
    '.....ll....ffff....ff.......',
    '...........fff..............',
    '..........ff............mm..',
    '......mm..f............mmmm.',
    '......mmm.......rrrrrrrmmmm.',
    '.......m........r......mmm..',
    '........rrrrrrrrr.......m...',
    '.......rr...........l.......',
    'ff....rr............l....mmm',
    'fff..rr............ll...mmmm',
    'ff...r..............l..mmmmm',
    '.....r........ff.....mmmmmm.',
    '....rr.......fff....mmmmm...'
  ];
  const TT = { '.': 'open', r: 'road', f: 'forest', l: 'lake', m: 'mountain' };
  const terrainAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'mountain' : TT[MAP[y][x]];
  const WARRENS = [
    { x: 17, y: 3, k: 'N', d: 'shallow' }, { x: 4, y: 9, k: 'S', d: 'mid' }, { x: 8, y: 15, k: 'C', d: 'shallow' },
    { x: 13, y: 12, k: 'S', d: 'deep' }, { x: 18, y: 15, k: 'C', d: 'deep' }, { x: 23, y: 7, k: 'D', d: 'mid' }, { x: 21, y: 11, k: 'D', d: 'deep' }
  ];
  const KIND = { C: 'Combat', S: 'Scout', D: 'Defense', N: 'Nursery' };
  const GIFT = { C: '+30% strength, loud', S: 'sees belief, thin walls', D: '+30% holding, slow to leave', N: '+1 a tick, loud' };
  const GROUND = { open: 'open: exposed', road: 'road: fast and loud', forest: 'forest: hidden and quiet', lake: 'lake: you swim, they can’t', mountain: 'mountain' };
  const warrenAt = (x, y) => WARRENS.find(w => w.x === x && w.y === y);
  const H32 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = ((h ^ (h >>> 13)) * 1274126177) | 0; return (h ^ (h >>> 16)) >>> 0; };
  const r01 = (a, b) => (H32(a | 0, b | 0) % 1000) / 1000;

  const youPass = (x, y) => terrainAt(x, y) !== 'mountain';
  const themPass = (x, y) => { const t = terrainAt(x, y); return t !== 'mountain' && t !== 'lake'; };
  function bfs(sx, sy, pass) {
    const dist = new Int16Array(W * H).fill(-1), prev = new Int16Array(W * H).fill(-1);
    const q = [sy * W + sx]; dist[q[0]] = 0; let qi = 0;
    while (qi < q.length) {
      const i = q[qi++], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (dist[j] >= 0 || !pass(nx, ny)) continue;
        dist[j] = dist[i] + 1; prev[j] = i; q.push(j);
      }
    }
    return { dist, prev };
  }
  function pathTo(from, to, pass) {
    const { dist, prev } = bfs(from.x, from.y, pass);
    let i = to.y * W + to.x; if (dist[i] < 0) return null;
    const p = []; while (i >= 0) { p.push({ x: i % W, y: (i / W) | 0 }); if (i === from.y * W + from.x) break; i = prev[i]; }
    return p.reverse();
  }
  const stepToward = (h, target, pass, stopAt = 1) => {
    const p = pathTo(h, target, pass); if (!p || p.length - 1 <= stopAt) return false;
    if (p[1].x === target.x && p[1].y === target.y) return false;
    h.x = p[1].x; h.y = p[1].y; return true;
  };
  const stepAway = (h, target) => {
    let best = null, bd = Math.abs(h.x - target.x) + Math.abs(h.y - target.y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = h.x + dx, ny = h.y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !themPass(nx, ny)) continue; const d = Math.abs(nx - target.x) + Math.abs(ny - target.y); if (d > bd) { bd = d; best = [nx, ny]; } }
    if (best) { h.x = best[0]; h.y = best[1]; }
  };
  const youTicks = path => path.reduce((n, c, i) => i === 0 ? 0 : n + (terrainAt(c.x, c.y) === 'forest' ? 2 : 1), 0);

  const SCENES = {
    hidden: { troop: { x: 17, y: 3, n: 4, state: 'warren' }, current: 0, hunters: [{ k: 'sweeper', x: 26, y: 2 }, { k: 'sweeper', x: 2, y: 16 }], mode: 'patrol' },
    located: { troop: { x: 17, y: 3, n: 19, state: 'warren', located: true, watched: 3 }, current: 0, ring: true, warm: true, mode: 'muster',
      hunters: [{ k: 'sweeper', x: 14, y: 3, reach: true }, { k: 'sweeper', x: 17, y: 6, reach: true }, { k: 'tracker', x: 20, y: 3, trail: true, reach: true }, { k: 'listener', x: 22, y: 8, muster: true }] },
    transit: { troop: { x: 17, y: 3, n: 19, state: 'transit' }, dest: { x: 13, y: 12 }, mode: 'transit', tracks: true,
      hunters: [{ k: 'sweeper', x: 21, y: 2 }, { k: 'sweeper', x: 20, y: 6 }, { k: 'tracker', x: 23, y: 4, trail: true }] },
    forest: { troop: { x: 13, y: 5, n: 23, state: 'holdForest' }, mode: 'patrol', hunters: [{ k: 'sweeper', x: 10, y: 8 }, { k: 'sweeper', x: 17, y: 8 }, { k: 'tracker', x: 20, y: 2 }] },
    scout: { troop: { x: 13, y: 12, n: 31, state: 'warren' }, current: 3, mode: 'patrol', heat: [{ x: 17, y: 3, s: 2.2, v: 1 }, { x: 12, y: 11, s: 1.5, v: 0.4 }, { x: 20, y: 5, s: 1.8, v: 0.55 }],
      hunters: [{ k: 'sweeper', x: 15, y: 6 }, { k: 'sweeper', x: 19, y: 5 }, { k: 'tracker', x: 16, y: 9 }] },
    decoy: { troop: { x: 17, y: 3, n: 23, state: 'warren' }, current: 0, mode: 'decoy',
      decoy: { path: [[18, 3], [19, 3], [20, 3], [21, 3], [22, 3], [22, 4], [23, 4], [24, 4], [25, 4], [26, 4], [26, 5]], seenAt: 5 },
      hunters: [{ k: 'sweeper', x: 21, y: 7 }, { k: 'tracker', x: 25, y: 0 }] },
    rearguard: { troop: { x: 18, y: 15, n: 31, state: 'warren' }, current: 4, mode: 'static', rearguard: { x: 17, y: 10, n: 5, state: 'fighting' },
      hunters: [{ k: 'sweeper', x: 17, y: 9, reach: true }, { k: 'tracker', x: 21, y: 13 }] },
    besieged: { troop: { x: 8, y: 15, n: 41, state: 'warren', located: true, besieged: true, watched: 6 }, current: 2, ring: true, ringSolid: true, warm: true, mode: 'static',
      hunters: [{ k: 'sweeper', x: 8, y: 12, reach: true }, { k: 'sweeper', x: 5, y: 15, reach: true }, { k: 'tracker', x: 11, y: 15, reach: true }, { k: 'hound', x: 8, y: 17, reach: true, trail: true }] },
    dawn: { troop: { x: 21, y: 11, n: 58, state: 'warren' }, current: 6, mode: 'retreat', dawnWash: true, hunters: [{ k: 'sweeper', x: 25, y: 13 }, { k: 'tracker', x: 16, y: 15 }, { k: 'listener', x: 12, y: 8 }] },
    fell: { troop: { x: 8, y: 15, n: 41, state: 'dead' }, current: 2, mode: 'static', dark: true, hunters: [{ k: 'sweeper', x: 7, y: 15 }, { k: 'sweeper', x: 9, y: 15 }, { k: 'tracker', x: 8, y: 14 }] },
    // the twin: one night from (17,3), told twice
    twinStay: { troop: { x: 17, y: 3, n: 19, state: 'warren', located: true, besieged: true, watched: 6 }, current: 0, ring: true, ringSolid: true, warm: true, mode: 'static',
      hunters: [{ k: 'sweeper', x: 14, y: 3, reach: true }, { k: 'sweeper', x: 17, y: 6, reach: true }, { k: 'tracker', x: 20, y: 3, reach: true, trail: true }, { k: 'listener', x: 19, y: 6, reach: true }] },
    twinFell: { troop: { x: 17, y: 3, n: 19, state: 'dead' }, current: 0, mode: 'static', dark: true, hunters: [{ k: 'sweeper', x: 16, y: 3 }, { k: 'sweeper', x: 17, y: 4 }, { k: 'tracker', x: 18, y: 3 }, { k: 'listener', x: 18, y: 5 }] },
    twinArrived: { troop: { x: 13, y: 12, n: 21, state: 'warren' }, current: 3, mode: 'patrol', heat: [{ x: 17, y: 3, s: 2.2, v: 1 }, { x: 20, y: 5, s: 1.8, v: 0.55 }, { x: 12, y: 11, s: 1.5, v: 0.3 }],
      hunters: [{ k: 'sweeper', x: 15, y: 4 }, { k: 'sweeper', x: 18, y: 5 }, { k: 'tracker', x: 21, y: 3 }] },
    twinDawn: { troop: { x: 13, y: 12, n: 23, state: 'warren' }, current: 3, mode: 'retreat', dawnWash: true, hunters: [{ k: 'sweeper', x: 14, y: 6 }, { k: 'sweeper', x: 17, y: 8 }, { k: 'tracker', x: 19, y: 4 }] }
  };

  const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const THEMES = {
    room: { paper: '#ece2cc', ink: '#2a241b', moss: '#8fbf63', mossInk: '#4f7a2e', blood: '#e2654c', bloodInk: '#9c3a26', gold: '#d2b052', goldInk: '#8a6a1d',
      forestTint: 'rgba(95,138,60,.16)', forestInk: '#4d6e33', lakeTint: 'rgba(110,140,165,.20)', lakeInk: '#5f7d95', mountainTint: 'rgba(80,72,62,.12)', mountainInk: '#4a433a', roadInk: '#4a433a',
      gridA: 0.07, crossA: 0.3, fibre: 0.05, lamp: true, vignette: 0.42, glow: false, boil: false, countFont: '"JetBrains Mono", ui-monospace, monospace' },
    burrow: { paper: '#08090a', ink: '#e4ddcc', moss: '#8fbf63', mossInk: '#8fbf63', blood: '#e2654c', bloodInk: '#e2654c', gold: '#d2b052', goldInk: '#d2b052',
      forestTint: 'rgba(143,191,99,.06)', forestInk: 'rgba(143,191,99,.55)', lakeTint: 'rgba(110,140,180,.07)', lakeInk: 'rgba(130,160,200,.5)', mountainTint: 'rgba(220,210,190,.04)', mountainInk: 'rgba(220,210,190,.45)', roadInk: 'rgba(228,221,204,.45)',
      gridA: 0, crossA: 0.18, fibre: 0, lamp: false, vignette: 0.75, glow: true, boil: false, countFont: '"JetBrains Mono", ui-monospace, monospace' },
    notebook: { paper: '#b08f5f', ink: '#2b241b', moss: '#8fbf63', mossInk: '#3d6424', blood: '#e2654c', bloodInk: '#8a3320', gold: '#d2b052', goldInk: '#6b5012',
      forestTint: 'rgba(60,90,40,.14)', forestInk: '#3b4a2c', lakeTint: 'rgba(60,80,110,.14)', lakeInk: '#4a5a6c', mountainTint: 'rgba(43,36,27,.10)', mountainInk: '#3a3128', roadInk: '#3a3128',
      gridA: 0.14, crossA: 0, fibre: 0.08, lamp: false, vignette: 0.28, glow: false, boil: true, countFont: '"JetBrains Mono", ui-monospace, monospace' },
    // a book plate: flat light, ink on cream, no lamp
    page: { paper: '#f3ecdb', ink: '#1f1b16', moss: '#6f9a48', mossInk: '#4a6e2c', blood: '#b5452f', bloodInk: '#8f2a1c', gold: '#b8923f', goldInk: '#7a5c1a',
      forestTint: 'rgba(95,138,60,.14)', forestInk: '#4d6e33', lakeTint: 'rgba(90,120,150,.16)', lakeInk: '#5f7d95', mountainTint: 'rgba(80,72,62,.10)', mountainInk: '#4a433a', roadInk: '#4a433a',
      gridA: 0.05, crossA: 0.25, fibre: 0.04, lamp: false, vignette: 0.14, glow: false, boil: false, countFont: '"Newsreader", Georgia, serif' },
    // a night-watch scope: phosphor on black, a sweep, scanlines
    scope: { paper: '#060a08', ink: '#b9d9b4', moss: '#9fe08a', mossInk: '#9fe08a', blood: '#ff6f52', bloodInk: '#ff6f52', gold: '#e3c76a', goldInk: '#e3c76a',
      forestTint: 'rgba(159,224,138,.07)', forestInk: 'rgba(159,224,138,.5)', lakeTint: 'rgba(120,170,200,.07)', lakeInk: 'rgba(120,170,200,.45)', mountainTint: 'rgba(185,217,180,.05)', mountainInk: 'rgba(185,217,180,.4)', roadInk: 'rgba(185,217,180,.4)',
      gridA: 0.07, crossA: 0.15, fibre: 0, lamp: false, vignette: 0.8, glow: true, boil: false, sweep: true, scan: true, countFont: '"Spline Sans Mono", ui-monospace, monospace' },
    // a diary page: graphite on cream, ruled, the lines shiver
    diary: { paper: '#f0e7d2', ink: '#2b2a26', moss: '#5f8a3a', mossInk: '#3d6424', blood: '#a33a22', bloodInk: '#8a3320', gold: '#9a7a2a', goldInk: '#6b5012',
      forestTint: 'rgba(60,90,40,.12)', forestInk: '#3b4a2c', lakeTint: 'rgba(60,80,110,.12)', lakeInk: '#4a5a6c', mountainTint: 'rgba(43,36,27,.08)', mountainInk: '#3a3128', roadInk: '#3a3128',
      gridA: 0.09, crossA: 0, fibre: 0.05, lamp: false, vignette: 0.1, glow: false, boil: true, countFont: '"Courier Prime", ui-monospace, monospace' }
  };

  function regionLoops(cells) {
    const has = (x, y) => cells.has(x + ',' + y);
    const out = new Map();
    const add = (x1, y1, x2, y2) => { const k = x1 + ',' + y1; if (!out.has(k)) out.set(k, []); out.get(k).push([x2, y2]); };
    for (const key of cells) {
      const [x, y] = key.split(',').map(Number);
      if (!has(x, y - 1)) add(x, y, x + 1, y);
      if (!has(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!has(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!has(x - 1, y)) add(x, y + 1, x, y);
    }
    const loops = []; let guard = 0;
    while (out.size && guard++ < 5000) {
      const [startKey, list] = out.entries().next().value;
      let cur = startKey.split(',').map(Number);
      let next = list.shift(); if (!list.length) out.delete(startKey);
      const loop = [cur]; let dir = [next[0] - cur[0], next[1] - cur[1]]; cur = next; let g2 = 0;
      while (!(cur[0] === loop[0][0] && cur[1] === loop[0][1]) && g2++ < 5000) {
        loop.push(cur);
        const k = cur[0] + ',' + cur[1]; const cands = out.get(k); if (!cands) break;
        let pick = 0;
        if (cands.length > 1) { const r = [-dir[1], dir[0]]; const i = cands.findIndex(c => c[0] - cur[0] === r[0] && c[1] - cur[1] === r[1]); if (i >= 0) pick = i; }
        next = cands.splice(pick, 1)[0]; if (!cands.length) out.delete(k);
        dir = [next[0] - cur[0], next[1] - cur[1]]; cur = next;
      }
      loops.push(loop);
    }
    return loops;
  }
  // corner-eased loop: straight runs, corners cut with short curves. Jitter per frame for the notebook boil.
  function loopPath(loop, c, jitter, frame) {
    const pts = loop.map(([x, y]) => {
      let jx = 0, jy = 0;
      if (jitter && x > 0 && y > 0 && x < W && y < H) { jx = (r01(x * 31 + frame * 7, y * 17 + 3) - 0.5) * jitter; jy = (r01(x * 13 + 5, y * 29 + frame * 11) - 0.5) * jitter; }
      return [x * c + jx, y * c + jy];
    });
    const p = new Path2D(); const n = pts.length; const k = 0.28;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ax = a[0] + (b[0] - a[0]) * k, ay = a[1] + (b[1] - a[1]) * k, bx = a[0] + (b[0] - a[0]) * (1 - k), by = a[1] + (b[1] - a[1]) * (1 - k);
      if (i === 0) p.moveTo(ax, ay); else p.quadraticCurveTo(a[0], a[1], ax, ay);
      p.lineTo(bx, by);
    }
    p.closePath(); return p;
  }

  class WarrenBoard2 extends HTMLElement {
    constructor() { super(); this._scene = 'hidden'; this._cell = 32; this._theme = 'diary'; this._t0 = performance.now(); this._hover = null; this._raf = 0; this.dpr = 1; this._visible = true; }
    static get observedAttributes() { return ['scene', 'cell', 'still', 'theme']; }
    now() { return (performance.now() - this._t0) / 1000; }
    isStill() { const v = this.getAttribute('still'); return v != null && v !== 'false' && v !== '0'; }
    get scene() { return this._scene; }
    set scene(v) { if (v && v !== this._scene) { this._scene = v; if (this.canvas) { this.loadScene(); this.draw(this.now()); this.start(); } } }
    get cell() { return this._cell; }
    set cell(v) { const c = +v || 32; if (c !== this._cell) { this._cell = c; if (this.canvas) { this.resize(); this.buildTerrain(); this.start(); } } }
    get theme() { return this._theme; }
    set theme(v) { if (v && THEMES[v] && v !== this._theme) { this._theme = v; if (this.canvas) { this.buildTerrain(); this.draw(this.now()); this.start(); } } }
    get T() { return THEMES[this._theme] || THEMES.room; }
    attributeChangedCallback(n, o, v) { if (n === 'scene') this.scene = v; else if (n === 'cell') this.cell = v; else if (n === 'theme') this.theme = v; else if (n === 'still') this.start(); }
    connectedCallback() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.style.display = 'block'; this.style.lineHeight = '0'; this.style.position = 'relative';
        this.appendChild(this.canvas);
        this.canvas.addEventListener('pointermove', e => this.onMove(e));
        this.canvas.addEventListener('pointerleave', () => { this._hover = null; this.canvas.style.cursor = 'default'; });
        this.canvas.addEventListener('click', e => this.onClick(e));
        if ('IntersectionObserver' in window) { this._io = new IntersectionObserver(es => { this._visible = es.some(e => e.isIntersecting); if (this._visible) this.start(); }, { rootMargin: '200px' }); this._io.observe(this); }
      }
      if (this.hasAttribute('scene')) this._scene = this.getAttribute('scene');
      if (this.hasAttribute('cell')) this._cell = +this.getAttribute('cell') || 32;
      if (this.hasAttribute('theme') && THEMES[this.getAttribute('theme')]) this._theme = this.getAttribute('theme');
      this.resize(); this.buildTerrain(); this.loadScene();
      this.draw(this.now()); this.start();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.draw(this.isStill() ? 2.2 : this.now()));
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; if (this._io) this._io.disconnect(); }
    resize() {
      const c = this._cell, dpr = Math.min(2, window.devicePixelRatio || 1); this.dpr = dpr;
      this.canvas.width = Math.round(W * c * dpr); this.canvas.height = Math.round(H * c * dpr);
      this.canvas.style.width = W * c + 'px'; this.canvas.style.height = H * c + 'px';
      this.style.width = W * c + 'px'; this.style.height = H * c + 'px';
    }

    // ---- terrain: one offscreen frame (three for the boil) ----
    buildTerrain() {
      const T = this.T, frames = T.boil ? 3 : 1; this.terrain = [];
      for (let f = 0; f < frames; f++) this.terrain.push(this.renderTerrain(f));
    }
    renderTerrain(frame) {
      const T = this.T, c = this._cell, dpr = this.dpr;
      const off = document.createElement('canvas'); off.width = this.canvas.width; off.height = this.canvas.height;
      const g = off.getContext('2d'); g.scale(dpr, dpr);
      const jitter = T.boil ? c * 0.09 : 0;
      g.fillStyle = T.paper; g.fillRect(0, 0, W * c, H * c);
      if (T.fibre) { const rnd = mulberry(11 + frame); for (let i = 0; i < W * H * 4; i++) { g.fillStyle = hexA(T.ink, rnd() * T.fibre); g.fillRect(rnd() * W * c, rnd() * H * c, 1 + rnd(), 1); } }
      if (T.gridA) { g.strokeStyle = hexA(T.ink, T.gridA); g.lineWidth = 1; g.beginPath(); for (let x = 1; x < W; x++) { g.moveTo(x * c + 0.5, 0); g.lineTo(x * c + 0.5, H * c); } for (let y = 1; y < H; y++) { g.moveTo(0, y * c + 0.5); g.lineTo(W * c, y * c + 0.5); } g.stroke(); }
      if (T.crossA) { g.strokeStyle = hexA(T.ink, T.crossA); g.lineWidth = 1; const a = Math.max(2, c * 0.12); g.beginPath(); for (let x = 2; x < W; x += 4) for (let y = 2; y < H; y += 4) { g.moveTo(x * c - a, y * c + 0.5); g.lineTo(x * c + a, y * c + 0.5); g.moveTo(x * c + 0.5, y * c - a); g.lineTo(x * c + 0.5, y * c + a); } g.stroke(); }
      // open ground: sparse stipple
      if (!T.glow) { g.fillStyle = hexA(T.ink, 0.22); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (terrainAt(x, y) === 'open') { const n = 1 + (H32(x, y) % 2); for (let i = 0; i < n; i++) { g.beginPath(); g.arc((x + 0.15 + r01(x * 7 + i, y * 3) * 0.7) * c, (y + 0.15 + r01(x * 5, y * 11 + i) * 0.7) * c, Math.max(0.6, c * 0.025), 0, 7); g.fill(); } } }
      const cellsOf = type => { const s = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (terrainAt(x, y) === type) s.add(x + ',' + y); return s; };
      const lw = Math.max(0.9, c / 30);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const unionPath = loops => { const u = new Path2D(); loops.forEach(p => u.addPath(p)); return u; };
      // lake: tint, ruled water lines, shoreline
      { const cells = cellsOf('lake'); const loops = regionLoops(cells).map(l => loopPath(l, c, jitter, frame));
        g.fillStyle = T.lakeTint; loops.forEach(p => g.fill(p));
        g.save(); g.clip(unionPath(loops), 'nonzero');
        g.strokeStyle = T.lakeInk; g.lineWidth = lw * 0.9; g.globalAlpha = 0.55; const sp = Math.max(4, c * 0.3);
        for (let yy = sp * 0.6; yy < H * c; yy += sp) { g.beginPath(); for (let xx = 0; xx <= W * c; xx += c * 0.5) { const wob = Math.sin(xx / (c * 0.9) + yy * 0.05 + frame) * c * 0.04; xx === 0 ? g.moveTo(xx, yy + wob) : g.lineTo(xx, yy + wob); } g.stroke(); }
        g.restore();
        g.strokeStyle = T.lakeInk; g.lineWidth = lw * 1.4; loops.forEach(p => g.stroke(p)); }
      // forest: tint, dotted boundary, tree stipple
      { const cells = cellsOf('forest'); const loops = regionLoops(cells).map(l => loopPath(l, c, jitter, frame));
        g.fillStyle = T.forestTint; loops.forEach(p => g.fill(p));
        g.strokeStyle = T.forestInk; g.lineWidth = lw * 1.3; g.setLineDash([lw * 1.2, Math.max(2.5, c * 0.16)]); loops.forEach(p => g.stroke(p)); g.setLineDash([]);
        g.fillStyle = T.forestInk; g.strokeStyle = T.forestInk; g.lineWidth = lw;
        for (const key of cells) { const [x, y] = key.split(',').map(Number);
          for (let i = 0; i < 3; i++) { const px = (x + 0.2 + r01(x * 3 + i + frame, y * 7) * 0.6) * c, py = (y + 0.2 + r01(x * 11, y * 5 + i + frame) * 0.6) * c; const r = c * (0.06 + 0.04 * r01(x + i, y + 9));
            g.globalAlpha = T.glow ? 0.8 : 0.75; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
            if (c >= 22) { g.globalAlpha = 0.6; g.beginPath(); g.moveTo(px, py + r); g.lineTo(px, py + r + c * 0.09); g.stroke(); } }
        } g.globalAlpha = 1; }
      // mountain: tint, hatching, hard edge
      { const cells = cellsOf('mountain'); const loops = regionLoops(cells).map(l => loopPath(l, c, jitter, frame));
        g.fillStyle = T.mountainTint; loops.forEach(p => g.fill(p));
        g.save(); g.clip(unionPath(loops), 'nonzero');
        g.strokeStyle = T.mountainInk; g.lineWidth = lw * 0.9; g.globalAlpha = T.glow ? 0.7 : 0.5; const sp = Math.max(3, c * 0.22);
        for (let d = -H * c; d < W * c + H * c; d += sp) { const wob = jitter ? (r01(d * 3 + frame, 1) - 0.5) * jitter : 0; g.beginPath(); g.moveTo(d + wob, 0); g.lineTo(d + H * c + wob, H * c); g.stroke(); }
        g.restore();
        g.strokeStyle = T.mountainInk; g.lineWidth = lw * 1.5; loops.forEach(p => g.stroke(p)); }
      // road: cased double line along the network
      { const cells = cellsOf('road'); const seg = new Path2D();
        for (const key of cells) { const [x, y] = key.split(',').map(Number); let deg = 0;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (cells.has((x + dx) + ',' + (y + dy))) { deg++; if (dx > 0 || dy > 0) { seg.moveTo((x + 0.5) * c, (y + 0.5) * c); seg.lineTo((x + dx + 0.5) * c, (y + dy + 0.5) * c); } }
          if (deg === 1) { seg.moveTo((x + 0.5) * c, (y + 0.5) * c); seg.lineTo((x + 0.5) * c + 0.01, (y + 0.5) * c); } }
        if (T.glow) { g.strokeStyle = T.roadInk; g.lineWidth = lw * 1.6; g.setLineDash([c * 0.22, c * 0.16]); g.stroke(seg); g.setLineDash([]); }
        else { g.strokeStyle = T.roadInk; g.lineWidth = Math.max(3, c * 0.26); g.globalAlpha = 0.85; g.stroke(seg); g.strokeStyle = T.paper; g.lineWidth = Math.max(1.2, c * 0.14); g.globalAlpha = 1; g.stroke(seg); } }
      return off;
    }

    loadScene() {
      const def = SCENES[this._scene] || SCENES.hidden;
      const st = JSON.parse(JSON.stringify(def));
      st.id = this._scene; st.t0 = this.now(); st.last = {}; st.tracks = [];
      st.hunters.forEach((h, i) => { h.ph = i * 1.7; h.home = { x: h.x, y: h.y }; });
      st.troop.px = st.troop.x; st.troop.py = st.troop.y;
      if (st.mode === 'transit') this.beginTransit(st, st.dest, true);
      if (st.decoy) { st.decoy.i = 0; st.decoy.px = st.decoy.path[0][0]; st.decoy.py = st.decoy.path[0][1]; st.decoy.seen = false; }
      this.st = st;
    }
    beginTransit(st, dest, loop) {
      const from = { x: st.troop.x, y: st.troop.y };
      const p = pathTo(from, dest, youPass); if (!p || p.length < 2) return;
      st.transit = { path: p, i: 0, from, loop, started: this.now() };
      st.troop.state = 'transit'; st.current = -1; st.troop.located = false; st.troop.besieged = false;
    }
    update(t) {
      const st = this.st; if (!st) return;
      const every = (key, period, fn) => { if (st.last[key] == null) st.last[key] = t; if (t - st.last[key] >= period) { st.last[key] = t; fn(); } };
      const troopCell = { x: Math.round(st.troop.px), y: Math.round(st.troop.py) };
      if (st.transit) {
        const tr = st.transit, TICK = 0.22, el = t - tr.started;
        const steps = Math.floor(el / TICK), frac = (el / TICK) - steps, i = Math.min(steps, tr.path.length - 1);
        if (i > tr.i) { for (let k = tr.i; k < i; k++) if (st.tracksOn || SCENES[st.id].tracks) st.tracks.push({ x: tr.path[k].x, y: tr.path[k].y, t }); tr.i = i; st.hunters.forEach(h => { if (h.k !== 'listener') stepToward(h, troopCell, themPass, 1); }); }
        if (i >= tr.path.length - 1) {
          st.troop.px = tr.path[i].x; st.troop.py = tr.path[i].y; st.troop.x = st.troop.px; st.troop.y = st.troop.py;
          if (!tr.done) tr.done = t;
          if (t - tr.done > 1.4) {
            if (tr.loop) { this.loadScene(); return; }
            const w = warrenAt(st.troop.x, st.troop.y); const wi = WARRENS.indexOf(w);
            st.troop.state = w ? 'warren' : (terrainAt(st.troop.x, st.troop.y) === 'forest' ? 'holdForest' : 'holdOpen');
            st.current = wi; st.transit = null;
          }
        } else { const a = tr.path[i], b = tr.path[i + 1]; st.troop.px = a.x + (b.x - a.x) * frac; st.troop.py = a.y + (b.y - a.y) * frac; }
      }
      st.tracks = st.tracks.filter(k => t - k.t < 14 * 0.22);
      if (st.mode === 'patrol') every('patrol', 1.3, () => st.hunters.forEach(h => {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [h.x + dx, h.y + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && themPass(x, y) && Math.abs(x - h.home.x) + Math.abs(y - h.home.y) <= 2 && !(x === troopCell.x && y === troopCell.y));
        if (opts.length) { const o = opts[Math.floor(r01(Math.round(t * 10), h.ph * 100) * opts.length)]; h.x = o[0]; h.y = o[1]; }
      }));
      if (st.mode === 'muster') every('muster', 0.9, () => st.hunters.forEach(h => { if (h.muster) { const moved = stepToward(h, troopCell, themPass, 3); if (!moved) { h.muster = false; h.reach = true; } } }));
      if (st.mode === 'retreat') every('retreat', 0.7, () => st.hunters.forEach(h => stepAway(h, troopCell)));
      if (st.mode === 'decoy' && st.decoy) {
        const d = st.decoy, TICK = 0.5, el = t - st.t0 - 0.6;
        if (el > 0) {
          const steps = Math.floor(el / TICK), frac = el / TICK - steps, i = Math.min(steps, d.path.length - 1);
          if (i > d.i) { d.i = i; st.hunters.forEach(h => stepToward(h, { x: d.path[i][0], y: d.path[i][1] }, themPass, 1)); }
          d.seen = i >= d.seenAt;
          if (i >= d.path.length - 1) { d.px = d.path[i][0]; d.py = d.path[i][1]; if (!d.done) d.done = t; if (t - d.done > 1.4) { this.loadScene(); return; } }
          else { const a = d.path[i], b = d.path[i + 1]; d.px = a[0] + (b[0] - a[0]) * frac; d.py = a[1] + (b[1] - a[1]) * frac; }
        }
      }
    }

    start() {
      cancelAnimationFrame(this._raf);
      if (this.isStill()) { this.draw(2.2); return; }
      if (!this._visible) return;
      const loop = now => { if (!this._visible) { this._raf = 0; return; } if (now - (this._lastF || 0) < 30) { this._raf = requestAnimationFrame(loop); return; } this._lastF = now; const t = (now - this._t0) / 1000; this.update(t); this.draw(t); this._raf = requestAnimationFrame(loop); };
      this._raf = requestAnimationFrame(loop);
    }
    troopCenter() { const c = this._cell; return { x: (this.st.troop.px + 0.5) * c, y: (this.st.troop.py + 0.5) * c }; }
    jit(t, x, y, amt) { const T = this.T; if (!T.boil) return [0, 0]; const f = Math.floor(t * 8) % 3; return [(r01(x * 7 + f * 13, y * 3 + 1) - 0.5) * amt, (r01(x * 5 + 2, y * 11 + f * 17) - 0.5) * amt]; }
    glow(g, color, c) { if (!this.T.glow) return; g.shadowColor = color; g.shadowBlur = c * 0.45; }
    unglow(g) { g.shadowBlur = 0; g.shadowColor = 'transparent'; }

    draw(t) {
      const st = this.st; if (!st || !this.terrain) return;
      const T = this.T, c = this._cell, g = this.canvas.getContext('2d'), dpr = this.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame = T.boil ? Math.floor(t * 8) % 3 : 0;
      g.drawImage(this.terrain[frame] || this.terrain[0], 0, 0, W * c, H * c);
      const el = t - st.t0, tc = this.troopCenter();
      g.lineCap = 'round'; g.lineJoin = 'round';

      if (st.heat) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let v = 0; for (const b of st.heat) { const d2 = (x - b.x) ** 2 + (y - b.y) ** 2; v = Math.max(v, b.v * Math.exp(-d2 / (2 * b.s * b.s))); }
          if (v < 0.06) continue;
          const sh = 1 + 0.08 * Math.sin(t * 1.3 + x * 0.7 + y * 0.5);
          g.fillStyle = hexA(T.gold, Math.min(0.62, v * (T.glow ? 0.5 : 0.6) * sh));
          g.beginPath(); g.roundRect((x + 0.06) * c, (y + 0.06) * c, c * 0.88, c * 0.88, 2); g.fill();
        }
      }
      for (const k of st.tracks) { const a = Math.max(0, 1 - (t - k.t) / (14 * 0.22)); g.fillStyle = hexA(T.mossInk, a * 0.85); const cx = (k.x + 0.5) * c, cy = (k.y + 0.5) * c, r = Math.max(1.2, c * 0.05); g.beginPath(); g.arc(cx - c * 0.12, cy + c * 0.08, r, 0, 7); g.arc(cx + c * 0.12, cy - c * 0.08, r, 0, 7); g.fill(); }

      if (st.transit) this.drawRoute(g, st.transit.path.slice(st.transit.i), T.mossInk, t);
      else if (this._hover) this.drawHover(g, t);

      WARRENS.forEach((w, i) => this.drawWarren(g, w, i === st.current && st.troop.state === 'warren', this._hover && this._hover.x === w.x && this._hover.y === w.y, t));

      if (st.ring) {
        const half = 3.5 * c, p = new Path2D();
        p.moveTo(tc.x, tc.y - half); p.lineTo(tc.x + half, tc.y); p.lineTo(tc.x, tc.y + half); p.lineTo(tc.x - half, tc.y); p.closePath();
        const perim = 4 * Math.SQRT2 * half;
        g.save(); this.glow(g, T.blood, c);
        if (st.ringSolid) { g.strokeStyle = T.blood; g.lineWidth = Math.max(2, c * 0.09); g.setLineDash([]); g.stroke(p); }
        else {
          const form = Math.min(1, el / 1.4), pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.4));
          g.strokeStyle = hexA(T.blood, form < 1 ? 1 : pulse); g.lineWidth = Math.max(1.6, c * 0.07);
          if (form < 1) g.setLineDash([perim * form, perim]); else { g.setLineDash([c * 0.28, c * 0.22]); g.lineDashOffset = -t * 22; }
          g.stroke(p);
        }
        g.restore();
      }

      st.hunters.forEach(h => this.drawGaze(g, h, t, tc));
      if (st.troop.located) st.hunters.forEach(h => {
        if (!(h.reach || h.trail)) return;
        const w = st.troop.watched || 1;
        g.save(); g.strokeStyle = hexA(T.gold, T.glow ? 0.7 : 0.75); g.lineWidth = Math.max(1.2, c * 0.045);
        g.setLineDash(w <= 1 ? [1, c * 0.22] : w <= 3 ? [c * 0.16, c * 0.16] : []); this.glow(g, T.gold, c);
        g.beginPath(); g.moveTo((h.x + 0.5) * c, (h.y + 0.5) * c); g.lineTo(tc.x, tc.y); g.stroke(); g.restore();
      });
      st.hunters.forEach(h => this.drawHunter(g, h, t));

      if (st.decoy) this.drawDecoy(g, st.decoy, t);
      if (st.rearguard) this.drawRearguard(g, st.rearguard, t);
      this.drawTroop(g, t, tc);
      this.drawLight(g, t);
      if (st.transit) this.drawTransitLabel(g); else if (this._hover) this.drawHoverLabel(g);
    }

    drawWarren(g, w, current, hover, t) {
      const T = this.T, c = this._cell, [jx, jy] = this.jit(t, w.x, w.y, c * 0.06);
      const cx = (w.x + 0.5) * c + jx, cy = (w.y + 0.5) * c + jy, r = c * 0.36;
      const lw = { deep: Math.max(2.6, c * 0.11), mid: Math.max(1.6, c * 0.065), shallow: Math.max(1.1, c * 0.04) }[w.d];
      let outline = new Path2D();
      if (w.k === 'C') { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 1.08 : r * 0.84; i ? outline.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : outline.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } outline.closePath(); }
      else if (w.k === 'S') { outline.moveTo(cx - r * 1.15, cy); outline.quadraticCurveTo(cx, cy - r * 1.25, cx + r * 1.15, cy); outline.quadraticCurveTo(cx, cy + r * 1.25, cx - r * 1.15, cy); outline.closePath(); }
      else outline.arc(cx, cy, r, 0, Math.PI * 2);
      g.save();
      g.fillStyle = T.paper; g.fill(outline);
      g.strokeStyle = T.ink; g.lineWidth = lw; if (w.d === 'shallow') g.setLineDash([Math.max(2, c * 0.1), Math.max(2, c * 0.09)]); g.stroke(outline); g.setLineDash([]);
      g.lineWidth = Math.max(1, c * 0.045); g.fillStyle = T.ink;
      if (w.k === 'D') { g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 7); g.fill(); }
      else if (w.k === 'S') { g.beginPath(); g.arc(cx, cy, r * 0.3, 0, 7); g.fill(); }
      else if (w.k === 'N') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.2, 0, 7); g.fill(); } }
      else { g.beginPath(); const teeth = 4, span = r * 1.1; for (let i = 0; i <= teeth * 2; i++) { const x = cx - span / 2 + (i / (teeth * 2)) * span, y = cy + (i % 2 ? r * 0.3 : -r * 0.25); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      if (current) { g.strokeStyle = T.mossInk; g.lineWidth = Math.max(2, c * 0.08); this.glow(g, T.moss, c); g.beginPath(); g.arc(cx, cy, c * 0.5, 0, 7); g.stroke(); }
      else if (hover) { g.strokeStyle = T.ink; g.lineWidth = 1.2; g.setLineDash([2, 3]); g.beginPath(); g.arc(cx, cy, c * 0.5, 0, 7); g.stroke(); }
      g.restore();
    }
    hunterPath(k, cx, cy, s) {
      const p = new Path2D();
      if (k === 'sweeper') p.roundRect(cx - s, cy - s, s * 2, s * 2, s * 0.25);
      else if (k === 'tracker') { p.moveTo(cx, cy - s * 1.15); p.lineTo(cx + s * 1.1, cy + s * 0.85); p.lineTo(cx - s * 1.1, cy + s * 0.85); p.closePath(); }
      else if (k === 'listener') p.arc(cx, cy, s * 0.95, 0, Math.PI * 2);
      else { p.moveTo(cx, cy - s * 1.2); p.lineTo(cx + s * 1.2, cy); p.lineTo(cx, cy + s * 1.2); p.lineTo(cx - s * 1.2, cy); p.closePath(); }
      return p;
    }
    drawHunter(g, h, t) {
      const T = this.T, c = this._cell, [jx, jy] = this.jit(t, h.x + 50, h.y, c * 0.07);
      let cx = (h.x + 0.5) * c + jx, cy = (h.y + 0.5) * c + jy;
      if (h.k === 'hound') { cx += Math.sin(t * 11 + h.ph) * c * 0.03; cy += Math.cos(t * 9 + h.ph) * c * 0.03; }
      const s = c * 0.3, p = this.hunterPath(h.k, cx, cy, s);
      g.save(); this.glow(g, T.blood, c);
      if (h.k === 'listener') { g.strokeStyle = T.blood; g.lineWidth = Math.max(3, c * 0.17); g.stroke(p); this.unglow(g); g.strokeStyle = T.bloodInk; g.lineWidth = 1; if (!T.glow) { g.beginPath(); g.arc(cx, cy, s * 0.95 + c * 0.085, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, Math.max(0.5, s * 0.95 - c * 0.085), 0, 7); g.stroke(); } g.fillStyle = T.bloodInk; g.beginPath(); g.arc(cx, cy, c * 0.06, 0, 7); g.fill(); }
      else { g.fillStyle = T.blood; g.fill(p); this.unglow(g); g.strokeStyle = T.bloodInk; g.lineWidth = Math.max(1.2, c * 0.05); g.stroke(p); }
      if (h.reach) { g.strokeStyle = T.blood; g.lineWidth = Math.max(1.4, c * 0.06); g.beginPath(); g.arc(cx, cy, c * 0.47, 0, 7); g.stroke(); }
      if (h.muster) { g.strokeStyle = hexA(T.blood, 0.8); g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, c * 0.47, 0, 7); g.stroke(); g.setLineDash([]); }
      if (h.trail) { g.fillStyle = T.gold; g.strokeStyle = T.paper; g.lineWidth = 1.2; this.glow(g, T.gold, c); g.beginPath(); g.arc(cx + c * 0.3, cy - c * 0.3, Math.max(2.5, c * 0.095), 0, 7); g.fill(); g.stroke(); }
      g.restore();
    }
    drawGaze(g, h, t, tc) {
      const T = this.T, c = this._cell, cx = (h.x + 0.5) * c, cy = (h.y + 0.5) * c, base = Math.atan2(tc.y - cy, tc.x - cx);
      const A = T.glow ? 1.5 : 1;
      g.save();
      if (h.k === 'sweeper') { const a = base + Math.sin(t * 0.9 + h.ph) * 0.85, r = c * 2.6, hw = 0.5; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - hw, a + hw); g.closePath(); g.fillStyle = hexA(T.blood, 0.07 * A); g.fill(); g.strokeStyle = hexA(T.blood, 0.3 * A); g.lineWidth = 1; g.setLineDash([2, 3]); g.stroke(); }
      else if (h.k === 'tracker') { const a = base + Math.sin(t * 1.7 + h.ph) * 0.12, r = c * 3.6, hw = 0.16; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - hw, a + hw); g.closePath(); g.fillStyle = hexA(T.blood, (0.08 + 0.05 * Math.sin(t * 3 + h.ph)) * A); g.fill(); }
      else if (h.k === 'listener') { for (let i = 0; i < 2; i++) { const f = (t * 0.45 + h.ph * 0.1 + i * 0.5) % 1; g.beginPath(); g.arc(cx, cy, 0.4 * c + f * c * 2.8, 0, 7); g.strokeStyle = hexA(T.blood, (1 - f) * 0.4 * A); g.lineWidth = 1.2; g.stroke(); } }
      else { const len = c * (0.95 + 0.35 * Math.sin(t * 6 + h.ph)); g.beginPath(); g.moveTo(cx + Math.cos(base) * c * 0.45, cy + Math.sin(base) * c * 0.45); g.lineTo(cx + Math.cos(base) * len, cy + Math.sin(base) * len); g.strokeStyle = hexA(T.blood, 0.5 * A); g.lineWidth = 2; g.setLineDash([3, 3]); g.stroke(); }
      g.restore();
    }
    drawDecoy(g, d, t) {
      const T = this.T, c = this._cell, cx = (d.px + 0.5) * c, cy = (d.py + 0.5) * c, r = c * 0.2;
      g.save(); this.glow(g, T.moss, c);
      g.strokeStyle = T.mossInk; g.lineWidth = Math.max(1.4, c * 0.06); g.setLineDash([Math.max(2, c * 0.09), Math.max(2, c * 0.08)]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]);
      g.lineWidth = 1.4; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(cx - r * 2.4, cy - r * 0.4); g.lineTo(cx - r * 1.5, cy - r * 0.4); g.moveTo(cx - r * 2.8, cy + r * 0.4); g.lineTo(cx - r * 1.5, cy + r * 0.4); g.stroke(); g.globalAlpha = 1;
      this.count(g, 'd', cx, cy, c * 0.3, T.mossInk, 500);
      if (d.seen) { this.glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(1.4, c * 0.055); g.setLineDash([c * 0.2, c * 0.14]); g.beginPath(); g.arc(cx, cy, c * 0.42, 0, 7); g.stroke(); }
      g.restore();
    }
    drawRearguard(g, r, t) {
      const T = this.T, c = this._cell, [jx, jy] = this.jit(t, r.x + 90, r.y, c * 0.06);
      const cx = (r.x + 0.5) * c + jx + (r.state === 'fighting' ? Math.sin(t * 14) * c * 0.03 : 0), cy = (r.y + 0.5) * c + jy, s = c * 0.26;
      g.save(); this.glow(g, T.moss, c);
      g.fillStyle = T.moss; g.beginPath(); g.roundRect(cx - s, cy - s, s * 2, s * 2, 3); g.fill(); this.unglow(g);
      g.strokeStyle = T.ink; g.lineWidth = Math.max(1.2, c * 0.05); g.stroke();
      if (r.state === 'fighting') { g.strokeStyle = T.blood; g.lineWidth = Math.max(1.5, c * 0.06); const k = 0.5 + 0.5 * Math.sin(t * 14); g.beginPath(); g.moveTo(cx + s * 1.3, cy - s * 1.3); g.lineTo(cx + s * (1.9 + k * 0.4), cy - s * (1.9 + k * 0.4)); g.moveTo(cx + s * 1.5, cy - s * 0.3); g.lineTo(cx + s * (2.2 + k * 0.3), cy - s * 0.3); g.moveTo(cx + s * 0.4, cy - s * 1.5); g.lineTo(cx + s * 0.4, cy - s * (2.2 + k * 0.3)); g.stroke(); }
      this.count(g, r.n, cx, cy, c * 0.34, T.ink, 700);
      g.restore();
    }
    drawTroop(g, t, tc) {
      const T = this.T, st = this.st, c = this._cell, tr = st.troop;
      const period = tr.located ? 1.3 : 2.6;
      const breath = tr.besieged || tr.state === 'dead' ? 1 : 1 + 0.04 * Math.sin(t * 2 * Math.PI / period);
      const [jx, jy] = this.jit(t, 7, 7, c * 0.05);
      const cx = tc.x + jx, cy = tc.y + jy, r = c * 0.43 * breath;
      g.save();
      if (tr.state === 'holdForest') g.globalAlpha = 0.8;
      if (tr.state === 'warren') { this.glow(g, T.moss, c); g.fillStyle = T.moss; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); this.unglow(g); g.strokeStyle = T.ink; g.lineWidth = Math.max(1.4, c * 0.06); g.stroke(); this.count(g, tr.n, cx, cy, c * 0.42, T.ink, 800); }
      else if (tr.state === 'holdOpen' || tr.state === 'holdForest') { this.glow(g, T.moss, c); g.strokeStyle = T.moss; g.lineWidth = Math.max(3, c * 0.13); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); this.unglow(g); g.strokeStyle = T.ink; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r + c * 0.065, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, r - c * 0.065, 0, 7); g.stroke(); this.count(g, tr.n, cx, cy, c * 0.4, T.glow ? T.ink : T.ink, 800); }
      else if (tr.state === 'transit') { this.glow(g, T.moss, c); g.strokeStyle = T.moss; g.lineWidth = Math.max(2.4, c * 0.1); g.setLineDash([c * 0.22, c * 0.16]); g.lineDashOffset = -t * 30; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]); this.unglow(g); g.strokeStyle = T.ink; g.lineWidth = 1; g.setLineDash([c * 0.22, c * 0.16]); g.lineDashOffset = -t * 30; g.beginPath(); g.arc(cx, cy, r + c * 0.055, 0, 7); g.stroke(); g.setLineDash([]); this.count(g, tr.n, cx, cy, c * 0.4, T.ink, 800); }
      else { g.strokeStyle = T.ink; g.lineWidth = Math.max(1.4, c * 0.06); g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]); g.lineWidth = Math.max(2, c * 0.08); g.beginPath(); g.moveTo(cx - r * 0.6, cy + r * 0.6); g.lineTo(cx + r * 0.6, cy - r * 0.6); g.stroke(); }
      g.globalAlpha = 1;
      if (tr.located) { this.glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(1.6, c * 0.065); g.setLineDash([c * 0.3, c * 0.22]); g.lineDashOffset = -t * 18; g.beginPath(); g.arc(cx, cy, c * 0.62, 0, 7); g.stroke(); g.setLineDash([]); this.unglow(g); }
      if (tr.besieged) { this.glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(3, c * 0.14); g.beginPath(); g.arc(cx, cy, c * 0.6, 0, 7); g.stroke(); this.unglow(g); }
      if (tr.located && tr.watched) { const n = Math.min(8, tr.watched), rr = c * 0.9; g.fillStyle = T.gold; g.strokeStyle = T.ink; g.lineWidth = 1; this.glow(g, T.gold, c); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.4; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.max(2, c * 0.075), 0, 7); g.fill(); if (!T.glow) g.stroke(); } }
      g.restore();
    }
    count(g, n, x, y, px, color, weight) {
      g.save(); this.unglow(g); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
      const size = Math.max(9, String(n).length >= 3 ? px * 0.78 : px);
      g.font = `${weight || 700} ${size}px ${this.T.countFont}`; g.fillText(String(n), x, y + size * 0.06); g.restore();
    }
    drawLight(g, t) {
      const T = this.T, st = this.st, c = this._cell, w = W * c, h = H * c;
      const flick = T.lamp ? 0.025 * Math.sin(t * 1.9) + 0.015 * Math.sin(t * 5.3 + 1) + 0.01 * Math.sin(t * 13.1) : 0;
      if (T.lamp) { // lamp at the top-left of the desk
        const lx = w * 0.12, ly = -h * 0.1, R = Math.hypot(w, h) * 0.95;
        const rad = g.createRadialGradient(lx, ly, R * 0.12, lx, ly, R); rad.addColorStop(0, 'rgba(255,236,190,0.10)'); rad.addColorStop(0.45, 'rgba(0,0,0,0)'); rad.addColorStop(1, hexA('#1a140c', (st.dark ? 0.62 : T.vignette) + flick));
        g.fillStyle = rad; g.fillRect(0, 0, w, h);
      } else {
        const rad = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.72); rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, `rgba(0,0,0,${st.dark ? Math.min(0.9, T.vignette + 0.25) : T.vignette})`);
        g.fillStyle = rad; g.fillRect(0, 0, w, h);
      }
      if (!T.glow) { // drifting cloud shadow
        for (let i = 0; i < 3; i++) { const x = ((t * (0.22 + i * 0.07) * c + i * w * 0.37) % (w + 12 * c)) - 6 * c, y = h * (0.2 + i * 0.3) + Math.sin(t * 0.15 + i) * c * 1.5; const r = g.createRadialGradient(x, y, 0, x, y, c * 6); r.addColorStop(0, 'rgba(20,15,8,0.05)'); r.addColorStop(1, 'rgba(20,15,8,0)'); g.fillStyle = r; g.fillRect(x - c * 6, y - c * 6, c * 12, c * 12); }
      }
      if (T.sweep && g.createConicGradient) { const R = Math.hypot(w, h) / 2; g.save(); g.translate(w / 2, h / 2); g.rotate((t * 0.7) % (Math.PI * 2)); const cg = g.createConicGradient(0, 0, 0); cg.addColorStop(0, hexA(T.moss, 0.26)); cg.addColorStop(0.14, hexA(T.moss, 0)); cg.addColorStop(1, hexA(T.moss, 0)); g.fillStyle = cg; g.fillRect(-R, -R, 2 * R, 2 * R); g.restore(); }
      if (T.scan) { g.fillStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); }
      if (st.warm) { const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.4); const r2 = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.7); r2.addColorStop(0, hexA(T.blood, 0)); r2.addColorStop(1, hexA(T.blood, st.ringSolid ? 0.2 : 0.07 + 0.1 * pulse)); g.fillStyle = r2; g.fillRect(0, 0, w, h); }
      if (st.dawnWash) { const b = 0.26 + 0.07 * Math.sin(t * 0.8); const lg = g.createLinearGradient(w, 0, w * 0.45, 0); lg.addColorStop(0, hexA(T.gold, b)); lg.addColorStop(1, hexA(T.gold, 0)); g.fillStyle = lg; g.fillRect(0, 0, w, h); }
    }
    drawRoute(g, path, color, t) {
      const c = this._cell; if (!path || path.length < 2) return;
      g.save(); this.glow(g, color, c); g.strokeStyle = color; g.lineWidth = Math.max(2, c * 0.085); g.setLineDash([0.01, c * 0.36]); g.lineDashOffset = -t * 8;
      g.beginPath(); path.forEach((p, i) => (i ? g.lineTo((p.x + 0.5) * c, (p.y + 0.5) * c) : g.moveTo((p.x + 0.5) * c, (p.y + 0.5) * c))); g.stroke();
      const e = path[path.length - 1]; g.setLineDash([]); g.lineWidth = Math.max(1.5, c * 0.06); g.beginPath(); g.arc((e.x + 0.5) * c, (e.y + 0.5) * c, c * 0.32, 0, 7); g.stroke();
      g.restore();
    }
    chip(g, x, y, text, color, textColor) {
      const T = this.T, c = this._cell;
      g.save(); g.font = `600 12px ${T.countFont}`;
      const w = g.measureText(text).width + 18, h = 24;
      let bx = x - w / 2, by = y - c * 0.75 - h; if (by < 4) by = y + c * 0.75; bx = Math.max(4, Math.min(W * c - w - 4, bx));
      g.fillStyle = T.glow ? 'rgba(8,9,10,0.94)' : hexA(T.paper, 0.97); g.strokeStyle = color; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(bx, by, w, h, 3); g.fill(); g.stroke();
      g.fillStyle = textColor; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, bx + w / 2, by + h / 2 + 0.5); g.restore();
    }
    raceFor(target) {
      const st = this.st, from = { x: Math.round(st.troop.px), y: Math.round(st.troop.py) };
      const p = pathTo(from, target, youPass); if (!p || p.length < 2) return null;
      const yt = youTicks(p); let tt = Infinity; for (const h of st.hunters) { const q = pathTo(h, target, themPass); if (q) tt = Math.min(tt, q.length - 1); }
      return { path: p, yt, tt, win: yt < tt };
    }
    drawHover(g, t) { const hv = this._hover; if (!hv || terrainAt(hv.x, hv.y) === 'mountain') return; const race = this.raceFor(hv); if (!race) return; this._race = race; this.drawRoute(g, race.path, race.win ? this.T.mossInk : this.T.blood, t); }
    drawHoverLabel(g) {
      const T = this.T, hv = this._hover, race = this._race; if (!hv || !race) return; const c = this._cell, w = warrenAt(hv.x, hv.y), tt = race.tt === Infinity ? '∞' : race.tt + 't';
      const text = w ? `${KIND[w.k]} (${GIFT[w.k]}) · ${w.d} · you ${race.yt}t · them ${tt}` : `${GROUND[terrainAt(hv.x, hv.y)]} · hold here · you ${race.yt}t · them ${tt}`;
      this.chip(g, (hv.x + 0.5) * c, (hv.y + 0.5) * c, text, race.win ? T.mossInk : T.blood, race.win ? (T.glow ? T.moss : T.mossInk) : (T.glow ? T.blood : T.bloodInk));
    }
    drawTransitLabel(g) {
      const T = this.T, st = this.st, tr = st.transit, c = this._cell, e = tr.path[tr.path.length - 1], w = warrenAt(e.x, e.y), left = tr.path.length - 1 - tr.i;
      const text = tr.done ? (w ? `${KIND[w.k]} · ${w.d} · in.` : 'Holding.') : (w ? `${KIND[w.k]} · ${w.d} · ${left}t` : `${GROUND[terrainAt(e.x, e.y)]} · ${left}t`);
      this.chip(g, (e.x + 0.5) * c, (e.y + 0.5) * c, text, T.mossInk, T.glow ? T.moss : T.mossInk);
    }
    cellFromEvent(e) { const r = this.canvas.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H); return (x < 0 || y < 0 || x >= W || y >= H) ? null : { x, y }; }
    onMove(e) { const cell = this.cellFromEvent(e); this._hover = cell; this._race = null; this.canvas.style.cursor = cell && terrainAt(cell.x, cell.y) !== 'mountain' ? 'pointer' : 'default'; }
    onClick(e) {
      const st = this.st, cell = this.cellFromEvent(e); if (!st || !cell || st.transit || st.troop.state === 'dead') return;
      if (terrainAt(cell.x, cell.y) === 'mountain') return;
      if (cell.x === Math.round(st.troop.px) && cell.y === Math.round(st.troop.py)) return;
      st.mode = 'static'; st.ring = false; st.warm = false; st.tracksOn = true;
      this.beginTransit(st, cell, false);
    }
  }
  if (!customElements.get('lw-board')) customElements.define('lw-board', WarrenBoard2);
})();
