// Build the v2 deliverables from the reviewed research files:
//   data/v2/reviewed/*.json  →  data/v2/catalogue.v2.json (production)
//                               data/v2/catalogue.audit.json (every record, every disposition)
//                               data/v2/catalogue.changelog.json (v1 → v2 differences)
// Usage: node scripts/v2/build.mjs
//
// Confidence is computed here from evidence fields, never typed in by a researcher (rubric in
// data/v2/SCHEMA.md). production_eligible is also computed. A record still marked "pending" fails
// the build: every record must have been revalidated by a person or agent.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { validateRecords, validateCatalogue } from './validate.mjs';
import { SCHEMA_VERSION, DATASET_ID } from './schema.mjs';

const root = new URL('../../', import.meta.url);
const dir = new URL('data/v2/reviewed/', root);
const v1 = JSON.parse(readFileSync(new URL('data/catalogue.json', root), 'utf8')).records;
const v1ById = Object.fromEntries(v1.map(r => [r.id, r]));

let records = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const arr = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`${f}: expected an array of records`);
  records.push(...arr.map(r => ({ ...r, _file: f })));
}

const pending = records.filter(r => r.disposition === 'pending');
if (pending.length) {
  console.error(`${pending.length} record(s) still "pending": ${pending.map(r => r.id).join(', ')}`);
  process.exit(1);
}

// ---------- confidence rubric ----------
export function confidence(r) {
  const base = { strong: 0.75, moderate: 0.45, weak: 0.25, insufficient: 0.05 }[r.evidence_quality];
  let c = base;
  const opened = r.sources.filter(s => s.access_status === 'opened_and_reviewed' && ['official', 'government', 'job_board', 'academic'].includes(s.source_type));
  if (opened.some(s => s.supports.includes('availability') || s.supports.includes('canadian_eligibility') || s.supports.includes('ontario_eligibility'))) c += 0.10;
  c += { confirmed: 0.05, likely: 0.03, partial: 0.02, unclear: 0, not_eligible: 0 }[r.region_eligibility.ontario_residents];
  if (r.availability_status !== 'availability_unknown' && r.availability_evidence.length) c += 0.05;
  if ((r.economics.verified_rate || r.economics.advertised_rate) && r.economics.currency && r.economics.currency !== 'unstated') c += 0.03;
  if (r.sources.some(s => s.source_type === 'worker_anecdote' || s.source_type === 'independent_reporting')) c += 0.02; // negative-evidence pass done
  c -= Math.min(0.15, 0.05 * r.contradictions.length);
  const ageDays = (Date.now() - Date.parse(r.last_researched_at)) / 86400000;
  if (ageDays > 180) c -= 0.10;
  return Math.round(Math.max(0, Math.min(1, c)) * 100) / 100;
}

export function productionEligible(r) {
  if (['rejected', 'merged'].includes(r.disposition)) return false;
  if (r.evidence_quality === 'insufficient') return false;
  if (['not_eligible_for_ontario', 'rejected_insufficient_evidence'].includes(r.availability_status)) return false;
  if (r.region_eligibility.ontario_residents === 'not_eligible') return false;
  if (!r.sources.length) return false;
  return true;
}

for (const r of records) {
  r.confidence = confidence(r);
  r.production_eligible = productionEligible(r);
}

// ---------- validate everything (including rejected) ----------
const all = records.map(({ _file, ...r }) => r);
const v = validateRecords(all);
for (const w of v.warns) console.log(`warn  ${w}`);
if (v.errs.length) {
  for (const e of v.errs) console.error(`ERROR ${e}`);
  process.exit(1);
}

// ---------- production file ----------
const prod = all.filter(r => r.production_eligible).sort((a, b) => a.id.localeCompare(b.id));
const count = (list, f) => list.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
const now = new Date().toISOString();
const catalogue = {
  schema_version: SCHEMA_VERSION,
  dataset_id: DATASET_ID,
  generated_at: now,
  research_scope: {
    primary_region: 'Ontario, Canada',
    secondary_region: 'Canada-wide opportunities available to Ontario residents',
    research_methodology: 'Two-stage research by AI agents using web search (search_result_only: pages could not be opened from the research environment) and an Indeed job-board connector (opened_and_reviewed for the postings it returned). Every v1 record was individually revalidated; new candidates were held to the same standard. Statuses and eligibility are conservative: "confirmed" and "accepting_applications" require an opened authoritative source, which was mostly impossible this run. See RESEARCH_METHODOLOGY.md and RESEARCH_REPORT.md.',
    limitations: [
      'No web page could be opened directly in this research run (DNS blocked); evidence from web pages is search-engine summaries of those pages.',
      'Only job postings read through the Indeed connector count as opened_and_reviewed.',
      'Shared web-search budget of roughly 200 queries per run limited the depth per record and the breadth of discovery.',
      'No human has reviewed the records yet.',
      'Pay figures are advertised or anecdotal; none is independently verified from an opened official document.',
      'Province-level eligibility is modelled for Ontario only; other provinces appear in region_eligibility.provinces where a restriction was found.',
    ],
  },
  records: prod,
  summary: {
    total_records: prod.length,
    verified_records: prod.filter(r => r.evidence_quality === 'strong').length,
    records_with_unverified_availability: prod.filter(r => r.availability_status === 'availability_unknown').length,
    rejected_records: all.filter(r => r.disposition === 'rejected').length,
    record_type_counts: count(prod, r => r.record_type),
    availability_status_counts: count(prod, r => r.availability_status),
    evidence_quality_counts: count(prod, r => r.evidence_quality),
    category_counts: count(prod, r => r.category),
    disposition_counts: count(prod, r => r.disposition),
    source_access_counts: count(prod.flatMap(r => r.sources), s => s.access_status),
  },
};
const pv = validateCatalogue(catalogue);
if (pv.errs.length) { for (const e of pv.errs) console.error(`ERROR ${e}`); process.exit(1); }
writeFileSync(new URL('data/v2/catalogue.v2.json', root), JSON.stringify(catalogue, null, 1) + '\n');

// ---------- audit trail ----------
const audit = {
  schema_version: SCHEMA_VERSION,
  generated_at: now,
  original_record_count: v1.length,
  original_status_counts: count(v1, r => r.status),
  entries: all.map(r => ({
    original_or_candidate_id: r.migration.v1_id || r.id,
    final_record_id: r.production_eligible ? r.id : (r.migration.merged_into || null),
    original_name: r.migration.v1_name || null,
    final_name: r.name,
    disposition: r.disposition,
    disposition_reason: r.disposition_reason,
    production_eligible: r.production_eligible,
    record_type: r.record_type,
    availability_status: r.availability_status,
    ontario_residents: r.region_eligibility.ontario_residents,
    evidence_quality: r.evidence_quality,
    confidence: r.confidence,
    material_changes: r.migration.changes,
    claims_verified: r.migration.claims_verified,
    unresolved_claims: r.migration.unresolved_claims,
    contradictions: r.contradictions,
    last_researched_at: r.last_researched_at,
    sources: r.sources.map(s => ({ url: s.url, access_status: s.access_status, supports: s.supports })),
  })).sort((a, b) => a.original_or_candidate_id.localeCompare(b.original_or_candidate_id)),
};
const covered = new Set(audit.entries.map(e => e.original_or_candidate_id));
const missing = v1.filter(r => !covered.has(r.id)).map(r => r.id);
if (missing.length) { console.error(`v1 records with no audit entry: ${missing.join(', ')}`); process.exit(1); }
writeFileSync(new URL('data/v2/catalogue.audit.json', root), JSON.stringify(audit, null, 1) + '\n');

// ---------- changelog ----------
const prodIds = new Set(prod.map(r => r.id));
const changelog = {
  schema_version: SCHEMA_VERSION,
  generated_at: now,
  from: { file: 'data/catalogue.json', records: v1.length },
  to: { file: 'data/v2/catalogue.v2.json', records: prod.length },
  added: prod.filter(r => r.disposition === 'new').map(r => ({ id: r.id, name: r.name, record_type: r.record_type, category: r.category })),
  updated: prod.filter(r => r.disposition === 'updated').map(r => ({ id: r.id, v1_id: r.migration.v1_id, changes: r.migration.changes })),
  downgraded: prod.filter(r => r.disposition === 'downgraded').map(r => ({ id: r.id, v1_id: r.migration.v1_id, v1_status: r.migration.v1_status, availability_status: r.availability_status, reason: r.disposition_reason })),
  retained: prod.filter(r => r.disposition === 'retained').map(r => r.id),
  merged: all.filter(r => r.disposition === 'merged').map(r => ({ v1_id: r.migration.v1_id, merged_into: r.migration.merged_into, reason: r.disposition_reason })),
  removed: all.filter(r => r.disposition === 'rejected').map(r => ({ v1_id: r.migration.v1_id, candidate_id: r.migration.v1_id ? null : r.id, name: r.name, reason: r.disposition_reason })),
  type_changes: all.filter(r => r.migration.v1_id && v1ById[r.migration.v1_id] && prodIds.has(r.id)).map(r => ({ id: r.id, v1_type: v1ById[r.migration.v1_id].type, record_type: r.record_type })).filter(x => !({ employment: 'employer', contract: 'employer', freelance: 'freelance_marketplace', task_platform: 'task_platform', research_participation: 'research_participation', training_pathway: 'training_program', program: 'government_support', category: 'work_category' }[x.v1_type] === x.record_type)),
};
writeFileSync(new URL('data/v2/catalogue.changelog.json', root), JSON.stringify(changelog, null, 1) + '\n');

console.log(`v2: ${prod.length} production records from ${all.length} reviewed (${changelog.added.length} new, ${changelog.updated.length} updated, ${changelog.downgraded.length} downgraded, ${changelog.retained.length} retained, ${changelog.merged.length} merged, ${changelog.removed.length} rejected); ${v.warns.length} warning(s).`);
