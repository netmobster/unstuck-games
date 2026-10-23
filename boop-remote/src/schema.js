// Catalogue schema: enums and a dependency-free validator.
// Used by the build script, the tests and (defensively) the app at load time.

export const TYPES = ['employment', 'contract', 'freelance', 'task_platform', 'research_participation', 'training_pathway', 'program', 'category'];

export const CATEGORIES = {
  customer_ops: 'Customer & business operations',
  language_writing: 'Language, writing & audio',
  ai_data: 'AI, data & evaluation',
  tech_digital: 'Software & digital operations',
  research_participation: 'Paid research participation',
  creative_production: 'Creative & production',
  structured_employment: 'Structured employment',
  freelance_microbusiness: 'Freelance & microbusiness',
  government_program: 'Public programs & training',
};

// Verification statuses. Order matters only for display.
export const STATUSES = {
  applications_open_confirmed: 'Applications open (confirmed on an official page)',
  registration_open_not_work_guaranteed: 'Sign-up open, work not guaranteed',
  eligibility_confirmed: 'Canadian eligibility confirmed, openings not checked',
  official_info_found: 'Official information found, openings not checked',
  waitlist_or_no_work_guarantee: 'Waitlist or reports of little work',
  uncertain: 'Uncertain: thin or conflicting evidence',
  not_currently_open: 'Not currently open',
  stale_needs_recheck: 'Stale: needs re-checking',
  rejected: 'Researched and rejected',
};

// Short labels for chips on cards.
export const STATUS_SHORT = {
  applications_open_confirmed: 'Open now',
  registration_open_not_work_guaranteed: 'Sign-up open',
  eligibility_confirmed: 'Eligible in Canada',
  official_info_found: 'Official info',
  waitlist_or_no_work_guarantee: 'Waitlist / little work',
  uncertain: 'Uncertain',
  not_currently_open: 'Closed',
  stale_needs_recheck: 'Stale',
  rejected: 'Rejected',
};

export const TYPE_LABELS = {
  employment: 'Job (employee)',
  contract: 'Contract role',
  freelance: 'Freelance',
  task_platform: 'Task platform',
  research_participation: 'Paid research (not a job)',
  training_pathway: 'Training route',
  program: 'Public program',
  category: 'Kind of work to investigate',
};

export const SOURCE_TYPES = ['official', 'government', 'independent_review', 'forum', 'journalism', 'aggregator'];
export const ELIGIBILITY = ['confirmed', 'likely', 'unclear', 'not_eligible'];
export const SETTINGS = ['remote', 'hybrid', 'onsite', 'varies'];
export const WINDOWS = ['day', 'evening', 'night', 'weekend'];
export const MODES = ['text', 'voice', 'video', 'in_person', 'independent'];
export const SKILLS = ['computer', 'writing', 'numeracy', 'detail', 'customer', 'technical', 'creative', 'language'];
export const HORIZONS = ['now', 'bridge', 'career'];
export const WORKER = ['employee', 'contractor', 'participant', 'student', 'varies', 'unknown'];
export const EVIDENCE = ['strong', 'moderate', 'weak'];
export const LEGITIMACY = ['established', 'likely', 'unclear'];
export const ASSESSMENTS = ['none', 'free_test', 'unpaid_test', 'paid_test', 'interview', 'unknown'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isHttpUrl(s) {
  if (typeof s !== 'string') return false;
  try {
    const u = new URL(s);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

// Validate one record. Returns a list of human-readable problems (empty = valid).
export function validateRecord(r) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  const oneOf = (v, list, field) => need(list.includes(v), `${field}: "${v}" not in [${list.join(', ')}]`);
  const str = (v, field) => need(typeof v === 'string' && v.trim().length > 0, `${field}: missing text`);

  if (!r || typeof r !== 'object') return ['record is not an object'];
  need(typeof r.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id), `id: "${r.id}" must be a kebab-case slug`);
  str(r.name, 'name');
  str(r.organization, 'organization');
  oneOf(r.type, TYPES, 'type');
  oneOf(r.category, Object.keys(CATEGORIES), 'category');
  str(r.summary, 'summary');
  str(r.whatYouDo, 'whatYouDo');
  need(Array.isArray(r.appeal) && r.appeal.length > 0, 'appeal: needs at least one item');
  need(Array.isArray(r.watchOuts) && r.watchOuts.length > 0, 'watchOuts: needs at least one item');
  // officialUrl may be null when no official site could be verified; the UI then links to the best source.
  need(r.officialUrl === null || isHttpUrl(r.officialUrl), `officialUrl: invalid "${r.officialUrl}"`);
  if (r.officialUrl === null && r.type !== 'category') {
    need(['uncertain', 'rejected', 'stale_needs_recheck', 'not_currently_open'].includes(r.status), 'a specific route without a verified official site must be uncertain/rejected/stale/closed');
  }
  need(r.applyUrl === null || isHttpUrl(r.applyUrl), `applyUrl: invalid "${r.applyUrl}"`);

  const g = r.geography || {};
  need(Array.isArray(g.countries), 'geography.countries: must be an array');
  need(Array.isArray(g.regions), 'geography.regions: must be an array');
  oneOf(g.canadaEligibility, ELIGIBILITY, 'geography.canadaEligibility');
  oneOf(g.setting, SETTINGS, 'geography.setting');

  const q = r.requirements || {};
  oneOf(q.experience, ['none', 'some', 'significant', 'unknown'], 'requirements.experience');
  need(typeof q.credentialRequired === 'boolean', 'requirements.credentialRequired: boolean');
  need(Array.isArray(q.equipment), 'requirements.equipment: array');
  oneOf(q.assessment, ASSESSMENTS, 'requirements.assessment');

  const s = r.schedule || {};
  oneOf(s.flexibility, ['flexible', 'shifts', 'fixed', 'varies', 'unknown'], 'schedule.flexibility');
  need(Array.isArray(s.windows) && s.windows.every(w => WINDOWS.includes(w)), 'schedule.windows: invalid');

  const i = r.interaction || {};
  // Empty modes / null phone mean "not known"; the engine treats them as unknown, never as a pass.
  need(Array.isArray(i.modes) && i.modes.every(m => MODES.includes(m)), 'interaction.modes: invalid');
  oneOf(i.realtime, ['none', 'some', 'high', 'unknown'], 'interaction.realtime');
  need(typeof i.phone === 'boolean' || i.phone === null, 'interaction.phone: boolean or null');

  const k = r.skills || {};
  for (const sk of SKILLS) need(Number.isInteger(k[sk]) && k[sk] >= 0 && k[sk] <= 3, `skills.${sk}: integer 0..3`);

  const c = r.compensation || {};
  need(c.min === null || typeof c.min === 'number', 'compensation.min: number|null');
  need(c.max === null || typeof c.max === 'number', 'compensation.max: number|null');
  oneOf(c.basis, ['official', 'self_reported', 'aggregator', 'unknown'], 'compensation.basis');
  if (c.min !== null || c.max !== null) {
    need(['CAD', 'USD', 'unstated'].includes(c.currency) && !!c.unit, 'compensation: numbers need a currency (CAD, USD or "unstated") and unit');
    need(c.basis !== 'unknown', 'compensation: numbers need a basis');
  }

  const rel = r.reliability || {};
  oneOf(rel.workVolume, ['steady', 'variable', 'sporadic', 'unknown'], 'reliability.workVolume');
  oneOf(rel.predictability, ['high', 'medium', 'low', 'unknown'], 'reliability.predictability');
  oneOf(r.workerStatus, WORKER, 'workerStatus');
  oneOf(r.timeToFirstEarnings, ['days', 'weeks', 'months', 'unknown'], 'timeToFirstEarnings');
  oneOf(r.horizon, HORIZONS, 'horizon');
  oneOf(r.status, Object.keys(STATUSES), 'status');
  oneOf(r.legitimacy, LEGITIMACY, 'legitimacy');
  oneOf(r.evidenceStrength, EVIDENCE, 'evidenceStrength');
  need(Array.isArray(r.riskFlags), 'riskFlags: array');
  need(r.audience === undefined || (Array.isArray(r.audience) && r.audience.every(a => typeof a === 'string' && a.trim())), 'audience: optional array of labels');
  str(r.fitsIf, 'fitsIf');
  str(r.notFitIf, 'notFitIf');
  need(DATE_RE.test(r.lastChecked || ''), 'lastChecked: YYYY-MM-DD');

  need(Array.isArray(r.sources) && r.sources.length > 0, 'sources: at least one source required');
  for (const [n, src] of (r.sources || []).entries()) {
    need(isHttpUrl(src.url), `sources[${n}].url invalid`);
    str(src.title, `sources[${n}].title`);
    oneOf(src.type, SOURCE_TYPES, `sources[${n}].type`);
    need(DATE_RE.test(src.accessed || ''), `sources[${n}].accessed: YYYY-MM-DD`);
    need(Array.isArray(src.claims), `sources[${n}].claims: array`);
  }

  // Evidence rules that encode the research policy.
  const official = (r.sources || []).filter(x => (x.type === 'official' || x.type === 'government') && x.accessible !== false);
  if (r.status === 'applications_open_confirmed') {
    need(official.some(x => x.claims.includes('status')), 'applications_open_confirmed needs an accessible official source supporting "status"');
  }
  if (r.applyUrl) {
    need((r.sources || []).some(x => x.url === r.applyUrl && x.accessible !== false), 'applyUrl must be a source page that was actually opened');
  }
  if (r.type === 'category') {
    need(r.applyUrl === null, 'category records must not have an applyUrl');
    need(['official_info_found', 'uncertain', 'stale_needs_recheck'].includes(r.status), 'category records cannot claim openings/eligibility statuses');
  }
  if (r.geography && r.geography.canadaEligibility === 'confirmed') {
    need(official.length > 0, 'canadaEligibility "confirmed" needs an official or government source');
  }
  return errs;
}

export function validateCatalogue(records) {
  const problems = [];
  const ids = new Set();
  for (const r of records) {
    for (const e of validateRecord(r)) problems.push(`${r && r.id}: ${e}`);
    if (ids.has(r.id)) problems.push(`${r.id}: duplicate id`);
    ids.add(r.id);
  }
  return problems;
}
