// Opportunity Engine UI. Vanilla ES modules, no build step.
import { CATEGORIES, STATUSES, STATUS_SHORT, TYPE_LABELS, validateRecord } from './schema.js';
import { visibleQuestions, emptyProfile, NONE } from './questions.js';
import { match, pickThree, uncertainties, contrast, hourlyCad, isStale } from './engine.js';
import { buildPrompt, GEMINI_URL } from './prompt.js';

const KEY = 'opportunity-engine:v1';
const TODAY = new Date().toISOString().slice(0, 10);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let catalogue = [];
let safety = [];
let state = load() || { profile: emptyProfile(), decisions: {}, qIndex: 0, answeredOnce: false };
let result = { ranked: [], excluded: [] };
let history = []; // undo stack of [id, previousDecision]

// ---------- storage (always optional) ----------
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.profile ? s : null; } catch { return null; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- routing ----------
const VIEWS = ['intro', 'quiz', 'deck', 'shortlist', 'saved', 'about'];
function go(view, { focus = true } = {}) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  document.querySelectorAll('nav button').forEach(b => {
    if (b.dataset.go === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (view === 'deck') renderDeck();
  if (view === 'shortlist') renderShortlist();
  if (view === 'saved') renderSaved();
  if (view === 'quiz') renderQuestion();
  if (location.hash !== `#${view}`) history_replace(view);
  if (focus) { const h = $(`#view-${view} h1, #view-${view} h2`); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); } }
  window.scrollTo({ top: 0 });
}
function history_replace(view) { try { window.history.replaceState(null, '', `#${view}`); } catch { /* sandboxed */ } }

// ---------- matching ----------
function rematch() {
  result = match(catalogue, state.profile, TODAY);
  updateCounts();
}
function updateCounts() {
  const n = Object.values(state.decisions).filter(d => d === 'save' || d === 'like').length;
  $('#saved-count').textContent = n ? String(n) : '';
}

// ---------- questionnaire ----------
function renderQuestion() {
  const qs = visibleQuestions(state.profile);
  state.qIndex = Math.max(0, Math.min(state.qIndex, qs.length - 1));
  const q = qs[state.qIndex];
  $('#q-step').textContent = `Question ${state.qIndex + 1} of ${qs.length}`;
  $('#q-bar').style.width = `${(state.qIndex / qs.length) * 100}%`;
  $('#q-title').textContent = q.title;
  $('#q-help').textContent = q.help || '';
  $('#q-help').hidden = !q.help;
  $('#q-back').disabled = state.qIndex === 0;
  $('#q-next').textContent = state.qIndex === qs.length - 1 ? 'Show me routes' : 'Next';
  const cur = state.profile[q.id];
  const box = $('#q-options');
  if (q.kind === 'matrix') {
    box.className = 'matrix';
    box.innerHTML = q.rows.map(r => `
      <div class="mrow"><fieldset><legend>${esc(r.label)}</legend>
        ${q.options.map(o => `<label class="pill"><input type="radio" name="m-${r.value}" value="${o.value}" ${cur && cur[r.value] === o.value ? 'checked' : ''}> ${esc(o.label)}</label>`).join('')}
        <label class="pill"><input type="radio" name="m-${r.value}" value="" ${!cur || !cur[r.value] ? 'checked' : ''}> Not sure</label>
      </fieldset></div>`).join('');
  } else {
    box.className = 'options';
    const type = q.kind === 'multi' ? 'checkbox' : 'radio';
    box.innerHTML = q.options.map((o, i) => {
      const checked = q.kind === 'multi' ? Array.isArray(cur) && (o.value === NONE ? cur.length === 0 : cur.includes(o.value)) : cur === o.value;
      return `<label class="opt"><input type="${type}" name="q" value="${i}" ${checked ? 'checked' : ''}> <span>${esc(o.label)}</span></label>`;
    }).join('');
  }
}

function readAnswer(q) {
  const form = $('#q-form');
  if (q.kind === 'matrix') {
    const out = {};
    for (const r of q.rows) {
      const v = form.querySelector(`input[name="m-${r.value}"]:checked`)?.value;
      if (v) out[r.value] = v;
    }
    return out;
  }
  const picked = [...form.querySelectorAll('input[name="q"]:checked')].map(i => q.options[+i.value].value);
  if (q.kind === 'multi') {
    if (picked.includes(NONE)) return [];
    return picked.length ? picked : null;
  }
  return picked.length ? picked[0] : null;
}

function advance(skip) {
  const qs = visibleQuestions(state.profile);
  const q = qs[state.qIndex];
  state.profile[q.id] = skip ? (q.kind === 'matrix' ? {} : null) : readAnswer(q);
  if (!skip && q.kind === 'single' && state.profile[q.id] === null) {
    // Nothing chosen: treat Next like skip; unanswered is a valid state.
  }
  const next = visibleQuestions(state.profile);
  const at = next.findIndex(x => x.id === q.id);
  if (at >= next.length - 1) {
    state.answeredOnce = true;
    save();
    rematch();
    go('deck');
    return;
  }
  state.qIndex = at + 1;
  save();
  renderQuestion();
  $('#q-title').focus();
}

// ---------- cards ----------
function payText(rec) {
  const c = rec.compensation;
  if (c.min == null && c.max == null) return 'Not published';
  const n = v => (v == null ? '' : v >= 1000 ? Math.round(v).toLocaleString('en-CA') : v);
  const range = c.min != null && c.max != null && c.min !== c.max ? `${n(c.min)}–${n(c.max)}` : n(c.min ?? c.max);
  const unit = { hour: '/hr', task: '/task', minute_audio: '/audio min', study: '/study', project: '/project', month: '/month', year: '/year' }[c.unit] || '';
  const basis = c.basis === 'official' ? '' : c.basis === 'self_reported' ? ' (self-reported)' : c.basis === 'aggregator' ? ' (aggregator)' : '';
  const cur = c.currency === 'USD' ? 'US$' : c.currency === 'CAD' ? 'CA$' : '$';
  return `${cur}${range}${unit}${c.currency === 'unstated' ? ' (currency not stated)' : ''}${basis}`;
}
const WORKER = { employee: 'Employee', contractor: 'Contractor', participant: 'Participant', student: 'Student/trainee', varies: 'Varies', unknown: 'Unknown' };
const SETTING = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site', varies: 'Varies' };
const FLEX = { flexible: 'Choose your hours', shifts: 'Set shifts', fixed: 'Fixed schedule', varies: 'Varies', unknown: 'Unknown' };

// Where the "next step" button points, and what it says. Never dresses up a non-official source.
function nextStep(r) {
  if (r.type === 'category') return { url: r.officialUrl || r.sources[0].url, label: 'Read the source' };
  if (r.applyUrl) return { url: r.applyUrl, label: 'Official application page' };
  if (r.officialUrl) return { url: r.officialUrl, label: 'Official website' };
  return { url: r.sources[0].url, label: 'Best source found (not an official site)' };
}

function chips(m) {
  const r = m.rec;
  const out = [];
  if (m.label && state.answeredOnce) out.push(`<span class="chip fit">${esc(m.label)}</span>`);
  out.push(`<span class="chip ${r.type === 'category' ? 'cat' : ''}">${esc(TYPE_LABELS[r.type])}</span>`);
  out.push(`<span class="chip ${m.stale ? 'stale' : ''}">${esc(m.stale ? 'Stale: needs re-check' : STATUS_SHORT[r.status])}</span>`);
  if (r.evidenceStrength === 'weak') out.push('<span class="chip weak">Thin evidence</span>');
  if (r.audience && r.audience.length) out.push('<span class="chip cat">Specific eligibility</span>');
  return `<div class="chips">${out.join('')}</div>`;
}

function facts(r) {
  return `<ul class="facts">
    <li><b>Pay</b>${esc(payText(r))}</li>
    <li><b>Status</b>${esc(WORKER[r.workerStatus])}</li>
    <li><b>Where</b>${esc(SETTING[r.geography.setting])}${r.geography.regions.length ? ' · ' + esc(r.geography.regions.join(', ')) : ''}</li>
    <li><b>Hours</b>${esc(FLEX[r.schedule.flexibility])}</li>
  </ul>`;
}

function undecided() {
  return result.ranked.filter(m => !state.decisions[m.rec.id]);
}

function renderDeck() {
  const area = $('#deck-area');
  const left = undecided();
  const total = result.ranked.length;
  const answered = state.answeredOnce;
  $('#deck-sub').textContent = answered
    ? `${total} routes fit your limits, best first. ${result.excluded.length} hidden by your answers.`
    : `Showing all ${total} routes, sorted by evidence strength. Answer the questions to rank them for you.`;
  $('#edit-answers').textContent = answered ? 'Edit answers' : 'Answer questions';

  // Excluded list (transparency about hard filters).
  const ex = $('#excluded');
  ex.hidden = result.excluded.length === 0;
  $('#excluded-sum').textContent = `Why ${result.excluded.length} route${result.excluded.length === 1 ? ' is' : 's are'} hidden`;
  $('#excluded-list').innerHTML = result.excluded.map(e => `<li><strong>${esc(e.rec.name)}</strong> (${esc(e.rec.organization)}): ${esc(e.reason)}</li>`).join('');

  if (!catalogue.length) { area.innerHTML = ''; return; }
  if (!total) {
    area.innerHTML = `<div class="empty"><h3>Nothing fits every limit you set.</h3>
      <p>We haven’t loosened anything without asking. Look at why routes were hidden below; if one of those limits is softer than you said, you can change it.</p>
      <div class="actions"><button class="btn primary" data-act="edit">Edit answers</button></div></div>`;
    return;
  }
  if (!left.length) {
    area.innerHTML = `<div class="empty"><h3>You’ve been through every route.</h3>
      <p>Your likes and saves shape your three. You can also look back through what you passed.</p>
      <div class="actions"><button class="btn primary" data-go="shortlist">See my three</button><button class="btn" data-go="saved">Review decisions</button></div></div>`;
    return;
  }
  const m = left[0];
  const r = m.rec;
  const why = (m.why.length ? m.why : [r.appeal[0]]).slice(0, 2);
  const watch = [...m.cautions, ...r.watchOuts].slice(0, 2);
  area.innerHTML = `<div class="deck">
    <article class="card" id="card" aria-labelledby="card-title" aria-describedby="card-sum" tabindex="0" data-id="${esc(r.id)}">
      <span class="stamp like" aria-hidden="true">LIKE</span><span class="stamp pass" aria-hidden="true">PASS</span>
      ${chips(m)}
      <p class="eyebrow">${esc(CATEGORIES[r.category])}</p>
      <h3 id="card-title">${esc(r.name)}</h3>
      <p class="org">${esc(r.organization)}</p>
      <p class="sum" id="card-sum">${esc(r.summary)}</p>
      ${r.audience && r.audience.length ? `<p class="who"><strong>Only for:</strong> ${esc(r.audience.join('; '))}</p>` : ''}
      ${facts(r)}
      <ul class="why" aria-label="Why it might fit">${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <ul class="watch" aria-label="Watch out for">${watch.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <div class="controls" role="group" aria-label="Decide on this route">
        <button class="btn pass" data-act="pass" aria-keyshortcuts="ArrowLeft">Pass<span class="k">← key</span></button>
        <button class="btn" data-act="details" aria-keyshortcuts="D">Details<span class="k">D</span></button>
        <button class="btn" data-act="save" aria-keyshortcuts="S">Save<span class="k">S</span></button>
        <button class="btn like" data-act="like" aria-keyshortcuts="ArrowRight">Like<span class="k">→ key</span></button>
      </div>
    </article>
  </div>
  <div class="deck-meta"><span>${total - left.length + 1} of ${total}</span>
    <span>${history.length ? '<button class="linkish" data-act="undo">Undo last</button> · ' : ''}Swipe, or use the buttons</span></div>`;
  attachSwipe($('#card'));
}

function decide(act, id) {
  const m = result.ranked.find(x => x.rec.id === id);
  if (!m) return;
  history.push([id, state.decisions[id]]);
  state.decisions[id] = act;
  save();
  updateCounts();
  toast(act === 'like' ? `Liked: ${m.rec.name}` : act === 'save' ? `Saved: ${m.rec.name}` : `Passed: ${m.rec.name}`);
  renderDeck();
  $('#card')?.focus();
}

function undo() {
  const last = history.pop();
  if (!last) return;
  const [id, prev] = last;
  if (prev) state.decisions[id] = prev; else delete state.decisions[id];
  save();
  updateCounts();
  renderDeck();
  $('#card')?.focus();
}

function attachSwipe(card) {
  if (!card) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let x0 = null, y0 = null, dx = 0, pid = null;
  const likeS = card.querySelector('.stamp.like'), passS = card.querySelector('.stamp.pass');
  card.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a')) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; pid = e.pointerId;
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', e => {
    if (x0 === null || e.pointerId !== pid) return;
    dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) return; // vertical scroll
    if (Math.abs(dx) > 8 && !card.hasPointerCapture(pid)) card.setPointerCapture(pid);
    if (!reduce) card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
    likeS.style.opacity = Math.max(0, Math.min(1, dx / 100));
    passS.style.opacity = Math.max(0, Math.min(1, -dx / 100));
  });
  const end = () => {
    if (x0 === null) return;
    card.classList.remove('dragging');
    const id = card.dataset.id;
    const threshold = Math.min(110, window.innerWidth * 0.25);
    x0 = null;
    if (Math.abs(dx) > threshold) {
      const act = dx > 0 ? 'like' : 'pass';
      if (!reduce) { card.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx / 10}deg)`; card.style.opacity = '0'; }
      setTimeout(() => decide(act, id), reduce ? 0 : 180);
    } else {
      card.style.transform = '';
      likeS.style.opacity = passS.style.opacity = 0;
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

// ---------- detail ----------
function findMatch(id) {
  return result.ranked.find(m => m.rec.id === id)
    || (() => { const e = result.excluded.find(x => x.rec.id === id); return e ? { rec: e.rec, why: [], cautions: [], excludedReason: e.reason, stale: isStale(e.rec, TODAY) } : null; })();
}

function openDetail(id) {
  const m = findMatch(id);
  if (!m) return;
  const r = m.rec;
  const unc = uncertainties(r, TODAY, state.profile);
  const prompt = buildPrompt(r, state.profile, TODAY);
  const next = nextStep(r);
  const h = hourlyCad(r);
  const reqs = [
    r.requirements.experience === 'none' ? 'No experience required' : r.requirements.experience === 'some' ? 'Some experience helps or is required' : 'Significant experience required',
    r.requirements.credentialRequired ? `Required credential: ${r.requirements.credentials.join(', ')}` : (r.requirements.credentials.length ? `Credentials mentioned: ${r.requirements.credentials.join(', ')}` : null),
    r.requirements.minAge ? `Minimum age ${r.requirements.minAge}` : null,
    r.languages.length ? `Working language: ${r.languages.join(', ').toUpperCase()}` : null,
    r.requirements.assessment !== 'none' && r.requirements.assessment !== 'unknown' ? `Screening: ${r.requirements.assessment.replace(/_/g, ' ')}` : null,
  ].filter(Boolean);
  $('#d-body').innerHTML = `
    ${chips(m)}
    <p class="eyebrow">${esc(CATEGORIES[r.category])}</p>
    <h2 id="d-title">${esc(r.name)}</h2>
    <p class="org">${esc(r.organization)}</p>
    ${m.excludedReason ? `<p class="notice warn">Hidden by your answers: ${esc(m.excludedReason)}</p>` : ''}
    ${r.status === 'rejected' ? '<p class="notice bad">We researched this and do not recommend it. See the watch-outs.</p>' : ''}
    ${r.audience && r.audience.length ? `<p class="notice warn">Only open to: ${esc(r.audience.join('; '))}. We don’t ask about this, so check it applies to you.</p>` : ''}
    ${r.type === 'category' ? '<p class="notice warn">This is a kind of work to investigate, not a specific employer or job opening.</p>' : ''}
    <p>${esc(r.summary)}</p>
    <div class="d-sec"><h3>What you’d actually do</h3><p>${esc(r.whatYouDo)}</p></div>
    <div class="d-sec cols2">
      <h3>Why it might fit</h3><ul class="why">${[...m.why, ...r.appeal].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p><em>${esc(r.fitsIf)}</em></p>
      <h3>Watch out for</h3><ul class="watch">${[...m.cautions, ...r.watchOuts].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p><em>${esc(r.notFitIf)}</em></p>
    </div>
    <div class="d-sec"><h3>Still uncertain</h3>${unc.length ? `<ul>${unc.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>No major gaps recorded, but check the official source before acting.</p>'}</div>
    <div class="d-sec"><h3>The terms</h3><dl class="kv">
      <dt>Work type</dt><dd>${esc(TYPE_LABELS[r.type])} · ${esc(WORKER[r.workerStatus])}</dd>
      <dt>Pay</dt><dd>${esc(payText(r))}${h && r.compensation.currency === 'USD' ? ` (≈ CA$${h.lo.toFixed(0)}${h.hi !== h.lo ? '–' + h.hi.toFixed(0) : ''}/hr)` : ''}${r.compensation.notes ? `<br><span class="fine">${esc(r.compensation.notes)}</span>` : ''}</dd>
      <dt>How steady</dt><dd>Work volume: ${esc(r.reliability.workVolume)} · predictability: ${esc(r.reliability.predictability)}${r.reliability.notes ? `<br><span class="fine">${esc(r.reliability.notes)}</span>` : ''}</dd>
      <dt>Fees and costs</dt><dd>${esc(r.fees || 'None recorded')}</dd>
      <dt>Schedule</dt><dd>${esc(FLEX[r.schedule.flexibility])}${r.schedule.windows.length ? ' · ' + esc(r.schedule.windows.join(', ')) : ''}${r.schedule.hoursMinWeekly ? ` · min ${r.schedule.hoursMinWeekly} h/week` : ''}${r.schedule.hoursMaxWeekly ? ` · max ${r.schedule.hoursMaxWeekly} h/week` : ''}</dd>
      <dt>Interaction</dt><dd>${esc(r.interaction.modes.join(', ').replace('_', ' ') || 'not recorded')} · real-time: ${esc(r.interaction.realtime)}${r.interaction.phone ? ' · phone/voice work' : r.interaction.phone === null ? ' · phone work: unknown' : ''}</dd>
      <dt>Eligibility</dt><dd>Canada: ${esc(r.geography.canadaEligibility.replace('_', ' '))}${r.geography.regions.length ? ` · limited to ${esc(r.geography.regions.join(', '))}` : ''} · ${esc(SETTING[r.geography.setting])}</dd>
      <dt>Requirements</dt><dd>${reqs.map(esc).join('<br>') || 'Not recorded'}</dd>
      <dt>Equipment</dt><dd>${esc(r.requirements.equipment.join(', ') || 'Not recorded')}</dd>
      <dt>Training</dt><dd>${r.training.required ? 'Required' : 'Not required'}${r.training.cost && r.training.cost !== 'none' && r.training.cost !== 'unknown' ? ` · ${esc(r.training.cost.replace(/_/g, ' '))}` : ''}${r.training.notes ? ` · ${esc(r.training.notes)}` : ''}</dd>
      <dt>Time to first pay</dt><dd>${esc(r.timeToFirstEarnings)}</dd>
    </dl></div>
    <div class="d-sec"><h3>How to apply</h3>
      ${r.applicationSteps.length ? `<ol>${r.applicationSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <p><a class="btn primary ext" href="${esc(next.url)}" target="_blank" rel="noopener noreferrer">${esc(next.label)}<span class="sr-only"> (opens in a new tab)</span></a></p>
      <p class="fine">Opens in a new tab. ${r.applyUrl ? '' : 'We couldn’t verify a direct application link, so check the site for the current route in. '} Never pay a fee to get a job, and never deposit a cheque from a “recruiter”.</p>
    </div>
    <div class="d-sec"><h3>Evidence</h3>
      <p class="fine">Verification: <strong>${esc(STATUSES[r.status])}</strong> · legitimacy: ${esc(r.legitimacy)} · evidence: ${esc(r.evidenceStrength)} · last checked ${esc(r.lastChecked)}${m.stale ? ' <span class="bad">(stale)</span>' : ''}</p>
      <ol class="sources">${r.sources.map(s => `<li><span class="stype">${esc(s.type.replace('_', ' '))}</span> <a class="ext" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>${s.publisher ? ` · ${esc(s.publisher)}` : ''} · checked ${esc(s.accessed)}${s.published ? ` · published ${esc(s.published)}` : ''}${s.accessible === false ? ' · <span class="warn">could not be opened</span>' : ''}${s.notes ? `<br><span class="fine">${esc(s.notes)}</span>` : ''}</li>`).join('')}</ol>
    </div>
    <div class="d-sec"><h3>Investigate it further</h3>
      <p class="help">A ready-made research prompt with your non-sensitive preferences. Paste it into Gemini, Claude or another assistant that can search the web. Whatever it says isn’t verified by us.</p>
      <label for="prompt-text" class="fine">Research prompt</label>
      <textarea id="prompt-text" class="prompt" readonly>${esc(prompt)}</textarea>
      <div class="actions">
        <button class="btn primary" id="copy-prompt">Copy prompt</button>
        <a class="btn ext" id="open-gemini" href="${GEMINI_URL}" target="_blank" rel="noopener noreferrer">Open Gemini</a>
      </div>
      <p class="fine" id="copy-status" role="status"></p>
    </div>
    ${m.excludedReason || r.status === 'rejected' ? '' : `<div class="actions">
      <button class="btn pass" data-dact="pass" data-id="${esc(r.id)}">Pass</button>
      <button class="btn" data-dact="save" data-id="${esc(r.id)}">Save</button>
      <button class="btn like" data-dact="like" data-id="${esc(r.id)}">Like</button></div>`}`;
  const dlg = $('#detail');
  if (!dlg.open) dlg.showModal();
  $('#d-close').focus();
}

async function copyPrompt() {
  const ta = $('#prompt-text');
  const status = $('#copy-status');
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('no clipboard');
    await navigator.clipboard.writeText(ta.value);
    status.textContent = 'Copied. Paste it into Gemini or another assistant.';
  } catch {
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    status.textContent = ok ? 'Copied. Paste it into Gemini or another assistant.' : 'Couldn’t copy automatically. The text is selected: press Ctrl+C (or ⌘C), or long-press and choose Copy.';
  }
}

// ---------- shortlist ----------
function renderShortlist() {
  const area = $('#shortlist-area');
  if (!catalogue.length) { area.innerHTML = ''; return; }
  const liked = Object.entries(state.decisions).filter(([, d]) => d === 'like' || d === 'save').map(([id]) => id);
  const passed = Object.entries(state.decisions).filter(([, d]) => d === 'pass').map(([id]) => id);
  const picks = pickThree(result.ranked, { liked, passed });
  const intro = state.answeredOnce ? '' : `<p class="notice warn">You haven’t answered the questions yet, so these are ranked mainly on evidence. <button class="linkish" data-act="edit">Answer them</button> for a personal three.</p>`;
  if (!picks.length) {
    area.innerHTML = intro + `<div class="empty"><h3>No routes left to suggest.</h3><p>Either everything was hidden by your limits or you passed on the rest. Nothing has been loosened behind your back.</p>
      <div class="actions"><button class="btn primary" data-act="edit">Edit answers</button><button class="btn" data-go="saved">Review passes</button></div></div>`;
    return;
  }
  const best = picks[0];
  area.innerHTML = intro + `<div class="picks">${picks.map(p => {
    const r = p.rec;
    const unc = uncertainties(r, TODAY, state.profile).slice(0, 3);
    const c = contrast(p, best);
    return `<article class="pick" aria-labelledby="pk-${esc(r.id)}">
      <div class="role">${esc(p.title)}</div>
      ${chips(p)}
      <h3 id="pk-${esc(r.id)}">${esc(r.name)}</h3>
      <p class="org">${esc(r.organization)} · ${esc(payText(r))} · ${esc(WORKER[r.workerStatus])}</p>
      <p>${esc(r.summary)}</p>
      ${c ? `<p class="contrast">${esc(c)}</p>` : ''}
      <div class="cols">
        <div><h4>Why it fits</h4><ul>${(p.why.length ? p.why : r.appeal.slice(0, 2)).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>Watch out for</h4><ul>${[...p.cautions, ...r.watchOuts].slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>Still uncertain</h4><ul>${(unc.length ? unc : ['Check the official source before acting.']).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="actions">
        <button class="btn" data-detail="${esc(r.id)}">Details, evidence and research prompt</button>
        <a class="btn primary ext" href="${esc(nextStep(r).url)}" target="_blank" rel="noopener noreferrer">${esc(nextStep(r).label)}<span class="sr-only"> (opens in a new tab)</span></a>
      </div>
    </article>`;
  }).join('')}</div>
  ${picks.length < 3 ? '<p class="help">Only a few routes are left after your limits and passes, so you’re seeing fewer than three.</p>' : ''}`;
}

// ---------- saved ----------
function renderSaved() {
  const area = $('#saved-area');
  const groups = { like: 'Liked', save: 'Saved for later', pass: 'Passed' };
  const all = [...result.ranked.map(m => m.rec), ...result.excluded.map(e => e.rec)];
  const byId = Object.fromEntries(all.map(r => [r.id, r]));
  const html = Object.entries(groups).map(([k, label]) => {
    const ids = Object.entries(state.decisions).filter(([id, d]) => d === k && byId[id]).map(([id]) => id).sort();
    if (!ids.length) return '';
    return `<div class="saved-group"><h3>${label} (${ids.length})</h3>${ids.map(id => `<div class="row"><span><strong>${esc(byId[id].name)}</strong> · ${esc(byId[id].organization)}</span>
      <span class="rb"><button class="btn small" data-detail="${esc(id)}">Details</button><button class="btn small" data-undecide="${esc(id)}">Put back</button></span></div>`).join('')}</div>`;
  }).join('');
  area.innerHTML = html || '<div class="empty"><p>Nothing yet. Like, save or pass routes on the Explore page and they’ll show up here.</p><div class="actions"><button class="btn primary" data-go="deck">Explore</button></div></div>';
}

// ---------- about ----------
function renderAbout() {
  $('#status-defs').innerHTML = Object.entries(STATUSES).map(([k, v]) => `<li><strong>${esc(STATUS_SHORT[k])}:</strong> ${esc(v)}</li>`).join('');
  const tips = safety.flatMap(s => (s.tips || []).slice(0, 3).map(t => ({ t, s })));
  $('#safety-tips').innerHTML = (tips.length ? tips.slice(0, 8).map(({ t, s }) => `<li>${esc(t)} <span class="fine">(<a class="ext" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher || s.title)}</a>)</span></li>`).join('') : '')
    + '<li>Legitimate employers don’t charge you to apply, don’t pay you before you start work, and don’t ask you to buy equipment through them.</li>';
}

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, a');
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); if ($('#detail').open) $('#detail').close(); go(t.dataset.go); return; }
  if (t.dataset.detail) { openDetail(t.dataset.detail); return; }
  if (t.dataset.undecide) { delete state.decisions[t.dataset.undecide]; save(); updateCounts(); renderSaved(); return; }
  if (t.dataset.dact) { $('#detail').close(); decide(t.dataset.dact, t.dataset.id); return; }
  const act = t.dataset.act;
  if (act === 'edit') { state.qIndex = 0; go('quiz'); return; }
  if (act === 'undo') { undo(); return; }
  if (act && ['pass', 'save', 'like', 'details'].includes(act)) {
    const id = $('#card')?.dataset.id;
    if (!id) return;
    if (act === 'details') openDetail(id); else decide(act, id);
  }
  if (t.id === 'copy-prompt') copyPrompt();
});

document.addEventListener('keydown', e => {
  if ($('#view-deck').hidden || $('#detail').open) return;
  if (e.target.matches('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
  const id = $('#card')?.dataset.id;
  if (!id) return;
  const k = e.key.toLowerCase();
  if (e.key === 'ArrowLeft') { e.preventDefault(); decide('pass', id); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); decide('like', id); }
  else if (k === 's') decide('save', id);
  else if (k === 'd' || (e.key === 'Enter' && e.target.id === 'card')) { e.preventDefault(); openDetail(id); }
  else if (k === 'u') undo();
});

$('#start').addEventListener('click', () => { state.qIndex = 0; go('quiz'); });
$('#edit-answers').addEventListener('click', () => { state.qIndex = 0; go('quiz'); });
$('#q-options').addEventListener('change', e => {
  // "None of these" is exclusive with the other ticks.
  const q = visibleQuestions(state.profile)[state.qIndex];
  if (q.kind !== 'multi' || !e.target.checked) return;
  const boxes = [...$('#q-options').querySelectorAll('input[name="q"]')];
  const isNone = q.options[+e.target.value].exclusive;
  for (const b of boxes) if (b !== e.target && (isNone || q.options[+b.value].exclusive)) b.checked = false;
});
$('#q-form').addEventListener('submit', e => { e.preventDefault(); advance(false); });
$('#q-skip').addEventListener('click', () => advance(true));
$('#q-back').addEventListener('click', () => {
  const qs = visibleQuestions(state.profile);
  const q = qs[state.qIndex];
  state.profile[q.id] = readAnswer(q); // keep what they picked before going back
  state.qIndex = Math.max(0, state.qIndex - 1);
  save();
  renderQuestion();
  $('#q-title').focus();
});
$('#d-close').addEventListener('click', () => $('#detail').close());
$('#detail').addEventListener('click', e => { if (e.target === $('#detail')) $('#detail').close(); });
$('#detail').addEventListener('close', () => $('#card')?.focus());
$('#reset-decisions').addEventListener('click', () => { state.decisions = {}; history = []; save(); updateCounts(); renderSaved(); toast('Likes, saves and passes cleared.'); });
$('#reset-all').addEventListener('click', () => {
  state = { profile: emptyProfile(), decisions: {}, qIndex: 0, answeredOnce: false };
  history = [];
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  rematch();
  renderSaved();
  toast('Everything cleared from this browser.');
});
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) go(v); });

// ---------- boot ----------
async function boot() {
  // Make sure stored profiles from older versions have every key.
  state.profile = { ...emptyProfile(), ...state.profile };
  try {
    const res = await fetch('data/catalogue.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const bad = [];
    catalogue = data.records.filter(r => { const errs = validateRecord(r); if (errs.length) bad.push(r.id); return !errs.length; });
    if (bad.length) console.warn('Skipped invalid records:', bad);
    safety = data.safety || [];
    $('#catalogue-stamp').textContent = `${catalogue.length} researched routes · catalogue built ${data.generated}. Records are dated individually.`;
  } catch (err) {
    const el = $('#load-error');
    el.hidden = false;
    el.textContent = `Couldn’t load the opportunity catalogue (${err.message}). If you opened this file directly, serve the folder over http instead (see README).`;
  }
  rematch();
  renderAbout();
  const v = location.hash.slice(1);
  go(VIEWS.includes(v) ? v : 'intro', { focus: false });
}
boot();
