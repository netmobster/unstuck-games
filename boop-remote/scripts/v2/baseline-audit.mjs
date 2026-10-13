// Phase A: inventory the v1 catalogue before anything is changed. Writes data/v2/baseline_audit.json.
// Usage: node scripts/v2/baseline-audit.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const { records, generated } = JSON.parse(readFileSync(new URL('data/catalogue.json', root), 'utf8'));
const count = (list, f) => list.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

const sources = records.flatMap(r => r.sources.map(s => ({ ...s, rec: r.id })));
const findings = [];

// Overlaps: same organization or same official host across records.
const byHost = {};
for (const r of records) if (r.officialUrl) (byHost[host(r.officialUrl)] ||= []).push(r.id);
const overlaps = Object.entries(byHost).filter(([, ids]) => ids.length > 1).map(([h, ids]) => ({ host: h, ids }));
const byOrg = {};
for (const r of records) if (r.organization !== 'Various') (byOrg[r.organization.toLowerCase()] ||= []).push(r.id);
for (const [org, ids] of Object.entries(byOrg)) if (ids.length > 1 && !overlaps.some(o => o.ids.join() === ids.join())) overlaps.push({ organization: org, ids });

for (const r of records) {
  const f = [];
  const opened = r.sources.filter(s => s.accessible !== false);
  if (!opened.length) f.push('no source was opened; all evidence is search summaries');
  if (!r.sources.some(s => ['official', 'government'].includes(s.type))) f.push('no official or government source');
  if (r.compensation.currency === 'unstated') f.push('pay figure without currency');
  if (r.compensation.basis === 'aggregator') f.push('pay from an aggregator, not the employer');
  if (r.interaction.modes.length === 0 || r.interaction.phone === null) f.push('interaction style not recorded');
  if (r.officialUrl === null) f.push('no verified official URL');
  if (r.status === 'eligibility_confirmed' || r.geography.canadaEligibility === 'confirmed') f.push('claims confirmation without an opened source');
  if (r.type !== 'category' && r.status === 'official_info_found') f.push('availability never checked');
  if (r.sources.some(s => /2019|2020|2021|2022|2023/.test(s.published || ''))) f.push('cites sources published 2019–2023');
  if (f.length) findings.push({ id: r.id, name: r.name, type: r.type, status: r.status, needs_revalidation: f });
}

const audit = {
  generated_at: new Date().toISOString(),
  v1_catalogue_built: generated,
  original_record_count: records.length,
  status_counts: count(records, r => r.status),
  type_counts: count(records, r => r.type),
  category_counts: count(records, r => r.category),
  canada_eligibility_counts: count(records, r => r.geography.canadaEligibility),
  evidence_strength_counts: count(records, r => r.evidenceStrength),
  source_count: sources.length,
  sources_opened: sources.filter(s => s.accessible !== false).length,
  sources_search_summary_only: sources.filter(s => s.accessible === false).length,
  source_type_counts: count(sources, s => s.type),
  records_with_apply_url: records.filter(r => r.applyUrl).length,
  records_with_pay: records.filter(r => r.compensation.min != null || r.compensation.max != null).length,
  category_records: records.filter(r => r.type === 'category').map(r => r.id),
  rejected_or_closed: records.filter(r => ['rejected', 'not_currently_open'].includes(r.status)).map(r => ({ id: r.id, status: r.status })),
  potential_overlaps: overlaps,
  schema_observations: [
    'v1 "type" mixes relationship (employment/contract/freelance) with destination kind (task_platform/program/category); v2 separates record_type from work_conditions.relationship_type.',
    'v1 "status" mixes eligibility and availability (eligibility_confirmed vs applications_open_confirmed); v2 separates region_eligibility from availability_status.',
    'v1 sources carry a boolean "accessible"; v2 uses the five access_status states.',
    'v1 compensation.basis conflates advertised and self-reported pay; v2 separates advertised_rate, verified_rate and anecdotal_effective_rate.',
    'v1 has no availability-check timestamp; lastChecked covers the whole record.',
    'v1 "category" records share availability statuses with real destinations; v2 gives them not_applicable_category.',
  ],
  records_needing_revalidation: findings,
};
writeFileSync(new URL('data/v2/baseline_audit.json', root), JSON.stringify(audit, null, 1) + '\n');
console.log(`baseline: ${records.length} records, ${findings.length} with revalidation flags, ${overlaps.length} potential overlaps`);
