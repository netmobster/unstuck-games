/* demo.js — the mock's "moments" and a tiny simulation so the board moves without the real rules.
   None of this ships: in the game, src/ owns state and ui.js builds the board state object each tick.
   What to keep: the pathfinding is only here to preview races; the scene list is the QA checklist of board states. */
(function () {
  const B = window.LWBoard, W = B.W, H = B.H;
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
  const stepToward = (h, target, pass, stopAt = 1) => { const p = pathTo(h, target, pass); if (!p || p.length - 1 <= stopAt) return false; if (p[1].x === target.x && p[1].y === target.y) return false; h.x = p[1].x; h.y = p[1].y; return true; };
  const stepAway = (h, target) => { let best = null, bd = Math.abs(h.x - target.x) + Math.abs(h.y - target.y); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = h.x + dx, ny = h.y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !themPass(nx, ny)) continue; const d = Math.abs(nx - target.x) + Math.abs(ny - target.y); if (d > bd) { bd = d; best = [nx, ny]; } } if (best) { h.x = best[0]; h.y = best[1]; } };
  const youTicks = path => path.reduce((n, c, i) => i === 0 ? 0 : n + (terrainAt(c.x, c.y) === 'forest' ? 2 : 1), 0);

  // Board side of each moment. The panel copy for the same moments lives in app.js (MOMENTS).
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
    dawn: { troop: { x: 21, y: 11, n: 58, state: 'warren' }, current: 6, mode: 'retreat', dawn: true, hunters: [{ k: 'sweeper', x: 25, y: 13 }, { k: 'tracker', x: 16, y: 15 }, { k: 'listener', x: 12, y: 8 }] },
    fell: { troop: { x: 8, y: 15, n: 41, state: 'dead' }, current: 2, mode: 'static', dark: true, hunters: [{ k: 'sweeper', x: 7, y: 15 }, { k: 'sweeper', x: 9, y: 15 }, { k: 'tracker', x: 8, y: 14 }] }
  };
  function heatArray(blobs) { const a = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (const b of blobs) { const d2 = (x - b.x) ** 2 + (y - b.y) ** 2; v = Math.max(v, b.v * Math.exp(-d2 / (2 * b.s * b.s))); } a[y * W + x] = v; } return a; }

  class LWBoardElement extends HTMLElement {
    constructor() { super(); this._scene = 'hidden'; this._cell = 36; this._t0 = performance.now(); this._hover = null; this._raf = 0; this._visible = true; }
    static get observedAttributes() { return ['scene', 'cell', 'still']; }
    now() { return (performance.now() - this._t0) / 1000; }
    get scene() { return this._scene; }
    set scene(v) { if (v && SCENES[v] && v !== this._scene) { this._scene = v; if (this.canvas) { this.loadScene(); this.frame(this.now()); this.start(); } } }
    get cell() { return this._cell; }
    set cell(v) { const c = +v || 36; if (c !== this._cell) { this._cell = c; if (this.canvas) { this.resize(); this.start(); } } }
    attributeChangedCallback(n, o, v) { if (n === 'scene') this.scene = v; else if (n === 'cell') this.cell = v; else this.start(); }
    connectedCallback() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas'); this.appendChild(this.canvas);
        this.canvas.addEventListener('pointermove', e => this.onMove(e));
        this.canvas.addEventListener('pointerleave', () => { this._hover = null; this.canvas.style.cursor = 'default'; });
        this.canvas.addEventListener('click', e => this.onClick(e));
        if ('IntersectionObserver' in window) { this._io = new IntersectionObserver(es => { this._visible = es.some(e => e.isIntersecting); if (this._visible) this.start(); }, { rootMargin: '200px' }); this._io.observe(this); }
      }
      if (this.hasAttribute('scene') && SCENES[this.getAttribute('scene')]) this._scene = this.getAttribute('scene');
      if (this.hasAttribute('cell')) this._cell = +this.getAttribute('cell') || 36;
      this.resize(); this.loadScene(); this.frame(this.now()); this.start();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.frame(this.now()));
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; if (this._io) this._io.disconnect(); }
    resize() {
      const c = this._cell, dpr = Math.min(2, window.devicePixelRatio || 1); this.dpr = dpr;
      this.canvas.width = Math.round(W * c * dpr); this.canvas.height = Math.round(H * c * dpr);
      this.canvas.style.width = W * c + 'px'; this.canvas.style.height = H * c + 'px';
      this.terrain = B.terrainLayer(terrainAt, c, dpr);
    }
    loadScene() {
      const st = JSON.parse(JSON.stringify(SCENES[this._scene]));
      st.id = this._scene; st.t0 = this.now(); st.last = {}; st.tracks = [];
      st.hunters.forEach((h, i) => { h.ph = i * 1.7; h.home = { x: h.x, y: h.y }; });
      st.troop.px = st.troop.x; st.troop.py = st.troop.y;
      if (st.heat) st.heatArr = heatArray(st.heat);
      if (st.mode === 'transit') this.beginTransit(st, st.dest, true);
      if (st.decoy) { st.decoy.i = 0; st.decoy.px = st.decoy.path[0][0]; st.decoy.py = st.decoy.path[0][1]; st.decoy.seen = false; }
      this.st = st;
    }
    beginTransit(st, dest, loop) {
      const from = { x: st.troop.x, y: st.troop.y }; const p = pathTo(from, dest, youPass); if (!p || p.length < 2) return;
      st.transit = { path: p, i: 0, from, loop, started: this.now() };
      st.troop.state = 'transit'; st.current = -1; st.troop.located = false; st.troop.besieged = false;
    }
    update(t) {
      const st = this.st; if (!st) return;
      const every = (key, period, fn) => { if (st.last[key] == null) st.last[key] = t; if (t - st.last[key] >= period) { st.last[key] = t; fn(); } };
      const troopCell = { x: Math.round(st.troop.px), y: Math.round(st.troop.py) };
      if (st.transit) {
        const tr = st.transit, TICK = 0.22, el = t - tr.started; // 220 ms a tick, as in the game
        const steps = Math.floor(el / TICK), frac = (el / TICK) - steps, i = Math.min(steps, tr.path.length - 1);
        if (i > tr.i) { for (let k = tr.i; k < i; k++) if (st.tracksOn || SCENES[st.id].tracks) st.tracks.push({ x: tr.path[k].x, y: tr.path[k].y, t }); tr.i = i; st.hunters.forEach(h => { if (h.k !== 'listener') stepToward(h, troopCell, themPass, 1); }); }
        if (i >= tr.path.length - 1) {
          st.troop.px = tr.path[i].x; st.troop.py = tr.path[i].y; st.troop.x = st.troop.px; st.troop.y = st.troop.py;
          if (!tr.done) tr.done = t;
          if (t - tr.done > 1.4) {
            if (tr.loop) { this.loadScene(); return; }
            const w = warrenAt(st.troop.x, st.troop.y);
            st.troop.state = w ? 'warren' : (terrainAt(st.troop.x, st.troop.y) === 'forest' ? 'holdForest' : 'holdOpen');
            st.current = WARRENS.indexOf(w); st.transit = null;
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
    // Build the plain board-state object LWBoard.draw() reads. This is the shape ui.js should produce from the real game.
    boardState(t) {
      const st = this.st;
      let route = null;
      if (st.transit) {
        const tr = st.transit, e = tr.path[tr.path.length - 1], w = warrenAt(e.x, e.y), left = tr.path.length - 1 - tr.i;
        const label = tr.done ? (w ? `${KIND[w.k]} · ${w.d} · in.` : 'Holding.') : (w ? `${KIND[w.k]} · ${w.d} · ${left}t` : `${GROUND[terrainAt(e.x, e.y)]} · ${left}t`);
        route = { path: tr.path.slice(tr.i), win: true, label };
      } else if (this._hover && terrainAt(this._hover.x, this._hover.y) !== 'mountain') {
        const hv = this._hover, race = this.raceFor(hv);
        if (race) { const w = warrenAt(hv.x, hv.y), tt = race.tt === Infinity ? '∞' : race.tt + 't';
          route = { path: race.path, win: race.win, label: w ? `${KIND[w.k]} (${GIFT[w.k]}) · ${w.d} · you ${race.yt}t · them ${tt}` : `${GROUND[terrainAt(hv.x, hv.y)]} · hold here · you ${race.yt}t · them ${tt}` }; }
      }
      return {
        warrens: WARRENS, current: st.current, hover: this._hover,
        troop: { x: st.troop.px, y: st.troop.py, n: st.troop.n, state: st.troop.state, located: st.troop.located, besieged: st.troop.besieged, watched: st.troop.watched },
        hunters: st.hunters, ring: st.ring, ringSolid: st.ringSolid, ringAge: t - st.t0,
        heat: st.heatArr || null, tracks: st.tracks.map(k => ({ x: k.x, y: k.y, age: (t - k.t) / (14 * 0.22) })),
        route, decoy: st.decoy ? { x: st.decoy.px, y: st.decoy.py, seen: st.decoy.seen } : null, rearguard: st.rearguard || null,
        light: { warm: !!st.warm, dark: !!st.dark, dawn: !!st.dawn }
      };
    }
    raceFor(target) {
      const st = this.st, from = { x: Math.round(st.troop.px), y: Math.round(st.troop.py) };
      const p = pathTo(from, target, youPass); if (!p || p.length < 2) return null;
      const yt = youTicks(p); let tt = Infinity; for (const h of st.hunters) { const q = pathTo(h, target, themPass); if (q) tt = Math.min(tt, q.length - 1); }
      return { path: p, yt, tt, win: yt < tt };
    }
    frame(t) { const g = this.canvas.getContext('2d'); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); B.draw(g, { cell: this._cell, terrain: this.terrain }, this.boardState(t), t); }
    start() {
      cancelAnimationFrame(this._raf);
      if (this.hasAttribute('still')) { this.frame(2.2); return; }
      if (!this._visible) return;
      const loop = now => { if (!this._visible) { this._raf = 0; return; } const t = (now - this._t0) / 1000; this.update(t); this.frame(t); this._raf = requestAnimationFrame(loop); };
      this._raf = requestAnimationFrame(loop);
    }
    cellFromEvent(e) { const r = this.canvas.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H); return (x < 0 || y < 0 || x >= W || y >= H) ? null : { x, y }; }
    onMove(e) { const cell = this.cellFromEvent(e); this._hover = cell; this.canvas.style.cursor = cell && terrainAt(cell.x, cell.y) !== 'mountain' ? 'pointer' : 'default'; }
    onClick(e) {
      const st = this.st, cell = this.cellFromEvent(e); if (!st || !cell || st.transit || st.troop.state === 'dead') return;
      if (terrainAt(cell.x, cell.y) === 'mountain' || (cell.x === Math.round(st.troop.px) && cell.y === Math.round(st.troop.py))) return;
      st.mode = 'static'; st.ring = false; st.warm = false; st.tracksOn = true;
      this.beginTransit(st, cell, false);
    }
  }
  customElements.define('lw-board', LWBoardElement);
  window.LWDemo = { MAP, WARRENS, SCENES: Object.keys(SCENES), terrainAt };
})();
