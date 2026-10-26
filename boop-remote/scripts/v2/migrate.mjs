// Mechanical v1 → v2 migration. Produces data/v2/baseline/<category>.json: one file per v1
// category, every record carrying disposition "pending" and migration.v1_id. Nothing here is a
// research judgement: it is a field mapping, and every record must then be revalidated by hand
// before it can reach catalogue.v2.json (the builder refuses "pending").
//
// Usage: node scripts/v2/migrate.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const { records } = JSON.parse(readFileSync(new URL('data/catalogue.json', root), 'utf8'));
mkdirSync(new URL('data/v2/baseline/', root), { recursive: true });

const TYPE = { employment: 'employer', contract: 'employer', freelance: 'freelance_marketplace', task_platform: 'task_platform', research_participation: 'research_participation', training_pathway: 'training_program', program: 'government_support', category: 'work_category' };
const STATUS = {
  applications_open_confirmed: 'accepting_applications', registration_open_not_work_guaranteed: 'registration_open_work_not_guaranteed',
  eligibility_confirmed: 'availability_unknown', official_info_found: 'availability_unknown', waitlist_or_no_work_guarantee: 'waitlist',
  not_currently_open: 'closed_or_not_open', uncertain: 'availability_unknown', rejected: 'rejected_insufficient_evidence', stale_needs_recheck: 'availability_unknown',
};
const SRC = { official: 'official', government: 'government', independent_review: 'worker_anecdote', forum: 'worker_anecdote', journalism: 'independent_reporting', aggregator: 'aggregator' };
const CLAIM = { canada_eligibility: 'canadian_eligibility', pay: 'pay', status: 'availability', requirements: 'requirements', worker_status: 'work_conditions', reliability: 'work_volume', legitimacy: 'legitimacy', risk: 'risks', schedule: 'work_conditions', fees: 'fees', scam: 'scam_warning', training: 'training', funding: 'funding' };
const WORKER = { employee: 'employee', contractor: 'contractor', participant: 'participant', student: 'trainee', varies: 'varies', unknown: 'unknown' };
const FLEX = { flexible: 'flexible', shifts: 'shifts', fixed: 'fixed', varies: 'varies', unknown: 'unknown' };
const UNIT = { hour: 'hour', task: 'task', minute_audio: 'minute_audio', study: 'study', project: 'project', month: 'month', year: 'year' };
const PAYTYPE = { hour: 'hourly', task: 'per_task', minute_audio: 'per_minute_audio', study: 'participant_compensation', project: 'per_project', month: 'salary', year: 'salary' };
const RISK = { unpaid_assessment: 'unpaid_qualification', variable_work: 'low_task_volume', contractor_no_benefits: 'contractor_tax_obligations', fees: 'commission_or_platform_fees', account_deactivation_reports: 'account_deactivation_reports', emotional_content: 'emotional_content', payment_delay_reports: 'payment_delay_reports', waitlist: 'competitive_acceptance', scam_impersonation: 'scam_impersonation', phone_heavy: 'phone_heavy', equipment_cost: 'equipment_barrier' };

const uniq = a => [...new Set(a.filter(Boolean))];

function migrate(r) {
  const g = r.geography, q = r.requirements, s = r.schedule, i = r.interaction, c = r.compensation, rel = r.reliability;
  const cat = r.type === 'category';
  const provinceLimited = g.regions.length > 0;
  const ontario = g.canadaEligibility === 'not_eligible' ? 'not_eligible' : provinceLimited ? (g.regions.includes('ON') ? g.canadaEligibility : 'not_eligible') : g.canadaEligibility;
  const live = i.modes.some(m => ['voice', 'video', 'in_person'].includes(m));
  const rateObj = (c.min != null || c.max != null) ? { min: c.min, max: c.max, unit: UNIT[c.unit] || 'other', note: c.notes || '' } : null;
  const isAnecdotal = c.basis === 'self_reported';
  const risks = uniq(r.riskFlags.map(f => RISK[f]));
  if (rel.workVolume === 'sporadic' || rel.workVolume === 'variable') risks.push('no_guaranteed_work');
  if (rel.predictability === 'low') risks.push('unpredictable_income');
  if (g.setting === 'onsite' || g.setting === 'hybrid') risks.push('in_person_required');
  if (q.credentialRequired) risks.push('credential_required');
  if (r.audience && r.audience.length) risks.push('age_or_group_restricted');

  return {
    id: r.id,
    name: r.name,
    organization: r.organization === 'Various' ? null : r.organization,
    record_type: TYPE[r.type],
    category: r.category,
    summary: r.summary,
    what_you_do: r.whatYouDo,
    how_to_find_work: cat ? null : null,
    who_it_may_fit: [r.fitsIf, ...r.appeal],
    who_it_may_not_fit: [r.notFitIf, ...r.watchOuts],
    audience_restriction: r.audience || [],
    region_eligibility: {
      canadian_residents: g.canadaEligibility,
      ontario_residents: ontario,
      provinces: g.regions,
      eligibility_notes: [],
      work_authorization_notes: null,
    },
    availability_status: cat ? 'not_applicable_category' : STATUS[r.status],
    availability_checked_at: null,
    availability_evidence: [],
    application_or_registration_url: cat ? null : r.applyUrl,
    official_url: r.officialUrl,
    requirements: {
      minimum_age: q.minAge ?? null,
      education: q.credentialRequired ? (q.credentials.join('; ') || 'credential required') : (q.credentials.length ? q.credentials.join('; ') : null),
      experience: q.experience,
      languages: r.languages,
      equipment: q.equipment,
      certifications: [],
      other: [],
    },
    work_conditions: {
      work_location: g.setting,
      relationship_type: WORKER[r.workerStatus],
      schedule_type: r.type === 'task_platform' && s.flexibility === 'flexible' ? 'task_based' : FLEX[s.flexibility],
      hours_commitment: s.hoursMinWeekly >= 30 ? 'full_time' : s.hoursMinWeekly > 0 ? 'part_time' : 'unknown',
      hours_min_weekly: s.hoursMinWeekly ?? null,
      hours_max_weekly: s.hoursMaxWeekly ?? null,
      time_windows: s.windows,
      real_time_interaction: i.realtime,
      phone_or_video_required: i.phone === true ? 'yes' : i.phone === false ? (i.modes.includes('video') ? 'yes' : 'no') : 'unknown',
      text_based_work: i.modes.length ? (i.modes.includes('text') ? (live ? 'partly' : 'yes') : 'no') : 'unknown',
      independent_work: i.modes.length ? (i.modes.includes('independent') ? (live ? 'mixed' : 'yes') : 'no') : 'unknown',
      task_variety: 'unknown',
      customer_facing: r.skills.customer >= 2 ? 'high' : r.skills.customer === 1 ? 'some' : i.modes.length ? 'none' : 'unknown',
      sales_or_commission: 'unknown',
      deadline_pressure: 'unknown',
      work_guaranteed: rel.workVolume === 'steady' ? 'yes' : rel.workVolume === 'variable' ? 'conditional' : rel.workVolume === 'sporadic' ? 'sporadic' : 'unknown',
      emotional_content_risk: r.riskFlags.includes('emotional_content') ? 'yes' : 'unknown',
      training_required: r.training.required ? 'yes' : 'no',
      conditions_notes: uniq([rel.notes, r.training.notes]),
    },
    skill_demands: r.skills,
    economics: {
      pay_type: r.type === 'research_participation' ? 'participant_compensation' : c.unit ? PAYTYPE[c.unit] : (r.fees && /commission/i.test(r.fees) ? 'mixed' : 'unknown'),
      currency: c.currency || null,
      advertised_rate: isAnecdotal ? null : rateObj,
      verified_rate: null,
      anecdotal_effective_rate: isAnecdotal && rateObj ? { min: rateObj.min, max: rateObj.max, unit: rateObj.unit, basis: c.notes || 'self-reported figures' } : null,
      rate_unit: UNIT[c.unit] || null,
      fees: r.fees ? [r.fees] : [],
      payment_terms: [],
      unpaid_work: q.assessment === 'unpaid_test' ? ['Unpaid assessment or test before work'] : [],
      time_to_first_payment: r.timeToFirstEarnings,
      income_predictability: rel.predictability,
      earnings_depend_on: uniq([
        r.type === 'freelance' ? 'winning_clients' : null,
        r.type === 'task_platform' ? 'receiving_tasks' : null,
        ['unpaid_test', 'free_test', 'paid_test'].includes(q.assessment) ? 'passing_qualification' : null,
        r.type === 'research_participation' ? 'being_selected' : null,
        r.type === 'employment' || r.type === 'contract' ? 'hours_worked' : null,
      ]),
      economics_notes: uniq([c.notes]),
    },
    costs: { upfront_cost: r.training.cost === 'user_pays' ? 'moderate' : r.riskFlags.includes('equipment_cost') ? 'low' : 'unknown', required_purchases: [], potential_expenses: [] },
    risks: uniq(risks),
    risk_notes: [],
    barriers: [],
    progression_potential: r.horizon === 'career' ? 'high' : r.horizon === 'bridge' ? 'medium' : 'unknown',
    horizon: r.horizon,
    evidence_quality: r.evidenceStrength === 'strong' ? 'moderate' : r.evidenceStrength, // nothing opened: strong is impossible
    confidence: 0,
    contradictions: [],
    last_researched_at: r.lastChecked,
    sources: r.sources.map(src => ({
      url: src.url,
      source_type: SRC[src.type] || 'other',
      publisher: src.publisher || null,
      title: src.title,
      access_status: src.accessible === false ? 'search_result_only' : 'opened_and_reviewed',
      accessed_at: src.accessed,
      published_at: src.published || null,
      supports: uniq(src.claims.map(k => CLAIM[k])),
      evidence_summary: src.notes || '(no note recorded in v1)',
      limitations: src.accessible === false ? ['Seen only as a search-engine summary; the page itself was not opened.'] : [],
    })),
    research_notes: [],
    open_questions: [],
    disposition: 'pending',
    disposition_reason: 'Migrated from v1; awaiting revalidation.',
    production_eligible: false,
    migration: { v1_id: r.id, v1_name: r.name, v1_status: r.status, merged_into: null, merged_from: [], changes: [], claims_verified: [], unresolved_claims: [] },
  };
}

const byCat = {};
for (const r of records) (byCat[r.category] ||= []).push(migrate(r));
for (const [cat, list] of Object.entries(byCat)) {
  writeFileSync(new URL(`data/v2/baseline/${cat}.json`, root), JSON.stringify(list, null, 1) + '\n');
}
console.log(`migrated ${records.length} v1 records into ${Object.keys(byCat).length} baseline files`);
