import { test, expect } from 'bun:test';
import { buildPrompt, preferenceLines } from '../src/prompt.js';
import { emptyProfile } from '../src/questions.js';
import { rec, TODAY } from './fixtures.js';

const r = rec({ id: 'p', name: 'Chat support agent', organization: 'Acme', officialUrl: 'https://acme.example.org', applyUrl: 'https://acme.example.org/jobs' });

test('includes the opportunity, official URL and the required checks', () => {
  const p = buildPrompt(r, { ...emptyProfile(), region: 'CA-ON' }, TODAY);
  expect(p).toContain('Chat support agent');
  expect(p).toContain('https://acme.example.org');
  expect(p).toContain('https://acme.example.org/jobs');
  for (const s of ['Eligibility', 'Availability', 'Pay', 'employee or contractor', 'unpaid tests', 'Worker experiences', 'Red flags', 'unknown', 'Ontario, Canada']) expect(p).toContain(s);
});

test('only includes preferences the person gave', () => {
  expect(preferenceLines(emptyProfile())).toEqual([]);
  const lines = preferenceLines({ ...emptyProfile(), phone: 'no', goals: ['fast', 'career'], minPay: 22, minPayFirm: true });
  expect(lines.join('\n')).toMatch(/ruled out/);
  expect(lines.join('\n')).toMatch(/\$22/);
});

test('does not leak skill self-ratings, equipment or age', () => {
  const p = buildPrompt(r, { ...emptyProfile(), strengths: { writing: 'prefer_not' }, computer: 1, adult: false, equipment: ['smartphone'] }, TODAY);
  expect(p).not.toMatch(/prefer_not|smartphone|18|computer comfort/i);
});

test('category records ask for specific places rather than pretending to be one', () => {
  const p = buildPrompt(rec({ id: 'c', type: 'category', organization: 'Various' }), emptyProfile(), TODAY);
  expect(p).toMatch(/kind of work, not a specific employer/);
});
