/* Bunny Goes: build your life in Paramaribo, then see it.
   Data: data/site.json (built from the research by data/build_site.py).
   State: saved in this browser, and to the server when /api/state answers. */
(function () {
  'use strict';

  var D = null;
  var KEY = 'bunny-goes-v1';
  var API = 'api/state';

  // The secret link: unstuck-games.com/bunny-goes/#k=<key> (and &b=<key> for Bebu's notes).
  // Read once, kept in this browser, then taken out of the address bar. Without a key the
  // site is the public guide, and nothing is saved to or read from the server.
  var SKEY = 'bunny-goes-key', BKEY = 'bunny-goes-bebu-key', LINK = '', BEBU_LINK = '';
  (function () {
    var m = location.hash.match(/^#k=([A-Za-z0-9_-]{16,})(?:&b=([A-Za-z0-9_-]{16,}))?/);
    try {
      if (m) {
        if (localStorage.getItem(SKEY) !== m[1]) sessionStorage.setItem('bunny-goes-new-link', '1');
        localStorage.setItem(SKEY, m[1]);
        if (m[2]) localStorage.setItem(BKEY, m[2]);
        history.replaceState(null, '', location.pathname + location.search + '#/');
      }
      LINK = localStorage.getItem(SKEY) || '';
      BEBU_LINK = localStorage.getItem(BKEY) || '';
    } catch (e) { if (m) { LINK = m[1]; BEBU_LINK = m[2] || ''; } }
  })();
  function privateLink(bebu) { return location.origin + location.pathname + (bebu ? '?bebu=edit' : '') + '#k=' + LINK + (bebu && BEBU_LINK ? '&b=' + BEBU_LINK : ''); }
  function linkCard() {
    if (!LINK) return '';
    return '<div class="card link-card"><h3>Your private link</h3><p class="small muted">This link is your key: it opens your picks and Bebu’s carrots on any phone or computer. Keep it somewhere safe, and don’t share it.</p>' +
      '<div class="btn-row" style="justify-content:flex-start"><button type="button" class="btn btn-pink btn-small" data-copy-link="1">Copy my private link</button>' +
      (BEBU_LINK ? '<button type="button" class="btn btn-ghost btn-small" data-copy-link="bebu">Copy Bebu link</button>' : '') + '</div></div>';
  }
  function keyed(extra) { var h = { 'X-Bunny-Key': LINK }; Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; }); return h; }
  var app = document.getElementById('app');
  var openChip = null;

  var DEFAULT = {
    cur: 'PHP',
    moveDate: '2026-11-20',
    job: { area: null },
    salary: { amount: null, cur: 'USD', gross: true },
    home: { size: null, furnished: true, rentT: null, likes: [] },
    utilT: 0.35,
    food: { style: 0.3, casual: 2, nice: 1 },
    around: { mode: null, taxi: 4 },
    connected: { phone: null, fibre: null },
    health: { szf: 'unknown', gym: false },
    buckets: { home: 0, toronto: 0, emergency: 0, pretty: 0 },
    view: 'monthly',
    quests: {},
    toronto: { share: 50, coatT: 0.5, funT: 0.5, fareT: 0.5 },
    built: false
  };

  /* ---------- state ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    var out = clone(base);
    Object.keys(over || {}).forEach(function (k) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && out[k] && typeof out[k] === 'object') out[k] = merge(out[k], over[k]);
      else out[k] = over[k];
    });
    return out;
  }
  var S = clone(DEFAULT);
  try { S = merge(DEFAULT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  var saveTimer = null, serverOK = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (!serverOK || !LINK) return;
      fetch(API, { method: 'PUT', headers: keyed({ 'Content-Type': 'application/json' }), credentials: 'same-origin', body: JSON.stringify(S) }).catch(function () {});
    }, 700);
  }
  function loadServer() {
    if (!LINK) return Promise.resolve();
    return fetch(API, { headers: keyed(), credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('no server');
      return r.json();
    }).then(function (j) {
      serverOK = true;
      if (j && j.state) S = merge(DEFAULT, j.state);
    }).catch(function () { serverOK = false; });
  }

  /* ---------- money ---------- */
  var SYM = { PHP: '₱', USD: '$', SRD: 'SRD ', EUR: '€', CAD: 'CA$' };
  function toUSD(v, cur) { return v / (D.rates[cur] || 1); }
  function fromUSD(usd, cur) { return usd * (D.rates[cur] || 1); }
  function roundNice(v) {
    var a = Math.abs(v);
    var step = a >= 100000 ? 1000 : a >= 10000 ? 100 : a >= 1000 ? 10 : a >= 100 ? 5 : 1;
    return Math.round(v / step) * step;
  }
  function money(usd, cur) {
    cur = cur || S.cur;
    var v = roundNice(fromUSD(usd, cur));
    return SYM[cur] + v.toLocaleString('en-US');
  }
  function range(lo, hi, cur) {
    if (Math.abs(hi - lo) < 0.5) return money(lo, cur);
    return money(lo, cur) + '–' + money(hi, cur).replace(SYM[cur || S.cur], '');
  }
  function c(key) { return D.costs[key]; }
  function cUSD(r, t) {
    var lo = toUSD(r.low, r.cur), hi = toUSD(r.high, r.cur);
    return { lo: lo, hi: hi, at: lo + (hi - lo) * (t == null ? 0.5 : t) };
  }

  /* ---------- the model ---------- */
  function rentRange() {
    var size = S.home.size || '1bed';
    return cUSD(c('rent')[size], S.home.rentT);
  }
  function rentDefaultT() { return S.job.area ? 0.25 : null; }

  function salaryNet() {
    var s = S.salary;
    if (!s.amount) return null;
    var srd = s.amount * D.rates.SRD / D.rates[s.cur];
    if (!s.gross) return { usd: toUSD(srd, 'SRD'), tax: 0, taxed: false };
    var T = c('tax');
    var expense = Math.min(srd * T.expensePct, T.expenseCapSRD);
    var taxable = Math.max(0, srd - expense - T.freeSRD);
    var tax = 0;
    T.bands.forEach(function (b) {
      if (taxable <= 0) return;
      var slice = b[0] == null ? taxable : Math.min(taxable, b[0]);
      tax += slice * b[1];
      taxable -= slice;
    });
    return { usd: toUSD(srd - tax, 'SRD'), tax: toUSD(tax, 'SRD'), taxed: true };
  }

  function monthly() {
    var L = [];
    var r = rentRange();
    var rentSet = S.home.rentT != null;
    L.push({ key: 'rent', label: 'The roof over your ears', life: S.home.size ? sizeName(S.home.size) + (S.home.furnished ? ', furnished' : '') : 'a 1-bedroom, for now',
      usd: rentSet ? r.at : null, lo: r.lo, hi: r.hi, status: rentSet ? 'est' : 'unknown',
      hint: rentSet ? null : (S.job.area ? 'Slide to pick a rent' : 'Exploring until the job location is known'), src: c('rent')[S.home.size || '1bed'].src.concat(c('rent').alsoSee) });
    var u = cUSD(c('utilities'), S.utilT);
    L.push({ key: 'util', label: 'Fan vs AC negotiations', life: S.utilT < 0.3 ? 'fans mostly' : S.utilT < 0.7 ? 'AC at night' : 'AC all day', usd: u.at, lo: u.lo, hi: u.hi, status: 'est', src: c('utilities').src });
    var g = cUSD(c('groceries'), 0.15 + 0.7 * (1 - S.food.style));
    L.push({ key: 'groc', label: 'Grocery runs', life: S.food.style < 0.4 ? 'cooking most days' : S.food.style < 0.7 ? 'half and half' : 'cooking now and then', usd: g.at, lo: g.lo, hi: g.hi, status: 'est', src: c('groceries').src });
    var mc = cUSD(c('mealCasual'), 0.5);
    var casual = S.food.casual * 4.33;
    L.push({ key: 'casual', label: "Warung o'clock", life: S.food.casual + ' a week', usd: mc.at * casual, lo: mc.lo * casual, hi: mc.hi * casual, status: 'est', src: c('mealCasual').src });
    var nn = c('mealNice');
    var niceOne = toUSD((nn.typical || (nn.low + nn.high) / 2) / nn.perPersonDivisor, nn.cur);
    var niceLo = toUSD(nn.low / nn.perPersonDivisor, nn.cur), niceHi = toUSD(nn.high / nn.perPersonDivisor, nn.cur);
    L.push({ key: 'nice', label: 'Fancy dinners', life: S.food.nice + ' a month', usd: niceOne * S.food.nice, lo: niceLo * S.food.nice, hi: niceHi * S.food.nice, status: 'est', src: nn.src });
    var mode = S.around.mode || 'mix';
    var bus = cUSD(c('busMonthly'), 0.5), taxi = cUSD(c('taxiRide'), 0.5);
    var rides = (mode === 'bus' ? 0 : S.around.taxi) * 4.33;
    var tLo = (mode === 'taxi' ? 0 : bus.lo) + taxi.lo * rides, tHi = (mode === 'taxi' ? 0 : bus.hi) + taxi.hi * rides;
    var tAt = (mode === 'taxi' ? 0 : bus.at) + taxi.at * rides;
    L.push({ key: 'around', label: 'Getting from A to B', life: mode === 'bus' ? 'bus to work' : mode === 'taxi' ? S.around.taxi + ' taxi rides a week' : 'bus, plus ' + S.around.taxi + ' taxis a week', usd: tAt, lo: tLo, hi: tHi, status: S.around.mode ? 'est' : 'unknown', src: c('busMonthly').src.concat(c('taxiRide').src) });
    var ph = c('phone')[S.connected.phone || 'telesur'];
    var pv = toUSD(ph.typical || ph.low, ph.cur);
    L.push({ key: 'phone', label: 'Data for video calls', life: S.connected.phone ? phoneName(S.connected.phone) : 'a 30-day bundle', usd: pv, lo: pv, hi: pv, status: S.connected.phone ? 'est' : 'unknown', src: ph.src });
    if (S.connected.fibre) {
      var f = toUSD(c('fibre').typical || c('fibre').low, c('fibre').cur);
      L.push({ key: 'fibre', label: 'Home fibre, for long calls', life: 'before VAT, 2-year contract', usd: f, lo: f, hi: f, status: 'est', src: c('fibre').src });
    }
    var szf = toUSD(c('szf').typical, c('szf').cur);
    if (S.health.szf === 'me') L.push({ key: 'szf', label: 'State health fund (SZF)', life: 'if you pay it yourself', usd: szf, lo: szf, hi: szf, status: 'est', src: c('szf').src });
    if (S.health.szf === 'unknown') L.push({ key: 'szf', label: 'State health fund (SZF)', life: 'ask: does the company cover health?', usd: null, lo: szf, hi: szf, status: 'unknown', src: c('szf').src });
    if (S.health.gym) { var gy = cUSD(c('gym'), 0.5); L.push({ key: 'gym', label: 'Gym', life: 'monthly membership', usd: gy.at, lo: gy.lo, hi: gy.hi, status: 'est', src: c('gym').src }); }
    var hc = cUSD(c('haircut'), 0.5);
    L.push({ key: 'hair', label: 'Hair glow-up', life: 'every two months', usd: hc.at / 2, lo: hc.lo / 2, hi: hc.hi / 2, status: 'est', src: c('haircut').src });
    return L;
  }

  function bucketsUSD() { var b = S.buckets; return b.home + b.toronto + b.emergency + b.pretty; }

  function arrival() {
    var r = rentRange();
    var rentAt = S.home.rentT != null ? r.at : null;
    var nights = cUSD(c('shortStayNight'), 0.5);
    var L = [];
    L.push({ key: 'stay', label: 'First two weeks somewhere to stay', life: 'unless the company puts you up', usd: nights.at * 14, lo: nights.lo * 14, hi: nights.hi * 14, status: 'unknown', src: c('shortStayNight').src.concat(['E4.nomads.short-stay-night']) });
    L.push({ key: 'deposit', label: 'Rental deposit', life: '1 to 2 months of rent', usd: rentAt != null ? rentAt * 1.5 : null, lo: r.lo, hi: r.hi * 2, status: rentAt != null ? 'est' : 'unknown', src: c('deposit').src });
    L.push({ key: 'first', label: 'First month of rent', life: 'paid when you sign', usd: rentAt, lo: r.lo, hi: r.hi, status: rentAt != null ? 'est' : 'unknown', src: c('rent')[S.home.size || '1bed'].src });
    var tx = cUSD(c('airportTaxi'), 0.5);
    L.push({ key: 'taxi', label: 'Airport to the city', life: '45 km, no meter, unless the company picks you up', usd: tx.at, lo: tx.lo, hi: tx.hi, status: 'unknown', src: c('airportTaxi').src });
    var sim = toUSD(c('sim').typical || c('sim').low, c('sim').cur);
    L.push({ key: 'sim', label: 'SIM card', life: 'Telesur or Digicel, with your passport', usd: sim, lo: sim, hi: sim, status: 'est', src: c('sim').src });
    if (S.health.szf !== 'company') {
      var year = toUSD(c('szf').typical * 12, c('szf').cur);
      L.push({ key: 'szf', label: 'A year of state health fund', life: 'foreigners pay up front, unless the company covers health', usd: S.health.szf === 'me' ? year : null, lo: year, hi: year, status: S.health.szf === 'me' ? 'est' : 'unknown', src: c('szf').src });
    }
    L.push({ key: 'setup', label: 'Setting up a home', life: 'sheets, pots, a fan, a power bank', usd: null, lo: null, hi: null, status: 'unknown', src: [] });
    return L;
  }

  function irregular() {
    var gp = cUSD(c('gp'), 0.5);
    return [
      { key: 'gp', label: 'A doctor visit', life: 'paid up front, then claimed', usd: gp.at, lo: gp.lo, hi: gp.hi, status: 'est', src: c('gp').src },
      { key: 'flight', label: 'A trip home to the Philippines', life: 'not researched yet', usd: null, lo: null, hi: null, status: 'unknown', src: [] },
      { key: 'big', label: 'Something breaks', life: 'your emergency bucket is for this', usd: null, lo: null, hi: null, status: 'unknown', src: [] }
    ];
  }

  function sizeName(s) { return { studio: 'a studio', '1bed': 'a 1-bedroom', '2bed': 'a 2-bedroom' }[s]; }
  function phoneName(p) { return { telesur: 'Telesur, 75 GB', dataonly: 'Telesur data only', digicel: 'Digicel, 30 GB' }[p]; }

  /* ---------- little helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function tag(status) {
    return status === 'known' ? '<span class="tag tag-known">known</span>'
      : status === 'est' ? '<span class="tag tag-est">estimate</span>'
      : '<span class="tag tag-unknown">not yet known</span>';
  }
  function srcBtn(ids, label) {
    ids = (ids || []).filter(function (i) { return D.items[i]; });
    if (!ids.length) return '';
    return '<button type="button" class="src" data-src="' + esc(ids.join(',')) + '">' + (label || 'source') + '</button>';
  }
  function pressed(b) { return 'aria-pressed="' + (b ? 'true' : 'false') + '"'; }
  function daysTo(d) { return Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000); }
  function areaName(id) { var it = D.items[id]; return it ? it.label.split(' (')[0] : id; }

  var BUNNY = '<svg viewBox="0 0 120 130" aria-hidden="true">' +
    '<g class="ear ear-l"><ellipse cx="42" cy="34" rx="13" ry="32" fill="#fff" stroke="#2b2240" stroke-width="4"/><ellipse cx="42" cy="38" rx="6" ry="22" fill="#ff8fb1"/></g>' +
    '<g class="ear ear-r"><ellipse cx="78" cy="34" rx="13" ry="32" fill="#fff" stroke="#2b2240" stroke-width="4"/><ellipse cx="78" cy="38" rx="6" ry="22" fill="#ff8fb1"/></g>' +
    '<ellipse cx="60" cy="88" rx="42" ry="38" fill="#fff" stroke="#2b2240" stroke-width="4"/>' +
    '<g class="blink"><ellipse cx="45" cy="84" rx="5" ry="6" fill="#2b2240"/><ellipse cx="75" cy="84" rx="5" ry="6" fill="#2b2240"/></g>' +
    '<circle cx="47" cy="82" r="1.6" fill="#fff"/><circle cx="77" cy="82" r="1.6" fill="#fff"/>' +
    '<ellipse cx="33" cy="98" rx="7" ry="4.5" fill="#ffb3cb" opacity=".8"/><ellipse cx="87" cy="98" rx="7" ry="4.5" fill="#ffb3cb" opacity=".8"/>' +
    '<path d="M56 95 q4 4 8 0" fill="#ff8fb1" stroke="#2b2240" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M60 99 v4 M60 103 q-4 4 -8 1 M60 103 q4 4 8 1" fill="none" stroke="#2b2240" stroke-width="2.5" stroke-linecap="round"/>' +
    '</svg>';
  var OUTFIT = {
    hardhat: '<g><path d="M24 58 Q60 14 96 58 Z" fill="#ffc93c" stroke="#2b2240" stroke-width="4" stroke-linejoin="round"/><rect x="16" y="54" width="88" height="9" rx="4" fill="#ffc93c" stroke="#2b2240" stroke-width="4"/><path d="M60 24 v30" stroke="#2b2240" stroke-width="3"/></g>',
    chef: '<g><path d="M34 60 v-14 q-14 -4 -8 -18 q8 -12 20 -4 q6 -14 22 -8 q14 4 10 18 q14 2 8 16 q-4 6 -10 6 v4 Z" fill="#fff" stroke="#2b2240" stroke-width="4" stroke-linejoin="round"/><rect x="33" y="54" width="54" height="10" rx="3" fill="#fff" stroke="#2b2240" stroke-width="4"/></g>',
    shades: '<g><rect x="32" y="76" width="24" height="15" rx="6" fill="#2b2240"/><rect x="64" y="76" width="24" height="15" rx="6" fill="#2b2240"/><path d="M56 82 h8" stroke="#2b2240" stroke-width="4"/><path d="M37 80 l6 0" stroke="#7cc6fe" stroke-width="3" stroke-linecap="round"/><path d="M69 80 l6 0" stroke="#7cc6fe" stroke-width="3" stroke-linecap="round"/></g>',
    phone: '<g><rect x="96" y="72" width="20" height="34" rx="4" fill="#7cc6fe" stroke="#2b2240" stroke-width="4" transform="rotate(12 106 89)"/><circle cx="104" cy="98" r="2" fill="#2b2240" transform="rotate(12 106 89)"/></g>',
    heart: '<g class="float"><path d="M104 40 c-6 -10 -20 -4 -14 8 l14 14 l14 -14 c6 -12 -8 -18 -14 -8 Z" fill="#ff8fb1" stroke="#2b2240" stroke-width="3" stroke-linejoin="round"/></g>',
    umbrella: '<g><path d="M92 54 Q114 22 136 54 Z" fill="#ff8fb1" stroke="#2b2240" stroke-width="4" stroke-linejoin="round"/><path d="M114 54 v52 q0 8 -8 6" fill="none" stroke="#2b2240" stroke-width="4" stroke-linecap="round"/><path d="M103 54 q0 -10 11 -20 M125 54 q0 -10 -11 -20" fill="none" stroke="#2b2240" stroke-width="2"/></g>',
    wave: '<g class="wave"><ellipse cx="108" cy="64" rx="11" ry="15" fill="#fff" stroke="#2b2240" stroke-width="4"/><path d="M103 56 v6 M109 54 v7 M115 56 v6" stroke="#ffb3cb" stroke-width="2.5" stroke-linecap="round"/></g>',
    suitcase: '<g><rect x="92" y="100" width="34" height="26" rx="4" fill="#2e9e6b" stroke="#2b2240" stroke-width="4"/><path d="M102 100 v-6 h14 v6" fill="none" stroke="#2b2240" stroke-width="4"/><path d="M92 110 h34" stroke="#ffc93c" stroke-width="3"/><circle cx="100" cy="118" r="2" fill="#fff"/></g>'
  };
  function bunny(cls, mood, outfit, say) {
    var extra = String(outfit || '').split('+').map(function (o) { return OUTFIT[o] || ''; }).join('');
    var svg = extra ? BUNNY.replace('</svg>', extra + '</svg>') : BUNNY;
    var b = '<button type="button" class="bunny ' + cls + ' ' + (mood || 'happy') + '" data-poke="1" aria-label="Poke Bunny">' + svg + '</button>';
    if (!say) return b;
    return '<div class="talk">' + b + '<div class="bubble" aria-live="polite">' + say + '</div></div>';
  }
  function carrots(usd) { return Math.max(1, Math.round(fromUSD(usd, 'PHP') / 15)).toLocaleString('en-US'); }

  /* ---------- controls (shared by builder and the filter drops) ---------- */
  var CONTROLS = {
    date: function () {
      var d = daysTo(S.moveDate);
      return '<div class="field"><label for="f-date">Flying out on</label><input id="f-date" class="input" type="date" data-bind="moveDate" value="' + esc(S.moveDate) + '"></div>' +
        '<p class="muted">' + (d > 0 ? '<span class="countdown">' + d + '</span> sleeps to go.' : 'Bon voyage, Bunny.') + '</p>';
    },
    job: function () {
      var areas = [['', 'Not sure yet'], ['centrum', 'City centre'], ['noord', 'North'], ['zuid', 'South'], ['west', 'West / Kwatta'], ['wanica', 'Wanica'], ['commewijne', 'Across the bridge']];
      return '<div class="field"><span class="field-label">Where is the office?</span><div class="pills">' +
        areas.map(function (a) { return '<button type="button" class="pill" data-set="job.area" data-val="' + a[0] + '" ' + pressed((S.job.area || '') === a[0]) + '>' + a[1] + '</button>'; }).join('') +
        '</div><p class="tiny muted">This unlocks rent suggestions. Until then, rent is just for exploring.</p></div>';
    },
    salary: function () {
      var s = S.salary;
      return '<div class="field"><label for="f-sal">Monthly salary <span class="muted">(optional)</span></label>' +
        '<input id="f-sal" class="input" inputmode="decimal" placeholder="e.g. 1500" data-bind="salary.amount" data-num="1" value="' + (s.amount || '') + '"></div>' +
        '<div class="field"><span class="field-label">Paid in</span><div class="pills">' +
        ['USD', 'EUR', 'SRD', 'PHP'].map(function (k) { return '<button type="button" class="pill" data-set="salary.cur" data-val="' + k + '" ' + pressed(s.cur === k) + '>' + k + '</button>'; }).join('') +
        '</div></div><div class="field"><div class="pills">' +
        '<button type="button" class="pill" data-set="salary.gross" data-val="true" ' + pressed(s.gross) + '>Before tax</button>' +
        '<button type="button" class="pill" data-set="salary.gross" data-val="false" ' + pressed(!s.gross) + '>After tax</button></div>' +
        '<p class="tiny muted">Before tax, we estimate Suriname wage tax: the first SRD 9,000 a month is tax-free. ' + srcBtn(c('tax').src, 'how') + ' Pension contributions are not included yet.</p></div>';
    },
    home: function () {
      var sizes = [['studio', 'Studio'], ['1bed', '1-bedroom'], ['2bed', '2-bedroom']];
      var cards = sizes.map(function (s) {
        var r = cUSD(c('rent')[s[0]], 0);
        return '<button type="button" class="choice" data-set="home.size" data-val="' + s[0] + '" ' + pressed(S.home.size === s[0]) + '><b>' + s[1] + '</b><span>' + range(r.lo, r.hi) + ' asked</span></button>';
      }).join('');
      var r = rentRange();
      var t = S.home.rentT;
      var ghost = t == null;
      return '<div class="choices">' + cards + '</div>' +
        '<div class="field"><div class="pills"><button type="button" class="pill" data-set="home.furnished" data-val="true" ' + pressed(S.home.furnished) + '>Furnished</button><button type="button" class="pill" data-set="home.furnished" data-val="false" ' + pressed(!S.home.furnished) + '>Unfurnished</button></div></div>' +
        '<div class="field"><span class="field-label">Try a rent</span>' +
        '<div class="slider' + (ghost ? ' ghost' : '') + '"><input type="range" min="0" max="100" value="' + Math.round((ghost ? 0.5 : t) * 100) + '" data-bind="home.rentT" data-range="1" aria-label="Rent"></div>' +
        '<div class="slider-ends"><span>' + money(r.lo) + '</span><span>' + money(r.hi) + '</span></div>' +
        '<p class="big-num" data-live="rent">' + (ghost ? 'Slide to try one' : money(r.at) + ' a month') + '</p>' +
        '<p class="tiny muted">Listing prices from agencies, not signed leases. ' + srcBtn(c('rent')[S.home.size || '1bed'].src.concat(c('rent').alsoSee), 'where these come from') + '</p></div>';
    },
    areas: function () {
      return '<span class="field-label">Neighbourhoods to look at</span><p class="tiny muted">No official source ranks areas by safety, so none is called safe here. Tap the ones you like.</p>' +
        '<div class="scroller">' + D.areas.map(function (id) {
          var it = D.items[id];
          var liked = S.home.likes.indexOf(id) >= 0;
          return '<button type="button" class="area" data-like="' + esc(id) + '" ' + pressed(liked) + '><h3>' + esc(areaName(id)) + '</h3><p>' + esc(it.notes) + '</p><span class="tiny muted">' + (liked ? 'On your list' : 'Tap to add') + '</span></button>';
        }).join('') + '</div><p class="tiny">' + srcBtn(D.areaExtra.concat(D.areas), 'what each area is based on') + '</p>';
    },
    power: function () {
      return '<div class="field"><span class="field-label">Air conditioning</span><div class="slider"><input type="range" min="0" max="100" value="' + Math.round(S.utilT * 100) + '" data-bind="utilT" data-range="1" aria-label="Air conditioning"></div>' +
        '<div class="slider-ends"><span>Fans mostly</span><span>AC all day</span></div></div>' +
        '<div class="note note-sun">Power has been cut in rotation across Paramaribo since late August, 3 hours at a time. Ask every landlord about backup power. ' + srcBtn(['E5.backup-power']) + '</div>';
    },
    food: function () {
      return '<div class="field"><span class="field-label">Cooking or eating out?</span><div class="slider"><input type="range" min="0" max="100" value="' + Math.round(S.food.style * 100) + '" data-bind="food.style" data-range="1" aria-label="Cooking or eating out"></div><div class="slider-ends"><span>Cook most days</span><span>Eat out lots</span></div></div>' +
        stepper('Roti and warung meals a week', 'food.casual', S.food.casual, 0, 14) +
        stepper('Nice dinners a month', 'food.nice', S.food.nice, 0, 12) +
        '<div class="note note-green">Paksoi and long beans grow locally; Choi\'s and Tulip carry imports. A Filipino grocery isn\'t confirmed yet. ' + srcBtn(['G1.groceries-monthly', 'G1.rice', 'G1.chicken']) + '</div>';
    },
    around: function () {
      var modes = [['bus', 'Bus', 'Cash, no timetable'], ['mix', 'Bus and taxis', 'Taxis at night'], ['taxi', 'Taxis', 'Easiest, costs more']];
      return '<div class="choices">' + modes.map(function (m) { return '<button type="button" class="choice" data-set="around.mode" data-val="' + m[0] + '" ' + pressed(S.around.mode === m[0]) + '><b>' + m[1] + '</b><span>' + m[2] + '</span></button>'; }).join('') + '</div>' +
        (S.around.mode !== 'bus' ? stepper('Taxi rides a week', 'around.taxi', S.around.taxi, 0, 20) : '') +
        '<div class="note note-sky">There\'s no Uber or Bolt. Use a taxi you know after dark. ' + srcBtn(['J5.taxis.night', 'I1.bus.fare']) + '</div>';
    },
    connected: function () {
      var plans = [['telesur', 'Telesur 30 days', '75 GB'], ['dataonly', 'Telesur data only', 'Cheapest per GB'], ['digicel', 'Digicel 30 days', '30 GB, rollover']];
      return '<div class="choices">' + plans.map(function (p) { var v = c('phone')[p[0]]; return '<button type="button" class="choice" data-set="connected.phone" data-val="' + p[0] + '" ' + pressed(S.connected.phone === p[0]) + '><b>' + p[1] + '</b><span>' + p[2] + ' · ' + money(toUSD(v.typical || v.low, v.cur)) + '</span></button>'; }).join('') + '</div>' +
        '<div class="field"><span class="field-label">Home fibre?</span><div class="pills"><button type="button" class="pill" data-set="connected.fibre" data-val="true" ' + pressed(S.connected.fibre === true) + '>Yes, for video calls</button><button type="button" class="pill" data-set="connected.fibre" data-val="false" ' + pressed(S.connected.fibre === false) + '>Phone data is enough</button></div></div>' +
        '<div class="note note-pink">Keep your Philippine SIM alive: GCash doesn\'t list Suriname, so OTP texts need your PH number. ' + srcBtn(['H5.gcash.overseas', 'H5.keep-ph-number'].filter(function (i) { return D.items[i]; }).concat(['H3.telesur.fibre.basic'])) + '</div>';
    },
    health: function () {
      return '<div class="field"><span class="field-label">Health cover</span><div class="pills">' +
        [['unknown', 'Not sure yet'], ['company', 'The company covers it'], ['me', 'I pay the state fund']].map(function (o) { return '<button type="button" class="pill" data-set="health.szf" data-val="' + o[0] + '" ' + pressed(S.health.szf === o[0]) + '>' + o[1] + '</button>'; }).join('') +
        '</div><p class="tiny muted">The state fund (SZF) is SRD 785 a month, and foreigners pay a year up front. ' + srcBtn(c('szf').src) + '</p></div>' +
        '<div class="field"><div class="pills"><button type="button" class="pill" data-set="health.gym" data-val="' + (!S.health.gym) + '" ' + pressed(S.health.gym) + '>Gym membership</button></div></div>';
    },
    buckets: function () {
      var B = [['home', 'Padala (send home)', 'Western Union or a bank wire; Wise doesn\'t serve Suriname'], ['toronto', 'Bebu visits', 'For flights to see Bebu'], ['emergency', 'Escape pod money', 'Your emergency fund, for when something breaks'], ['pretty', 'Pretty fund', 'Conditioner and nice things. Protected.']];
      return '<p class="muted small">These come off first. Set what matters to you; zero is fine.</p>' + B.map(function (b) {
        var usd = S.buckets[b[0]];
        return '<div class="field"><div class="spread"><span class="field-label">' + b[1] + '</span><b data-live="b-' + b[0] + '">' + money(usd) + '</b></div>' +
          '<div class="slider"><input type="range" min="0" max="600" step="10" value="' + Math.round(usd) + '" data-bind="buckets.' + b[0] + '" data-usd="1" aria-label="' + b[1] + '"></div><p class="tiny muted">' + b[2] + '</p></div>';
      }).join('');
    }
  };
  function stepper(label, path, val, min, max) {
    return '<div class="field spread"><span class="field-label">' + label + '</span><span class="stepper"><button type="button" data-step="' + path + '" data-d="-1" data-min="' + min + '" aria-label="Fewer">−</button><output>' + val + '</output><button type="button" data-step="' + path + '" data-d="1" data-max="' + max + '" aria-label="More">+</button></span></div>';
  }

  /* ---------- explore: picture cards, hearts, and a realistic side ---------- */
  var AREA_FUN = {
    'E1.area.centrum': ['🏛️', 'Walk to the river, the markets and the cafes. Taxi home at night.'],
    'E1.area.zorg-en-hoop': ['🛩️', 'Mid-city, with a little airfield for neighbours.'],
    'E1.area.flora': ['🌱', 'Newer homes going up, right in the middle of things.'],
    'E1.area.uitvlugt': ['🌳', 'Green, leafy, big gardens. More houses than flats.'],
    'E1.area.noord': ['🍹', 'Where most expats live, with a food strip in Blauwgrond.'],
    'E1.area.latour-livorno': ['🏘️', 'The cheaper south side. Check the street after rain.'],
    'E1.area.zuid-hermitage': ['🛍️', 'Near Hermitage Mall: modest flats and lots of shopping.'],
    'E1.area.kwatta': ['🏡', 'Quiet houses with gardens. Better with a car.'],
    'E1.area.leiding': ['🌾', 'Semi-rural, big plots, far from the centre.'],
    'E1.area.lelydorp': ['🚜', 'Small-town Wanica, near the airport. A commute in.'],
    'E1.area.commewijne-meerzorg': ['🌉', 'Across the bridge: quieter, cheaper, rush-hour queues.']
  };
  var BG = { live: ['#ddf4e8', '#9fdcbf'], everyday: ['#ffe3ec', '#ffb3cb'], eat: ['#fff1c7', '#ffd36b'], see: ['#e2f2ff', '#9fd2ff'], weekend: ['#ddf4e8', '#7fcfa6'], hobby: ['#efe6ff', '#c9b3ff'], pretty: ['#ffe3ec', '#ff9fc0'], spots: ['#ffe9d6', '#ffbf8a'], cafe: ['#f3e6da', '#e0b98f'], homey: ['#fff1c7', '#ffb3cb'], fun: ['#efe6ff', '#9fd2ff'], words: ['#e2f2ff', '#bfe4ff'] };

  // Everyday choices. Hearting one IS the decision; its back shows what it costs.
  var LIFE = [
    { id: 'L.home.studio', group: 'home', emoji: '🛏️', title: 'Cozy studio', fun: 'Small, snug, all yours. Less to clean.', apply: function () { S.home.size = 'studio'; }, on: function () { return S.home.size === 'studio'; }, cost: function () { var r = cUSD(c('rent').studio, 0); return { lo: r.lo, hi: r.hi, what: 'rent a month, asked', src: c('rent').studio.src }; } },
    { id: 'L.home.1bed', group: 'home', emoji: '🛋️', title: '1-bed with a sofa', fun: 'A door to close, and a sofa for movie nights.', apply: function () { S.home.size = '1bed'; }, on: function () { return S.home.size === '1bed'; }, cost: function () { var r = cUSD(c('rent')['1bed'], 0); return { lo: r.lo, hi: r.hi, what: 'rent a month, asked', src: c('rent')['1bed'].src }; } },
    { id: 'L.home.2bed', group: 'home', emoji: '💞', title: 'Room for Bebu', fun: 'A spare room for visits. And a closet for the shoes.', apply: function () { S.home.size = '2bed'; }, on: function () { return S.home.size === '2bed'; }, cost: function () { var r = cUSD(c('rent')['2bed'], 0); return { lo: r.lo, hi: r.hi, what: 'rent a month, asked', src: c('rent')['2bed'].src }; } },
    { id: 'L.food.cook', group: 'food', emoji: '🍳', title: 'Home chef', fun: 'Rice cooker on, paksoi in the pan.', apply: function () { S.food.style = 0.2; S.food.casual = 2; }, on: function () { return S.food.style < 0.5; }, cost: function () { var r = cUSD(c('groceries'), 0.5); return { lo: r.lo, hi: r.hi, what: 'groceries a month', src: c('groceries').src }; } },
    { id: 'L.food.warung', group: 'food', emoji: '🍛', title: 'Warung life', fun: 'Roti on Monday, bami on Tuesday, saoto on Wednesday…', apply: function () { S.food.style = 0.8; S.food.casual = 5; }, on: function () { return S.food.style >= 0.5; }, cost: function () { var r = cUSD(c('mealCasual'), 0.5); return { lo: r.lo, hi: r.hi, what: 'per warung plate', src: c('mealCasual').src }; } },
    { id: 'L.food.both', group: 'food', emoji: '🥘', title: 'A bit of both', fun: 'Cook on weeknights, warung on Fridays.', apply: function () { S.food.style = 0.5; S.food.casual = 3; }, on: function () { return false; }, cost: function () { var r = cUSD(c('groceries'), 0.4); return { lo: r.lo, hi: r.hi, what: 'groceries a month, plus a few warung plates', src: c('groceries').src.concat(c('mealCasual').src) }; } },
    { id: 'L.move.bus', group: 'move', emoji: '🚌', title: 'Bus adventurer', fun: 'Cash in hand, no timetable, music on.', apply: function () { S.around.mode = 'bus'; }, on: function () { return S.around.mode === 'bus'; }, cost: function () { var r = cUSD(c('busMonthly'), 0.5); return { lo: r.lo, hi: r.hi, what: 'a month of commuting', src: c('busMonthly').src }; } },
    { id: 'L.move.mix', group: 'move', emoji: '🚕', title: 'Bus by day, taxi by night', fun: 'The sensible-but-fun combo. Bunny approves.', apply: function () { S.around.mode = 'mix'; S.around.taxi = 3; }, on: function () { return S.around.mode === 'mix'; }, cost: function () { var r = cUSD(c('taxiRide'), 0.5); return { lo: r.lo, hi: r.hi, what: 'per short taxi ride', src: c('taxiRide').src }; } },
    { id: 'L.move.taxi', group: 'move', emoji: '👑', title: 'Taxi princess', fun: 'Door to door, every time. Royalty.', apply: function () { S.around.mode = 'taxi'; S.around.taxi = 8; }, on: function () { return S.around.mode === 'taxi'; }, cost: function () { var r = cUSD(c('taxiRide'), 0.5); return { lo: r.lo, hi: r.hi, what: 'per short taxi ride', src: c('taxiRide').src }; } },
    { id: 'L.cool.fan', group: 'cool', emoji: '🌬️', title: 'Fan girl', fun: 'Windows open, fan on, breeze in.', apply: function () { S.utilT = 0.15; }, on: function () { return S.utilT < 0.3; }, cost: function () { var r = cUSD(c('utilities'), 0.15); return { lo: r.at, hi: r.at, what: 'power and water a month', src: c('utilities').src }; } },
    { id: 'L.cool.ac', group: 'cool', emoji: '❄️', title: 'AC at night', fun: 'Cool sleeps, warm days.', apply: function () { S.utilT = 0.45; }, on: function () { return S.utilT >= 0.3 && S.utilT < 0.7; }, cost: function () { var r = cUSD(c('utilities'), 0.45); return { lo: r.at, hi: r.at, what: 'power and water a month', src: c('utilities').src }; } },
    { id: 'L.cool.arctic', group: 'cool', emoji: '🧊', title: 'Arctic mode', fun: 'Sweater weather indoors. In the tropics.', apply: function () { S.utilT = 0.9; }, on: function () { return S.utilT >= 0.7; }, cost: function () { var r = cUSD(c('utilities'), 0.9); return { lo: r.at, hi: r.at, what: 'power and water a month', src: c('utilities').src }; } },
    { id: 'L.calls.fibre', group: 'calls', emoji: '📡', title: 'Fibre for long calls', fun: 'Hours of video with Bebu and Mama. No freezing faces.', apply: function () { S.connected.fibre = true; S.connected.phone = S.connected.phone || 'telesur'; }, on: function () { return S.connected.fibre === true; }, cost: function () { var f = toUSD(c('fibre').typical || c('fibre').low, c('fibre').cur); return { lo: f, hi: f, what: 'a month, before VAT, 2-year contract', src: c('fibre').src }; } },
    { id: 'L.calls.both', group: 'calls', emoji: '💞', title: 'Fibre and a good phone plan', fun: 'Long calls at home, and Bebu in your pocket everywhere else.', apply: function () { S.connected.fibre = true; S.connected.phone = 'telesur'; }, on: function () { return false; }, cost: function () { var f = toUSD(c('fibre').typical || c('fibre').low, c('fibre').cur), v = c('phone').telesur, u = toUSD(v.typical || v.low, v.cur); return { lo: f + u, hi: f + u, what: 'a month for both, before VAT', src: c('fibre').src.concat(v.src) }; } },
    { id: 'L.calls.data', group: 'calls', emoji: '📱', title: 'Phone data only', fun: 'Light and free. Calls from anywhere.', apply: function () { S.connected.fibre = false; S.connected.phone = 'dataonly'; }, on: function () { return S.connected.fibre === false; }, cost: function () { var v = c('phone').dataonly; var u = toUSD(v.typical || v.low, v.cur); return { lo: u, hi: u, what: 'a month of data', src: v.src }; } }
  ];
  var LIFE_BY = {};
  LIFE.forEach(function (l) {
    var applyState = l.apply;
    // A pick counts only once she makes it; defaults never show as picked.
    l.apply = function () { applyState(); S.picks = S.picks || {}; S.picks[l.group] = l.id; };
    l.on = function () { return !!(S.picks && S.picks[l.group] === l.id); };
    LIFE_BY[l.id] = l;
  });
  var GROUP_NAMES = { home: 'Home', food: 'Food', move: 'Getting around', cool: 'Keeping cool', calls: 'Calls home' };

  function funIds(prefix) { return (D.fun && D.fun[prefix]) || []; }
  function cardOf(id, row) {
    if (LIFE_BY[id]) { var l = LIFE_BY[id]; return { id: id, row: 'everyday', title: l.title, fun: l.fun, emoji: l.emoji, picked: l.on() }; }
    var it = D.items[id];
    if (!it) return null;
    if (AREA_FUN[id]) return { id: id, row: 'live', title: areaName(id), fun: AREA_FUN[id][1], emoji: AREA_FUN[id][0], picked: S.home.likes.indexOf(id) >= 0 };
    if (row === 'words') return { id: id, row: 'words', title: it.label, fun: (it.value || '').split(/[;.]/)[0], emoji: '💬', picked: !!(S.hearts && S.hearts[id]) };
    return { id: id, row: row, title: it.label, fun: it.fun || it.notes || '', emoji: { eat: '🍽️', see: '📍', weekend: '🛶', hobby: '🎨', pretty: '💅', spots: '🍛', cafe: '☕', homey: '🍜', fun: '🎉' }[row] || '✨', image: it.image, picked: !!(S.hearts && S.hearts[id]) };
  }
  function hearted(id) { return LIFE_BY[id] ? LIFE_BY[id].on() : AREA_FUN[id] ? S.home.likes.indexOf(id) >= 0 : !!(S.hearts && S.hearts[id]); }
  function toggleHeart(id) {
    S.hearts = S.hearts || {};
    if (LIFE_BY[id]) { LIFE_BY[id].apply(); }
    else if (AREA_FUN[id]) { var i = S.home.likes.indexOf(id); if (i >= 0) S.home.likes.splice(i, 1); else S.home.likes.push(id); }
    else S.hearts[id] = !S.hearts[id];
    save();
  }

  function pcard(card) {
    var bg = BG[card.row] || BG.everyday;
    var art = card.image
      ? '<img src="' + esc(card.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
      : '<span class="pc-emoji" aria-hidden="true">' + card.emoji + '</span>';
    return '<div class="pcard' + (card.picked ? ' picked' : '') + '"><button type="button" class="pcard-open" data-card="' + esc(card.id) + '" data-row="' + card.row + '">' +
      '<span class="pcard-art" style="background:linear-gradient(135deg,' + bg[0] + ',' + bg[1] + ')">' + art + '</span>' +
      '<span class="pcard-body"><b>' + esc(card.title) + '</b><span>' + esc(card.fun) + '</span></span></button>' +
      '<button type="button" class="pcard-heart" data-heart="' + esc(card.id) + '" aria-pressed="' + card.picked + '" aria-label="' + (card.picked ? 'Unheart ' : 'Heart ') + esc(card.title) + '">' + (card.picked ? '♥' : '♡') + '</button></div>';
  }
  function rail(cards) {
    return '<div class="rail-wrap at-start"><button type="button" class="rail-arrow prev" data-rail="-1" aria-label="Scroll back">‹</button>' +
      '<div class="rail">' + cards + '</div><button type="button" class="rail-arrow next" data-rail="1" aria-label="Scroll on">›</button></div>';
  }
  // Rows drift slowly on their own to show there's more. They stop while touched,
  // stay still for a while after, and never move with reduced motion.
  var drifting = [], driftOn = false;
  function driftLoop(prev) {
    var now = performance.now(), dt = Math.min(64, now - (prev || now));
    drifting = drifting.filter(function (r) { return document.body.contains(r); });
    drifting.forEach(function (r) {
      if (!r._visible || now < (r._pauseUntil || 0) || r.scrollWidth <= r.clientWidth + 4) return;
      if (r.style.scrollSnapType !== 'none') r.style.scrollSnapType = 'none';
      if (r._pos == null) r._pos = r.scrollLeft;
      r._pos += (r._dir || 1) * dt * 0.022;
      var max = r.scrollWidth - r.clientWidth;
      if (r._pos >= max) { r._pos = max; r._dir = -1; r._pauseUntil = now + 1800; }
      if (r._pos <= 0) { r._pos = 0; r._dir = 1; r._pauseUntil = now + 1800; }
      r.scrollLeft = r._pos;
    });
    if (drifting.length) requestAnimationFrame(driftLoop); else driftOn = false;
  }
  var driftSeen = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { e.target._visible = e.isIntersecting; }); }, { threshold: 0.4 }) : null;
  function drift(r) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !driftSeen) return;
    r._pauseUntil = performance.now() + 1500;
    var hold = function () { r._pauseUntil = performance.now() + 6000; r._pos = null; r.style.scrollSnapType = ''; };
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { r.addEventListener(ev, hold, { passive: true }); });
    r.parentNode.querySelectorAll('.rail-arrow').forEach(function (a) { a.addEventListener('click', hold); });
    driftSeen.observe(r);
    drifting.push(r);
    if (!driftOn) { driftOn = true; requestAnimationFrame(driftLoop); }
  }
  function railEnds() {
    document.querySelectorAll('.rail-wrap').forEach(function (w) {
      var r = w.querySelector('.rail');
      var paint = function () {
        w.classList.toggle('at-start', r.scrollLeft < 8);
        w.classList.toggle('at-end', r.scrollLeft + r.clientWidth >= r.scrollWidth - 8);
      };
      if (!r.dataset.wired) {
        r.dataset.wired = '1';
        r.addEventListener('scroll', paint, { passive: true });
        // Click-and-drag with a mouse; touch keeps its own swipe.
        var down = false, startX = 0, startL = 0, moved = false;
        r.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; startX = e.clientX; startL = r.scrollLeft; });
        window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 5) { moved = true; r.classList.add('dragging'); } r.scrollLeft = startL - dx; });
        window.addEventListener('pointerup', function () { if (!down) return; down = false; setTimeout(function () { r.classList.remove('dragging'); }, 0); });
        r.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
        drift(r);
      }
      paint();
    });
  }
  function row(key, title, sub, ids) {
    var cards = ids.map(function (id) { return cardOf(id, key); }).filter(Boolean);
    if (!cards.length) return '';
    return '<section class="row-sec"><div class="row-head"><h2>' + title + '</h2>' + (sub ? '<span class="muted small">' + sub + '</span>' : '') + '</div>' + rail(cards.map(pcard).join('')) + '</section>';
  }

  function renderExplore() {
    var d = daysTo(S.moveDate);
    var n = Object.keys(S.hearts || {}).filter(function (k) { return S.hearts[k]; }).length + S.home.likes.length;
    app.innerHTML = '<section class="hero explore-hero">' + bunny('bunny-big', 'happy', 'shades', d > 0 ? d + ' sleeps until Paramaribo! Kaya nato ni.' : 'You made it! Amping, Bunny.') +
      '<h1>Bunny goes to Paramaribo</h1><p><button type="button" class="src" data-hello="1">What is this?</button> Look around. Heart what makes you smile. Bunny keeps the boring maths on the back of every card.</p>' +
      '<div class="btn-row"><a class="btn btn-pink" href="#/play">Play this or that</a><a class="btn btn-ghost" href="#/mine">My Paramaribo' + (n ? ' · ' + n + ' ♥' : '') + '</a></div></section>' +
      notesHTML('welcome') +
      row('live', 'Where you could live', 'Heart the ones you like', D.areas) +
      row('everyday', 'Pick your everyday', 'One per group. Flip for the cost', LIFE.map(function (l) { return l.id; })) +
      row('eat', 'What you\'ll eat', 'Lami!', funIds('X1')) +
      row('spots', 'Where to eat', 'Real places, real plates', funIds('X6')) +
      row('cafe', 'Coffee and sweet things', 'Merienda o\'clock', funIds('X7')) +
      row('homey', 'Tastes of home', 'When you miss Mama\'s cooking', funIds('X8')) +
      row('see', 'Places to see', '', funIds('X2')) +
      row('weekend', 'Weekend adventures', '', funIds('X3')) +
      row('hobby', 'Things to do and people to meet', '', funIds('X4')) +
      row('pretty', 'Pretty and cute', 'For the pretty fund', funIds('X5')) +
      row('fun', 'Fun times', 'Evenings, weekends and your first Christmas', funIds('X9')) +
      row('words', 'Words to know', 'Tap Bunny too', D.phrases) +
      (funIds('X1').length ? '' : '<div class="note note-sky">More rows are coming: food, places, weekends and pretty things are still being researched.</div>');
  }

  function openCard(id, row) {
    var card = cardOf(id, row);
    if (!card) return;
    var it = D.items[id], life = LIFE_BY[id];
    var back = '';
    if (life) {
      var cst = life.cost();
      var others = LIFE.filter(function (l) { return l.group === life.group; });
      back = '<p class="big-num">' + range(cst.lo, cst.hi) + '</p><p class="small muted">' + esc(cst.what) + '</p>' +
        '<p class="small">Other ' + GROUP_NAMES[life.group].toLowerCase() + ' options: ' + others.filter(function (o) { return o.id !== id; }).map(function (o) { var oc = o.cost(); return esc(o.title) + ' (' + range(oc.lo, oc.hi) + ')'; }).join(', ') + '.</p>' +
        '<p class="tiny">' + srcBtn(cst.src, 'where these numbers come from') + '</p>';
    } else if (it) {
      var nums = it.low != null || it.high != null ? '<p class="big-num">' + range(toUSD(it.low != null ? it.low : it.high, it.currency || 'USD'), toUSD(it.high != null ? it.high : it.low, it.currency || 'USD')) + '</p><p class="small muted">' + esc(it.unit || '') + '</p>' : '';
      var rent = AREA_FUN[id] ? '<p class="small">Rents city-wide: a 1-bed is asked at ' + range(cUSD(c('rent')['1bed'], 0).lo, cUSD(c('rent')['1bed'], 0).hi) + '. No source gives rents by area yet.</p>' : '';
      var full = it.value && typeof it.value === 'string' ? it.value : '';
      var tip = it.notes && it.notes !== card.fun ? it.notes : '';
      back = nums + (tip ? '<div class="note note-green"><b>Bunny\'s tip:</b> ' + esc(tip) + '</div>' : '') + rent +
        (full ? (full.length > 220 ? '<details class="more"><summary>Read the research</summary><p class="small">' + esc(full) + '</p></details>' : '<p class="small">' + esc(full) + '</p>') : '') +
        (it.limits ? '<p class="tiny muted">Limits: ' + esc(it.limits) + '</p>' : '') + '<p class="tiny">' + tagConf(it.confidence) + ' ' + srcBtn([id], 'source and date') + '</p>' +
        (it.imageCredit ? '<p class="tiny muted">Photo: ' + esc(it.imageCredit) + (it.imagePage ? ' · <a href="' + esc(it.imagePage) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' : '') + '</p>' : '');
    }
    var bg = BG[card.row] || BG.everyday;
    showSheet('<div class="flip" data-flipped="false">' +
      '<div class="flip-front"><div class="sheet-art" style="background:linear-gradient(135deg,' + bg[0] + ',' + bg[1] + ')">' + (card.image ? '<img src="' + esc(card.image) + '" alt="" referrerpolicy="no-referrer">' : '<span class="pc-emoji big">' + card.emoji + '</span>') + '</div>' +
      '<h2 id="sheet-title">' + esc(card.title) + '</h2><p class="pc-hand" style="font-size:24px">' + esc(card.fun) + '</p>' +
      '<div class="btn-row"><button type="button" class="btn btn-pink" data-heart="' + esc(id) + '" data-in-sheet="1">' + (card.picked ? '♥ ' + (life ? 'Picked' : 'Hearted') : '♡ ' + (life ? 'Pick this' : 'Heart it')) + '</button><button type="button" class="btn btn-ghost" data-flip="1">Realistic? ↻</button></div></div>' +
      '<div class="flip-back"><p class="step-kicker">The realistic side</p><h2>' + esc(card.title) + '</h2>' + back + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-small" data-flip="1">↻ Back to the fun side</button></div></div>' +
      '</div>');
    sheet.dataset.card = id; sheet.dataset.row = row;
  }

  /* ---------- this or that ---------- */
  var ROUNDS = [
    { q: 'Your nest?', opts: ['L.home.studio', 'L.home.1bed', 'L.home.2bed'] },
    { q: 'Dinner tonight?', opts: ['L.food.cook', 'L.food.both', 'L.food.warung'] },
    { q: 'Getting to work?', opts: ['L.move.bus', 'L.move.mix', 'L.move.taxi'] },
    { q: 'Bedtime?', opts: ['L.cool.fan', 'L.cool.ac', 'L.cool.arctic'] },
    { q: 'Calls home?', opts: ['L.calls.data', 'L.calls.both', 'L.calls.fibre'] },
    { q: 'Your street?', opts: ['E1.area.centrum', 'E1.area.zuid-hermitage', 'E1.area.noord'] },
    { q: 'Payday treat?', opts: ['T.pretty', 'T.cushion', 'T.padala'] },
    { q: 'Sunday?', opts: ['T.city', 'T.cozy', 'T.jungle'] }
  ];
  var TREATS = {
    'T.pretty': { emoji: '💅', title: 'Pretty fund first', fun: 'Nails, hair, conditioner. Protected.', apply: function () { S.buckets.pretty = Math.max(S.buckets.pretty, 60); } },
    'T.padala': { emoji: '💌', title: 'Padala first', fun: 'Send some home before anything else.', apply: function () { S.buckets.home = Math.max(S.buckets.home, 150); } },
    'T.cushion': { emoji: '🛟', title: 'Escape pod first', fun: 'A little cushion, then everything else feels lighter.', apply: function () { S.buckets.emergency = Math.max(S.buckets.emergency, 50); } },
    'T.cozy': { emoji: '🛋️', title: 'Couch and a good drama', fun: 'Aircon, snacks, three episodes. Zero regrets.', apply: function () { S.vibe = 'cozy'; } },
    'T.city': { emoji: '🏛️', title: 'Wander the old city', fun: 'Wooden houses, the river, a cold drink.', apply: function () { S.vibe = 'city'; } },
    'T.jungle': { emoji: '🛶', title: 'River and jungle', fun: 'Boats, dolphins, green as far as you can see.', apply: function () { S.vibe = 'jungle'; } }
  };
  function choiceCard(id, i) {
    var t = TREATS[id], card = t ? { title: t.title, fun: t.fun, emoji: t.emoji, row: ['everyday', 'pretty', 'see'][i % 3] } : cardOf(id);
    var bg = BG[card.row] || BG.everyday;
    return '<button type="button" class="tot" data-pick="' + esc(id) + '"><span class="tot-art" style="background:linear-gradient(160deg,' + bg[0] + ',' + bg[1] + ')"><span class="pc-emoji big">' + card.emoji + '</span></span><b>' + esc(card.title) + '</b><span>' + esc(card.fun) + '</span></button>';
  }
  function renderPlay(n) {
    if (n > ROUNDS.length) return renderMatch();
    var r = ROUNDS[n - 1];
    var dots = ROUNDS.map(function (_, i) { return '<span class="' + (i + 1 < n ? 'done' : i + 1 === n ? 'on' : '') + '"></span>'; }).join('');
    app.innerHTML = '<section class="play"><div class="hops" aria-hidden="true">' + dots + '</div><p class="step-kicker" style="text-align:center">This or that · round ' + n + '</p><h1 class="play-q">' + r.q + '</h1>' +
      '<p class="play-sub">Pick the one that feels most like you. Nothing is final, and you can change it any time.</p>' +
      '<div class="tot-trio">' + r.opts.map(choiceCard).join('') + '</div>' +
      '<div class="btn-row"><a class="skip-link" href="#/play/' + (n + 1) + '">I DUNNO BEBU!!! &gt; Skip</a></div>' + notesHTML('play-' + n) + '</section>';
  }
  function pick(id, btn) {
    if (TREATS[id]) TREATS[id].apply(); else if (LIFE_BY[id]) LIFE_BY[id].apply(); else if (AREA_FUN[id] && S.home.likes.indexOf(id) < 0) S.home.likes.push(id);
    S.played = true; save();
    var m = location.hash.match(/#\/play\/(\d+)/), n = m ? Number(m[1]) : 1;
    if (btn) { btn.classList.add('chosen'); var other = btn.parentNode.querySelectorAll('.tot'); other.forEach(function (o) { if (o !== btn) o.classList.add('gone'); }); }
    setTimeout(function () { location.hash = '#/play/' + (n + 1); }, 380);
  }
  function renderMatch() {
    var picks = LIFE.filter(function (l) { return l.on(); });
    app.innerHTML = '<section class="hero match">' + bunny('bunny-big', 'happy', 'suitcase', 'It\'s a match! Bunny ♥ Paramaribo.') +
      '<h1>Your Paramaribo is ready</h1><p>Here\'s what you picked. Everything can change, any time.</p>' +
      '<div class="pick-chips">' + picks.map(function (l) { return '<span class="pick-chip">' + l.emoji + ' ' + esc(l.title) + '</span>'; }).join('') + S.home.likes.map(function (id) { return '<span class="pick-chip">' + AREA_FUN[id][0] + ' ' + esc(areaName(id)) + '</span>'; }).join('') + '</div>' +
      '<div class="btn-row"><a class="btn btn-pink" href="#/mine">See my Paramaribo</a><a class="btn btn-ghost" href="#/postcard">Send Bebu a postcard</a></div></section>' + notesHTML('match');
    confetti();
  }

  /* ---------- my paramaribo ---------- */
  function renderMine() {
    var picks = LIFE.filter(function (l) { return l.on(); });
    var hearts = Object.keys(S.hearts || {}).filter(function (k) { return S.hearts[k] && D.items[k]; });
    var L = monthly(), spend = L.reduce(function (a, l) { return a + (l.usd || 0); }, 0);
    var groups = Object.keys(GROUP_NAMES).map(function (g) {
      var on = LIFE.filter(function (l) { return l.group === g && l.on(); })[0];
      return '<button type="button" class="mine-pick' + (on ? '' : ' empty') + '" data-card="' + (on ? on.id : LIFE.filter(function (l) { return l.group === g; })[0].id) + '" data-row="everyday"><span class="pc-emoji">' + (on ? on.emoji : '❔') + '</span><span><small>' + GROUP_NAMES[g] + '</small><b>' + (on ? esc(on.title) : 'Not picked yet') + '</b></span></button>';
    }).join('');
    var areas = S.home.likes.map(function (id) { return cardOf(id, 'live'); });
    var hc = hearts.map(function (id) { var it = D.items[id]; var rowKey = /^X1/.test(id) ? 'eat' : /^X2/.test(id) ? 'see' : /^X3/.test(id) ? 'weekend' : /^X4/.test(id) ? 'hobby' : /^X5/.test(id) ? 'pretty' : /^X6/.test(id) ? 'spots' : /^X7/.test(id) ? 'cafe' : /^X8/.test(id) ? 'homey' : /^X9/.test(id) ? 'fun' : 'words'; return cardOf(id, rowKey); }).filter(Boolean);
    app.innerHTML = '<section class="hero">' + bunny('bunny-big', 'happy', 'heart', picks.length ? 'Look at you, building a whole life.' : 'Nothing picked yet. Play this or that?') + '<h1>My Paramaribo</h1></section>' +
      '<div class="card"><h2>My everyday</h2><div class="mine-grid">' + groups + '</div></div>' +
      (areas.length ? '<section class="row-sec"><div class="row-head"><h2>Streets I like</h2></div>' + rail(areas.map(pcard).join('')) + '</section>' : '') +
      (hc.length ? '<section class="row-sec"><div class="row-head"><h2>Things I hearted</h2></div>' + rail(hc.map(pcard).join('')) + '</section>' : '') +
      '<div class="card real-teaser"><div class="spread"><div><p class="step-kicker">When you want the realistic part</p><h2>About ' + money(spend) + ' a month to live</h2><p class="small muted">A picture, not a promise: from your picks and the research. Rent and salary sharpen it.</p></div></div>' +
      '<div class="btn-row" style="justify-content:flex-start"><a class="btn btn-pink btn-small" href="#/real">Make it real</a><a class="btn btn-ghost btn-small" href="#/postcard">Postcard to Bebu</a><a class="btn btn-ghost btn-small" href="#/play">Play again</a></div></div>' +
      notesHTML('mine') + linkCard();
  }

  function renderReveal() {
    S.built = true; save();
    var L = monthly();
    var spend = L.reduce(function (a, l) { return a + (l.usd || 0); }, 0);
    var date = new Date(S.moveDate + 'T00:00:00');
    var stampDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    app.innerHTML = '<section class="postcard-wrap">' +
      '<div class="postcard front"><div class="pc-sky"></div><div class="pc-title"><span>Greetings from</span><b>Paramaribo</b></div>' + bunny('pc-bunny', 'happy', 'suitcase') + '</div>' +
      '<div class="postcard back"><div class="pc-stamp">' + bunny('stamp-bunny', 'happy') + '<span>SR · 2026</span></div><div class="pc-postmark">PARAMARIBO<br>' + esc(stampDate) + '</div>' +
      '<p class="pc-hand">Dear Bebu,</p><p class="pc-hand">My month here looks like this:</p><ul class="pc-lines">' +
      L.filter(function (l) { return l.usd != null; }).map(function (l) { return '<li><span>' + esc(l.label) + '</span><span>' + money(l.usd) + '</span></li>'; }).join('') +
      '</ul><p class="pc-hand pc-total">About ' + money(spend) + ' to live' + (bucketsUSD() ? ', plus ' + money(bucketsUSD()) + ' for the things I love' : '') + '.</p>' +
      '<p class="pc-hand">Wish you were here. (You will be.)<br>Love, Bunny</p>' +
      '<p class="tiny muted">A first sketch from your picks and the research. Not a forecast.</p></div></section>' +
      '<div class="btn-row"><a class="btn btn-pink" href="#/mine">My Paramaribo</a><a class="btn btn-ghost" href="#/real">Make it real</a></div>' + notesHTML('postcard');
    confetti();
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var bits = ['🥭', '🌺', '🥕', '🌴', '⭐', '💖', '🍍'];
    for (var i = 0; i < 36; i++) {
      var el = document.createElement('span');
      el.className = 'confetti';
      el.textContent = bits[i % bits.length];
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.animationDelay = (Math.random() * 0.8) + 's';
      el.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
      el.style.fontSize = (18 + Math.random() * 18) + 'px';
      document.body.appendChild(el);
      setTimeout(function (e) { return function () { e.remove(); }; }(el), 4800);
    }
  }

  function burst(el) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = el.getBoundingClientRect();
    for (var i = 0; i < 8; i++) {
      var h = document.createElement('span');
      h.className = 'burst'; h.textContent = '♥';
      h.style.left = (r.left + r.width / 2) + 'px'; h.style.top = (r.top + r.height / 2) + 'px';
      h.style.setProperty('--dx', (Math.cos(i / 8 * 6.283) * 46) + 'px'); h.style.setProperty('--dy', (Math.sin(i / 8 * 6.283) * 46) + 'px');
      document.body.appendChild(h);
      setTimeout(function (e) { return function () { e.remove(); }; }(h), 700);
    }
  }

  /* ---------- life view ---------- */
  var CHIPS = [
    ['date', 'Move date', function () { return S.moveDate !== DEFAULT.moveDate; }],
    ['job', 'Job area', function () { return !!S.job.area; }],
    ['salary', 'Salary', function () { return !!S.salary.amount; }],
    ['home', 'Home', function () { return !!S.home.size; }],
    ['areas', 'Areas', function () { return S.home.likes.length > 0; }],
    ['food', 'Food', function () { return true; }],
    ['around', 'Getting around', function () { return !!S.around.mode; }],
    ['connected', 'Connected', function () { return !!S.connected.phone; }],
    ['health', 'Health', function () { return S.health.szf !== 'unknown'; }],
    ['buckets', 'Priorities', function () { return bucketsUSD() > 0; }],
    ['power', 'AC', function () { return true; }]
  ];

  function renderLife() {
    var chips = '<div class="filters"><div class="chips">' + CHIPS.map(function (ch) {
      return '<button type="button" class="chip' + (ch[2]() ? ' set' : '') + '" data-chip="' + ch[0] + '" aria-expanded="' + (openChip === ch[0]) + '">' + ch[1] + '</button>';
    }).join('') + '</div>' + (openChip ? '<div class="drop">' + CONTROLS[openChip]() + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-small" data-chip="' + openChip + '">Done</button></div></div>' : '') + '</div>';
    app.innerHTML = chips + monthCard() + sectionsHTML() + phrasesHTML() + notesHTML('life') +
      '<p class="tiny muted" style="text-align:center;margin-top:20px">' + (LINK ? 'Your picks are saved to your private link.' : 'Your picks are saved in this browser only.') + ' <button type="button" class="src" data-forget="1">Forget my picks</button></p>' + linkCard();
  }

  function monthCard() {
    var net = salaryNet();
    var view = S.view;
    var L = view === 'arrival' ? arrival() : view === 'irregular' ? irregular() : monthly();
    var known = L.reduce(function (a, l) { return a + (l.usd || 0); }, 0);
    var unknowns = L.filter(function (l) { return l.usd == null; }).length;
    var mood = 'happy', verdict = '';
    if (view === 'monthly') {
      if (net) {
        var left = net.usd - bucketsUSD() - known;
        mood = left >= 0 ? 'happy' : 'droop';
        verdict = '<div class="note ' + (left >= 0 ? 'note-green' : 'note-sun') + '"><b>' + (left >= 0 ? 'About ' + money(left) + ' left over each month.' : 'About ' + money(-left) + ' short each month, on these picks.') + '</b> ' +
          (unknowns ? unknowns + ' thing' + (unknowns > 1 ? 's are' : ' is') + ' not known yet, so this will move. ' : '') +
          'Take-home ' + money(net.usd) + (net.taxed ? ' after an estimated ' + money(net.tax) + ' wage tax' : '') + ', minus ' + money(bucketsUSD()) + ' for your priorities.</div>' +
          (left < 0 ? '<p class="small"><b>Some swaps to try</b> (your call):</p><div class="swaps">' + swaps().join('') + '</div>' : '');
      } else {
        mood = 'think';
        verdict = '<div class="note note-sky">This is an illustrative month, not a forecast. Add your salary when the offer lands, and Bunny will show what\'s left over. <button type="button" class="src" data-chip-go="salary">Add salary</button></div>';
      }
    }
    var titles = { monthly: 'My month', arrival: 'Cash for arriving', irregular: 'Now and then' };
    var lead = { monthly: 'What a normal month costs, from your picks.', arrival: 'What you need before the first payday. Some of this the company may cover: ask.', irregular: 'Costs that come up now and then.' };
    var says = view !== 'monthly' ? (view === 'arrival' ? 'Pack some dollars. Not ten thousand of them.' : 'For the oops moments. Bunny has a fund for that.')
      : !net ? 'No salary yet, so this is a picture, not a promise.'
      : mood === 'happy' ? 'Kaya ra! There\'s room left over.' : 'Ay, nahutdan ta. Want to try a swap?';
    return '<div class="card"><div class="month-head">' + bunny('bunny-mid', mood, view === 'arrival' ? 'suitcase' : null, says) + '</div><h2>' + titles[view] + '</h2><p class="small muted">' + lead[view] + '</p>' +
      '<div class="seg" role="group" aria-label="Which money view">' + [['monthly', 'Monthly'], ['arrival', 'Arrival cash'], ['irregular', 'Now and then']].map(function (v) { return '<button type="button" data-view="' + v[0] + '" ' + pressed(view === v[0]) + '>' + v[1] + '</button>'; }).join('') + '</div>' +
      '<ul class="lines">' + L.filter(function (l) { return l.usd != null; }).map(lineHTML).join('') + '</ul>' +
      '<div class="total"><span>' + (unknowns ? 'Known so far' : 'Total') + '</span><span>' + money(known) + '</span></div>' +
      (unknowns ? '<p class="field-label" style="margin-top:14px">Maybe, not added in</p><ul class="lines">' + L.filter(function (l) { return l.usd == null; }).map(lineHTML).join('') + '</ul>' : '') + verdict +
      '<p class="tiny muted">Money shown at ' + D.ratesAsOf + ' rates: 1 USD = ' + D.rates.SRD.toFixed(2) + ' SRD = ' + D.rates.PHP.toFixed(2) + ' PHP. Indicative. ' + srcBtn(D.rateSources) + '</p></div>';
  }

  function lineHTML(l) {
    var amt = l.usd != null ? money(l.usd) : (l.lo != null ? '<span class="muted">' + range(l.lo, l.hi) + '?</span>' : '<span class="muted">?</span>');
    return '<li><span class="what">' + esc(l.label) + ' ' + tag(l.status) + '<small>' + esc(l.life) + (l.hint ? ' · ' + esc(l.hint) : '') + '</small></span><span class="amt">' + amt + '<br>' + srcBtn(l.src) + '</span></li>';
  }

  function swaps() {
    var out = [];
    if (S.home.size === '2bed') out.push('<button type="button" class="pill" data-set="home.size" data-val="1bed" aria-pressed="false">Try a 1-bedroom</button>');
    if (S.home.rentT != null && S.home.rentT > 0.3) out.push('<button type="button" class="pill" data-set="home.rentT" data-val="0.25" aria-pressed="false">A lower rent</button>');
    if (S.connected.fibre) out.push('<button type="button" class="pill" data-set="connected.fibre" data-val="false" aria-pressed="false">Phone data only</button>');
    if (S.around.mode !== 'bus' && S.around.taxi > 2) out.push('<button type="button" class="pill" data-set="around.taxi" data-val="' + Math.max(0, S.around.taxi - 3) + '" aria-pressed="false">Fewer taxis</button>');
    if (S.food.nice > 1) out.push('<button type="button" class="pill" data-set="food.nice" data-val="' + (S.food.nice - 1) + '" aria-pressed="false">One less dinner out</button>');
    if (S.utilT > 0.5) out.push('<button type="button" class="pill" data-set="utilT" data-val="0.35" aria-pressed="false">AC at night only</button>');
    out.push('<button type="button" class="pill" data-chip-go="buckets" aria-pressed="false">Adjust priorities</button>');
    return out;
  }

  function factHTML(id) {
    var it = D.items[id];
    if (!it) return '';
    var body = it.notes || it.value || '';
    return '<div class="fact"><h4>' + esc(it.label) + '</h4><p>' + esc(body) + '</p><p class="tiny muted">' + tagConf(it.confidence) + ' ' + srcBtn([id], 'source and date') + '</p></div>';
  }
  function tagConf(cf) { return '<span class="tag ' + (cf === 'high' ? 'tag-known' : cf === 'medium' ? 'tag-est' : 'tag-unknown') + '">' + (cf || 'unrated') + ' confidence</span>'; }

  function sectionsHTML() {
    return D.sections.filter(function (s) { return s.key !== 'life'; }).map(function (s) {
      return '<details class="sec"><summary>' + esc(s.title) + '</summary><div class="sec-body">' + notesHTML(s.key) + s.ids.map(factHTML).join('') + '</div></details>';
    }).join('');
  }
  function phrasesHTML() {
    return '<details class="sec"><summary>Phrase cards</summary><div class="sec-body"><div class="phrases">' + D.phrases.map(function (id) {
      var it = D.items[id];
      return '<div class="phrase"><b>' + esc(it.label) + '</b><p>' + esc(it.value) + '</p>' + (it.notes ? '<p class="tiny muted">' + esc(it.notes) + '</p>' : '') + '</div>';
    }).join('') + '</div><p class="tiny muted">Sranan pronunciation hints are approximate. ' + srcBtn(D.phrases.slice(0, 1)) + '</p></div></details>';
  }

  /* ---------- briefing ---------- */
  function renderBriefing() {
    var life = D.sections.filter(function (s) { return s.key === 'life'; })[0];
    var health = D.sections.filter(function (s) { return s.key === 'health'; })[0];
    app.innerHTML = '<section class="hero">' + bunny('bunny-big', 'happy', 'umbrella', 'Short rains from December. Bring the umbrella. Tap me for Sranan.') + '<h1>Suriname, in ten minutes</h1><p class="muted">Everything here comes from the research, dated ' + D.research.researchedAt + '. Tap any source.</p></section>' +
      '<div class="card"><h2>The basics</h2>' + ['K1.languages', 'F1.usd.eur.dailyuse', 'K8.timezone', 'K9.plugs.voltage', 'K5.nov.dec.weather', 'K5.packing'].map(factHTML).join('') + '</div>' +
      '<div class="card"><h2>Staying well</h2>' + health.ids.slice(0, 8).map(factHTML).join('') + '</div>' +
      '<div class="card"><h2>Work, church and holidays</h2>' + life.ids.filter(function (i) { return /^K(6|4|3|7)/.test(i); }).map(factHTML).join('') + '</div>' +
      phrasesHTML() + notesHTML('briefing');
  }

  /* ---------- quests ---------- */
  var QUESTS = [
    ['yf', '💉', 'Get the yellow fever shot', 'Bureau of Quarantine, by about 10 Nov'],
    ['hr', '📝', 'Send HR the open questions', 'Salary currency, job location, a pickup'],
    ['sim', '📱', 'Keep the Philippine SIM alive', 'For GCash and bank codes'],
    ['adapter', '🔌', 'Pack a universal adapter', 'Sockets are mostly 127 V'],
    ['powerbank', '🔋', 'Pack a power bank', 'For the power cuts'],
    ['umbrella', '☂️', 'An umbrella that lives in your bag', 'Short rains from December'],
    ['cash', '💵', 'Bring some US dollars', 'Well under USD 10,000'],
    ['numbers', '🚑', 'Save 115, 113 and 110', 'Police, ambulance, fire'],
    ['embassy', '🇵🇭', 'Save the Brasília embassy number', 'There\'s no PH embassy in Suriname'],
    ['phrases', '💬', 'Learn five phrases', 'Odi, grantangi, dank u…'],
    ['stay', '🏨', 'Sort the first two weeks\' stay', 'Ask HR first'],
    ['viewing', '🔑', 'Never pay rent before a viewing', 'Fake landlords exist']
  ];
  var STICKERS = ['🐰', '🌺', '⭐', '🥭', '🌴', '🎉', '💖', '🌈', '🍍', '🦋', '🌻', '🍀'];
  function flySticker(btn, q) {
    var i = QUESTS.map(function (x) { return x[0]; }).indexOf(q);
    var target = btn.querySelector('.sticker').getBoundingClientRect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { route(); return; }
    var el = document.createElement('span');
    el.className = 'flying';
    el.textContent = STICKERS[i % STICKERS.length];
    el.style.left = (window.innerWidth / 2 - 30) + 'px';
    el.style.top = (window.innerHeight / 2 - 30) + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transform = 'translate(' + (target.left + target.width / 2 - window.innerWidth / 2) + 'px,' + (target.top + target.height / 2 - window.innerHeight / 2) + 'px) scale(.45) rotate(380deg)';
      });
    });
    setTimeout(function () { el.remove(); route(); }, 750);
  }
  function renderQuests() {
    var done = QUESTS.filter(function (q) { return S.quests[q[0]]; }).length;
    app.innerHTML = '<section class="hero">' + bunny('bunny-big', done === QUESTS.length ? 'happy' : 'think', done === QUESTS.length ? 'suitcase' : null, done === QUESTS.length ? 'Every sticker! Ready to fly.' : done ? done + ' stickers! Bunny is proud.' : "Stickers are waiting. Tap a quest when it's done.") + '<h1>Moving quests</h1><p class="muted">' + (QUESTS.length - done) + ' to go. Tap one when it\'s done, and get a sticker.</p></section>' +
      QUESTS.map(function (q, i) {
        var d = !!S.quests[q[0]];
        return '<button type="button" class="quest" data-quest="' + q[0] + '" ' + pressed(d) + '><span class="sticker">' + (d ? STICKERS[i % STICKERS.length] : q[1]) + '</span><span><b>' + esc(q[2]) + '</b><small>' + esc(q[3]) + '</small></span></button>';
      }).join('') + notesHTML('quests');
  }

  /* ---------- open questions ---------- */
  function renderOpen() {
    var R = D.research, T = D.toronto;
    var drawer = '<details class="sec"><summary>What the research found</summary><div class="sec-body">' +
      '<p class="small">Researched <b>' + R.researchedAt + '</b>. ' + R.totalItems + ' facts, each with a source and a date. ' + R.gapLines + ' gaps are still open. Prices and rates go stale on ' + R.reviewBy + '.</p>' +
      '<div class="drawer-grid">' + R.groups.map(function (g) {
        return '<div class="rg"><h4>' + esc(g.title) + '</h4><p class="small">' + esc(g.summary) + '</p><p class="counts">' + (g.items || 0) + ' facts · ' + (g.high || 0) + ' high, ' + (g.medium || 0) + ' medium, ' + (g.low || 0) + ' low confidence</p></div>';
      }).join('') + '</div></div></details>';
    var tor = torontoHTML();
    var qs = '<div class="card"><h2>Still open</h2><p class="small muted">Answers to these sharpen everything above. Nothing here is a guess.</p><ul class="lines">' + D.openQuestions.map(function (q) {
      return '<li><span class="what">' + esc(q.q) + '</span><span class="who">' + esc(q.who) + '</span></li>';
    }).join('') + '</ul></div>';
    app.innerHTML = '<section class="hero">' + bunny('bunny-big', 'think', null, "Things Bunny doesn't know yet. Nobody does. That's fine.") + '<h1>Open questions</h1><p class="muted">What\'s still being worked out, the Toronto option, and what the research found.</p></section>' + qs + tor + drawer + notesHTML('open');
  }

  function torontoHTML() {
    var T = D.toronto, st = S.toronto;
    var tMap = { coat: 'coatT', fun: 'funT', fare: 'fareT' };
    var total = 0, unknown = false;
    var rows = T.costs.map(function (cst) {
      var link = cst.url ? ' <a href="' + esc(cst.url) + '" target="_blank" rel="noopener">source</a>' : '';
      if (cst.unknown) {
        unknown = true;
        return '<li><span class="what">' + esc(cst.label) + ' ' + tag('unknown') + '<small>' + esc(cst.note) + link + '</small></span><span class="amt">' + range(toUSD(cst.low, cst.cur), toUSD(cst.high, cst.cur)) + '<br><span class="tiny muted">not added in</span></span></li>';
      }
      var t = tMap[cst.key] ? st[tMap[cst.key]] : 0;
      var v = cst.low + (cst.high - cst.low) * t;
      var usd = toUSD(v, cst.cur);
      total += usd;
      var slider = tMap[cst.key] ? '<div class="slider"><input type="range" min="0" max="100" value="' + Math.round(t * 100) + '" data-bind="toronto.' + tMap[cst.key] + '" data-range="1" aria-label="' + esc(cst.label) + '"></div>' : '';
      return '<li><span class="what">' + esc(cst.label) + ' ' + tag(cst.estimate ? 'est' : 'known') + '<small>' + esc(cst.note) + link + '</small>' + slider + '</span><span class="amt">' + money(usd) + '<br><span class="tiny muted">CA$' + Math.round(v) + '</span></span></li>';
    }).join('');
    var share = st.share;
    return '<div class="card"><h2>The Toronto option</h2><p class="small">' + esc(T.summary) + '</p>' +
      '<p class="field-label">Steps</p><ol class="small">' + T.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="field-label">Budget</p><ul class="lines">' + rows + '</ul>' +
      '<div class="total"><span>' + (unknown ? 'Known so far' : 'Toronto total') + '</span><span>' + money(total) + '</span></div>' +
      (unknown ? '<p class="tiny muted">Plus the airfare difference, once the employer quotes a multi-city ticket.</p>' : '') +
      '<div class="field"><span class="field-label">Sharing it</span><div class="slider"><input type="range" min="0" max="100" step="5" value="' + share + '" data-bind="toronto.share" data-int="1" aria-label="Bebu\'s share"></div>' +
      '<div class="share-split"><span>Bebu ' + money(total * share / 100) + '</span><span>Bunny ' + money(total * (100 - share) / 100) + '</span></div></div>' +
      '<p class="tiny muted">Researched ' + T.researchedAt + '. Not immigration advice: IRCC, the airline and the employer have the final say.</p></div>';
  }

  /* ---------- Bebu notes (from the server only; none ship in the code) ---------- */
  var NOTES = [];
  function loadNotes() {
    if (!LINK) return Promise.resolve();
    return fetch('api/notes', { headers: keyed(), credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (j) { NOTES = Array.isArray(j) ? j : (j.notes || []); }).catch(function () { NOTES = []; });
  }
  // Writing mode for Bebu: open the site with ?bebu=edit. Every spot a note can live shows a
  // "+ Bebu note" button; drafts stay in this browser until "Copy for CC" packages them up.
  var EDIT = /[?&]bebu=edit\b/.test(location.search);
  var DKEY = 'bunny-goes-bebu-drafts';
  var DRAFTS = {};
  try { DRAFTS = JSON.parse(localStorage.getItem(DKEY) || '{}') || {}; } catch (e) {}
  function saveDrafts() { try { localStorage.setItem(DKEY, JSON.stringify(DRAFTS)); } catch (e) {} paintEditBar(); }
  var SPOT_NAMES = { welcome: 'Explore', mine: 'My Paramaribo', life: 'Make it real', home: 'Home and neighbourhoods', money: 'Money and banking', connected: 'Getting connected', around: 'Getting around', health: 'Health and safety', papers: 'Papers', briefing: 'the Suriname briefing', quests: 'Quests', open: 'Open questions' };
  var SPOTS = [['hello', '#/'], ['welcome', '#/']].concat([1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return ['play-' + n, '#/play/' + n]; }))
    .concat([['match', '#/play/9'], ['mine', '#/mine'], ['postcard', '#/postcard'], ['life', '#/real'], ['home', '#/real'], ['money', '#/real'], ['connected', '#/real'], ['around', '#/real'], ['health', '#/real'], ['papers', '#/real'], ['briefing', '#/briefing'], ['quests', '#/quests'], ['open', '#/open']]);
  SPOT_NAMES.hello = 'the welcome pop-up'; SPOT_NAMES.match = 'the match screen'; SPOT_NAMES.postcard = 'the postcard';
  function spotName(w) { var m = w.match(/^play-(\d+)$/); return m ? 'This or that, round ' + m[1] + (ROUNDS[m[1] - 1] ? ' (' + ROUNDS[m[1] - 1].q + ')' : '') : (SPOT_NAMES[w] || w); }
  var spotAt = -1;
  function goSpot(i) {
    spotAt = (i + SPOTS.length) % SPOTS.length;
    var sp = SPOTS[spotAt];
    sheet.hidden = true;
    if (location.hash === sp[1] || (sp[1] === '#/' && !location.hash)) route(); else location.hash = sp[1];
    setTimeout(function () {
      if (sp[0] === 'hello') showHello();
      var el = document.querySelector('[data-bebu-edit="' + sp[0] + '"]');
      if (!el) return;
      var d = el.closest('details'); if (d) d.open = true;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('spot-pulse'); void el.offsetWidth; el.classList.add('spot-pulse');
    }, 150);
    paintEditBar();
  }
  function foundCount() { return NOTES.filter(function (n, i) { return S.found && S.found[n.where + ':' + i]; }).length; }
  function notesHTML(where) {
    if (EDIT) {
      var has = DRAFTS[where];
      return '<div class="row" style="justify-content:flex-end;margin:6px 0"><button type="button" class="pill" data-bebu-edit="' + esc(where) + '" style="border-style:dashed">' + (has ? '♥ Edit Bebu note' : '+ Bebu note here') + '</button></div>';
    }
    var out = '';
    NOTES.forEach(function (n, i) {
      if (n.where !== where) return;
      var k = where + ':' + i, got = S.found && S.found[k];
      out += '<button type="button" class="carrot' + (got ? ' got' : '') + '" data-note="' + esc(k) + '" aria-label="' + (got ? 'A note from Bebu' : 'A hidden carrot') + '">🥕</button>';
    });
    return out ? '<div class="row" style="justify-content:flex-end">' + out + '</div>' : '';
  }
  function openDraft(where) {
    showSheet('<h2 id="sheet-title">A note for ' + esc(spotName(where)) + '</h2><p class="tiny muted">Bunny finds this as a little heart here. Saved in this browser only.</p>' +
      '<textarea id="bebu-text" class="input" rows="6" style="resize:vertical">' + esc(DRAFTS[where] || '') + '</textarea>' +
      '<div class="btn-row"><button type="button" class="btn btn-pink btn-small" data-bebu-save="' + esc(where) + '">Save note</button>' +
      (DRAFTS[where] ? '<button type="button" class="btn btn-ghost btn-small" data-bebu-del="' + esc(where) + '">Remove</button>' : '') + '</div>');
    setTimeout(function () { var t = document.getElementById('bebu-text'); if (t) t.focus(); }, 50);
  }
  function draftsText() {
    var keys = Object.keys(DRAFTS).filter(function (k) { return (DRAFTS[k] || '').trim(); });
    return 'BUNNY GOES · Bebu notes · ' + new Date().toISOString().slice(0, 10) + '\n' +
      JSON.stringify(keys.map(function (k) { return { where: k, spot: spotName(k), text: DRAFTS[k].trim() }; }), null, 2);
  }
  var editBar = null;
  function bebuButtons() {
    return '<span class="row" style="gap:6px">' + (BEBU_LINK ? '<button type="button" class="btn btn-pink btn-small" data-bebu-publish="1">Publish</button>' : '') +
      '<button type="button" class="btn ' + (BEBU_LINK ? 'btn-ghost' : 'btn-pink') + ' btn-small" data-bebu-copy="1">Copy for CC</button></span>';
  }
  function paintEditBar() {
    if (!EDIT) return;
    if (!editBar) {
      editBar = document.createElement('div');
      editBar.setAttribute('style', 'position:fixed;left:12px;right:12px;bottom:12px;z-index:40;display:flex;gap:8px;align-items:center;justify-content:space-between;background:var(--ink);color:var(--bg);border-radius:20px;padding:10px 12px 10px 16px;box-shadow:var(--shadow);max-width:600px;margin:0 auto;flex-wrap:wrap');
      document.body.appendChild(editBar);
    }
    var n = Object.keys(DRAFTS).filter(function (k) { return (DRAFTS[k] || '').trim(); }).length;
    editBar.innerHTML = '<span class="small"><b>Bebu mode</b> · ' + n + ' note' + (n === 1 ? '' : 's') + (spotAt >= 0 ? '<br><span class="tiny">Spot ' + (spotAt + 1) + ' of ' + SPOTS.length + ': ' + esc(spotName(SPOTS[spotAt][0])) + '</span>' : '') + '</span>' +
      '<span class="row" style="gap:6px"><button type="button" class="btn btn-ghost btn-small" data-bebu-spots="1">Spots</button><button type="button" class="btn btn-ghost btn-small" data-bebu-next="1">Next ›</button>' + bebuButtons() + '</span>';
  }

  /* ---------- hello: the first-visit welcome ---------- */
  var HELLO_KEY = 'bunny-goes-hello-seen';
  function showHello() {
    var note = NOTES.filter(function (n) { return n.where === 'hello'; })[0];
    showSheet('<div class="hello">' + bunny('bunny-hello', 'happy', 'shades+wave') +
      '<h2 id="sheet-title">Welcome to Bunny Goes</h2>' +
      (note ? '<div class="hello-note"><span class="step-kicker">A note from Bebu</span><p class="pc-hand">' + esc(note.text) + '</p></div>' : '') +
      '<p>Bunny Goes is your little guide to life in Paramaribo. Food, streets, weekend trips and pretty things to fall in love with, built on real research, with every number traceable to where it came from. The boring maths lives on the back of each card, for when you want it.</p>' +
      '<ul class="hello-steps"><li><b>Explore:</b> swipe the rows and heart what makes you smile.</li>' +
      '<li><b>This or that:</b> eight quick rounds so Bunny learns what you like. "I DUNNO BEBU" is always allowed.</li>' +
      '<li><b>My Paramaribo:</b> your picks in one place, with the realistic stuff one tap away.</li></ul>' +
      '<div class="btn-row"><a class="btn btn-pink" href="#/play" data-close>Go dream up your dream</a></div>' +
      (LINK ? '<p class="tiny muted" style="text-align:center">This page opened from your private link, which is your key. <button type="button" class="src" data-copy-link="1">Copy it</button> and keep it safe.</p>' : '') +
      notesHTML('hello') + '</div>');
    try { localStorage.setItem(HELLO_KEY, '1'); } catch (e) {}
  }

  /* ---------- sources sheet ---------- */
  var sheet = document.getElementById('sheet'), sheetBody = document.getElementById('sheet-body');
  function openSources(ids) {
    var html = '<h2 id="sheet-title">Where this comes from</h2>' + ids.map(function (id) {
      var it = D.items[id];
      if (!it) return '';
      var nums = it.low != null || it.high != null || it.typical != null ? '<p><b>' + [it.low, it.typical, it.high].map(function (x) { return x == null ? '–' : x; }).join(' / ') + '</b> ' + esc(it.currency || '') + ' ' + esc(it.unit || '') + ' <span class="tiny muted">(low / typical / high)</span></p>' : '';
      return '<div class="srcitem"><h3>' + esc(it.label) + '</h3>' + nums + (it.value && !nums ? '<p>' + esc(it.value) + '</p>' : '') +
        '<p class="tiny">' + tagConf(it.confidence) + ' · as of ' + esc(it.asOf || '?') + (it.kind ? ' · ' + esc(it.kind) : '') + (it.scope ? ' · ' + esc(it.scope) : '') + '</p>' +
        (it.limits ? '<p class="tiny muted">Limits: ' + esc(it.limits) + '</p>' : '') +
        (it.conflicts && it.conflicts.length ? '<p class="tiny"><b>Sources disagree:</b> ' + it.conflicts.map(function (cf) { return esc(typeof cf === 'string' ? cf : [cf.value, cf.source, cf.date].filter(Boolean).join(', ')); }).join('; ') + '</p>' : '') +
        (it.sources || []).map(function (s) { return '<p class="tiny">' + esc(s.publisher || '') + (s.published ? ', ' + esc(s.published) : '') + ' · read ' + esc(s.read || '') + '<br><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></p>'; }).join('') + '</div>';
    }).join('');
    showSheet(html);
  }
  function showSheet(html) { sheetBody.innerHTML = html; sheet.hidden = false; }
  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) sheet.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sheet.hidden = true; });

  /* ---------- events ---------- */
  function setPath(path, val) {
    var parts = path.split('.'), o = S;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = val;
  }
  function getPath(path) { return path.split('.').reduce(function (o, k) { return o[k]; }, S); }
  function parseVal(v) { return v === 'true' ? true : v === 'false' ? false : v === '' ? null : (/^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.hello) { showHello(); return; }
    if (t.dataset.fs) {
      var fs = 0; try { fs = Number(localStorage.getItem('bunny-goes-fs') || 0); } catch (e) {}
      fs = Math.max(-8, fs + Number(t.dataset.fs));
      document.documentElement.style.setProperty('--fs-zoom', String((16 + fs) / 16));
      try { localStorage.setItem('bunny-goes-fs', String(fs)); } catch (e) {}
      return;
    }
    if (t.dataset.themeToggle) {
      var root = document.documentElement, cur = root.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('bunny-goes-theme', dark ? 'light' : 'dark'); } catch (e) {}
      return;
    }
    if (t.dataset.cur) { S.cur = t.dataset.cur; save(); paintCur(); route(); return; }
    if (t.dataset.rail) {
      // Step whole cards, so scroll-snap agrees with where we're going.
      var rr = t.parentNode.querySelector('.rail'), card = rr.querySelector('.pcard');
      var step = card ? card.getBoundingClientRect().width + 12 : 180, per = Math.max(1, Math.floor(rr.clientWidth / step));
      var target = Math.max(0, Math.min(rr.scrollWidth - rr.clientWidth, Math.round(rr.scrollLeft / step + Number(t.dataset.rail) * per) * step));
      // Animated by hand: smooth scrollTo stalls inside a zoomed page.
      rr.style.scrollSnapType = 'none';
      var from = rr.scrollLeft, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380;
      var stepFn = function (now) {
        var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
        rr.scrollLeft = from + (target - from) * e;
        if (k < 1) requestAnimationFrame(stepFn); else setTimeout(function () { rr.style.scrollSnapType = ''; }, 60);
      };
      requestAnimationFrame(stepFn);
      return;
    }
    if (t.dataset.card) { openCard(t.dataset.card, t.dataset.row); return; }
    if (t.dataset.flip) { var fl = sheet.querySelector('.flip'); if (fl) fl.dataset.flipped = fl.dataset.flipped === 'true' ? 'false' : 'true'; return; }
    if (t.dataset.heart) {
      var hid = t.dataset.heart, was = hearted(hid);
      if (LIFE_BY[hid] && was) return;
      toggleHeart(hid);
      if (!was) { t.classList.add('pop'); if (LIFE_BY[hid] || AREA_FUN[hid]) burst(t); }
      if (t.dataset.inSheet) { var rw = sheet.dataset.row; route(); openCard(hid, rw); } else { var rail = t.closest('.rail'), sl = rail ? rail.scrollLeft : 0, idx = rail ? Array.prototype.indexOf.call(document.querySelectorAll('.rail'), rail) : -1; route(); if (idx >= 0) { var nr = document.querySelectorAll('.rail')[idx]; if (nr) nr.scrollLeft = sl; } }
      return;
    }
    if (t.dataset.pick) { pick(t.dataset.pick, t); return; }
    if (t.dataset.src) { openSources(t.dataset.src.split(',')); return; }
    if (t.dataset.set) {
      var v = parseVal(t.dataset.val);
      setPath(t.dataset.set, v);
      if (t.dataset.set === 'job.area' && v && S.home.rentT == null) S.home.rentT = rentDefaultT();
      save(); route(); return;
    }
    if (t.dataset.step) {
      var cur = getPath(t.dataset.step), d = Number(t.dataset.d);
      var nv = cur + d;
      if (t.dataset.min != null && nv < Number(t.dataset.min)) nv = Number(t.dataset.min);
      if (t.dataset.max != null && nv > Number(t.dataset.max)) nv = Number(t.dataset.max);
      setPath(t.dataset.step, nv); save(); route(); return;
    }
    if (t.dataset.like) {
      var i = S.home.likes.indexOf(t.dataset.like);
      if (i >= 0) S.home.likes.splice(i, 1); else S.home.likes.push(t.dataset.like);
      save(); var sx = t.closest('.scroller'); var sl = sx ? sx.scrollLeft : 0; route(); var nx = app.querySelector('.scroller'); if (nx) nx.scrollLeft = sl; return;
    }
    if (t.dataset.chip) { openChip = openChip === t.dataset.chip ? null : t.dataset.chip; route(); return; }
    if (t.dataset.chipGo) { location.hash = '#/real'; openChip = t.dataset.chipGo; route(); window.scrollTo(0, 0); return; }
    if (t.dataset.view) { S.view = t.dataset.view; save(); route(); return; }
    if (t.dataset.quest) {
      var q = t.dataset.quest, nowDone = !S.quests[q];
      S.quests[q] = nowDone; save();
      if (nowDone) flySticker(t, q); else route();
      return;
    }
    if (t.dataset.bebuEdit) { openDraft(t.dataset.bebuEdit); return; }
    if (t.dataset.bebuSave) { var tx = document.getElementById('bebu-text'); DRAFTS[t.dataset.bebuSave] = tx ? tx.value : ''; saveDrafts(); sheet.hidden = true; route(); return; }
    if (t.dataset.bebuDel) { delete DRAFTS[t.dataset.bebuDel]; saveDrafts(); sheet.hidden = true; route(); return; }
    if (t.dataset.copyLink) {
      var url = privateLink(t.dataset.copyLink === 'bebu'), label = t.textContent;
      var shown = function () { showSheet('<h2 id="sheet-title">Your private link</h2><p class="small">Select it all and copy. Keep it somewhere safe.</p><textarea class="input" rows="3" readonly id="link-out">' + esc(url) + '</textarea>'); var o = document.getElementById('link-out'); o.focus(); o.select(); };
      try { navigator.clipboard.writeText(url).then(function () { t.textContent = 'Copied! Save it somewhere safe'; setTimeout(function () { t.textContent = label; }, 2500); }, shown); } catch (err) { shown(); }
      return;
    }
    if (t.dataset.bebuNext) { goSpot(spotAt + 1); return; }
    if (t.dataset.bebuGo) { goSpot(Number(t.dataset.bebuGo)); return; }
    if (t.dataset.bebuSpots) {
      showSheet('<h2 id="sheet-title">Where notes can go</h2><p class="tiny muted">' + SPOTS.length + ' spots. Tap one to jump there.</p><ul class="lines">' + SPOTS.map(function (sp, i) {
        return '<li><button type="button" class="src" style="text-decoration:none;text-align:left;font-size:15px;color:var(--ink)" data-bebu-go="' + i + '">' + (i + 1) + '. ' + esc(spotName(sp[0])) + '</button><span>' + ((DRAFTS[sp[0]] || '').trim() ? '♥ written' : '') + '</span></li>';
      }).join('') + '</ul>' +
        '<p class="field-label" style="margin-top:16px">Bring notes from another browser</p><p class="tiny muted">Paste what "Copy for CC" gave you, then Import. Then Publish.</p>' +
        '<textarea id="bebu-import" class="input" rows="4" placeholder="BUNNY GOES · Bebu notes · …"></textarea>' +
        '<div class="btn-row" style="justify-content:flex-start"><button type="button" class="btn btn-pink btn-small" data-bebu-import="1">Import</button><span id="bebu-import-msg" class="small"></span></div>');
      return;
    }
    if (t.dataset.bebuImport) {
      var raw = (document.getElementById('bebu-import') || {}).value || '', msg = document.getElementById('bebu-import-msg'), got = 0;
      try {
        var list = JSON.parse(raw.slice(raw.indexOf('[')));
        list.forEach(function (n) { if (n && n.where && (n.text || '').trim()) { DRAFTS[String(n.where)] = String(n.text); got++; } });
        saveDrafts();
        msg.textContent = got + ' note' + (got === 1 ? '' : 's') + ' imported. Tap Publish to send them to Bunny.';
      } catch (err) { msg.textContent = "That didn't look like the copied notes. Paste the whole thing."; }
      return;
    }
    if (t.dataset.bebuPublish) {
      var list = Object.keys(DRAFTS).filter(function (k) { return (DRAFTS[k] || '').trim(); }).map(function (k) { return { where: k, text: DRAFTS[k].trim() }; });
      t.textContent = 'Publishing…';
      fetch('api/notes', { method: 'PUT', credentials: 'same-origin', headers: keyed({ 'Content-Type': 'application/json', 'X-Bebu-Key': BEBU_LINK }), body: JSON.stringify(list) })
        .then(function (r) { t.textContent = r.ok ? 'Published ' + list.length : 'Not published (' + r.status + ')'; })
        .catch(function () { t.textContent = 'Not published'; });
      setTimeout(function () { t.textContent = 'Publish'; }, 3000);
      return;
    }
    if (t.dataset.forget) {
      if (t.dataset.armed !== '1') { t.dataset.armed = '1'; t.textContent = 'Tap again to forget everything'; return; }
      S = clone(DEFAULT); try { localStorage.removeItem(KEY); } catch (e) {}
      if (LINK) fetch(API, { method: 'DELETE', headers: keyed(), credentials: 'same-origin' }).catch(function () {});
      location.hash = '#/'; route(); return;
    }
    if (t.dataset.bebuCopy) {
      var txt = draftsText();
      var fallback = function () { showSheet('<h2 id="sheet-title">Copy this for CC</h2><textarea id="bebu-out" class="input" rows="12" readonly>' + esc(txt) + '</textarea><p class="tiny muted">Select all and copy.</p>'); var o = document.getElementById('bebu-out'); o.focus(); o.select(); };
      try { navigator.clipboard.writeText(txt).then(function () { t.textContent = 'Copied'; setTimeout(function () { t.textContent = 'Copy for CC'; }, 2000); }, fallback); } catch (err) { fallback(); }
      return;
    }
    if (t.dataset.note) {
      var key = t.dataset.note, n = NOTES[Number(key.split(':').pop())];
      if (!n) return;
      S.found = S.found || {};
      var first = !S.found[key];
      S.found[key] = true; save();
      t.classList.add('got');
      var f = foundCount();
      showSheet('<h2 id="sheet-title">' + (first ? 'You found a carrot!' : 'From Bebu') + '</h2><p class="pc-hand" style="font-size:24px;white-space:pre-wrap">' + esc(n.text) + '</p><p class="tiny muted">' + f + ' carrot' + (f === 1 ? '' : 's') + ' found so far. More are hiding.</p>');
      if (first) confetti();
      return;
    }
    if (t.dataset.poke) {
      var ph = D.phrases[Math.floor(Math.random() * D.phrases.length)];
      var it = D.items[ph];
      S.heard = S.heard || [];
      if (S.heard.indexOf(ph) < 0) S.heard.push(ph);
      save();
      t.classList.remove('boing'); void t.offsetWidth; t.classList.add('boing');
      var talk = t.closest('.talk'), bub = talk ? talk.querySelector('.bubble') : null;
      var line = '<b>' + esc(it.label) + '</b><br>' + esc(it.value) + '<br><span class="tiny muted">Bunny has taught you ' + S.heard.length + ' phrase' + (S.heard.length === 1 ? '' : 's') + '.</span>';
      if (bub) bub.innerHTML = line; else showSheet('<h2 id="sheet-title">Bunny says</h2><p>' + line + '</p>');
      return;
    }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    var path = el.dataset.bind, v;
    if (el.dataset.range) v = Number(el.value) / 100;
    else if (el.dataset.usd || el.dataset.int) v = Number(el.value);
    else if (el.dataset.num) v = el.value === '' ? null : Number(el.value.replace(/[^\d.]/g, '')) || null;
    else v = el.value;
    setPath(path, v);
    el.closest('.slider') && el.closest('.slider').classList.remove('ghost');
    save();
    if (path === 'home.rentT') {
      var lv = app.querySelector('[data-live="rent"]'); if (lv) lv.textContent = money(rentRange().at) + ' a month';
      var bb = app.querySelector('.step .bubble'); if (bb) bb.textContent = money(rentRange().at) + ' a month is about ' + carrots(rentRange().at) + ' carrots. Bunny math.';
    }
    if (path.indexOf('buckets.') === 0) { var bl = app.querySelector('[data-live="b-' + path.split('.')[1] + '"]'); if (bl) bl.textContent = money(v); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    var y = window.scrollY;
    var onBuild = /^#\/build/.test(location.hash);
    if (!onBuild || el.type === 'date') { route(); window.scrollTo(0, y); }
  });

  function paintCur() { document.querySelectorAll('[data-cur]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cur === S.cur)); }); }
  function paintTabs(tab) { document.querySelectorAll('.tabs a').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }

  /* ---------- router ---------- */
  var lastRoute = '';
  function route() {
    var h = location.hash || '#/';
    var m = h.match(/^#\/build\/(\d+)/);
    var y = h === lastRoute ? window.scrollY : 0;
    var p = h.match(/^#\/play(?:\/(\d+))?/);
    if (m) { location.replace('#/play'); return; }
    if (p) { paintTabs('play'); renderPlay(Number(p[1] || 1)); }
    else if (h.indexOf('#/mine') === 0) { paintTabs('mine'); renderMine(); }
    else if (h.indexOf('#/postcard') === 0) { paintTabs('mine'); renderReveal(); }
    else if (h.indexOf('#/real') === 0 || h.indexOf('#/life') === 0) { paintTabs('real'); renderLife(); }
    else if (h.indexOf('#/briefing') === 0) { paintTabs('briefing'); renderBriefing(); }
    else if (h.indexOf('#/quests') === 0) { paintTabs('quests'); renderQuests(); }
    else if (h.indexOf('#/open') === 0) { paintTabs('open'); renderOpen(); }
    else { paintTabs('explore'); renderExplore(); }
    if (h !== lastRoute) { openChip = (h.indexOf('#/real') === 0 || h.indexOf('#/life') === 0) ? openChip : null; window.scrollTo(0, 0); }
    else window.scrollTo(0, y);
    lastRoute = h;
    railEnds();
  }
  window.addEventListener('hashchange', route);

  // Named places live in their own file (the research from PR #148), so a rebuild of site.json never drops them.
  function loadPlaces() {
    return fetch('data/places.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (!p || !p.items) return;
      D.fun = D.fun || {};
      Object.keys(p.fun || {}).forEach(function (k) { D.fun[k] = p.fun[k]; });
      p.items.forEach(function (it) { D.items[it.id] = it; });
    }).catch(function () {});
  }

  document.querySelector('[data-bunny="mini"]').innerHTML = '<div class="bunny happy" style="width:34px;height:34px">' + BUNNY + '</div>';
  paintCur();
  fetch('data/site.json').then(function (r) { return r.json(); }).then(function (j) {
    D = j;
    return Promise.all([loadServer(), loadNotes(), loadPlaces()]);
  }).then(function () {
    paintCur(); paintEditBar(); route();
    var fresh = false, seen = false;
    try { fresh = sessionStorage.getItem('bunny-goes-new-link') === '1'; sessionStorage.removeItem('bunny-goes-new-link'); seen = localStorage.getItem(HELLO_KEY) === '1'; } catch (e) {}
    if (!EDIT) setTimeout(showHello, 500);   // Jay: the welcome always fires
  }).catch(function (err) {
    app.innerHTML = '<div class="card"><h2>Bunny got lost.</h2><p>The data didn\'t load. Try reloading.</p><p class="tiny muted">' + esc(err && err.message) + '</p></div>';
  });
})();
