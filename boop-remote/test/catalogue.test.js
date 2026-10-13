import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { validateRecord, isHttpUrl } from '../src/schema.js';
import { match, pickThree, isStale } from '../src/engine.js';
import { emptyProfile } from '../src/questions.js';

const data = JSON.parse(readFileSync(new URL('../data/catalogue.json', import.meta.url), 'utf8'));
const records = data.records;
const TODAY = data.generated;
const host = u => new URL(u).hostname.replace(/^www\./, '');
// "example.com" counts as covered by a source on "help.example.com" and vice versa.
const related = (a, b) => a === b || a.endsWith('.' + b) || b.endsWith('.' + a);

describe('catalogue', () => {
  test('has records', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  test('every record passes schema validation', () => {
    const problems = records.flatMap(r => validateRecord(r).map(e => `${r.id}: ${e}`));
    expect(problems).toEqual([]);
  });

  test('ids are unique', () => {
    expect(new Set(records.map(r => r.id)).size).toBe(records.length);
  });

  test('every published link is a valid URL backed by a source on the same site', () => {
    const missing = [];
    for (const r of records) {
      for (const u of [r.officialUrl, r.applyUrl].filter(Boolean)) {
        expect(isHttpUrl(u)).toBe(true);
        if (!r.sources.some(s => related(host(s.url), host(u)))) missing.push(`${r.id}: ${u}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('"applications open" always has accessible official evidence and a check date', () => {
    for (const r of records.filter(r => r.status === 'applications_open_confirmed')) {
      const off = r.sources.filter(s => ['official', 'government'].includes(s.type) && s.accessible !== false && s.claims.includes('status'));
      expect(off.length).toBeGreaterThan(0);
      expect(r.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('category records never pose as specific jobs', () => {
    for (const r of records.filter(r => r.type === 'category')) {
      expect(r.applyUrl).toBeNull();
      expect(['applications_open_confirmed', 'registration_open_not_work_guaranteed', 'eligibility_confirmed']).not.toContain(r.status);
    }
  });

  test('research participation is never labelled as employment', () => {
    for (const r of records.filter(r => r.type === 'research_participation')) {
      expect(r.workerStatus).not.toBe('employee');
    }
  });

  test('rejected and stale records never reach the shortlist', () => {
    const { ranked } = match(records, emptyProfile(), TODAY);
    const all = ranked.map(m => m.rec.id);
    const picks = pickThree(ranked, { liked: all });
    for (const p of picks) {
      expect(p.rec.status).not.toBe('rejected');
      expect(isStale(p.rec, TODAY)).toBe(false);
    }
  });

  test('source dates are not in the future', () => {
    for (const r of records) for (const s of r.sources) expect(s.accessed <= TODAY).toBe(true);
  });
});
