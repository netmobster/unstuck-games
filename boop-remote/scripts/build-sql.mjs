// Generate supabase/schema.sql and supabase/seed.sql from data/catalogue.json and src/schema.js.
// Usage: node boop-remote/scripts/build-sql.mjs
//
// Postgres (Supabase) DDL plus a seed. Scalar fields are columns, nested groups are jsonb, and the
// full original record is kept in `record` so a client can hand it straight to the matching engine.
// Check constraints are generated from the same enums as the validator.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../src/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'supabase');
mkdirSync(out, { recursive: true });
const { records, generated, safety } = JSON.parse(readFileSync(join(root, 'data', 'catalogue.json'), 'utf8'));

const lit = v => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const arr = a => `array[${(a || []).map(lit).join(',')}]::text[]`;
const json = v => `${lit(JSON.stringify(v))}::jsonb`;
const inList = list => list.map(lit).join(', ');

const schema = `-- Opportunity Engine data layer for Supabase / Postgres. Generated ${generated} by scripts/build-sql.mjs.
-- Apply this file once, then supabase/seed.sql. Re-running seed.sql upserts.

create table if not exists public.opportunities (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  organization text not null,
  type text not null check (type in (${inList(S.TYPES)})),
  category text not null check (category in (${inList(Object.keys(S.CATEGORIES))})),
  tags text[] not null default '{}',
  summary text not null,
  what_you_do text not null,
  appeal text[] not null,
  watch_outs text[] not null,
  official_url text,
  apply_url text,
  canada_eligibility text not null check (canada_eligibility in (${inList(S.ELIGIBILITY)})),
  setting text not null check (setting in (${inList(S.SETTINGS)})),
  regions text[] not null default '{}',
  countries text[] not null default '{}',
  languages text[] not null default '{}',
  worker_status text not null check (worker_status in (${inList(S.WORKER)})),
  fees text,
  time_to_first_earnings text not null check (time_to_first_earnings in ('days', 'weeks', 'months', 'unknown')),
  horizon text not null check (horizon in (${inList(S.HORIZONS)})),
  status text not null check (status in (${inList(Object.keys(S.STATUSES))})),
  legitimacy text not null check (legitimacy in (${inList(S.LEGITIMACY)})),
  evidence_strength text not null check (evidence_strength in (${inList(S.EVIDENCE)})),
  risk_flags text[] not null default '{}',
  audience text[] not null default '{}',
  fits_if text not null,
  not_fit_if text not null,
  last_checked date not null,
  pay_min numeric,
  pay_max numeric,
  pay_currency text check (pay_currency in ('CAD', 'USD', 'unstated')),
  pay_unit text,
  pay_basis text not null check (pay_basis in ('official', 'self_reported', 'aggregator', 'unknown')),
  requirements jsonb not null,
  schedule jsonb not null,
  interaction jsonb not null,
  skills jsonb not null,
  training jsonb not null,
  compensation jsonb not null,
  reliability jsonb not null,
  application_steps text[] not null default '{}',
  record jsonb not null,
  recommendable boolean generated always as (status not in ('rejected', 'not_currently_open')) stored,
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id bigserial primary key,
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  position int not null,
  url text not null,
  title text not null,
  type text not null check (type in (${inList(S.SOURCE_TYPES)})),
  publisher text,
  published text,
  accessed date not null,
  claims text[] not null default '{}',
  notes text,
  accessible boolean not null default false,
  unique (opportunity_id, position)
);

create table if not exists public.safety_sources (
  url text primary key,
  title text not null,
  publisher text,
  accessed date,
  notes text,
  tips text[] not null default '{}'
);

create index if not exists opportunities_category_idx on public.opportunities (category);
create index if not exists opportunities_status_idx on public.opportunities (status);
create index if not exists sources_opportunity_idx on public.sources (opportunity_id);

-- Everyone may read; nobody writes through the API (load data with seed.sql using the service role).
alter table public.opportunities enable row level security;
alter table public.sources enable row level security;
alter table public.safety_sources enable row level security;
drop policy if exists "public read opportunities" on public.opportunities;
drop policy if exists "public read sources" on public.sources;
drop policy if exists "public read safety" on public.safety_sources;
create policy "public read opportunities" on public.opportunities for select using (true);
create policy "public read sources" on public.sources for select using (true);
create policy "public read safety" on public.safety_sources for select using (true);

-- The view a front end should list from: nothing rejected or closed.
create or replace view public.opportunities_live as
  select * from public.opportunities where recommendable;
`;

const rows = records.map(r => {
  const g = r.geography, c = r.compensation;
  const cols = {
    id: lit(r.id), name: lit(r.name), organization: lit(r.organization), type: lit(r.type), category: lit(r.category),
    tags: arr(r.tags), summary: lit(r.summary), what_you_do: lit(r.whatYouDo), appeal: arr(r.appeal), watch_outs: arr(r.watchOuts),
    official_url: lit(r.officialUrl), apply_url: lit(r.applyUrl),
    canada_eligibility: lit(g.canadaEligibility), setting: lit(g.setting), regions: arr(g.regions), countries: arr(g.countries),
    languages: arr(r.languages), worker_status: lit(r.workerStatus), fees: lit(r.fees),
    time_to_first_earnings: lit(r.timeToFirstEarnings), horizon: lit(r.horizon), status: lit(r.status),
    legitimacy: lit(r.legitimacy), evidence_strength: lit(r.evidenceStrength), risk_flags: arr(r.riskFlags),
    audience: arr(r.audience), fits_if: lit(r.fitsIf), not_fit_if: lit(r.notFitIf), last_checked: lit(r.lastChecked),
    pay_min: c.min ?? 'null', pay_max: c.max ?? 'null', pay_currency: lit(c.currency), pay_unit: lit(c.unit), pay_basis: lit(c.basis),
    requirements: json(r.requirements), schedule: json(r.schedule), interaction: json(r.interaction), skills: json(r.skills),
    training: json(r.training), compensation: json(r.compensation), reliability: json(r.reliability),
    application_steps: arr(r.applicationSteps), record: json(r),
  };
  const names = Object.keys(cols);
  const upd = names.filter(n => n !== 'id').map(n => `${n} = excluded.${n}`).join(', ');
  const srcs = r.sources.map((s, i) => `insert into public.sources (opportunity_id, position, url, title, type, publisher, published, accessed, claims, notes, accessible) values (${lit(r.id)}, ${i}, ${lit(s.url)}, ${lit(s.title)}, ${lit(s.type)}, ${lit(s.publisher)}, ${lit(s.published)}, ${lit(s.accessed)}, ${arr(s.claims)}, ${lit(s.notes)}, ${s.accessible === false ? 'false' : 'true'});`);
  return [
    `insert into public.opportunities (${names.join(', ')}) values (${names.map(n => cols[n]).join(', ')})\n  on conflict (id) do update set ${upd}, updated_at = now();`,
    `delete from public.sources where opportunity_id = ${lit(r.id)};`,
    ...srcs,
  ].join('\n');
});

const safetyRows = safety.map(s => `insert into public.safety_sources (url, title, publisher, accessed, notes, tips) values (${lit(s.url)}, ${lit(s.title)}, ${lit(s.publisher)}, ${lit(s.accessed)}, ${lit(s.notes)}, ${arr(s.tips)}) on conflict (url) do update set title = excluded.title, publisher = excluded.publisher, accessed = excluded.accessed, notes = excluded.notes, tips = excluded.tips;`);

const seed = `-- Opportunity Engine seed: ${records.length} opportunities, ${records.reduce((n, r) => n + r.sources.length, 0)} sources, ${safety.length} safety sources. Generated ${generated} by scripts/build-sql.mjs. Idempotent.
begin;
${rows.join('\n\n')}

${safetyRows.join('\n')}
commit;
`;

writeFileSync(join(out, 'schema.sql'), schema);
writeFileSync(join(out, 'seed.sql'), seed);
console.log(`supabase/: schema.sql and seed.sql (${records.length} opportunities).`);
