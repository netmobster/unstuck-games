// Generate the human-readable record-by-record audit (CATALOGUE_AUDIT.md) from catalogue.audit.json
// and catalogue.v2.json. Usage: node scripts/v2/audit-md.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const audit = JSON.parse(readFileSync(new URL('data/v2/catalogue.audit.json', root), 'utf8'));
const cat = JSON.parse(readFileSync(new URL('data/v2/catalogue.v2.json', root), 'utf8'));
const base = JSON.parse(readFileSync(new URL('data/v2/baseline_audit.json', root), 'utf8'));
const count = (list, f) => list.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
const tbl = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n');
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rows = audit.entries.map(e => {
  return `| \`${e.original_or_candidate_id}\` | ${esc(e.final_name)} | ${e.disposition}${e.production_eligible ? '' : ' (excluded)'} | ${e.record_type} | ${e.availability_status} | ${e.ontario_residents} | ${e.evidence_quality} / ${e.confidence} | ${esc(e.disposition_reason).slice(0, 160)}${e.unresolved_claims.length ? ' *Unresolved:* ' + esc(e.unresolved_claims.join('; ')).slice(0, 120) : ''} |`;
});

const md = `# Catalogue audit (v2)

Record-by-record outcome of the 2026-10-13 revalidation. The machine-readable version with every verified claim, unresolved claim and source is \`data/v2/catalogue.audit.json\`; the production dataset is \`data/v2/catalogue.v2.json\`. Regenerate with \`node scripts/v2/audit-md.mjs\`.

## Before and after

| | v1 (\`data/catalogue.json\`) | v2 production |
|---|---|---|
| Records | ${base.original_record_count} | ${cat.records.length} |
| Sources | ${base.source_count} (${base.sources_opened} opened, ${base.sources_search_summary_only} search-summary only) | ${cat.records.reduce((n, r) => n + r.sources.length, 0)} (${cat.summary.source_access_counts.opened_and_reviewed || 0} opened, ${cat.summary.source_access_counts.search_result_only || 0} search-result only) |
| Category / "kind of work" records | ${base.category_records.length} | ${cat.records.filter(r => r.record_type === 'work_category').length} |
| Records claiming a confirmed opening | 0 | ${cat.records.filter(r => ['open_specific_opportunity', 'accepting_applications'].includes(r.availability_status)).length} |

v1 status distribution: ${Object.entries(base.status_counts).map(([k, v]) => `${k} ${v}`).join(', ')}.

## Dispositions of the ${audit.entries.length} audited records (${base.original_record_count} original + ${audit.entries.filter(e => !e.original_name).length} new candidates)

| Disposition | Records |
|---|---|
${tbl(count(audit.entries, e => e.disposition))}

## Production dataset by type, status and evidence

| Record type | Records |
|---|---|
${tbl(cat.summary.record_type_counts)}

| Availability status | Records |
|---|---|
${tbl(cat.summary.availability_status_counts)}

| Evidence quality | Records |
|---|---|
${tbl(cat.summary.evidence_quality_counts)}

| Ontario eligibility | Records |
|---|---|
${tbl(count(cat.records, r => r.region_eligibility.ontario_residents))}

## Record by record

Columns: original or candidate id · final name · disposition · record type · availability · Ontario eligibility · evidence / confidence · reason and unresolved claims.

| Id | Name | Disposition | Type | Availability | ON | Evidence / conf. | Reason |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Overlaps found in the baseline audit

${base.potential_overlaps.map(o => `- ${o.host ? `Same site \`${o.host}\`` : `Same organization "${o.organization}"`}: ${o.ids.map(i => `\`${i}\``).join(', ')}`).join('\n')}

Resolution of each is recorded in the audit entries above (merged records name \`merged_into\`; records sharing a government site are distinct programs and were kept apart).
`;
writeFileSync(new URL('CATALOGUE_AUDIT.md', root), md);
console.log('wrote CATALOGUE_AUDIT.md');
