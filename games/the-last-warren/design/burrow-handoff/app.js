/* app.js — the side panel, header, verbs and the review-only moment stepper.
   MOMENTS is the panel copy for each board moment in demo.js (same ids). In the game, these values come from the rules in src/. */
(function () {
  const $ = id => document.getElementById(id);
  const nursery = { k: 'N', d: 'shallow', kind: 'Nursery', depth: 'shallow', gift: '+1 extra person every tick', cost: 'Loud: noise ×1.5', depthNote: 'Shallow: hides nothing (×1)' };
  const H = (k, name, n, state) => ({ k, name, n, state: state || '' });
  const L = (t, k) => ({ t, k: k || 'ink' });
  const open = [L('Night 1. The drowned coast. 2 hunters at the edges.', 'gold'), L('Sorrel I.', 'gold')];

  const MOMENTS = [
    { id: 'hidden', label: 'Hidden', night: 1, dawn: 0, count: 4, where: 'in a shallow Nursery warren', strength: '4', noise: '3.2', growing: '+1 a tick · +2 in 10', watched: '—', status: 'hidden', statusKind: 'you',
      odds: 'You wouldn’t beat even one sweeper (0%).', attack: null, w: nursery, hunters: [H('sweeper', 'Sweeper', 8), H('sweeper', 'Sweeper', 8)], log: open,
      note: 'Quiet. The troop breathes slowly; the sweepers’ fans wander. Hover any square for the race; click one to run there.' },
    { id: 'located', label: 'Seen · the ring forms', night: 1, dawn: 23, count: 19, where: 'in a shallow Nursery warren', strength: '19', noise: '6.1', growing: '+1 a tick · +2 in 10', watched: '3 ticks', status: 'located', statusKind: 'them',
      odds: 'Holding here you’d beat 1 sweeper (71%), not 2 (24%).', attack: '71%', w: nursery,
      hunters: [H('sweeper', 'Sweeper', 8, 'in reach'), H('sweeper', 'Sweeper', 8, 'in reach'), H('tracker', 'Tracker', 6, 'on your trail'), H('listener', 'Listener', 5, 'mustering')],
      log: [...open, L('Seen.', 'them'), L('The ring is forming.', 'them')],
      note: 'The ring draws itself in, then pulses while the edges run warm. The troop breathes twice as fast. Gold threads and pips: how long they’ve watched. The listener is still mustering, so the ring isn’t closed yet.' },
    { id: 'transit', label: 'Running', night: 1, dawn: 24, count: 19, where: 'running for the deep Scout warren', strength: '19', noise: '8.4', growing: '—', watched: '—', status: 'in transit', statusKind: 'you',
      odds: 'In the open you’d beat 1 sweeper (52%).', attack: null, w: null, hunters: [H('sweeper', 'Sweeper', 8), H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6, 'on your trail')],
      log: [...open, L('Seen.', 'them'), L('The ring is forming.', 'them'), L('Running. 9 ticks to the deep Scout warren.', 'you')],
      note: '220 ms a tick, playing itself out. The token goes hollow and dashed; the route counts down; tracks fade behind over 14 ticks (the tracks variant). The hunters step with every tick.' },
    { id: 'forest', label: 'Holding in forest', night: 1, dawn: 31, count: 23, where: 'holding in the forest', strength: '23', noise: '2.0', growing: '+1 a tick', watched: '—', status: 'holding · hidden', statusKind: 'you',
      odds: 'Holding here you’d beat 2 sweepers (64%), not 3 (31%).', attack: null, w: null, hunters: [H('sweeper', 'Sweeper', 8), H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6)],
      log: [...open, L('Holding in the forest. Hidden and quiet.', 'you')],
      note: 'A hollow ring, a little faded into the trees.' },
    { id: 'scout', label: 'Scouting', night: 1, dawn: 36, count: 31, where: 'in a deep Scout warren', strength: '25', noise: '1.6', growing: '+1 a tick · +2 in 10', watched: '—', status: 'hidden', statusKind: 'you',
      odds: 'Holding here you’d beat 2 sweepers (58%), not 3 (22%).', attack: null,
      w: { k: 'S', d: 'deep', kind: 'Scout', depth: 'deep', gift: 'See where they think you are', cost: 'Thin walls: holding −20%', depthNote: 'Deep: noise ×0.5' },
      hunters: [H('sweeper', 'Sweeper', 8), H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6)],
      log: [...open, L('Scout out. −3.', 'you'), L('They think you’re still at the nursery.', 'gold')],
      note: 'Belief is knowledge, so it is gold, not blood, and it shimmers. Only a Scout warren shows it.' },
    { id: 'decoy', label: 'Decoy', night: 1, dawn: 27, count: 23, where: 'in a shallow Nursery warren', strength: '23', noise: '4.6', growing: '+1 a tick · +2 in 10', watched: '—', status: 'hidden', statusKind: 'you',
      odds: 'Holding here you’d beat 1 sweeper (76%), not 2 (30%).', attack: null, w: nursery, hunters: [H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6)],
      log: [...open, L('Decoy out. −4. It breaks east.', 'you'), L('They take it.', 'gold')],
      note: 'A small dashed ring of us, marked d, loud, running the other way; the hunters turn after it. When they take it, it gets a blood ring.' },
    { id: 'rearguard', label: 'Rearguard', night: 1, dawn: 40, count: 31, where: 'in a deep Combat warren', strength: '40', noise: '3.9', growing: '+1 a tick · +2 in 10', watched: '—', status: 'hidden', statusKind: 'you',
      odds: 'Holding here you’d beat 3 sweepers (66%), not 4 (29%).', attack: null,
      w: { k: 'C', d: 'deep', kind: 'Combat', depth: 'deep', gift: '+30% strength', cost: 'Loud: noise ×1.5', depthNote: 'Deep: noise ×0.5' },
      hunters: [H('sweeper', 'Sweeper', 8, 'fighting the rearguard'), H('tracker', 'Tracker', 6)],
      log: [...open, L('Rearguard left at the road. −5.', 'you'), L('The rearguard meets a sweeper.', 'them')],
      note: 'The rearguard is the square: part of us, left behind, with its own count. It shakes while it fights.' },
    { id: 'besieged', label: 'Besieged', night: 1, dawn: 44, count: 41, where: 'in a shallow Combat warren', strength: '53', noise: '7.2', growing: '—', watched: '6 ticks', status: 'besieged · not growing', statusKind: 'them',
      odds: 'Attacking the hound you’d win (58%). Holding, you’d beat 2 sweepers (61%), not 3 (27%).', attack: '58%',
      w: { k: 'C', d: 'shallow', kind: 'Combat', depth: 'shallow', gift: '+30% strength', cost: 'Loud: noise ×1.5', depthNote: 'Shallow: hides nothing (×1)' },
      hunters: [H('sweeper', 'Sweeper', 8, 'in reach'), H('sweeper', 'Sweeper', 8, 'in reach'), H('tracker', 'Tracker', 6, 'in reach'), H('hound', 'Hound', 7, 'in reach · on your trail')],
      log: [...open, L('Seen.', 'them'), L('Besieged.', 'them'), L('Not growing.', 'them')],
      note: 'Stillness is the signal: the troop stops breathing, the ring goes solid, the edges run warm and stay there.' },
    { id: 'dawn', label: 'Dawn in 3', night: 2, dawn: 51, count: 58, where: 'in a deep Defense warren', strength: '75', noise: '2.1', growing: '+1 a tick · +2 in 10', watched: '—', status: 'hidden', statusKind: 'you',
      odds: 'Holding here you’d beat 4 sweepers (70%), not 5 (38%).', attack: null,
      w: { k: 'D', d: 'deep', kind: 'Defense', depth: 'deep', gift: '+30% holding', cost: 'Slow to leave: +1 tick', depthNote: 'Deep: noise ×0.5' },
      hunters: [H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6), H('listener', 'Listener', 5)],
      log: [L('Night 2. The same coast, colder. 3 hunters.', 'gold'), L('Dawn in 3.', 'gold'), L('They turn for the edges.', 'gold')],
      note: 'Light comes in from the east and the dawn line is nearly full; the hunters back off a step at a time.' },
    { id: 'fell', label: 'The warren fell', night: 2, dawn: 45, count: 41, where: 'the warren fell', strength: '—', noise: '—', growing: '—', watched: '—', status: 'dead', statusKind: 'ink',
      odds: '', attack: null, w: null, hunters: [H('sweeper', 'Sweeper', 8), H('sweeper', 'Sweeper', 8), H('tracker', 'Tracker', 6)],
      log: [L('Night 2. The same coast, colder. 3 hunters.', 'gold'), L('Seen.', 'them'), L('Besieged.', 'them'), L('Night 2, 9 ticks before dawn. Found where you stayed, a shallow Combat warren, 41 strong, by two sweepers and a tracker.', 'them')],
      note: 'The light goes down and the token goes hollow with a line through it. The ending dialog comes up over this.' }
  ];

  // hunter glyphs, 16×16: the shape is the kind, never colour alone
  const HUNTER_D = {
    sweeper: 'M4 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5z',
    tracker: 'M8 2L14.5 13.5H1.5Z',
    listener: 'M8 2a6 6 0 1 0 0.01 0zm0 2.7a3.3 3.3 0 1 1-0.01 0z',
    hound: 'M8 1.2L14.8 8 8 14.8 1.2 8Z'
  };
  // warren glyphs, 24×24: outline by kind, line by depth
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

  function render(m) {
    $('board').scene = m.id;
    $('night').textContent = m.night;
    $('dawn-fill').style.width = Math.round(m.dawn / 54 * 100) + '%';
    $('dawn-ticks').textContent = m.dawn;
    $('count').textContent = m.count;
    $('where').textContent = m.where;
    const st = $('status'); st.textContent = m.status; st.className = 'status ' + m.statusKind;
    $('strength').textContent = m.strength; $('noise').textContent = m.noise; $('growing').textContent = m.growing; $('watched').textContent = m.watched;
    $('odds').textContent = m.odds; $('odds').hidden = !m.odds;
    const w = $('warren'); w.hidden = !m.w;
    if (m.w) { $('warren-glyph').innerHTML = warrenGlyphSVG(m.w.k, m.w.d); $('warren-name').textContent = `${m.w.kind} · ${m.w.depth}`; $('warren-gift').textContent = m.w.gift; $('warren-cost').textContent = m.w.cost; $('warren-depth').textContent = m.w.depthNote; }
    $('hunter-count').textContent = m.hunters.length;
    $('hunters').innerHTML = m.hunters.map(h => `<div class="row"><svg width="14" height="14" viewBox="0 0 16 16"><path d="${HUNTER_D[h.k]}" fill="var(--blood)" fill-rule="evenodd"></path></svg><span>${h.name}</span><span class="state">${h.state}</span><span class="n">${h.n}</span></div>`).join('');
    $('log').innerHTML = m.log.map((l, i) => `<div class="row"><span class="i">${i + 1}</span><span class="${l.k}">${l.t}</span></div>`).join('');
    const dead = m.status === 'dead' || m.id === 'transit';
    $('attack').disabled = !m.attack; $('attack-key').textContent = m.attack ? `A · ${m.attack}` : 'A · NONE IN REACH';
    $('spend-decoy').disabled = dead || m.count < 4;
    $('spend-rearguard').disabled = dead || m.count < 5;
    $('spend-scout').disabled = dead || m.count < 3;
    $('spend-dig').disabled = dead || m.count < 8 || !!m.w;
    document.querySelectorAll('#moments button[data-i]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === cur)));
    const note = document.querySelector('#moments .note'); if (note) note.innerHTML = `<b>This moment:</b> ${m.note}`;
  }

  // review-only stepper (also ?moment=located)
  let cur = Math.max(0, MOMENTS.findIndex(m => m.id === (new URLSearchParams(location.search).get('moment') || 'located')));
  const go = i => { cur = ((i % MOMENTS.length) + MOMENTS.length) % MOMENTS.length; render(MOMENTS[cur]); };
  const mo = $('moments');
  mo.innerHTML = `<span class="label">Moment</span>` + MOMENTS.map((m, i) => `<button data-i="${i}" aria-pressed="false">${m.label}</button>`).join('') + `<button class="nav" data-nav="-1">← prev</button><button class="nav" data-nav="1">next →</button><p class="note"></p>`;
  mo.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.i != null) go(+b.dataset.i); else go(cur + (+b.dataset.nav)); });

  // keys: Space / A / D R S G flash the verb (the mock has no rules behind them); arrows step moments
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,select')) return;
    if (e.key === 'ArrowRight') { go(cur + 1); return; } if (e.key === 'ArrowLeft') { go(cur - 1); return; }
    const k = e.key.toLowerCase(); const b = document.querySelector(`.verb[data-key="${k === ' ' ? ' ' : k}"]`);
    if (b && !b.disabled) { e.preventDefault(); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 180); }
  });
  $('working-toggle').addEventListener('click', () => { const w = $('working'); const open = w.classList.toggle('open'); $('working-toggle').textContent = open ? 'Hide the working' : 'Show the working'; $('working-toggle').setAttribute('aria-expanded', String(open)); });

  go(cur);
  window.LWApp = { MOMENTS, go, render, warrenGlyphSVG, HUNTER_D };
})();
