// The v2 data contract: controlled vocabularies and the JSON Schema for catalogue.v2.json.
// `node scripts/v2/schema.mjs` writes data/v2/catalogue.schema.json. Everything else in
// scripts/v2/ imports the enums from here, so the validator, the builder and the schema agree.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = '2.0.0';
export const DATASET_ID = 'opportunity-engine-ontario';

export const E = {
  record_type: ['specific_job', 'employer', 'task_platform', 'freelance_marketplace', 'service_business', 'research_participation', 'training_program', 'funded_employment_program', 'government_support', 'work_category'],
  category: ['customer_ops', 'language_writing', 'ai_data', 'tech_digital', 'research_participation', 'creative_production', 'structured_employment', 'freelance_microbusiness', 'government_program'],
  availability_status: ['open_specific_opportunity', 'accepting_applications', 'registration_open_work_not_guaranteed', 'program_open_check_eligibility', 'temporarily_paused', 'closed_or_not_open', 'waitlist', 'availability_unknown', 'not_eligible_for_ontario', 'rejected_insufficient_evidence', 'not_applicable_category'],
  eligibility: ['confirmed', 'likely', 'partial', 'unclear', 'not_eligible'],
  experience: ['none', 'some', 'significant', 'unknown'],
  work_location: ['remote', 'hybrid', 'onsite', 'varies', 'unknown'],
  relationship_type: ['employee', 'contractor', 'platform', 'freelance', 'participant', 'trainee', 'varies', 'unknown'],
  schedule_type: ['fixed', 'shifts', 'flexible', 'task_based', 'varies', 'unknown'],
  hours_commitment: ['none', 'low', 'part_time', 'full_time', 'varies', 'unknown'],
  time_window: ['day', 'evening', 'night', 'weekend'],
  level3: ['none', 'some', 'high', 'unknown'],
  yes_no_sometimes: ['yes', 'no', 'sometimes', 'unknown'],
  yes_no_partly: ['yes', 'no', 'partly', 'unknown'],
  yes_no_mixed: ['yes', 'no', 'mixed', 'unknown'],
  yes_no: ['yes', 'no', 'unknown'],
  task_variety: ['repetitive', 'varied', 'mixed', 'unknown'],
  pressure: ['low', 'medium', 'high', 'unknown'],
  work_guaranteed: ['yes', 'conditional', 'competitive', 'sporadic', 'no', 'unknown'],
  pay_type: ['hourly', 'salary', 'per_task', 'per_project', 'per_minute_audio', 'per_word', 'per_lead', 'commission', 'revenue_share', 'royalties', 'stipend', 'participant_compensation', 'wage_subsidy', 'none', 'mixed', 'unknown'],
  currency: ['CAD', 'USD', 'unstated'],
  rate_unit: ['hour', 'task', 'project', 'minute_audio', 'word', 'lead', 'study', 'month', 'year', 'other'],
  time_to_first_payment: ['days', 'weeks', 'months', 'unknown'],
  income_predictability: ['high', 'medium', 'low', 'none', 'unknown'],
  earnings_depend_on: ['winning_clients', 'receiving_tasks', 'passing_qualification', 'being_selected', 'sales', 'hours_worked', 'program_funding', 'audience_or_downloads'],
  upfront_cost: ['none', 'low', 'moderate', 'high', 'unknown'],
  risk: ['no_guaranteed_work', 'competitive_acceptance', 'low_task_volume', 'unpaid_qualification', 'unpredictable_income', 'upfront_fees', 'commission_or_platform_fees', 'scam_impersonation', 'geographic_restriction', 'contractor_tax_obligations', 'commission_dependence', 'low_monetization_probability', 'equipment_barrier', 'emotional_content', 'phone_heavy', 'account_deactivation_reports', 'payment_delay_reports', 'stale_information', 'credential_required', 'age_or_group_restricted', 'funding_uncertain', 'in_person_required'],
  progression: ['low', 'medium', 'high', 'unknown'],
  horizon: ['now', 'bridge', 'career'],
  evidence_quality: ['strong', 'moderate', 'weak', 'insufficient'],
  disposition: ['retained', 'updated', 'downgraded', 'merged', 'rejected', 'new'],
  source_type: ['official', 'government', 'academic', 'independent_reporting', 'worker_anecdote', 'aggregator', 'job_board', 'other'],
  access_status: ['opened_and_reviewed', 'search_result_only', 'access_blocked', 'not_found', 'not_checked'],
  claim: ['existence', 'official_url', 'canadian_eligibility', 'ontario_eligibility', 'availability', 'application_route', 'pay', 'fees', 'requirements', 'work_conditions', 'work_volume', 'risks', 'legitimacy', 'scam_warning', 'program_eligibility', 'funding', 'training'],
  skill: ['computer', 'writing', 'numeracy', 'detail', 'customer', 'technical', 'creative', 'language'],
};

const str = { type: 'string' };
const text = { type: 'string', minLength: 1 };
const strArr = { type: 'array', items: str };
const en = k => ({ type: 'string', enum: E[k] });
const enArr = k => ({ type: 'array', items: en(k), uniqueItems: true });
const nul = s => ({ anyOf: [s, { type: 'null' }] });
const url = { type: 'string', pattern: '^https?://[^\\s]+\\.[^\\s]+$' };
const isoDate = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2}))?$' };
const obj = (properties, extra = {}) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false, ...extra });
const rate = nul(obj({ min: nul({ type: 'number' }), max: nul({ type: 'number' }), unit: nul(en('rate_unit')), note: str }));

export const sourceSchema = obj({
  url,
  source_type: en('source_type'),
  publisher: nul(str),
  title: text,
  access_status: en('access_status'),
  accessed_at: isoDate,
  published_at: nul(str),
  supports: enArr('claim'),
  evidence_summary: text,
  limitations: strArr,
});

const skills = {};
for (const k of E.skill) skills[k] = { type: 'integer', minimum: 0, maximum: 3 };

export const recordSchema = obj({
  id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
  name: text,
  organization: nul(str),
  record_type: en('record_type'),
  category: en('category'),
  summary: text,
  what_you_do: text,
  how_to_find_work: nul(str),
  who_it_may_fit: strArr,
  who_it_may_not_fit: strArr,
  audience_restriction: strArr,
  region_eligibility: obj({
    canadian_residents: en('eligibility'),
    ontario_residents: en('eligibility'),
    provinces: strArr,
    eligibility_notes: strArr,
    work_authorization_notes: nul(str),
  }),
  availability_status: en('availability_status'),
  availability_checked_at: nul(isoDate),
  availability_evidence: strArr,
  application_or_registration_url: nul(url),
  official_url: nul(url),
  requirements: obj({
    minimum_age: nul({ type: 'integer', minimum: 0 }),
    education: nul(str),
    experience: en('experience'),
    languages: strArr,
    equipment: strArr,
    certifications: strArr,
    other: strArr,
  }),
  work_conditions: obj({
    work_location: en('work_location'),
    relationship_type: en('relationship_type'),
    schedule_type: en('schedule_type'),
    hours_commitment: en('hours_commitment'),
    hours_min_weekly: nul({ type: 'number' }),
    hours_max_weekly: nul({ type: 'number' }),
    time_windows: enArr('time_window'),
    real_time_interaction: en('level3'),
    phone_or_video_required: en('yes_no_sometimes'),
    text_based_work: en('yes_no_partly'),
    independent_work: en('yes_no_mixed'),
    task_variety: en('task_variety'),
    customer_facing: en('level3'),
    sales_or_commission: en('yes_no'),
    deadline_pressure: en('pressure'),
    work_guaranteed: en('work_guaranteed'),
    emotional_content_risk: en('yes_no'),
    training_required: en('yes_no'),
    conditions_notes: strArr,
  }),
  skill_demands: obj(skills),
  economics: obj({
    pay_type: en('pay_type'),
    currency: nul(en('currency')),
    advertised_rate: rate,
    verified_rate: rate,
    anecdotal_effective_rate: nul(obj({ min: nul({ type: 'number' }), max: nul({ type: 'number' }), unit: nul(en('rate_unit')), basis: text })),
    rate_unit: nul(en('rate_unit')),
    fees: strArr,
    payment_terms: strArr,
    unpaid_work: strArr,
    time_to_first_payment: nul(en('time_to_first_payment')),
    income_predictability: en('income_predictability'),
    earnings_depend_on: enArr('earnings_depend_on'),
    economics_notes: strArr,
  }),
  costs: obj({ upfront_cost: en('upfront_cost'), required_purchases: strArr, potential_expenses: strArr }),
  risks: enArr('risk'),
  risk_notes: strArr,
  barriers: strArr,
  progression_potential: en('progression'),
  horizon: en('horizon'),
  evidence_quality: en('evidence_quality'),
  confidence: { type: 'number', minimum: 0, maximum: 1 },
  contradictions: strArr,
  last_researched_at: isoDate,
  sources: { type: 'array', items: sourceSchema },
  research_notes: strArr,
  open_questions: strArr,
  disposition: en('disposition'),
  disposition_reason: text,
  production_eligible: { type: 'boolean' },
  migration: obj({
    v1_id: nul(str),
    v1_name: nul(str),
    v1_status: nul(str),
    merged_into: nul(str),
    merged_from: strArr,
    changes: strArr,
    claims_verified: strArr,
    unresolved_claims: strArr,
  }),
});

export const catalogueSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://unstuck-games.com/boop-remote/data/v2/catalogue.schema.json',
  title: 'Opportunity Engine catalogue v2',
  description: 'Production dataset for Opportunity Engine (Ontario, Canada). Each record describes one earning route, program or kind of work with its evidence. Semantic rules not expressible here (e.g. which statuses need which evidence) are enforced by scripts/v2/validate.mjs and described in data/v2/SCHEMA.md.',
  ...obj({
    schema_version: { type: 'string', const: SCHEMA_VERSION },
    dataset_id: { type: 'string', const: DATASET_ID },
    generated_at: isoDate,
    research_scope: obj({
      primary_region: text,
      secondary_region: text,
      research_methodology: text,
      limitations: strArr,
    }),
    records: { type: 'array', items: recordSchema },
    summary: obj({
      total_records: { type: 'integer', minimum: 0 },
      verified_records: { type: 'integer', minimum: 0 },
      records_with_unverified_availability: { type: 'integer', minimum: 0 },
      rejected_records: { type: 'integer', minimum: 0 },
      record_type_counts: { type: 'object', additionalProperties: { type: 'integer' } },
      availability_status_counts: { type: 'object', additionalProperties: { type: 'integer' } },
      evidence_quality_counts: { type: 'object', additionalProperties: { type: 'integer' } },
      category_counts: { type: 'object', additionalProperties: { type: 'integer' } },
      disposition_counts: { type: 'object', additionalProperties: { type: 'integer' } },
      source_access_counts: { type: 'object', additionalProperties: { type: 'integer' } },
    }),
  }),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../../data/v2/catalogue.schema.json', import.meta.url);
  writeFileSync(out, JSON.stringify(catalogueSchema, null, 1) + '\n');
  console.log('wrote data/v2/catalogue.schema.json');
}
