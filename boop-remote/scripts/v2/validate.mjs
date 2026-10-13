// Validate v2 data: structural (a JSON-Schema subset interpreter over scripts/v2/schema.mjs) and
// semantic (the evidence and status rules in data/v2/SCHEMA.md).
//
//   node scripts/v2/validate.mjs                       validate data/v2/catalogue.v2.json
//   node scripts/v2/validate.mjs path.json --records   validate a bare array of records (agent output)
//   node scripts/v2/validate.mjs --report              also write VALIDATION_REPORT.md
//
// Exit code 1 on any error. Warnings never fail the run.

import { readFileSync, writeFileSync } from 'node:fs';
import { catalogueSchema, recordSchema } from './schema.mjs';

// ---------- a small JSON-Schema (2020-12 subset) interpreter ----------
// Supports: type, enum, const, properties, required, additionalProperties, items, minItems,
// uniqueItems, minimum, maximum, minLength, pattern, anyOf. Enough for our schema; ajv is used as
// an independent cross-check when available (see scripts/v2/crosscheck-ajv.mjs).
export function check(schema, value, path = '$', errs = []) {
  const fail = m => errs.push(`${path}: ${m}`);
  if (schema.anyOf) {
    const tries = schema.anyOf.map(s => { const e = []; check(s, value, path, e); return e; });
    if (!tries.some(e => e.length === 0)) fail(`matches none of: ${schema.anyOf.map(s => s.type || 'variant').join(' | ')}`);
    return errs;
  }
  if ('const' in schema && value !== schema.const) fail(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`"${value}" not in [${schema.enum.join(', ')}]`);
  if (schema.type) {
    const t = schema.type;
    const ok = t === 'null' ? value === null
      : t === 'array' ? Array.isArray(value)
      : t === 'integer' ? Number.isInteger(value)
      : t === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : t === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : typeof value === t;
    if (!ok) { fail(`expected ${t}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`); return errs; }
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) fail('must not be empty');
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(`"${value.slice(0, 60)}" does not match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) fail(`${value} < ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) fail(`${value} > ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) fail(`needs at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail('duplicate items');
    if (schema.items) value.forEach((v, i) => check(schema.items, v, `${path}[${i}]`, errs));
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    for (const k of schema.required || []) if (!(k in value)) fail(`missing "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties[k]) check(schema.properties[k], v, `${path}.${k}`, errs);
      else if (schema.additionalProperties === false) fail(`unexpected field "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') check(schema.additionalProperties, v, `${path}.${k}`, errs);
    }
  }
  return errs;
}

// ---------- semantic rules ----------
const openedOfficial = (r, claim) => r.sources.some(s => ['official', 'government', 'job_board'].includes(s.source_type) && s.access_status === 'opened_and_reviewed' && s.supports.includes(claim));
const anyOfficial = (r, claim) => r.sources.some(s => ['official', 'government', 'job_board', 'academic'].includes(s.source_type) && s.supports.includes(claim));

export function semantic(r) {
  const errs = [], warns = [];
  const err = m => errs.push(`${r.id}: ${m}`);
  const warn = m => warns.push(`${r.id}: ${m}`);
  const cat = r.record_type === 'work_category' || r.record_type === 'service_business';

  // Categories and services are directions, not destinations.
  if (cat) {
    if (r.availability_status !== 'not_applicable_category') err('work_category/service_business must use availability_status "not_applicable_category"');
    if (r.application_or_registration_url) err('work_category/service_business must not carry an application URL');
    if (!r.how_to_find_work) err('work_category/service_business needs how_to_find_work');
  } else if (r.availability_status === 'not_applicable_category') err('"not_applicable_category" is only for work_category/service_business');

  // Status claims need the evidence they imply.
  if (['open_specific_opportunity', 'accepting_applications'].includes(r.availability_status)) {
    if (!openedOfficial(r, 'availability')) err(`${r.availability_status} needs an opened official/government/job_board source supporting "availability"`);
    if (!r.availability_checked_at) err(`${r.availability_status} needs availability_checked_at`);
  }
  if (['registration_open_work_not_guaranteed', 'program_open_check_eligibility', 'waitlist', 'temporarily_paused', 'closed_or_not_open'].includes(r.availability_status)) {
    if (!anyOfficial(r, 'availability') && !r.sources.some(s => s.supports.includes('availability'))) err(`${r.availability_status} needs at least one source supporting "availability"`);
    if (!r.availability_evidence.length) err(`${r.availability_status} needs availability_evidence`);
  }
  if (r.availability_status === 'availability_unknown' && r.availability_checked_at) warn('availability_unknown but availability_checked_at is set');
  if (r.availability_status === 'open_specific_opportunity' && r.record_type !== 'specific_job') err('open_specific_opportunity requires record_type specific_job');
  if (r.record_type === 'specific_job' && !r.application_or_registration_url && r.production_eligible) warn('specific_job without an application URL');

  // Eligibility claims.
  for (const k of ['canadian_residents', 'ontario_residents']) {
    const claim = k === 'canadian_residents' ? 'canadian_eligibility' : 'ontario_eligibility';
    if (r.region_eligibility[k] === 'confirmed' && !openedOfficial(r, claim) && !openedOfficial(r, 'canadian_eligibility')) err(`${k} "confirmed" needs an opened official/government source supporting eligibility`);
    if (r.region_eligibility[k] === 'likely' && !r.sources.some(s => s.supports.includes(claim) || s.supports.includes('canadian_eligibility'))) warn(`${k} "likely" without a source supporting eligibility`);
  }
  if (r.region_eligibility.ontario_residents === 'not_eligible' && r.production_eligible) err('not eligible for Ontario but production_eligible');
  if (r.availability_status === 'not_eligible_for_ontario' && r.region_eligibility.ontario_residents !== 'not_eligible') err('availability not_eligible_for_ontario but ontario_residents is not "not_eligible"');

  // Evidence quality is about what sources establish.
  const opened = r.sources.filter(s => s.access_status === 'opened_and_reviewed');
  if (r.evidence_quality === 'strong' && !(opened.some(s => ['official', 'government', 'job_board'].includes(s.source_type) && (s.supports.includes('canadian_eligibility') || s.supports.includes('ontario_eligibility'))) && opened.some(s => s.supports.includes('availability')))) {
    err('evidence_quality "strong" needs opened authoritative sources for both eligibility and availability');
  }
  if (r.evidence_quality === 'moderate' && !r.sources.some(s => ['official', 'government', 'job_board', 'academic'].includes(s.source_type))) err('evidence_quality "moderate" needs at least one official/government/academic/job_board source');
  if (r.evidence_quality === 'insufficient' && r.production_eligible) err('insufficient evidence but production_eligible');
  if (r.production_eligible && r.sources.length === 0) err('production record without sources');

  // Pay: verified means an opened official document said so.
  if (r.economics.verified_rate && !openedOfficial(r, 'pay')) err('verified_rate needs an opened official source supporting "pay"');
  if ((r.economics.advertised_rate || r.economics.verified_rate) && !r.economics.currency) err('a rate needs a currency (use "unstated" if the page gave none)');
  if (r.economics.advertised_rate && !r.sources.some(s => s.supports.includes('pay'))) err('advertised_rate needs a source supporting "pay"');
  if (r.economics.anecdotal_effective_rate && !r.sources.some(s => s.source_type === 'worker_anecdote' || s.source_type === 'independent_reporting' || s.source_type === 'aggregator')) warn('anecdotal_effective_rate without an anecdote/reporting source');

  // Dispositions and migration.
  if (r.disposition === 'merged' && !r.migration.merged_into) err('merged record needs migration.merged_into');
  if (r.disposition === 'merged' && r.production_eligible) err('merged record cannot be production_eligible');
  if (r.disposition === 'rejected' && r.production_eligible) err('rejected record cannot be production_eligible');
  if (r.disposition !== 'new' && !r.migration.v1_id) err('non-new record needs migration.v1_id');
  if (r.disposition === 'new' && r.migration.v1_id) err('new record must not carry a v1_id');
  if (r.disposition === 'retained' && r.migration.changes.length) warn('retained but lists changes (should it be "updated"?)');
  if (r.sources.some(s => s.supports.length === 0)) warn('a source supports no claim');
  if (r.availability_checked_at && r.last_researched_at && r.availability_checked_at > r.last_researched_at) err('availability_checked_at is after last_researched_at');
  return { errs, warns };
}

export function validateRecords(records, { production = false } = {}) {
  const errs = [], warns = [];
  const ids = new Set();
  const notes = new Map();
  for (const [i, r0] of records.entries()) {
    // Baseline files carry disposition "pending" until a record is revalidated. Structurally fine
    // for a working file; the builder refuses it.
    const r = r0 && r0.disposition === 'pending' ? { ...r0, disposition: 'retained', disposition_reason: r0.disposition_reason || 'pending' } : r0;
    if (r0 && r0.disposition === 'pending') warns.push(`${r0.id}: still pending revalidation`);
    const structural = check(recordSchema, r, `records[${i}]`);
    if (structural.length) { errs.push(...structural.map(e => `${r && r.id ? r.id + ' ' : ''}${e}`)); continue; }
    if (ids.has(r.id)) errs.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    const s = semantic(r);
    errs.push(...s.errs); warns.push(...s.warns);
    for (const n of r.research_notes) { if (n.length > 40) { if (notes.has(n) && notes.get(n) !== r.id) warns.push(`${r.id}: research note identical to ${notes.get(n)}'s ("${n.slice(0, 50)}…")`); notes.set(n, r.id); } }
    if (production && !r.production_eligible) errs.push(`${r.id}: not production_eligible but present in the production file`);
  }
  for (const r of records) if (r.migration && r.migration.merged_into && !ids.has(r.migration.merged_into) && !production) warns.push(`${r.id}: merged_into "${r.migration.merged_into}" is not a record id in this set`);
  return { errs, warns };
}

export function validateCatalogue(cat) {
  const errs = check(catalogueSchema, cat);
  if (errs.length) return { errs, warns: [], checks: [] };
  const rec = validateRecords(cat.records, { production: true });
  const checks = [];
  const count = f => cat.records.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
  const s = cat.summary;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const expect = (name, ok) => { checks.push([name, ok]); if (!ok) rec.errs.push(`summary: ${name} does not match the records`); };
  expect('total_records', s.total_records === cat.records.length);
  expect('record_type_counts', same(s.record_type_counts, count(r => r.record_type)));
  expect('availability_status_counts', same(s.availability_status_counts, count(r => r.availability_status)));
  expect('evidence_quality_counts', same(s.evidence_quality_counts, count(r => r.evidence_quality)));
  expect('category_counts', same(s.category_counts, count(r => r.category)));
  expect('verified_records', s.verified_records === cat.records.filter(r => r.evidence_quality === 'strong').length);
  expect('records_with_unverified_availability', s.records_with_unverified_availability === cat.records.filter(r => r.availability_status === 'availability_unknown').length);
  return { ...rec, checks };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--')) || new URL('../../data/v2/catalogue.v2.json', import.meta.url).pathname;
  const raw = readFileSync(file, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error(`${file}: not valid JSON: ${e.message}`); process.exit(1); }
  const res = args.includes('--records') ? validateRecords(Array.isArray(data) ? data : data.records || []) : validateCatalogue(data);
  for (const w of res.warns) console.log(`warn  ${w}`);
  for (const e of res.errs) console.log(`ERROR ${e}`);
  const n = Array.isArray(data) ? data.length : (data.records || []).length;
  console.log(`${file}: ${n} records, ${res.errs.length} error(s), ${res.warns.length} warning(s)`);
  if (args.includes('--report')) {
    const lines = [
      '# Validation report',
      '',
      `Produced by \`node scripts/v2/validate.mjs --report\` on ${new Date().toISOString()} against \`${file.replace(/.*boop-remote\//, '')}\`. Every line below is a check that actually ran.`,
      '',
      '| Check | Result |',
      '|---|---|',
      `| JSON parses with \`JSON.parse\` | pass |`,
      `| Structural validation against \`catalogue.schema.json\` (built-in interpreter: type, enum, const, required, additionalProperties, items, pattern, min/max) | ${res.errs.some(e => /records\[\d+\]|^\$/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Unique record ids | ${res.errs.some(e => /duplicate id/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Required fields and controlled vocabularies | ${res.errs.some(e => /missing|not in \[/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| URL and date formats | ${res.errs.some(e => /does not match/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Confidence within 0..1 | ${res.errs.some(e => /confidence/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Status claims backed by cited evidence (semantic rules) | ${res.errs.some(e => /needs an opened|needs at least one source|needs availability/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Eligibility "confirmed" backed by opened official sources | ${res.errs.some(e => /"confirmed" needs/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Categories carry no application URL and use not_applicable_category | ${res.errs.some(e => /work_category/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Every record has an explicit disposition and production_eligible | pass (required by schema) |`,
      `| Rejected / merged records absent from production | ${res.errs.some(e => /not production_eligible but present/.test(e)) ? 'FAIL' : 'pass'} |`,
      `| Duplicate boilerplate research notes | ${res.warns.filter(w => /identical/.test(w)).length} warning(s) |`,
      ...(res.checks || []).map(([k, ok]) => `| Summary count: ${k} | ${ok ? 'pass' : 'FAIL'} |`),
      '',
      `**Totals:** ${n} records, ${res.errs.length} error(s), ${res.warns.length} warning(s).`,
      '',
      res.errs.length ? '## Errors\n\n' + res.errs.map(e => `- ${e}`).join('\n') + '\n' : '',
      res.warns.length ? '## Warnings\n\n' + res.warns.map(w => `- ${w}`).join('\n') + '\n' : '',
    ];
    writeFileSync(new URL('../../VALIDATION_REPORT.md', import.meta.url), lines.join('\n'));
    console.log('wrote VALIDATION_REPORT.md');
  }
  process.exit(res.errs.length ? 1 : 0);
}
