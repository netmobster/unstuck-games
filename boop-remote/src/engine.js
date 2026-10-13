// Deterministic matching engine. Pure functions, no DOM, no randomness.
// 1. Hard filters remove routes that break an explicit constraint (with the reason kept).
// 2. Soft components score the rest from -1..1, weighted (WEIGHTS below).
// 3. Evidence strength and freshness are a component, never an override of a hard filter.
// 4. pickThree chooses a best fit plus two alternatives with different trade-offs.

import { CATEGORIES } from './schema.js';

export const CONFIG = {
  staleDays: 180,          // records older than this are treated as stale
  usdToCad: 1.37,          // rough conversion for comparing USD hourly pay to a CAD floor; documented in DECISIONS.md
  hoursCap: { lt10: 10, '10to20': 20, '20to30': 30, '30plus': 60 },
};

export const WEIGHTS = {
  interaction: 3,
  skills: 3,
  goals: 3,
  schedule: 2,
  evidence: 2,
  predictability: 1.5,
  learning: 1,
  pay: 1,
  equipment: 1,
};

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function isStale(rec, today) {
  return rec.status === 'stale_needs_recheck' || daysBetween(rec.lastChecked, today) > CONFIG.staleDays;
}

export function hourlyCad(rec) {
  const c = rec.compensation;
  if (!c || c.unit !== 'hour') return null;
  const rate = c.currency === 'USD' ? CONFIG.usdToCad : c.currency === 'CAD' ? 1 : null;
  if (!rate) return null;
  const lo = c.min ?? c.max;
  const hi = c.max ?? c.min;
  if (lo == null) return null;
  return { lo: lo * rate, hi: hi * rate };
}

const has = (arr, v) => Array.isArray(arr) && arr.includes(v);
const answered = v => v !== null && v !== undefined;

// ---------- hard filters ----------
// Returns null if the record passes, else a plain-language reason.
export function hardFilter(rec, p, _today) {
  if (rec.status === 'rejected') return 'Researched and rejected (see its watch-outs).';
  if (rec.status === 'not_currently_open') return 'Not currently open.';

  const g = rec.geography;
  if (p.region === 'CA' || p.region === 'CA-ON') {
    if (g.canadaEligibility === 'not_eligible') return 'Not open to people in Canada.';
    if (g.regions.length > 0) {
      const prov = p.region === 'CA-ON' ? 'ON' : null;
      if (!prov || !g.regions.includes(prov)) return `Limited to ${g.regions.join(', ')}.`;
    }
  } else if (p.region === 'outside') {
    const onlyCanada = g.regions.length > 0 || (g.countries.length > 0 && g.countries.every(c => c === 'CA'));
    if (onlyCanada) return 'Only open in Canada.';
  }

  if (p.phone === 'no' && rec.interaction.phone) return 'Phone or voice calls are a core part of it, and you ruled them out.';

  const db = p.dealbreakers || [];
  if (has(db, 'contractor') && ['contractor', 'participant'].includes(rec.workerStatus)) return 'Contractor or participant status, and you want employee status.';
  if (has(db, 'onsite') && ['onsite', 'hybrid'].includes(g.setting)) return 'Requires going in person.';
  if (has(db, 'unpaid_test') && (rec.requirements.assessment === 'unpaid_test' || has(rec.riskFlags, 'unpaid_assessment'))) return 'Has an unpaid test or assessment.';
  if (has(db, 'fees') && (has(rec.riskFlags, 'fees') || (rec.fees && rec.fees.trim()))) return 'Charges fees or commission.';
  if (has(db, 'emotional_content') && has(rec.riskFlags, 'emotional_content')) return 'May involve disturbing content.';

  if (Array.isArray(p.equipment) && !p.equipment.includes('computer') && has(rec.requirements.equipment, 'computer')) {
    return 'Needs a computer.';
  }

  if (p.adult === false && (rec.requirements.minAge ?? 0) >= 18) return `Minimum age ${rec.requirements.minAge}.`;

  if (answered(p.hours) && rec.schedule.hoursMinWeekly != null) {
    if (rec.schedule.hoursMinWeekly > CONFIG.hoursCap[p.hours]) return `Needs at least ${rec.schedule.hoursMinWeekly} hours a week.`;
  }

  if (p.windowsFirm === true && Array.isArray(p.windows) && p.windows.length > 0) {
    const w = rec.schedule.windows;
    if (rec.schedule.flexibility !== 'flexible' && w.length > 0 && !w.some(x => p.windows.includes(x))) {
      return 'Its hours fall outside the times you can work.';
    }
  }

  if (p.minPayFirm === true && p.minPay > 0) {
    const h = hourlyCad(rec);
    if (h && h.hi < p.minPay) return `Published pay tops out around $${h.hi.toFixed(0)}/hr CAD, below your floor.`;
  }
  return null;
}

// ---------- soft components ----------
// Each returns { s: -1..1, why?: string, caution?: string } or null when there is nothing to judge.

function cInteraction(rec, p) {
  const m = rec.interaction.modes;
  const live = has(m, 'voice') || has(m, 'video') || has(m, 'in_person') || rec.interaction.realtime === 'high';
  const textish = has(m, 'text') || has(m, 'independent');
  let out = null;
  // Interaction style not recorded: say nothing positive or negative about it.
  switch (m.length ? p.interaction : null) {
    case 'text':
      out = live && !has(m, 'text') ? { s: -0.7, caution: 'Mostly live interaction, and you prefer text.' }
        : has(m, 'text') ? { s: 1, why: 'Mostly written communication, which you prefer.' }
        : { s: 0.5, why: 'Little live interaction.' };
      break;
    case 'independent':
      out = has(m, 'independent') && rec.interaction.realtime !== 'high' ? { s: 1, why: 'Largely independent work.' }
        : live ? { s: -0.8, caution: 'Involves a lot of live interaction; you prefer working on your own.' }
        : { s: 0.2 };
      break;
    case 'live':
      out = live ? { s: 0.8, why: 'Uses the live interaction you are comfortable with.' } : { s: 0.3 };
      break;
    case 'mix':
      out = live && textish ? { s: 0.8, why: 'A mix of live and solo work.' } : { s: 0.4 };
      break;
    default:
      out = null;
  }
  if (p.phone === 'prefer_not' && rec.interaction.phone) {
    out = { s: Math.min(out ? out.s : 0, -0.5), caution: 'Includes phone or voice calls, which you said you would rather avoid.' };
  }
  if ((p.phone === 'no' || p.phone === 'prefer_not') && rec.interaction.phone === null) {
    out = { s: Math.min(out ? out.s : 0, -0.3), caution: 'We couldn’t confirm whether phone calls are part of it.' };
  }
  return out;
}

function cSkills(rec, p) {
  const st = p.strengths || {};
  const comfort = p.computer; // 1..3 or null
  let total = 0, n = 0;
  const why = [], caution = [];
  const labels = { writing: 'writing', detail: 'careful checking', numeracy: 'numbers', technical: 'troubleshooting', customer: 'helping customers', creative: 'creative work', language: 'a second language' };
  for (const [k, label] of Object.entries(labels)) {
    const demand = rec.skills[k];
    if (!demand) continue;
    const a = st[k];
    if (a === 'yes') { total += demand >= 2 ? 1 : 0.5; n++; if (demand >= 2) why.push(label); }
    else if (a === 'learn') { total += demand >= 3 ? 0 : 0.3; n++; }
    else if (a === 'prefer_not') { total -= demand >= 2 ? 1 : 0.3; n++; if (demand >= 2) caution.push(label); }
    // unanswered / not sure: neutral by design, contributes nothing
  }
  if (answered(comfort)) {
    const need = rec.skills.computer;
    if (need > comfort) {
      const gap = need - comfort;
      total -= gap >= 2 ? 1 : 0.4; n++;
      caution.push(gap >= 2 ? 'more computer confidence than you have today' : 'a bit more computer confidence (learnable)');
    } else if (need >= 2) { total += 0.4; n++; }
  }
  if (!n) return null;
  return {
    s: Math.max(-1, Math.min(1, total / n)),
    why: why.length ? `Leans on ${why.join(', ')}, which you like.` : undefined,
    caution: caution.length ? `Asks for ${caution.join(', ')}.` : undefined,
  };
}

function cGoals(rec, p) {
  const goals = (p.goals || []).filter(g => g !== 'explore');
  if (!goals.length) return null;
  const parts = [];
  for (const g of goals) {
    if (g === 'fast') {
      const quick = rec.timeToFirstEarnings === 'days' || (rec.timeToFirstEarnings === 'weeks' && rec.horizon === 'now');
      parts.push(quick ? { s: 1, why: 'Can lead to first earnings fairly quickly.' }
        : rec.timeToFirstEarnings === 'months' || rec.horizon === 'career' ? { s: -0.6, caution: 'Slow route to first earnings.' } : { s: 0 });
    }
    if (g === 'stable') {
      const steady = rec.workerStatus === 'employee' || rec.reliability.workVolume === 'steady';
      parts.push(steady ? { s: 1, why: 'More predictable than gig work.' }
        : ['sporadic', 'variable'].includes(rec.reliability.workVolume) ? { s: -0.7, caution: 'Work volume varies; not a steady income on its own.' } : { s: 0 });
    }
    if (g === 'flexible') {
      parts.push(rec.schedule.flexibility === 'flexible' ? { s: 1, why: 'You choose when you work.' }
        : rec.schedule.flexibility === 'fixed' || rec.schedule.flexibility === 'shifts' ? { s: -0.4, caution: 'Set shifts or schedule.' } : { s: 0 });
    }
    if (g === 'career') {
      parts.push(rec.horizon === 'career' ? { s: 1, why: 'Builds toward a longer-term route.' }
        : rec.horizon === 'bridge' ? { s: 0.5, why: 'Can be a stepping stone.' } : { s: -0.2 });
    }
  }
  const s = parts.reduce((a, b) => a + b.s, 0) / parts.length;
  return {
    s,
    why: parts.filter(x => x.why).map(x => x.why).join(' ') || undefined,
    caution: parts.filter(x => x.caution).map(x => x.caution).join(' ') || undefined,
  };
}

function cSchedule(rec, p) {
  if (!Array.isArray(p.windows) || !p.windows.length) return null;
  if (rec.schedule.flexibility === 'flexible') return { s: 0.8, why: 'Flexible hours.' };
  const w = rec.schedule.windows;
  if (!w.length) return { s: 0 };
  const overlap = w.filter(x => p.windows.includes(x)).length;
  if (!overlap) return { s: -0.8, caution: 'Its usual hours don’t match the times you gave.' };
  return { s: overlap / w.length >= 0.5 ? 0.6 : 0.2 };
}

function cPredictability(rec, p) {
  const goals = p.goals || [];
  if (!goals.includes('stable') && !goals.includes('fast')) return null;
  const pr = rec.reliability.predictability;
  if (pr === 'high') return { s: 1 };
  if (pr === 'medium') return { s: 0.3 };
  if (pr === 'low') return { s: -0.6, caution: 'Hard to predict how much you will earn.' };
  return { s: 0 };
}

function cLearning(rec, p) {
  if (!answered(p.learn)) return null;
  const trainy = rec.training.required || rec.type === 'training_pathway';
  if (!trainy) return { s: 0.2 };
  if (p.learn === 'yes') return { s: 0.8, why: 'Includes training, which you are open to.' };
  if (p.learn === 'some') return { s: 0 };
  return { s: -0.8, caution: 'Requires training before you earn.' };
}

function cPay(rec, p) {
  if (!(p.minPay > 0)) return null;
  const h = hourlyCad(rec);
  if (!h) return { s: 0, caution: 'Pay isn’t published as an hourly rate, so we can’t check it against your floor.' };
  if (h.lo >= p.minPay) return { s: 1, why: `Published pay meets your floor (about $${h.lo.toFixed(0)}+/hr CAD).` };
  if (h.hi >= p.minPay) return { s: 0.2, caution: 'Only part of the published pay range meets your floor.' };
  return { s: -1, caution: 'Published pay is below your floor.' };
}

function cEquipment(rec, p) {
  if (!Array.isArray(p.equipment)) return null;
  const missing = rec.requirements.equipment.filter(e => e !== 'computer' && !p.equipment.includes(e));
  if (!missing.length) return { s: 0.3 };
  return { s: -0.4, caution: `Needs ${missing.join(', ')}, which you didn’t list.` };
}

function cEvidence(rec, today) {
  const base = { strong: 1, moderate: 0.4, weak: -0.4 }[rec.evidenceStrength];
  let s = base;
  if (rec.status === 'uncertain' || rec.status === 'waitlist_or_no_work_guarantee') s -= 0.4;
  if (isStale(rec, today)) s -= 0.8;
  if (rec.legitimacy === 'unclear') s -= 0.5;
  return { s: Math.max(-1, Math.min(1, s)) };
}

// ---------- scoring ----------

export function scoreRecord(rec, p, today) {
  const comps = {
    interaction: cInteraction(rec, p),
    skills: cSkills(rec, p),
    goals: cGoals(rec, p),
    schedule: cSchedule(rec, p),
    predictability: cPredictability(rec, p),
    learning: cLearning(rec, p),
    pay: cPay(rec, p),
    equipment: cEquipment(rec, p),
    evidence: cEvidence(rec, today),
  };
  // The denominator is the sum of ALL weights, so an unanswered question contributes 0 (neutral)
  // rather than vanishing. That keeps "not sure" exactly neutral and a mild positive (e.g.
  // "would learn") always at least as good as skipping.
  let num = 0;
  const den = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const breakdown = [];
  for (const [k, c] of Object.entries(comps)) {
    if (!c) continue;
    num += WEIGHTS[k] * c.s;
    breakdown.push({ key: k, s: Math.round(c.s * 100) / 100, weight: WEIGHTS[k] });
  }
  const score = num / den;
  const why = Object.values(comps).filter(c => c && c.why).map(c => c.why);
  const cautions = Object.values(comps).filter(c => c && c.caution).map(c => c.caution);
  return { score: Math.round(score * 1000) / 1000, breakdown, why, cautions };
}

export function fitLabel(score) {
  if (score >= 0.45) return 'Strong fit';
  if (score >= 0.25) return 'Good fit';
  if (score >= 0.05) return 'Possible fit';
  return 'Long shot';
}

// What is still unknown about a record, independent of the user.
export function uncertainties(rec, today, p = {}) {
  const u = [];
  if (isRestricted(rec)) u.push(`Only open to: ${rec.audience.join('; ')}.`);
  if (rec.type === 'category') u.push('This is a kind of work, not a specific employer or opening.');
  if (rec.geography.canadaEligibility === 'unclear') u.push('Whether it accepts people in Canada is unclear.');
  if (rec.geography.canadaEligibility === 'likely') u.push('Canadian eligibility is likely but not confirmed by an official source.');
  if (p.region === 'outside') u.push('Not checked for countries outside Canada.');
  if (!answered(p.region)) u.push('You didn’t say where you are, so eligibility wasn’t filtered.');
  if (rec.interaction.phone === null || !rec.interaction.modes.length) u.push('How much live or phone interaction it involves is not recorded.');
  if (!rec.officialUrl) u.push('No official website could be verified.');
  if (rec.compensation.currency === 'unstated') u.push('Pay was published without a currency.');
  if (rec.compensation.basis === 'unknown' || (rec.compensation.min == null && rec.compensation.max == null)) u.push('Pay is not published or not verified.');
  else if (rec.compensation.basis !== 'official') u.push('Pay figures are self-reported or from aggregators, not official.');
  if (rec.reliability.workVolume === 'unknown') u.push('How much work is actually available is unknown.');
  if (rec.status !== 'applications_open_confirmed' && rec.type !== 'category' && rec.type !== 'program') u.push('No specific open posting was confirmed when we checked.');
  if (isStale(rec, today)) u.push(`Last checked ${rec.lastChecked}. This record needs re-checking.`);
  if (rec.evidenceStrength === 'weak') u.push('Evidence is thin.');
  return u;
}

// ---------- matching ----------

export function match(catalogue, profile, today) {
  const ranked = [];
  const excluded = [];
  for (const rec of catalogue) {
    const reason = hardFilter(rec, profile, today);
    if (reason) { excluded.push({ rec, reason }); continue; }
    const sc = scoreRecord(rec, profile, today);
    // With fewer than two preference signals the score is mostly evidence; don't dress it up as fit.
    const signals = sc.breakdown.filter(b => b.key !== 'evidence').length;
    ranked.push({ rec, ...sc, label: signals < 2 ? 'Not enough answers yet' : fitLabel(sc.score), stale: isStale(rec, today) });
  }
  // Deterministic: score desc, then evidence, then fewer risk flags, then id.
  const ev = { strong: 0, moderate: 1, weak: 2 };
  ranked.sort((a, b) => b.score - a.score || ev[a.rec.evidenceStrength] - ev[b.rec.evidenceStrength]
    || a.rec.riskFlags.length - b.rec.riskFlags.length || a.rec.id.localeCompare(b.rec.id));
  excluded.sort((a, b) => a.rec.id.localeCompare(b.rec.id));
  return { ranked, excluded };
}

// Pick three distinct recommendations. `liked` ids are boosted (the user's swipes count),
// `passed` ids are dropped. Category records may fill a slot but never the first one if a
// specific route exists.
export const isRestricted = rec => Array.isArray(rec.audience) && rec.audience.length > 0;

export function pickThree(ranked, { liked = [], passed = [] } = {}) {
  // Routes limited to a specific group (rec.audience) only enter the shortlist if the person
  // liked or saved them: we never ask about those characteristics, so we never assume them.
  const pool = ranked
    .filter(m => !passed.includes(m.rec.id) && !m.stale && m.score > -0.15)
    .filter(m => !isRestricted(m.rec) || liked.includes(m.rec.id))
    .map(m => ({ ...m, adj: m.score + (liked.includes(m.rec.id) ? 0.25 : 0) }))
    .sort((a, b) => b.adj - a.adj || a.rec.riskFlags.length - b.rec.riskFlags.length || a.rec.id.localeCompare(b.rec.id));
  if (!pool.length) return [];

  // The best-fit slot goes to an actual earning route: not a category, and not a support
  // program or search tool (those can still fill the other two slots).
  const first = pool.find(m => !['category', 'program'].includes(m.rec.type))
    || pool.find(m => m.rec.type !== 'category') || pool[0];
  const picks = [{ role: 'best', title: 'Best overall fit', ...first }];
  const used = new Set([first.rec.id]);

  const differs = (m, ref) => m.rec.category !== ref.rec.category || m.rec.type !== ref.rec.type;
  const second = pool.find(m => !used.has(m.rec.id) && m.rec.category !== first.rec.category && differs(m, first))
    || pool.find(m => !used.has(m.rec.id) && differs(m, first));
  if (second) { picks.push({ role: 'alternative', title: 'Different trade-off', ...second }); used.add(second.rec.id); }

  const cats = new Set(picks.map(x => x.rec.category));
  const horizons = new Set(picks.map(x => x.rec.horizon));
  const third = pool.find(m => !used.has(m.rec.id) && !horizons.has(m.rec.horizon) && !cats.has(m.rec.category))
    || pool.find(m => !used.has(m.rec.id) && !horizons.has(m.rec.horizon))
    || pool.find(m => !used.has(m.rec.id) && !cats.has(m.rec.category))
    || pool.find(m => !used.has(m.rec.id));
  if (third) {
    const stretch = third.rec.horizon !== 'now' && !picks.some(x => x.rec.horizon === third.rec.horizon);
    picks.push({ role: stretch ? 'stretch' : 'flexible', title: stretch ? 'Longer-term or stretch route' : 'Another angle', ...third });
  }
  return picks;
}

// Describe how a pick differs from the best one, in plain words.
export function contrast(pick, best) {
  if (pick.rec.id === best.rec.id) return null;
  const d = [];
  if (pick.rec.category !== best.rec.category) d.push(`a different field (${CATEGORIES[pick.rec.category]})`);
  if (pick.rec.workerStatus !== best.rec.workerStatus) d.push(`${pick.rec.workerStatus} rather than ${best.rec.workerStatus} status`);
  if (pick.rec.horizon !== best.rec.horizon) d.push({ now: 'earns sooner', bridge: 'a stepping-stone route', career: 'a longer-term route' }[pick.rec.horizon]);
  if (pick.rec.schedule.flexibility !== best.rec.schedule.flexibility) d.push(`${pick.rec.schedule.flexibility} hours`);
  return d.length ? `Compared with the best fit: ${d.join('; ')}.` : null;
}
