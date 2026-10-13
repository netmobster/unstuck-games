import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import * as S from '../src/schema.js';
import { QUESTIONS, visibleQuestions, conditionHolds, emptyProfile } from '../src/questions.js';
import { WEIGHTS } from '../src/engine.js';

const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const { records } = read('data/catalogue.json');

describe('static API (api/)', () => {
  test('every endpoint in index.json exists', () => {
    const idx = read('api/index.json');
    for (const ep of Object.keys(idx.endpoints)) {
      const path = ep.includes('{id}') ? `api/opportunities/${records[0].id}.json` : `api/${ep}`;
      expect(existsSync(new URL(path, root))).toBe(true);
    }
  });

  test('one file per record, and the slim list matches the catalogue', () => {
    const files = readdirSync(new URL('api/opportunities/', root)).filter(f => f.endsWith('.json'));
    expect(files.length).toBe(records.length);
    const slim = read('api/opportunities.json');
    expect(slim.count).toBe(records.length);
    expect(slim.records.map(r => r.id)).toEqual(records.map(r => r.id));
    for (const r of slim.records) expect(typeof r.recommendable).toBe('boolean');
    const full = read(`api/opportunities/${records[0].id}.json`);
    expect(full).toEqual(records[0]);
  });

  test('meta counts and weights match the sources of truth', () => {
    const meta = read('api/meta.json');
    expect(meta.counts.records).toBe(records.length);
    expect(meta.counts.recommendable).toBe(records.filter(r => !['rejected', 'not_currently_open'].includes(r.status)).length);
    expect(meta.matching.weights).toEqual(WEIGHTS);
    expect(Object.keys(meta.enums.statuses)).toEqual(Object.keys(S.STATUSES));
    expect(Object.keys(meta.enums.categories)).toEqual(Object.keys(S.CATEGORIES));
  });

  test('the JSON Schema enums mirror the validator', () => {
    const sch = read('api/schema.json');
    const p = sch.properties;
    expect(p.status.enum).toEqual(Object.keys(S.STATUSES));
    expect(p.type.enum).toEqual(S.TYPES);
    expect(p.category.enum).toEqual(Object.keys(S.CATEGORIES));
    expect(p.workerStatus.enum).toEqual(S.WORKER);
    expect(p.sources.items.properties.type.enum).toEqual(S.SOURCE_TYPES);
    expect(Object.keys(p.skills.properties)).toEqual(S.SKILLS);
    for (const r of records) for (const k of sch.required) expect(r).toHaveProperty(k);
  });

  test('questions survive a JSON round trip, conditions included', () => {
    const q = read('api/questions.json').questions;
    expect(q).toEqual(JSON.parse(JSON.stringify(QUESTIONS)));
    const profile = { ...emptyProfile(), windows: ['evening'], minPay: 22, interaction: 'live' };
    const direct = visibleQuestions(profile).map(x => x.id);
    const viaJson = q.filter(x => conditionHolds(x.when, profile)).map(x => x.id);
    expect(viaJson).toEqual(direct);
  });
});

describe('conditionHolds', () => {
  test('each operator', () => {
    expect(conditionHolds(undefined, {})).toBe(true);
    expect(conditionHolds({ key: 'a', not: 'x' }, { a: 'x' })).toBe(false);
    expect(conditionHolds({ key: 'a', not: 'x' }, { a: null })).toBe(true);
    expect(conditionHolds({ key: 'n', gt: 0 }, { n: 5 })).toBe(true);
    expect(conditionHolds({ key: 'n', gt: 0 }, { n: null })).toBe(false);
    expect(conditionHolds({ key: 'l', minLength: 1, maxLength: 3 }, { l: ['a'] })).toBe(true);
    expect(conditionHolds({ key: 'l', minLength: 1, maxLength: 3 }, { l: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(conditionHolds({ key: 'l', minLength: 1 }, { l: null })).toBe(false);
  });
});

describe('Supabase SQL (supabase/)', () => {
  const schema = readFileSync(new URL('supabase/schema.sql', root), 'utf8');
  const seed = readFileSync(new URL('supabase/seed.sql', root), 'utf8');

  test('seed has one upsert per record and one insert per source', () => {
    expect((seed.match(/insert into public\.opportunities /g) || []).length).toBe(records.length);
    expect((seed.match(/insert into public\.sources /g) || []).length).toBe(records.reduce((n, r) => n + r.sources.length, 0));
    expect(seed.startsWith('--')).toBe(true);
    expect(seed.trim().endsWith('commit;')).toBe(true);
  });

  test('check constraints carry every enum value', () => {
    for (const s of Object.keys(S.STATUSES)) expect(schema).toContain(`'${s}'`);
    for (const c of Object.keys(S.CATEGORIES)) expect(schema).toContain(`'${c}'`);
    for (const t of S.TYPES) expect(schema).toContain(`'${t}'`);
    expect(schema).toContain('enable row level security');
    expect(schema).toContain('create or replace view public.opportunities_live');
  });

  test('every record id appears quoted and escaped in the seed', () => {
    for (const r of records) expect(seed).toContain(`'${r.id}'`);
    // Apostrophes in text must be doubled for SQL.
    const withQuote = records.find(r => r.summary.includes("'"));
    if (withQuote) expect(seed).toContain(withQuote.summary.replace(/'/g, "''"));
  });
});
