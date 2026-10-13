import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { check, validateCatalogue, validateRecords } from '../scripts/v2/validate.mjs';
import { catalogueSchema, E, SCHEMA_VERSION, DATASET_ID } from '../scripts/v2/schema.mjs';

const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const have = existsSync(new URL('data/v2/catalogue.v2.json', root));
const v1 = read('data/catalogue.json').records;

describe.if(have)('catalogue.v2.json', () => {
  const cat = have ? read('data/v2/catalogue.v2.json') : null;
  const audit = have ? read('data/v2/catalogue.audit.json') : null;
  const changelog = have ? read('data/v2/catalogue.changelog.json') : null;
  const schemaFile = have ? read('data/v2/catalogue.schema.json') : null;

  test('identifies itself', () => {
    expect(cat.schema_version).toBe(SCHEMA_VERSION);
    expect(cat.dataset_id).toBe(DATASET_ID);
    expect(cat.research_scope.limitations.length).toBeGreaterThan(0);
  });

  test('validates structurally against the written schema file and the in-code schema', () => {
    expect(check(schemaFile, cat)).toEqual([]);
    expect(check(catalogueSchema, cat)).toEqual([]);
  });

  test('passes every semantic rule and the summary reconciles', () => {
    const res = validateCatalogue(cat);
    expect(res.errs).toEqual([]);
    for (const [, ok] of res.checks) expect(ok).toBe(true);
  });

  test('every production record is eligible, researched, and has honest sources', () => {
    for (const r of cat.records) {
      expect(r.production_eligible).toBe(true);
      expect(['rejected', 'merged']).not.toContain(r.disposition);
      expect(r.evidence_quality).not.toBe('insufficient');
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) expect(E.access_status).toContain(s.access_status);
      expect(r.last_researched_at >= '2026-10-13').toBe(true);
      // Nothing was marked verified just because it existed in v1.
      if (r.evidence_quality === 'strong') expect(r.sources.some(s => s.access_status === 'opened_and_reviewed')).toBe(true);
    }
  });

  test('categories cannot be mistaken for jobs', () => {
    for (const r of cat.records.filter(r => ['work_category', 'service_business'].includes(r.record_type))) {
      expect(r.availability_status).toBe('not_applicable_category');
      expect(r.application_or_registration_url).toBeNull();
      expect(r.how_to_find_work).toBeTruthy();
    }
  });

  test('registration is never presented as guaranteed work', () => {
    for (const r of cat.records.filter(r => r.availability_status === 'registration_open_work_not_guaranteed')) {
      expect(r.work_conditions.work_guaranteed).not.toBe('yes');
    }
    for (const r of cat.records.filter(r => r.record_type === 'research_participation')) {
      expect(r.work_conditions.relationship_type).toBe('participant');
      expect(r.economics.pay_type).toBe('participant_compensation');
      expect(['sporadic', 'no', 'competitive', 'unknown']).toContain(r.work_conditions.work_guaranteed);
    }
  });

  test('no record is ineligible for Ontario', () => {
    for (const r of cat.records) expect(r.region_eligibility.ontario_residents).not.toBe('not_eligible');
  });

  test('pay claims are backed or explicitly unknown', () => {
    for (const r of cat.records) {
      const e = r.economics;
      if (e.advertised_rate || e.verified_rate) {
        expect(e.currency).toBeTruthy();
        expect(r.sources.some(s => s.supports.includes('pay'))).toBe(true);
      }
      if (e.verified_rate) expect(r.sources.some(s => s.access_status === 'opened_and_reviewed' && s.supports.includes('pay'))).toBe(true);
    }
  });

  test('confidence is computed within range and tracks evidence quality', () => {
    const byQ = {};
    for (const r of cat.records) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      (byQ[r.evidence_quality] ||= []).push(r.confidence);
    }
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    if (byQ.moderate && byQ.weak) expect(avg(byQ.moderate)).toBeGreaterThan(avg(byQ.weak));
  });

  test('the audit trail covers every v1 record and every production record', () => {
    const ids = new Set(audit.entries.map(e => e.original_or_candidate_id));
    for (const r of v1) expect(ids.has(r.id)).toBe(true);
    const finals = new Set(audit.entries.filter(e => e.production_eligible).map(e => e.final_record_id));
    for (const r of cat.records) expect(finals.has(r.id)).toBe(true);
    for (const e of audit.entries) {
      expect(E.disposition).toContain(e.disposition);
      expect(e.disposition_reason.length).toBeGreaterThan(0);
    }
    expect(audit.original_record_count).toBe(v1.length);
  });

  test('merged records point at a production record', () => {
    const prodIds = new Set(cat.records.map(r => r.id));
    for (const m of changelog.merged) expect(prodIds.has(m.merged_into)).toBe(true);
  });

  test('changelog agrees with the catalogue', () => {
    expect(changelog.to.records).toBe(cat.records.length);
    expect(changelog.from.records).toBe(v1.length);
    const n = changelog.added.length + changelog.updated.length + changelog.downgraded.length + changelog.retained.length;
    expect(n).toBe(cat.records.length);
    expect(changelog.removed.length).toBe(cat.summary.rejected_records);
  });

  test('no two records share identical long research notes or summaries', () => {
    const seen = new Map();
    for (const r of cat.records) {
      for (const t of [r.summary, ...r.research_notes.filter(n => n.length > 40)]) {
        expect(seen.get(t) ?? r.id).toBe(r.id);
        seen.set(t, r.id);
      }
    }
  });

  test('availability timestamps reflect checks, not bulk edits', () => {
    for (const r of cat.records) {
      if (r.availability_checked_at) {
        expect(r.availability_evidence.length).toBeGreaterThan(0);
        expect(r.availability_checked_at <= r.last_researched_at).toBe(true);
      }
    }
  });
});

describe('v2 validator', () => {
  test('catches a status claim without evidence', () => {
    const base = read('data/v2/baseline/ai_data.json')[0];
    const r = { ...base, disposition: 'updated', availability_status: 'accepting_applications', availability_checked_at: null };
    const { errs } = validateRecords([r]);
    expect(errs.some(e => /accepting_applications needs an opened/.test(e))).toBe(true);
  });
  test('catches a category with an application link', () => {
    const base = read('data/v2/baseline/ai_data.json').find(r => r.record_type === 'work_category');
    const r = { ...base, disposition: 'updated', application_or_registration_url: 'https://example.org/apply', how_to_find_work: 'x' };
    const { errs } = validateRecords([r]);
    expect(errs.some(e => /must not carry an application URL/.test(e))).toBe(true);
  });
  test('catches confirmed eligibility without an opened source', () => {
    const base = read('data/v2/baseline/ai_data.json')[0];
    const r = { ...base, disposition: 'updated', region_eligibility: { ...base.region_eligibility, canadian_residents: 'confirmed' } };
    const { errs } = validateRecords([r]);
    expect(errs.some(e => /"confirmed" needs an opened/.test(e))).toBe(true);
  });
});
