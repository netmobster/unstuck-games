-- Opportunity Engine data layer for Supabase / Postgres. Generated 2026-10-13 by scripts/build-sql.mjs.
-- Apply this file once, then supabase/seed.sql. Re-running seed.sql upserts.

create table if not exists public.opportunities (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  organization text not null,
  type text not null check (type in ('employment', 'contract', 'freelance', 'task_platform', 'research_participation', 'training_pathway', 'program', 'category')),
  category text not null check (category in ('customer_ops', 'language_writing', 'ai_data', 'tech_digital', 'research_participation', 'creative_production', 'structured_employment', 'freelance_microbusiness', 'government_program')),
  tags text[] not null default '{}',
  summary text not null,
  what_you_do text not null,
  appeal text[] not null,
  watch_outs text[] not null,
  official_url text,
  apply_url text,
  canada_eligibility text not null check (canada_eligibility in ('confirmed', 'likely', 'unclear', 'not_eligible')),
  setting text not null check (setting in ('remote', 'hybrid', 'onsite', 'varies')),
  regions text[] not null default '{}',
  countries text[] not null default '{}',
  languages text[] not null default '{}',
  worker_status text not null check (worker_status in ('employee', 'contractor', 'participant', 'student', 'varies', 'unknown')),
  fees text,
  time_to_first_earnings text not null check (time_to_first_earnings in ('days', 'weeks', 'months', 'unknown')),
  horizon text not null check (horizon in ('now', 'bridge', 'career')),
  status text not null check (status in ('applications_open_confirmed', 'registration_open_not_work_guaranteed', 'eligibility_confirmed', 'official_info_found', 'waitlist_or_no_work_guarantee', 'uncertain', 'not_currently_open', 'stale_needs_recheck', 'rejected')),
  legitimacy text not null check (legitimacy in ('established', 'likely', 'unclear')),
  evidence_strength text not null check (evidence_strength in ('strong', 'moderate', 'weak')),
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
  type text not null check (type in ('official', 'government', 'independent_review', 'forum', 'journalism', 'aggregator')),
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
