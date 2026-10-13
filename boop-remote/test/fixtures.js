// Synthetic records for engine tests. These are NOT catalogue data.
const base = () => ({
  id: 'x',
  name: 'Test route',
  organization: 'Test Org',
  type: 'employment',
  category: 'customer_ops',
  tags: [],
  summary: 'A test route.',
  whatYouDo: 'Tests things.',
  appeal: ['Appeal'],
  watchOuts: ['Watch out'],
  officialUrl: 'https://example.org',
  applyUrl: null,
  geography: { countries: ['CA'], regions: [], canadaEligibility: 'confirmed', setting: 'remote' },
  languages: ['en'],
  requirements: { experience: 'none', credentialRequired: false, credentials: [], equipment: ['computer'], minAge: 18, assessment: 'none' },
  schedule: { flexibility: 'flexible', windows: [], hoursMinWeekly: null, hoursMaxWeekly: null },
  interaction: { modes: ['text'], realtime: 'none', phone: false },
  skills: { computer: 1, writing: 0, numeracy: 0, detail: 0, customer: 0, technical: 0, creative: 0, language: 0 },
  training: { required: false, cost: 'none', notes: '' },
  compensation: { min: null, max: null, currency: null, unit: null, basis: 'unknown', notes: '' },
  reliability: { workVolume: 'unknown', predictability: 'unknown', notes: '' },
  workerStatus: 'employee',
  fees: null,
  applicationSteps: [],
  timeToFirstEarnings: 'weeks',
  horizon: 'now',
  status: 'official_info_found',
  legitimacy: 'established',
  evidenceStrength: 'moderate',
  riskFlags: [],
  fitsIf: 'Fits someone.',
  notFitIf: 'Does not fit someone else.',
  lastChecked: '2026-10-13',
  sources: [{ url: 'https://example.org/about', title: 'About', type: 'official', publisher: 'Test', published: null, accessed: '2026-10-13', claims: ['legitimacy', 'canada_eligibility'], notes: '', accessible: true }],
});

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v;
  }
  return out;
};

export const rec = (o = {}) => merge(base(), o);

export const TODAY = '2026-10-13';

export const SAMPLE = [
  rec({ id: 'chat-support', name: 'Chat support', category: 'customer_ops', interaction: { modes: ['text'], realtime: 'high', phone: false }, schedule: { flexibility: 'shifts', windows: ['day', 'evening'] }, skills: { customer: 2, writing: 2 }, reliability: { workVolume: 'steady', predictability: 'high' }, compensation: { min: 18, max: 20, currency: 'CAD', unit: 'hour', basis: 'official' }, evidenceStrength: 'strong' }),
  rec({ id: 'phone-agent', name: 'Phone agent', category: 'customer_ops', interaction: { modes: ['voice'], realtime: 'high', phone: true }, schedule: { flexibility: 'shifts', windows: ['day'] }, requirements: { equipment: ['computer', 'headset'] }, skills: { customer: 3 }, evidenceStrength: 'strong' }),
  rec({ id: 'ai-rater', name: 'AI rater', type: 'task_platform', category: 'ai_data', workerStatus: 'contractor', interaction: { modes: ['independent', 'text'], realtime: 'none', phone: false }, skills: { writing: 2, detail: 3 }, reliability: { workVolume: 'variable', predictability: 'low' }, requirements: { assessment: 'unpaid_test' }, riskFlags: ['unpaid_assessment', 'variable_work'], compensation: { min: 15, max: 20, currency: 'USD', unit: 'hour', basis: 'official' }, timeToFirstEarnings: 'days' }),
  rec({ id: 'tutor-market', name: 'Tutoring marketplace', type: 'freelance', category: 'language_writing', workerStatus: 'contractor', interaction: { modes: ['video'], realtime: 'high', phone: false }, fees: '33% commission on first lesson', riskFlags: ['fees'], skills: { language: 2, customer: 2 }, geography: { countries: ['CA', 'US', 'GB'] } }),
  rec({ id: 'trades-app', name: 'Apprenticeship', type: 'training_pathway', category: 'government_program', horizon: 'career', geography: { setting: 'onsite', regions: ['ON'] }, interaction: { modes: ['in_person'], realtime: 'some', phone: false }, training: { required: true, cost: 'free' }, timeToFirstEarnings: 'months', schedule: { flexibility: 'fixed', windows: ['day'], hoursMinWeekly: 35 } }),
  rec({ id: 'moderation', name: 'Content moderation', category: 'customer_ops', riskFlags: ['emotional_content'], interaction: { modes: ['independent'], realtime: 'none', phone: false }, skills: { detail: 2 } }),
  rec({ id: 'qa-tester', name: 'Crowd QA tester', type: 'task_platform', category: 'tech_digital', workerStatus: 'contractor', interaction: { modes: ['independent'], realtime: 'none', phone: false }, skills: { technical: 2, detail: 2, computer: 2 }, reliability: { workVolume: 'sporadic', predictability: 'low' }, horizon: 'bridge' }),
  rec({ id: 'research-panel', name: 'Paid studies', type: 'research_participation', category: 'research_participation', workerStatus: 'participant', interaction: { modes: ['independent'], realtime: 'none', phone: false }, reliability: { workVolume: 'sporadic', predictability: 'low' }, timeToFirstEarnings: 'days', evidenceStrength: 'strong', geography: { countries: ['CA', 'US', 'GB'] } }),
  rec({ id: 'old-record', name: 'Old record', category: 'creative_production', lastChecked: '2025-01-01', evidenceStrength: 'strong' }),
  rec({ id: 'rejected-thing', name: 'Rejected thing', status: 'rejected', category: 'freelance_microbusiness' }),
  rec({ id: 'va-category', name: 'Virtual assistance', organization: 'Various', type: 'category', category: 'customer_ops', workerStatus: 'varies' }),
];
