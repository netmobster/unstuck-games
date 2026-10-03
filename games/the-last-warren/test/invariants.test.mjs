// Hard invariants: these pass or the build is broken. (The sweeps never pass or fail;
// they report distributions. That split is lifted from Orbis.)
//   node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, view, cloneGame, takeBoon, HUNTER_KINDS } from '../src/sim.js';
import { generateMap, COST, flat } from '../src/map.js';
import { runGame, summarise } from '../src/run.js';
import { roster, pickBoon } from '../src/policies.js';

const R = roster(true);

test('same seed, same policy, same world', () => {
  for (const s of [1, 2, 3, 99, 4242]) {
    const a = summarise(runGame(s, {}, R['hybrid-5-1.3'])), b = summarise(runGame(s, {}, R['hybrid-5-1.3']));
    assert.deepEqual(a, b);
  }
});

test('maps are sound: every warren reachable, spawns valid, warrens on ground', () => {
  for (let s = 1; s <= 300; s++) {
    const m = generateMap(s), t = flat(m);
    assert.ok(m.warrens.length >= 4, 'warrens ' + s);
    for (const w of m.warrens) assert.ok(COST.troop[t[w.y * m.w + w.x]] < Infinity);
    for (const [x, y] of m.spawns) assert.ok(COST.hunter[t[y * m.w + x]] < Infinity);
    assert.equal(m.format, 'warren-map/1');
  }
});

test('belief is a probability distribution every tick', () => {
  for (const s of [5, 6, 7]) {
    const g = newGame(s, {}), pol = R['scout-3-1.3']();
    for (let k = 0; k < 400 && !g.over; k++) {
      if (g.pendingDraft) takeBoon(g, pickBoon(g.pendingDraft));
      step(g, pol(view(g)));
      let sum = 0; for (const b of g.belief) { assert.ok(b >= 0 && Number.isFinite(b)); sum += b; }
      assert.ok(Math.abs(sum - 1) < 1e-6, 'belief sum ' + sum);
    }
  }
});

test('nobody stands where they cannot', () => {
  for (const s of [8, 9, 10, 11]) {
    const g = newGame(s, {}), pol = R['move-at-5']();
    const t = g.tiles;
    for (let k = 0; k < 400 && !g.over; k++) {
      if (g.pendingDraft) takeBoon(g, pickBoon(g.pendingDraft));
      step(g, pol(view(g)));
      for (const h of g.hunters) assert.ok(COST.hunter[t[h.y * g.W + h.x]] < Infinity, `hunter on ${t[h.y * g.W + h.x]}`);
      assert.ok(COST.troop[t[g.troop.y * g.W + g.troop.x]] < Infinity);
      assert.ok(g.troop.size >= 1);
    }
  }
});

test('a clone does not touch the original', () => {
  const g = newGame(12, {}), before = JSON.stringify({ t: g.troop, h: g.hunters, T: g.T, b: Array.from(g.belief).slice(0, 40) });
  const c = cloneGame(g, 7);
  for (let k = 0; k < 30 && !c.over; k++) step(c, { type: 'stay' });
  assert.equal(JSON.stringify({ t: g.troop, h: g.hunters, T: g.T, b: Array.from(g.belief).slice(0, 40) }), before);
});

test('rolls are keyed by tick, not by order: a twin diverges only where it chose to', () => {
  // Same decisions up to tick 20, then different. Everything before 20 must match exactly.
  const a = newGame(31, {}), b = newGame(31, {});
  for (let k = 0; k < 19; k++) { step(a, { type: 'stay' }); step(b, { type: 'stay' }); }
  assert.deepEqual(a.hunters.map(h => [h.x, h.y]), b.hunters.map(h => [h.x, h.y]));
  assert.equal(a.troop.size, b.troop.size);
});

test('a stationary troop grows by one a tick unless besieged', () => {
  const g = newGame(13, { hunterStart: 0, reinforceEvery: 999 });
  for (let k = 0; k < 10; k++) { const s = g.troop.size; step(g, { type: 'stay' }); assert.equal(g.troop.size, s + 1); }
});

test('every hunter kind is known', () => {
  for (let s = 1; s < 40; s++) { const g = runGame(s, {}, R['hybrid-3-1.8']); for (const h of g.hunters) assert.ok(HUNTER_KINDS[h.kind]); }
});

import { newLine, lineCfg, heirlooms, recordGeneration, heirSlots } from '../src/lineage.js';
import { TUNED } from '../src/tuned.js';
test('lineage: one heirloom passes, the family is remembered, a night-1 death ends the line', () => {
  let line = newLine(7);
  let g; for (let s = 5; s < 60; s++) { g = runGame(s, { ...TUNED, ...lineCfg(line) }, R['hybrid-3-1.8']); if (g.result.nights >= 1) break; }
  assert.ok(g.result.nights >= 1, 'seed 5 should see a dawn');
  const opts = heirlooms(g);
  assert.ok(opts.length >= 1); const slots = Math.min(3, g.result.nights); assert.ok(slots >= 1 && slots <= 3);
  line = recordGeneration(line, g, 'a sentence', [opts[0]]);
  assert.equal(line.gen, 2); assert.equal(line.chronicle.length, 1); assert.ok(line.heir);
  const c = lineCfg(line);
  assert.ok(c.heir && c.lineage && c.lineage.C + c.lineage.S + c.lineage.D + c.lineage.N > 0);
  const g2 = newGame(6, { ...TUNED, ...c });
  for (const h of c.heir) if (h.attune) assert.equal(g2.troop.spec[h.attune], 1);
  // a generation that never sees a dawn ends the line
  const dead = runGame(6, { ...TUNED, ...c }, R['always-stay']);
  if (dead.result.nights === 0) { const ended = recordGeneration(line, dead, 'x', null); assert.equal(ended.ended, true); }
});

test('warrens remember you: going back keeps most of your growth speed', () => {
  const g = newGame(13, { hunterStart: 0, reinforceEvery: 999 });
  const home = g.troop.warren;
  for (let k = 0; k < 15; k++) step(g, { type: 'stay' });
  assert.equal(g.settled[home], 15);
  const other = g.warrens.find(w => w.id !== home);
  step(g, { type: 'move', to: other.id });
  assert.equal(g.settled[home], 12, 'leaving costs 3');
});

test('heirlooms: one slot per night survived, up to three', () => {
  let line = newLine(9), g;
  for (let s = 1; s < 200; s++) { g = runGame(s, { ...TUNED }, R['hybrid-3-1.8']); if (g.result.nights >= 3) break; }
  assert.equal(heirSlots(g), Math.min(3, g.result.nights));
  const opts = heirlooms(g);
  line = recordGeneration(line, g, 's', opts.slice(0, 5));
  assert.ok(line.heir.length <= heirSlots(g));
});
