// Build the static data API in boop-remote/api/ from data/catalogue.json.
// Usage: node boop-remote/scripts/build-api.mjs   (run after build-catalogue.mjs)
//
// Everything here is plain JSON a front end on another origin can fetch (nginx adds CORS headers
// for /boop-remote/api/). The JSON Schema is generated from the enums in src/schema.js, so it
// cannot drift from the validator.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../src/schema.js';
import { QUESTIONS } from '../src/questions.js';
import { WEIGHTS, CONFIG } from '../src/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(root, 'api');
const data = JSON.parse(readFileSync(join(root, 'data', 'catalogue.json'), 'utf8'));
const { records, generated, safety } = data;

rmSync(api, { recursive: true, force: true });
mkdirSync(join(api, 'opportunities'), { recursive: true });
const write = (rel, obj) => writeFileSync(join(api, rel), JSON.stringify(obj, null, 1) + '\n');

// --- JSON Schema for one record, generated from the validator's enums ---
const str = { type: 'string', minLength: 1 };
const strArr = { type: 'array', items: { type: 'string' } };
const en = list => ({ type: 'string', enum: list });
const nullable = s => ({ anyOf: [s, { type: 'null' }] });
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const url = { type: 'string', format: 'uri', pattern: '^https?://' };
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: true });
const skills = {};
for (const k of S.SKILLS) skills[k] = { type: 'integer', minimum: 0, maximum: 3 };

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://unstuck-games.com/boop-remote/api/schema.json',
  title: 'Opportunity record',
  description: 'One earning route in the Opportunity Engine catalogue. Enums mirror src/schema.js; the evidence rules (e.g. "applications_open_confirmed needs an opened official source") are enforced by the validator, not expressible here.',
  ...obj({
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
    name: str,
    organization: str,
    type: en(S.TYPES),
    category: en(Object.keys(S.CATEGORIES)),
    tags: strArr,
    summary: str,
    whatYouDo: str,
    appeal: { ...strArr, minItems: 1 },
    watchOuts: { ...strArr, minItems: 1 },
    officialUrl: nullable(url),
    applyUrl: nullable(url),
    geography: obj({ countries: strArr, regions: strArr, canadaEligibility: en(S.ELIGIBILITY), setting: en(S.SETTINGS) }),
    languages: strArr,
    requirements: obj({
      experience: en(['none', 'some', 'significant', 'unknown']),
      credentialRequired: { type: 'boolean' },
      credentials: strArr,
      equipment: strArr,
      minAge: nullable({ type: 'integer' }),
      assessment: en(S.ASSESSMENTS),
    }),
    schedule: obj({
      flexibility: en(['flexible', 'shifts', 'fixed', 'varies', 'unknown']),
      windows: { type: 'array', items: en(S.WINDOWS) },
      hoursMinWeekly: nullable({ type: 'number' }),
      hoursMaxWeekly: nullable({ type: 'number' }),
    }),
    interaction: obj({
      modes: { type: 'array', items: en(S.MODES) },
      realtime: en(['none', 'some', 'high', 'unknown']),
      phone: nullable({ type: 'boolean' }),
    }),
    skills: obj(skills),
    training: obj({ required: { type: 'boolean' }, cost: en(['free', 'paid_to_you', 'user_pays', 'none', 'unknown']), notes: { type: 'string' } }),
    compensation: obj({
      min: nullable({ type: 'number' }),
      max: nullable({ type: 'number' }),
      currency: nullable(en(['CAD', 'USD', 'unstated'])),
      unit: nullable(en(['hour', 'task', 'minute_audio', 'study', 'project', 'month', 'year'])),
      basis: en(['official', 'self_reported', 'aggregator', 'unknown']),
      notes: { type: 'string' },
    }),
    reliability: obj({ workVolume: en(['steady', 'variable', 'sporadic', 'unknown']), predictability: en(['high', 'medium', 'low', 'unknown']), notes: { type: 'string' } }),
    workerStatus: en(S.WORKER),
    fees: nullable({ type: 'string' }),
    applicationSteps: strArr,
    timeToFirstEarnings: en(['days', 'weeks', 'months', 'unknown']),
    horizon: en(S.HORIZONS),
    status: en(Object.keys(S.STATUSES)),
    legitimacy: en(S.LEGITIMACY),
    evidenceStrength: en(S.EVIDENCE),
    riskFlags: strArr,
    audience: strArr,
    fitsIf: str,
    notFitIf: str,
    lastChecked: date,
    sources: {
      type: 'array', minItems: 1,
      items: obj({
        url, title: str, type: en(S.SOURCE_TYPES),
        publisher: nullable({ type: 'string' }), published: nullable({ type: 'string' }),
        accessed: date, claims: strArr, notes: { type: 'string' }, accessible: { type: 'boolean' },
      }, ['url', 'title', 'type', 'accessed', 'claims']),
    },
  }, ['id', 'name', 'organization', 'type', 'category', 'summary', 'whatYouDo', 'appeal', 'watchOuts', 'officialUrl', 'applyUrl', 'geography', 'languages', 'requirements', 'schedule', 'interaction', 'skills', 'training', 'compensation', 'reliability', 'workerStatus', 'fees', 'applicationSteps', 'timeToFirstEarnings', 'horizon', 'status', 'legitimacy', 'evidenceStrength', 'riskFlags', 'fitsIf', 'notFitIf', 'lastChecked', 'sources']),
};

// --- endpoints ---
const slim = r => ({
  id: r.id, name: r.name, organization: r.organization, type: r.type, category: r.category,
  summary: r.summary, status: r.status, canadaEligibility: r.geography.canadaEligibility,
  setting: r.geography.setting, regions: r.geography.regions, workerStatus: r.workerStatus,
  horizon: r.horizon, evidenceStrength: r.evidenceStrength, legitimacy: r.legitimacy,
  compensation: { min: r.compensation.min, max: r.compensation.max, currency: r.compensation.currency, unit: r.compensation.unit, basis: r.compensation.basis },
  riskFlags: r.riskFlags, audience: r.audience || [], lastChecked: r.lastChecked,
  recommendable: !['rejected', 'not_currently_open'].includes(r.status),
});

const count = f => records.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});

write('catalogue.json', data);
write('opportunities.json', { generated, count: records.length, records: records.map(slim) });
for (const r of records) write(join('opportunities', `${r.id}.json`), r);
write('safety.json', { generated, sources: safety });
write('questions.json', { generated, questions: QUESTIONS, notes: {
  skipped: 'An unanswered question is null (or {} for the matrix). The engine treats it as neutral.',
  multi: 'A multi-select with nothing ticked is null (skipped), not an empty list. The value "__none" is an explicit "none of these" and is stored as [].',
  when: 'A question with a `when` condition is only asked when conditionHolds(when, profile) is true. Tests: not, gt, minLength, maxLength on profile[key].',
} });
write('schema.json', schema);
write('meta.json', {
  generated,
  counts: { records: records.length, recommendable: records.filter(r => slim(r).recommendable).length, byCategory: count(r => r.category), byStatus: count(r => r.status), byType: count(r => r.type) },
  enums: {
    types: S.TYPE_LABELS, categories: S.CATEGORIES, statuses: S.STATUSES, statusShort: S.STATUS_SHORT,
    sourceTypes: S.SOURCE_TYPES, eligibility: S.ELIGIBILITY, settings: S.SETTINGS, windows: S.WINDOWS,
    modes: S.MODES, skills: S.SKILLS, horizons: S.HORIZONS, workerStatus: S.WORKER, evidence: S.EVIDENCE,
    legitimacy: S.LEGITIMACY, assessments: S.ASSESSMENTS,
  },
  matching: { weights: WEIGHTS, config: CONFIG, labels: { strong: 0.45, good: 0.25, possible: 0.05 }, shortlistFloor: -0.15, docs: 'DECISIONS.md §7' },
});
write('index.json', {
  generated,
  base: 'https://unstuck-games.com/boop-remote/api/',
  endpoints: {
    'index.json': 'this list',
    'meta.json': 'counts, enum labels, matching weights',
    'opportunities.json': 'slim list of every record, for list views',
    'opportunities/{id}.json': 'one full record',
    'catalogue.json': 'every full record plus safety sources (the file the app loads)',
    'questions.json': 'the questionnaire',
    'schema.json': 'JSON Schema for one record',
    'safety.json': 'official Canadian job-scam guidance sources',
  },
  licence: 'Catalogue content is research output with cited sources; verify against the source before relying on it.',
});

console.log(`api/: ${records.length} records, ${Object.keys(S.CATEGORIES).length} categories.`);
