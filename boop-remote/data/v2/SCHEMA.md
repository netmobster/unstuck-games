# Catalogue v2: data contract

`schema_version` **2.0.0** · `dataset_id` **opportunity-engine-ontario** · machine-readable schema: `catalogue.schema.json` (generated from `scripts/v2/schema.mjs`, which is the source of truth for every enum).

The production file is `catalogue.v2.json`. Everything a front end needs to filter and rank is a controlled value or a number; prose fields are for display. **Unknown is a value, never a guess:** `null`, `[]` or the literal `"unknown"` mean the evidence didn't say.

## Top level

| Field | Meaning |
|---|---|
| `schema_version`, `dataset_id`, `generated_at` | Identity of the file |
| `research_scope` | Region, methodology, and the run's limitations (read them) |
| `records[]` | Only records with `production_eligible: true` |
| `summary` | Counts, recomputed by the builder and checked by the validator |

The companion files are `catalogue.audit.json` (every original record and candidate with its disposition, including rejected and merged ones) and `catalogue.changelog.json` (v1 → v2 differences).

## A record

### Identity
- `id` stable kebab-case; v1 ids were kept wherever the record survived.
- `name`, `organization` (null for categories), `summary`, `what_you_do`.
- `record_type` (what kind of thing this is) is separate from `category` (what field of work).

| `record_type` | Meaning |
|---|---|
| `specific_job` | one verified posting or vacancy |
| `employer` | a hiring destination without a verified specific vacancy |
| `task_platform` | eligible users may qualify for paid tasks; no work guaranteed |
| `freelance_marketplace` | you must find clients or compete for work |
| `service_business` | a service someone could sell independently |
| `research_participation` | paid studies, interviews, panels; occasional compensation, never a wage |
| `training_program` | training or education pathway |
| `funded_employment_program` | supported employment, placement or wage subsidy |
| `government_support` | an employment support or funding service |
| `work_category` | a broad kind of work, not an employer or platform |

- `how_to_find_work`: required for `work_category` and `service_business`; concrete places and methods to find actual paid work.
- `who_it_may_fit[]` / `who_it_may_not_fit[]`: factual fit statements, grounded in the record's conditions. Display only; never used as a hidden persona filter.
- `audience_restriction[]`: groups the route is only open to (students, youth 15–30, assistive-technology users…). The app must never ask people whether they belong; show the label, and keep such routes out of automatic shortlists.

### Eligibility (separate from availability)
`region_eligibility.canadian_residents` and `.ontario_residents`: `confirmed` · `likely` · `partial` · `unclear` · `not_eligible`.
- `confirmed` requires an **opened** official/government source supporting the eligibility claim. (This run could open no web page, so `confirmed` is rare.)
- `partial` = some provinces or some people (see `provinces[]`, `eligibility_notes[]`).
- `work_authorization_notes` when a posting states citizenship/PR/permit rules.

### Availability (separate from eligibility and from existence)
`availability_status`:

| Value | Use only when |
|---|---|
| `open_specific_opportunity` | a real, specific opening was verified from an opened authoritative source; `record_type` must be `specific_job` |
| `accepting_applications` | an opened authoritative source shows applications are being accepted |
| `registration_open_work_not_guaranteed` | sign-up is open, tasks/work are not promised |
| `program_open_check_eligibility` | the program is running; the person must check they qualify |
| `temporarily_paused` | official notice of a pause |
| `closed_or_not_open` | officially closed, or the posting's deadline passed |
| `waitlist` | official waitlist, or consistent reports of long waits for any work |
| `availability_unknown` | nothing current could be established |
| `not_eligible_for_ontario` | demonstrably closed to Ontario residents |
| `rejected_insufficient_evidence` | kept for the audit trail only |
| `not_applicable_category` | `work_category` and `service_business` only |

- `availability_checked_at` is set only when an availability check was actually performed on that record; `availability_evidence[]` says what was seen, citing sources.
- `application_or_registration_url` is set only when that page was opened or appeared verbatim in an authoritative listing; otherwise null and `official_url` is the next step.

### Requirements, conditions, skills
- `requirements`: `minimum_age`, `education`, `experience` (`none|some|significant|unknown`), `languages[]`, `equipment[]`, `certifications[]`, `other[]`.
- `work_conditions`: all controlled: `work_location`, `relationship_type`, `schedule_type`, `hours_commitment`, `hours_min_weekly`/`hours_max_weekly`, `time_windows[]`, `real_time_interaction`, `phone_or_video_required`, `text_based_work`, `independent_work`, `task_variety`, `customer_facing`, `sales_or_commission`, `deadline_pressure`, `work_guaranteed` (`yes|conditional|competitive|sporadic|no|unknown`), `emotional_content_risk`, `training_required`, plus `conditions_notes[]`.
- `skill_demands`: 0 (not needed) to 3 (core, high bar) for computer, writing, numeracy, detail, customer, technical, creative, language. Carried over from v1 so a matcher can compare against a person's stated preferences.

### Economics (advertised ≠ verified ≠ anecdotal)
- `pay_type` and `rate_unit` are controlled; `currency` is `CAD`, `USD` or `unstated` (a figure published without a currency; never assumed).
- `advertised_rate` {min, max, unit, note}: what an official or aggregator page says.
- `verified_rate`: only from an **opened** official document supporting `pay`. (None this run.)
- `anecdotal_effective_rate` {min, max, unit, basis}: worker-reported; `basis` states where it comes from. Never a general expectation.
- `fees[]`, `payment_terms[]`, `unpaid_work[]`, `time_to_first_payment` (`days|weeks|months|unknown|null`), `income_predictability`, `earnings_depend_on[]` (winning_clients, receiving_tasks, passing_qualification, being_selected, sales, hours_worked, program_funding, audience_or_downloads), `economics_notes[]`.
- `costs`: `upfront_cost` (`none|low|moderate|high|unknown`), `required_purchases[]`, `potential_expenses[]`.

### Risk and outlook
- `risks[]`: controlled codes (see `scripts/v2/schema.mjs` → `E.risk`), `risk_notes[]` for specifics, `barriers[]` for practical obstacles.
- `progression_potential` (`low|medium|high|unknown`) and `horizon` (`now` = can earn soon, `bridge` = stepping stone, `career` = longer route).

### Evidence
- `evidence_quality`: `strong` (central claims directly supported by current authoritative sources that were opened, with eligibility and status checked) · `moderate` (credible evidence, one or more important details unverified) · `weak` (limited, indirect, stale or mostly anecdotal) · `insufficient` (not enough to include).
- `confidence` 0–1 is **computed by the builder**, never typed in: base by evidence quality (strong .75, moderate .45, weak .25, insufficient .05) + .10 if an opened authoritative source supports availability or eligibility + Ontario eligibility (confirmed .05, likely .03, partial .02) + .05 if availability was established with evidence + .03 if a rate has a real currency + .02 if a negative-evidence pass (anecdote or reporting source) was done − .05 per recorded contradiction (max .15) − .10 if last researched more than 180 days ago. Clamped to [0, 1].
- `contradictions[]`: where sources disagree.
- `last_researched_at`: when work was actually done on this record (ISO-8601). Not bulk-updated.
- `sources[]`: see below. `research_notes[]`, `open_questions[]`.

### Disposition and migration
- `disposition`: `retained` · `updated` · `downgraded` · `merged` · `rejected` · `new`, with `disposition_reason`.
- `production_eligible` is computed: not rejected/merged, evidence not insufficient, not ineligible for Ontario, and at least one source.
- `migration`: `v1_id`, `v1_name`, `v1_status` (null for new records), `merged_into`, `merged_from[]`, `changes[]`, `claims_verified[]`, `unresolved_claims[]`.

## A source

```json
{ "url": "https://…", "source_type": "official", "publisher": "…", "title": "…",
  "access_status": "search_result_only", "accessed_at": "2026-10-13T15:02:00Z", "published_at": null,
  "supports": ["canadian_eligibility", "pay"], "evidence_summary": "What this source establishes", "limitations": ["…"] }
```
- `source_type`: `official` · `government` · `academic` · `independent_reporting` · `worker_anecdote` · `aggregator` · `job_board` · `other`.
- `access_status`: `opened_and_reviewed` (the page itself was read) · `search_result_only` (seen as a search-engine summary or snippet) · `access_blocked` · `not_found` · `not_checked`.
- `supports[]` lists only the claims this source genuinely supports: existence, official_url, canadian_eligibility, ontario_eligibility, availability, application_route, pay, fees, requirements, work_conditions, work_volume, risks, legitimacy, scam_warning, program_eligibility, funding, training.

## Rules the validator enforces (`scripts/v2/validate.mjs`)
1. Categories and services: `not_applicable_category`, no application URL, `how_to_find_work` present.
2. `open_specific_opportunity` / `accepting_applications` need an opened authoritative source supporting `availability` and an `availability_checked_at`.
3. Other definite statuses need a source supporting `availability` and non-empty `availability_evidence`.
4. `confirmed` eligibility needs an opened authoritative source.
5. `strong` evidence needs opened authoritative sources for both eligibility and availability. `moderate` needs at least one authoritative source.
6. `verified_rate` needs an opened official source supporting `pay`; any rate needs a currency and a `pay` source.
7. Rejected, merged, insufficient-evidence and Ontario-ineligible records are never `production_eligible`.
8. Non-new records carry `migration.v1_id`; merged records name `merged_into`.
9. `availability_checked_at` cannot be later than `last_researched_at`.
10. Summary counts must equal the records.

## Mapping from v1 (for anyone holding the old file)
`type` → `record_type` (employment/contract → employer, freelance → freelance_marketplace, training_pathway → training_program, program → government_support or funded_employment_program, category → work_category); `status` → `availability_status` (official_info_found/uncertain/stale → availability_unknown, waitlist_or_no_work_guarantee → waitlist, not_currently_open → closed_or_not_open); `geography.canadaEligibility` → `region_eligibility.canadian_residents`; `sources[].accessible` → `access_status` (false → search_result_only); `compensation` → `advertised_rate` or `anecdotal_effective_rate` by `basis`; `appeal`/`fitsIf` → `who_it_may_fit`; `watchOuts`/`notFitIf` → `who_it_may_not_fit`; `riskFlags` → `risks` codes. The mechanical part is `scripts/v2/migrate.mjs`; the judgement part is in `catalogue.audit.json`.
