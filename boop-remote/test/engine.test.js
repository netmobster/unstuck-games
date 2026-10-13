import { describe, test, expect } from 'bun:test';
import { match, pickThree, hardFilter, scoreRecord, uncertainties, fitLabel } from '../src/engine.js';
import { emptyProfile, visibleQuestions, QUESTIONS } from '../src/questions.js';
import { validateCatalogue } from '../src/schema.js';
import { SAMPLE, TODAY, rec } from './fixtures.js';

const profile = o => ({ ...emptyProfile(), ...o });
const ids = list => list.map(m => m.rec.id);

describe('fixtures', () => {
  test('are valid records', () => {
    expect(validateCatalogue(SAMPLE)).toEqual([]);
  });
});

describe('hard filters', () => {
  test('phone ruled out removes phone-heavy work', () => {
    const { ranked, excluded } = match(SAMPLE, profile({ phone: 'no' }), TODAY);
    expect(ids(ranked)).not.toContain('phone-agent');
    expect(excluded.find(e => e.rec.id === 'phone-agent').reason).toMatch(/phone/i);
  });

  test('rejected records are never ranked', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    expect(ids(ranked)).not.toContain('rejected-thing');
  });

  test('province limits apply', () => {
    expect(hardFilter(SAMPLE.find(r => r.id === 'trades-app'), profile({ region: 'CA' }), TODAY)).toMatch(/Limited to ON/);
    expect(hardFilter(SAMPLE.find(r => r.id === 'trades-app'), profile({ region: 'CA-ON' }), TODAY)).toBeNull();
  });

  test('not eligible in Canada is excluded for Canadian users', () => {
    const r = rec({ id: 'us-only', geography: { countries: ['US'], canadaEligibility: 'not_eligible' } });
    expect(hardFilter(r, profile({ region: 'CA-ON' }), TODAY)).toMatch(/Canada/);
  });

  test('outside-Canada users do not see Canada-only routes', () => {
    const { ranked } = match(SAMPLE, profile({ region: 'outside' }), TODAY);
    expect(ids(ranked).sort()).toEqual(['research-panel', 'tutor-market']);
  });

  test('dealbreakers: unpaid tests, fees, disturbing content, contractor, on-site', () => {
    const p = profile({ dealbreakers: ['unpaid_test', 'fees', 'emotional_content', 'contractor', 'onsite'] });
    const { ranked } = match(SAMPLE, p, TODAY);
    for (const id of ['ai-rater', 'tutor-market', 'moderation', 'qa-tester', 'research-panel', 'trades-app']) {
      expect(ids(ranked)).not.toContain(id);
    }
  });

  test('no computer removes computer-dependent routes, but skipping the question does not', () => {
    expect(ids(match(SAMPLE, profile({ equipment: ['smartphone'] }), TODAY).ranked)).toEqual([]);
    expect(match(SAMPLE, profile({ equipment: null }), TODAY).ranked.length).toBeGreaterThan(5);
  });

  test('minimum hours above what the user can give is excluded', () => {
    expect(hardFilter(SAMPLE.find(r => r.id === 'trades-app'), profile({ region: 'CA-ON', hours: 'lt10' }), TODAY)).toMatch(/35 hours/);
  });

  test('firm time windows exclude fixed shifts outside them; soft ones do not', () => {
    const r = SAMPLE.find(x => x.id === 'phone-agent');
    expect(hardFilter(r, profile({ windows: ['night'], windowsFirm: true }), TODAY)).toMatch(/outside/);
    expect(hardFilter(r, profile({ windows: ['night'], windowsFirm: false }), TODAY)).toBeNull();
  });

  test('firm pay floor uses converted hourly pay; unknown pay is kept', () => {
    const p = profile({ minPay: 22, minPayFirm: true });
    expect(hardFilter(SAMPLE.find(r => r.id === 'chat-support'), p, TODAY)).toMatch(/below your floor/);
    // US$15–20 ≈ CA$20.5–27.4: top of range meets the floor, so it stays.
    expect(hardFilter(SAMPLE.find(r => r.id === 'ai-rater'), p, TODAY)).toBeNull();
    expect(hardFilter(SAMPLE.find(r => r.id === 'moderation'), p, TODAY)).toBeNull();
  });

  test('under-18 users do not see 18+ routes', () => {
    const r = rec({ id: 'kid-ok', requirements: { minAge: 16 } });
    expect(hardFilter(SAMPLE[0], profile({ adult: false }), TODAY)).toMatch(/age/);
    expect(hardFilter(r, profile({ adult: false }), TODAY)).toBeNull();
  });

  test('every ranked record passes every hard filter, across many profiles', () => {
    const qs = QUESTIONS.filter(q => q.kind !== 'matrix');
    for (let seed = 0; seed < 300; seed++) {
      const p = emptyProfile();
      for (const [i, q] of qs.entries()) {
        const opts = q.options.map(o => o.value);
        const pick = opts[(seed * (i + 3) + i) % (opts.length + 1)];
        p[q.id] = q.kind === 'multi' ? (pick === undefined ? null : opts.filter((_, j) => (seed >> j) & 1)) : pick ?? null;
      }
      const { ranked } = match(SAMPLE, p, TODAY);
      for (const m of ranked) expect(hardFilter(m.rec, p, TODAY)).toBeNull();
    }
  });
});

describe('ranking', () => {
  test('is deterministic for the same input', () => {
    const p = profile({ region: 'CA-ON', interaction: 'text', goals: ['fast', 'flexible'], strengths: { writing: 'yes' } });
    const a = ids(match(SAMPLE, p, TODAY).ranked);
    const b = ids(match([...SAMPLE].reverse(), p, TODAY).ranked);
    expect(a).toEqual(b);
  });

  test('unknown answers never act as negative skill judgements', () => {
    const r = SAMPLE.find(x => x.id === 'qa-tester');
    const blank = scoreRecord(r, profile({}), TODAY);
    const notSure = scoreRecord(r, profile({ strengths: {} , computer: null }), TODAY);
    const disliked = scoreRecord(r, profile({ strengths: { technical: 'prefer_not', detail: 'prefer_not' } }), TODAY);
    expect(notSure.score).toBe(blank.score);
    expect(blank.breakdown.find(b => b.key === 'skills')).toBeUndefined();
    expect(disliked.score).toBeLessThan(blank.score);
  });

  test('"would learn" is never worse than not answering for moderate demands', () => {
    const r = SAMPLE.find(x => x.id === 'chat-support');
    const learn = scoreRecord(r, profile({ strengths: { customer: 'learn', writing: 'learn' } }), TODAY);
    const blank = scoreRecord(r, profile({}), TODAY);
    expect(learn.score).toBeGreaterThanOrEqual(blank.score);
  });

  test('preferences move the right routes up', () => {
    const textFirst = ids(match(SAMPLE, profile({ interaction: 'text', phone: 'prefer_not' }), TODAY).ranked);
    expect(textFirst.indexOf('chat-support')).toBeLessThan(textFirst.indexOf('phone-agent'));
    const career = ids(match(SAMPLE, profile({ region: 'CA-ON', goals: ['career'], learn: 'yes' }), TODAY).ranked);
    expect(career[0]).toBe('trades-app');
  });

  test('stale records are demoted and flagged, never presented as current', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    const old = ranked.find(m => m.rec.id === 'old-record');
    expect(old.stale).toBe(true);
    expect(uncertainties(old.rec, TODAY).join(' ')).toMatch(/re-checking/);
    const fresh = scoreRecord(rec({ id: 'fresh', evidenceStrength: 'strong' }), profile({}), TODAY);
    expect(old.score).toBeLessThan(fresh.score);
  });

  test('fit labels are words, not percentages', () => {
    for (const s of [-1, 0, 0.2, 0.4, 0.9]) expect(fitLabel(s)).not.toMatch(/%/);
  });
});

describe('three picks', () => {
  test('are distinct and avoid a single category when possible', () => {
    const { ranked } = match(SAMPLE, profile({ region: 'CA-ON' }), TODAY);
    const picks = pickThree(ranked);
    expect(picks.length).toBe(3);
    expect(new Set(picks.map(p => p.rec.id)).size).toBe(3);
    expect(new Set(picks.map(p => p.rec.category)).size).toBeGreaterThanOrEqual(2);
  });

  test('first pick is a specific route, not a category, when one exists', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    expect(pickThree(ranked)[0].rec.type).not.toBe('category');
  });

  test('passes are removed and likes are boosted', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    const first = pickThree(ranked)[0].rec.id;
    const after = pickThree(ranked, { passed: [first] });
    expect(after.map(p => p.rec.id)).not.toContain(first);
    const liked = pickThree(ranked, { liked: ['qa-tester'] });
    expect(liked.map(p => p.rec.id)).toContain('qa-tester');
  });

  test('stale records never appear in the three', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    expect(pickThree(ranked, { liked: ['old-record'] }).map(p => p.rec.id)).not.toContain('old-record');
  });

  test('empty input gives an empty shortlist, not a crash', () => {
    expect(pickThree([])).toEqual([]);
  });
});

describe('questionnaire', () => {
  test('follow-ups only appear when they matter', () => {
    const ids0 = visibleQuestions(emptyProfile()).map(q => q.id);
    expect(ids0).not.toContain('windowsFirm');
    expect(ids0).not.toContain('minPayFirm');
    const ids1 = visibleQuestions({ ...emptyProfile(), windows: ['evening'], minPay: 22, interaction: 'live' }).map(q => q.id);
    expect(ids1).toContain('windowsFirm');
    expect(ids1).toContain('minPayFirm');
    expect(ids1).not.toContain('phone');
  });

  test('core question count stays short', () => {
    expect(visibleQuestions(emptyProfile()).length).toBeLessThanOrEqual(13);
  });

  test('no question asks for diagnoses or identity details', () => {
    const text = JSON.stringify(QUESTIONS).toLowerCase();
    for (const w of ['diagnos', 'disab', 'health', 'your name', 'email address', 'phone number', 'immigration', 'gender', 'birth', 'postal']) expect(text).not.toContain(w);
  });
});

describe('restricted audiences', () => {
  const restricted = rec({ id: 'only-some', audience: ['People who use assistive technology'], evidenceStrength: 'strong', interaction: { modes: ['text'], realtime: 'none', phone: false } });
  test('never enter the shortlist unless liked or saved', () => {
    const { ranked } = match([restricted, ...SAMPLE], profile({ interaction: 'text' }), TODAY);
    expect(pickThree(ranked).map(p => p.rec.id)).not.toContain('only-some');
    expect(pickThree(ranked, { liked: ['only-some'] }).map(p => p.rec.id)).toContain('only-some');
  });
  test('are still visible in the ranked list, with the restriction surfaced', () => {
    const { ranked } = match([restricted], profile({}), TODAY);
    expect(ranked.length).toBe(1);
    expect(uncertainties(restricted, TODAY).join(' ')).toMatch(/Only open to/);
  });
});

describe('labels and slots', () => {
  test('sparse answers produce an honest label instead of a fit judgement', () => {
    const { ranked } = match(SAMPLE, profile({}), TODAY);
    expect(ranked.every(m => m.label === 'Not enough answers yet')).toBe(true);
  });
  test('the best-fit slot is never a support program or category when an earning route exists', () => {
    const prog = rec({ id: 'job-search-tool', type: 'program', category: 'government_program', evidenceStrength: 'strong', interaction: { modes: ['independent'], realtime: 'none', phone: false } });
    const { ranked } = match([prog, ...SAMPLE], profile({ interaction: 'independent', goals: ['flexible'] }), TODAY);
    expect(['program', 'category']).not.toContain(pickThree(ranked)[0].rec.type);
  });
});
