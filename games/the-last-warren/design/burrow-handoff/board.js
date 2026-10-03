/* board.js — The Last Warren · "Burrow" board renderer.
   Plain canvas 2D, no dependencies, no build step. Port target: the draw() seam in ui.js.
   Everything is drawn from a plain state object (shape documented in README.md → "Board state").

   Paint order inside LWBoard.draw():
     terrain (cached layer) → belief heat → tracks → route → warrens → siege ring → hunter gaze
     → watched threads → hunters → decoy → rearguard → troop → light (vignette, warm edges, dawn) → label chip
*/
(function () {
  const W = 28, H = 18;

  // ---- tokens: the three meanings + the ground. Change here, everything follows. ----
  const THEME = {
    ground: '#08090a',          // the board itself
    ink: '#e4ddcc',             // neutral marks (warren outlines, counts, grid crosses)
    moss: '#8fbf63',            // you / alive
    blood: '#e2654c',           // them / danger
    gold: '#d2b052',            // knowledge / time
    forestTint: 'rgba(143,191,99,.06)', forestInk: 'rgba(143,191,99,.55)',
    lakeTint: 'rgba(110,140,180,.07)', lakeInk: 'rgba(130,160,200,.5)',
    mountainTint: 'rgba(220,210,190,.04)', mountainInk: 'rgba(220,210,190,.45)',
    roadInk: 'rgba(228,221,204,.45)',
    crossAlpha: 0.18,           // survey crosses every 4 cells
    vignette: 0.75,             // edge darkness, 0..1
    glow: 0.45,                 // glow radius as a fraction of the cell
    countFont: '"JetBrains Mono", ui-monospace, Menlo, monospace'
  };

  const hexA = (h, a) => h.startsWith('#') ? `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})` : h;
  const H32 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = ((h ^ (h >>> 13)) * 1274126177) | 0; return (h ^ (h >>> 16)) >>> 0; };
  const r01 = (a, b) => (H32(a | 0, b | 0) % 1000) / 1000;

  // ---- terrain regions → outlines (grid-aligned, corners eased) ----
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
  function loopPath(loop, c) {
    const pts = loop.map(([x, y]) => [x * c, y * c]);
    const p = new Path2D(), n = pts.length, k = 0.28;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ax = a[0] + (b[0] - a[0]) * k, ay = a[1] + (b[1] - a[1]) * k, bx = a[0] + (b[0] - a[0]) * (1 - k), by = a[1] + (b[1] - a[1]) * (1 - k);
      if (i === 0) p.moveTo(ax, ay); else p.quadraticCurveTo(a[0], a[1], ax, ay);
      p.lineTo(bx, by);
    }
    p.closePath(); return p;
  }
  const unionPath = loops => { const u = new Path2D(); loops.forEach(p => u.addPath(p)); return u; };

  /* terrainLayer(terrainAt, cell, dpr) → an offscreen canvas. terrainAt(x,y) returns 'open'|'road'|'forest'|'lake'|'mountain'.
     Rebuild only when the map or the cell size changes. */
  function terrainLayer(terrainAt, c, dpr) {
    const T = THEME;
    const off = document.createElement('canvas'); off.width = Math.round(W * c * dpr); off.height = Math.round(H * c * dpr);
    const g = off.getContext('2d'); g.scale(dpr, dpr);
    g.fillStyle = T.ground; g.fillRect(0, 0, W * c, H * c);
    // survey crosses
    g.strokeStyle = hexA(T.ink, T.crossAlpha); g.lineWidth = 1; const a = Math.max(2, c * 0.12); g.beginPath();
    for (let x = 2; x < W; x += 4) for (let y = 2; y < H; y += 4) { g.moveTo(x * c - a, y * c + 0.5); g.lineTo(x * c + a, y * c + 0.5); g.moveTo(x * c + 0.5, y * c - a); g.lineTo(x * c + 0.5, y * c + a); }
    g.stroke();
    const cellsOf = type => { const s = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (terrainAt(x, y) === type) s.add(x + ',' + y); return s; };
    const lw = Math.max(0.9, c / 30);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // lake: tint, ruled water, shoreline
    { const cells = cellsOf('lake'); const loops = regionLoops(cells).map(l => loopPath(l, c));
      g.fillStyle = T.lakeTint; loops.forEach(p => g.fill(p));
      g.save(); g.clip(unionPath(loops), 'nonzero');
      g.strokeStyle = T.lakeInk; g.lineWidth = lw * 0.9; g.globalAlpha = 0.55; const sp = Math.max(4, c * 0.3);
      for (let yy = sp * 0.6; yy < H * c; yy += sp) { g.beginPath(); for (let xx = 0; xx <= W * c; xx += c * 0.5) { const wob = Math.sin(xx / (c * 0.9) + yy * 0.05) * c * 0.04; xx === 0 ? g.moveTo(xx, yy + wob) : g.lineTo(xx, yy + wob); } g.stroke(); }
      g.restore();
      g.strokeStyle = T.lakeInk; g.lineWidth = lw * 1.4; loops.forEach(p => g.stroke(p)); }
    // forest: tint, dotted boundary, tree stipple
    { const cells = cellsOf('forest'); const loops = regionLoops(cells).map(l => loopPath(l, c));
      g.fillStyle = T.forestTint; loops.forEach(p => g.fill(p));
      g.strokeStyle = T.forestInk; g.lineWidth = lw * 1.3; g.setLineDash([lw * 1.2, Math.max(2.5, c * 0.16)]); loops.forEach(p => g.stroke(p)); g.setLineDash([]);
      g.fillStyle = T.forestInk; g.strokeStyle = T.forestInk; g.lineWidth = lw;
      for (const key of cells) { const [x, y] = key.split(',').map(Number);
        for (let i = 0; i < 3; i++) { const px = (x + 0.2 + r01(x * 3 + i, y * 7) * 0.6) * c, py = (y + 0.2 + r01(x * 11, y * 5 + i) * 0.6) * c; const r = c * (0.06 + 0.04 * r01(x + i, y + 9));
          g.globalAlpha = 0.8; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
          if (c >= 22) { g.globalAlpha = 0.6; g.beginPath(); g.moveTo(px, py + r); g.lineTo(px, py + r + c * 0.09); g.stroke(); } } }
      g.globalAlpha = 1; }
    // mountain: tint, hatching, hard edge
    { const cells = cellsOf('mountain'); const loops = regionLoops(cells).map(l => loopPath(l, c));
      g.fillStyle = T.mountainTint; loops.forEach(p => g.fill(p));
      g.save(); g.clip(unionPath(loops), 'nonzero');
      g.strokeStyle = T.mountainInk; g.lineWidth = lw * 0.9; g.globalAlpha = 0.7; const sp = Math.max(3, c * 0.22);
      for (let d = -H * c; d < W * c + H * c; d += sp) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H * c, H * c); g.stroke(); }
      g.restore();
      g.strokeStyle = T.mountainInk; g.lineWidth = lw * 1.5; loops.forEach(p => g.stroke(p)); }
    // road: dashed line along the network
    { const cells = cellsOf('road'); const seg = new Path2D();
      for (const key of cells) { const [x, y] = key.split(',').map(Number); let deg = 0;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (cells.has((x + dx) + ',' + (y + dy))) { deg++; if (dx > 0 || dy > 0) { seg.moveTo((x + 0.5) * c, (y + 0.5) * c); seg.lineTo((x + dx + 0.5) * c, (y + dy + 0.5) * c); } }
        if (deg === 1) { seg.moveTo((x + 0.5) * c, (y + 0.5) * c); seg.lineTo((x + 0.5) * c + 0.01, (y + 0.5) * c); } }
      g.strokeStyle = T.roadInk; g.lineWidth = lw * 1.6; g.setLineDash([c * 0.22, c * 0.16]); g.stroke(seg); g.setLineDash([]); }
    return off;
  }

  // ---- symbols ----
  function hunterPath(k, cx, cy, s) {
    const p = new Path2D();
    if (k === 'sweeper') p.roundRect(cx - s, cy - s, s * 2, s * 2, s * 0.25);
    else if (k === 'tracker') { p.moveTo(cx, cy - s * 1.15); p.lineTo(cx + s * 1.1, cy + s * 0.85); p.lineTo(cx - s * 1.1, cy + s * 0.85); p.closePath(); }
    else if (k === 'listener') p.arc(cx, cy, s * 0.95, 0, Math.PI * 2);
    else { p.moveTo(cx, cy - s * 1.2); p.lineTo(cx + s * 1.2, cy); p.lineTo(cx, cy + s * 1.2); p.lineTo(cx - s * 1.2, cy); p.closePath(); }
    return p;
  }
  function warrenOutline(k, cx, cy, r) {
    const p = new Path2D();
    if (k === 'C') { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 1.08 : r * 0.84; i ? p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } p.closePath(); }
    else if (k === 'S') { p.moveTo(cx - r * 1.15, cy); p.quadraticCurveTo(cx, cy - r * 1.25, cx + r * 1.15, cy); p.quadraticCurveTo(cx, cy + r * 1.25, cx - r * 1.15, cy); p.closePath(); }
    else p.arc(cx, cy, r, 0, Math.PI * 2);
    return p;
  }
  const glow = (g, color, c) => { g.shadowColor = color; g.shadowBlur = c * THEME.glow; };
  const unglow = g => { g.shadowBlur = 0; g.shadowColor = 'transparent'; };
  function drawCount(g, n, x, y, px, color, weight) {
    g.save(); unglow(g); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    const size = Math.max(9, String(n).length >= 3 ? px * 0.78 : px);
    g.font = `${weight || 700} ${size}px ${THEME.countFont}`; g.fillText(String(n), x, y + size * 0.06); g.restore();
  }

  // ---- the frame ----
  /* draw(g, view, st, t): g = 2D context (already scaled by dpr), view = {cell, terrain}, st = board state, t = seconds. */
  function draw(g, view, st, t) {
    const T = THEME, c = view.cell;
    g.drawImage(view.terrain, 0, 0, W * c, H * c);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tr = st.troop, tc = { x: (tr.x + 0.5) * c, y: (tr.y + 0.5) * c };
    const light = st.light || {};

    // belief heat (Scout warrens only): knowledge, so gold, and it shimmers a little
    if (st.heat) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = st.heat[y * W + x]; if (!v || v < 0.06) continue;
      const sh = 1 + 0.08 * Math.sin(t * 1.3 + x * 0.7 + y * 0.5);
      g.fillStyle = hexA(T.gold, Math.min(0.62, v * 0.5 * sh));
      g.beginPath(); g.roundRect((x + 0.06) * c, (y + 0.06) * c, c * 0.88, c * 0.88, 2); g.fill();
    }
    // tracks: two pips, fading with age (0 fresh → 1 gone)
    for (const k of st.tracks || []) { const a = Math.max(0, 1 - k.age); g.fillStyle = hexA(T.moss, a * 0.85); const cx = (k.x + 0.5) * c, cy = (k.y + 0.5) * c, r = Math.max(1.2, c * 0.05); g.beginPath(); g.arc(cx - c * 0.12, cy + c * 0.08, r, 0, 7); g.arc(cx + c * 0.12, cy - c * 0.08, r, 0, 7); g.fill(); }
    // route: committed transit or hover preview. Moss if you win the race, blood if they do.
    if (st.route && st.route.path && st.route.path.length > 1) {
      const color = st.route.win === false ? T.blood : T.moss, path = st.route.path;
      g.save(); glow(g, color, c); g.strokeStyle = color; g.lineWidth = Math.max(2, c * 0.085); g.setLineDash([0.01, c * 0.36]); g.lineDashOffset = -t * 8;
      g.beginPath(); path.forEach((p, i) => (i ? g.lineTo((p.x + 0.5) * c, (p.y + 0.5) * c) : g.moveTo((p.x + 0.5) * c, (p.y + 0.5) * c))); g.stroke();
      const e = path[path.length - 1]; g.setLineDash([]); g.lineWidth = Math.max(1.5, c * 0.06); g.beginPath(); g.arc((e.x + 0.5) * c, (e.y + 0.5) * c, c * 0.32, 0, 7); g.stroke();
      g.restore();
    }
    // warrens: kind is the shape, depth is the line
    (st.warrens || []).forEach((w, i) => {
      const cx = (w.x + 0.5) * c, cy = (w.y + 0.5) * c, r = c * 0.36;
      const lw = { deep: Math.max(2.6, c * 0.11), mid: Math.max(1.6, c * 0.065), shallow: Math.max(1.1, c * 0.04) }[w.d] || 1.6;
      const outline = warrenOutline(w.k, cx, cy, r);
      g.save();
      g.fillStyle = T.ground; g.fill(outline);
      g.strokeStyle = T.ink; g.lineWidth = lw; if (w.d === 'shallow') g.setLineDash([Math.max(2, c * 0.1), Math.max(2, c * 0.09)]); g.stroke(outline); g.setLineDash([]);
      g.lineWidth = Math.max(1, c * 0.045); g.fillStyle = T.ink;
      if (w.k === 'D') { g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 7); g.fill(); }
      else if (w.k === 'S') { g.beginPath(); g.arc(cx, cy, r * 0.3, 0, 7); g.fill(); }
      else if (w.k === 'N') { for (let j = 0; j < 3; j++) { const a = -Math.PI / 2 + j * Math.PI * 2 / 3; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.2, 0, 7); g.fill(); } }
      else { g.beginPath(); const teeth = 4, span = r * 1.1; for (let j = 0; j <= teeth * 2; j++) { const x = cx - span / 2 + (j / (teeth * 2)) * span, y = cy + (j % 2 ? r * 0.3 : -r * 0.25); j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      if (i === st.current && tr.state === 'warren') { g.strokeStyle = T.moss; g.lineWidth = Math.max(2, c * 0.08); glow(g, T.moss, c); g.beginPath(); g.arc(cx, cy, c * 0.5, 0, 7); g.stroke(); }
      else if (st.hover && st.hover.x === w.x && st.hover.y === w.y) { g.strokeStyle = T.ink; g.lineWidth = 1.2; g.setLineDash([2, 3]); g.beginPath(); g.arc(cx, cy, c * 0.5, 0, 7); g.stroke(); }
      g.restore();
    });
    // the siege ring: a diamond 3 blocks out. Draws itself in over 1.4s (ringAge), then pulses. Solid once besieged.
    if (st.ring) {
      const half = 3.5 * c, p = new Path2D();
      p.moveTo(tc.x, tc.y - half); p.lineTo(tc.x + half, tc.y); p.lineTo(tc.x, tc.y + half); p.lineTo(tc.x - half, tc.y); p.closePath();
      const perim = 4 * Math.SQRT2 * half;
      g.save(); glow(g, T.blood, c);
      if (st.ringSolid) { g.strokeStyle = T.blood; g.lineWidth = Math.max(2, c * 0.09); g.stroke(p); }
      else {
        const form = Math.min(1, (st.ringAge == null ? 9 : st.ringAge) / 1.4), pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.4));
        g.strokeStyle = hexA(T.blood, form < 1 ? 1 : pulse); g.lineWidth = Math.max(1.6, c * 0.07);
        if (form < 1) g.setLineDash([perim * form, perim]); else { g.setLineDash([c * 0.28, c * 0.22]); g.lineDashOffset = -t * 22; }
        g.stroke(p);
      }
      g.restore();
    }
    // hunters search: each kind has its own gaze
    for (const h of st.hunters || []) {
      const cx = (h.x + 0.5) * c, cy = (h.y + 0.5) * c, base = Math.atan2(tc.y - cy, tc.x - cx), ph = h.ph || 0;
      g.save();
      if (h.k === 'sweeper') { const a = base + Math.sin(t * 0.9 + ph) * 0.85, r = c * 2.6, hw = 0.5; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - hw, a + hw); g.closePath(); g.fillStyle = hexA(T.blood, 0.1); g.fill(); g.strokeStyle = hexA(T.blood, 0.45); g.lineWidth = 1; g.setLineDash([2, 3]); g.stroke(); }
      else if (h.k === 'tracker') { const a = base + Math.sin(t * 1.7 + ph) * 0.12, r = c * 3.6, hw = 0.16; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - hw, a + hw); g.closePath(); g.fillStyle = hexA(T.blood, 0.12 + 0.07 * Math.sin(t * 3 + ph)); g.fill(); }
      else if (h.k === 'listener') { for (let i = 0; i < 2; i++) { const f = (t * 0.45 + ph * 0.1 + i * 0.5) % 1; g.beginPath(); g.arc(cx, cy, 0.4 * c + f * c * 2.8, 0, 7); g.strokeStyle = hexA(T.blood, (1 - f) * 0.6); g.lineWidth = 1.2; g.stroke(); } }
      else { const len = c * (0.95 + 0.35 * Math.sin(t * 6 + ph)); g.beginPath(); g.moveTo(cx + Math.cos(base) * c * 0.45, cy + Math.sin(base) * c * 0.45); g.lineTo(cx + Math.cos(base) * len, cy + Math.sin(base) * len); g.strokeStyle = hexA(T.blood, 0.75); g.lineWidth = 2; g.setLineDash([3, 3]); g.stroke(); }
      g.restore();
    }
    // watched N ticks: gold threads from each watching hunter. Dotted at 1, dashed to 3, solid beyond.
    if (tr.located) for (const h of st.hunters || []) {
      if (!(h.reach || h.trail)) continue;
      const w = tr.watched || 1;
      g.save(); g.strokeStyle = hexA(T.gold, 0.7); g.lineWidth = Math.max(1.2, c * 0.045);
      g.setLineDash(w <= 1 ? [1, c * 0.22] : w <= 3 ? [c * 0.16, c * 0.16] : []); glow(g, T.gold, c);
      g.beginPath(); g.moveTo((h.x + 0.5) * c, (h.y + 0.5) * c); g.lineTo(tc.x, tc.y); g.stroke(); g.restore();
    }
    // hunter bodies: shape = kind, never colour alone
    for (const h of st.hunters || []) {
      let cx = (h.x + 0.5) * c, cy = (h.y + 0.5) * c; const ph = h.ph || 0;
      if (h.k === 'hound') { cx += Math.sin(t * 11 + ph) * c * 0.03; cy += Math.cos(t * 9 + ph) * c * 0.03; }
      const s = c * 0.3, p = hunterPath(h.k, cx, cy, s);
      g.save(); glow(g, T.blood, c);
      if (h.k === 'listener') { g.strokeStyle = T.blood; g.lineWidth = Math.max(3, c * 0.17); g.stroke(p); unglow(g); g.fillStyle = T.blood; g.beginPath(); g.arc(cx, cy, c * 0.06, 0, 7); g.fill(); }
      else { g.fillStyle = T.blood; g.fill(p); unglow(g); }
      if (h.reach) { g.strokeStyle = T.blood; g.lineWidth = Math.max(1.4, c * 0.06); g.beginPath(); g.arc(cx, cy, c * 0.47, 0, 7); g.stroke(); }
      if (h.muster) { g.strokeStyle = hexA(T.blood, 0.8); g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, c * 0.47, 0, 7); g.stroke(); g.setLineDash([]); }
      if (h.trail) { g.fillStyle = T.gold; glow(g, T.gold, c); g.beginPath(); g.arc(cx + c * 0.3, cy - c * 0.3, Math.max(2.5, c * 0.095), 0, 7); g.fill(); }
      g.restore();
    }
    // decoy: a small dashed ring of us, marked d, running the other way. Blood ring once they take it.
    if (st.decoy) {
      const d = st.decoy, cx = (d.x + 0.5) * c, cy = (d.y + 0.5) * c, r = c * 0.2;
      g.save(); glow(g, T.moss, c);
      g.strokeStyle = T.moss; g.lineWidth = Math.max(1.4, c * 0.06); g.setLineDash([Math.max(2, c * 0.09), Math.max(2, c * 0.08)]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]);
      g.lineWidth = 1.4; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(cx - r * 2.4, cy - r * 0.4); g.lineTo(cx - r * 1.5, cy - r * 0.4); g.moveTo(cx - r * 2.8, cy + r * 0.4); g.lineTo(cx - r * 1.5, cy + r * 0.4); g.stroke(); g.globalAlpha = 1;
      drawCount(g, 'd', cx, cy, c * 0.3, T.moss, 500);
      if (d.seen) { glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(1.4, c * 0.055); g.setLineDash([c * 0.2, c * 0.14]); g.beginPath(); g.arc(cx, cy, c * 0.42, 0, 7); g.stroke(); }
      g.restore();
    }
    // rearguard: the square, part of us, left behind, with its own count. Shakes while it fights.
    if (st.rearguard) {
      const r = st.rearguard, s = c * 0.26, cx = (r.x + 0.5) * c + (r.state === 'fighting' ? Math.sin(t * 14) * c * 0.03 : 0), cy = (r.y + 0.5) * c;
      g.save(); glow(g, T.moss, c);
      g.fillStyle = T.moss; g.beginPath(); g.roundRect(cx - s, cy - s, s * 2, s * 2, 3); g.fill(); unglow(g);
      if (r.state === 'fighting') { g.strokeStyle = T.blood; g.lineWidth = Math.max(1.5, c * 0.06); const k = 0.5 + 0.5 * Math.sin(t * 14); g.beginPath(); g.moveTo(cx + s * 1.3, cy - s * 1.3); g.lineTo(cx + s * (1.9 + k * 0.4), cy - s * (1.9 + k * 0.4)); g.moveTo(cx + s * 1.5, cy - s * 0.3); g.lineTo(cx + s * (2.2 + k * 0.3), cy - s * 0.3); g.moveTo(cx + s * 0.4, cy - s * 1.5); g.lineTo(cx + s * 0.4, cy - s * (2.2 + k * 0.3)); g.stroke(); }
      drawCount(g, r.n, cx, cy, c * 0.34, T.ground, 800);
      g.restore();
    }
    // the troop: breathes (faster once located, still when besieged or dead)
    {
      const period = tr.located ? 1.3 : 2.6;
      const breath = tr.besieged || tr.state === 'dead' ? 1 : 1 + 0.04 * Math.sin(t * 2 * Math.PI / period);
      const cx = tc.x, cy = tc.y, r = c * 0.43 * breath;
      g.save();
      if (tr.state === 'holdForest') g.globalAlpha = 0.8;
      if (tr.state === 'warren') { glow(g, T.moss, c); g.fillStyle = T.moss; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); unglow(g); drawCount(g, tr.n, cx, cy, c * 0.42, T.ground, 800); }
      else if (tr.state === 'holdOpen' || tr.state === 'holdForest') { glow(g, T.moss, c); g.strokeStyle = T.moss; g.lineWidth = Math.max(3, c * 0.13); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); unglow(g); drawCount(g, tr.n, cx, cy, c * 0.4, T.ink, 800); }
      else if (tr.state === 'transit') { glow(g, T.moss, c); g.strokeStyle = T.moss; g.lineWidth = Math.max(2.4, c * 0.1); g.setLineDash([c * 0.22, c * 0.16]); g.lineDashOffset = -t * 30; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]); unglow(g); drawCount(g, tr.n, cx, cy, c * 0.4, T.ink, 800); }
      else { g.strokeStyle = T.ink; g.lineWidth = Math.max(1.4, c * 0.06); g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]); g.lineWidth = Math.max(2, c * 0.08); g.beginPath(); g.moveTo(cx - r * 0.6, cy + r * 0.6); g.lineTo(cx + r * 0.6, cy - r * 0.6); g.stroke(); }
      g.globalAlpha = 1;
      if (tr.located) { glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(1.6, c * 0.065); g.setLineDash([c * 0.3, c * 0.22]); g.lineDashOffset = -t * 18; g.beginPath(); g.arc(cx, cy, c * 0.62, 0, 7); g.stroke(); g.setLineDash([]); unglow(g); }
      if (tr.besieged) { glow(g, T.blood, c); g.strokeStyle = T.blood; g.lineWidth = Math.max(3, c * 0.14); g.beginPath(); g.arc(cx, cy, c * 0.6, 0, 7); g.stroke(); unglow(g); }
      if (tr.located && tr.watched) { const n = Math.min(8, tr.watched), rr = c * 0.9; g.fillStyle = T.gold; glow(g, T.gold, c); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.4; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.max(2, c * 0.075), 0, 7); g.fill(); } }
      g.restore();
    }
    // light: vignette to black; warm blood edges while located; gold from the east at dawn
    {
      const w = W * c, h = H * c;
      const rad = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
      rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, `rgba(0,0,0,${light.dark ? Math.min(0.9, T.vignette + 0.25) : T.vignette})`);
      g.fillStyle = rad; g.fillRect(0, 0, w, h);
      if (light.warm) { const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.4); const r2 = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.7); r2.addColorStop(0, hexA(T.blood, 0)); r2.addColorStop(1, hexA(T.blood, st.ringSolid ? 0.2 : 0.07 + 0.1 * pulse)); g.fillStyle = r2; g.fillRect(0, 0, w, h); }
      if (light.dawn) { const b = 0.26 + 0.07 * Math.sin(t * 0.8); const lg = g.createLinearGradient(w, 0, w * 0.45, 0); lg.addColorStop(0, hexA(T.gold, b)); lg.addColorStop(1, hexA(T.gold, 0)); g.fillStyle = lg; g.fillRect(0, 0, w, h); }
    }
    // label chip: the race, or the transit countdown
    if (st.route && st.route.label) {
      const e = st.route.path[st.route.path.length - 1], color = st.route.win === false ? T.blood : T.moss;
      drawChip(g, c, (e.x + 0.5) * c, (e.y + 0.5) * c, st.route.label, color);
    }
  }
  function drawChip(g, c, x, y, text, color) {
    g.save(); g.font = `600 12px ${THEME.countFont}`;
    const w = g.measureText(text).width + 18, h = 24;
    let bx = x - w / 2, by = y - c * 0.75 - h; if (by < 4) by = y + c * 0.75; bx = Math.max(4, Math.min(W * c - w - 4, bx));
    g.fillStyle = 'rgba(8,9,10,0.94)'; g.strokeStyle = color; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(bx, by, w, h, 3); g.fill(); g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, bx + w / 2, by + h / 2 + 0.5); g.restore();
  }

  window.LWBoard = { W, H, THEME, terrainLayer, draw, hunterPath, warrenOutline, regionLoops, drawCount };
})();
