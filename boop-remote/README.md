# Opportunity Engine (boop-remote)

**Find work that fits. Not another job board.** A low-pressure tool that asks about how a person likes to work, filters out routes that can't work for them, ranks the rest on fit, and leaves them with three realistic next steps. Each step comes with its trade-offs and its evidence, including what couldn't be verified.

Canada-first (Ontario where relevant). No accounts, no tracking. Answers stay in the browser.

> **Status (2026-10-13):** working prototype plus two datasets. **v2 (`data/v2/catalogue.v2.json`, 98 records) is the one to build on:** every v1 record was individually revalidated for Ontario, 25 routes were added, 12 were rejected into the audit trail, and the contract is documented in `data/v2/SCHEMA.md`. The research environment could not open web pages, so evidence is search-engine summaries plus 20 job postings read through a job-board connector; **no record claims "confirmed" eligibility, and only five claim a current opening.** Read `RESEARCH_REPORT.md` and `VALIDATION_REPORT.md` before relying on any listing. The reference app in this folder still runs on v1 (`data/catalogue.json`).

## Run it

It is a static site: plain HTML, CSS and ES modules, with no build step and no dependencies. It must be served over http, because the catalogue is fetched.

```bash
cd boop-remote
npx http-server -c-1 -p 8080 .     # or: python3 -m http.server 8080
# open http://localhost:8080
```

Once merged, it is also served by the repo's GitHub Pages at `/boop-remote/`.

## Using it as a data layer

The front end can be rebuilt elsewhere (Lovable, say) on top of what's here. **`LOVABLE.md`** explains the three routes: fetch the static JSON in `api/` (served with CORS at `https://unstuck-games.com/boop-remote/api/` once deployed), load `supabase/schema.sql` + `supabase/seed.sql` into Supabase, or copy the four engine modules in with `types/index.d.ts`. The reference UI in this folder uses exactly the same modules and data.

## What's in it

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `src/app.js` | The reference UI: intro → questions → swipe deck → details → three-pick shortlist → saved → about |
| `api/` | Generated static JSON endpoints: `index.json`, `meta.json`, `opportunities.json`, `opportunities/{id}.json`, `catalogue.json`, `questions.json`, `schema.json`, `safety.json` |
| `supabase/` | Generated Postgres DDL (`schema.sql`, with RLS and the `opportunities_live` view) and idempotent `seed.sql` |
| `types/index.d.ts` | TypeScript types for records, profiles, questions and the engine API |
| `LOVABLE.md` | Handoff for a Lovable front end, including a build prompt |
| `src/questions.js` | The adaptive questionnaire (13 core questions plus 2 follow-ups that only appear when they matter; every one can be skipped) |
| `src/engine.js` | Deterministic matching: hard filters → weighted soft scoring → three distinct picks. Weights are in `WEIGHTS`/`CONFIG` |
| `src/schema.js` | Record enums and the validator that encodes the evidence policy |
| `src/prompt.js` | The "investigate this further" research-prompt generator (Copy prompt / Open Gemini) |
| `data/raw/*.json` | Research output, one file per family, plus `safety_sources.json` |
| `data/curation.json` | Editorial overrides (audience restrictions) |
| `data/catalogue.json` | v1: built, validated catalogue the reference app loads |
| `data/v2/` | **v2 dataset:** `catalogue.v2.json` (production), `catalogue.schema.json`, `catalogue.audit.json`, `catalogue.changelog.json`, `SCHEMA.md` (contract), `REVIEW_GUIDE.md`, `baseline/` (mechanical migration), `reviewed/` (per-slice revalidated records) |
| `scripts/v2/` | `schema.mjs` → `migrate.mjs` → `baseline-audit.mjs` → `build.mjs` → `validate.mjs --report` → `audit-md.mjs`; `crosscheck-ajv.mjs` |
| `RESEARCH_REPORT.md`, `VALIDATION_REPORT.md` | What the v2 revalidation found, and which checks actually ran |
| `research/` | Record format, per-family research ledgers, normalisation log, `ledger.csv` export |
| `scripts/` | `normalize-raw.mjs` → `build-catalogue.mjs` → `audit.mjs`; `check-links.mjs` |
| `test/` | Unit tests (bun) and browser tests (Playwright) |

## Working on it

```bash
cd boop-remote
npm run data                      # v1: after editing data/raw or curation: normalise → validate → api/ → supabase/ → audit
npm run data:v2                   # v2: rebuild catalogue.v2.json, audit, changelog, VALIDATION_REPORT.md and CATALOGUE_AUDIT.md from data/v2/reviewed/
bun test test/                    # 53 unit tests: schema, catalogue rules, engine, prompt, api/ and SQL consistency
node test/ui.mjs                  # 26 browser checks at mobile and desktop sizes; screenshots in test/screens/
npx eslint src scripts test       # lint
bash scripts/check-sql.sh         # loads the SQL into a scratch Postgres, twice; needs psql
node scripts/check-links.mjs      # needs network; unreachable ≠ fake
```

`build-catalogue.mjs` exits non-zero if any record breaks the schema or the evidence rules. For example, "applications open" without an opened official source fails, as does a category record with an application link. `api/` and `supabase/` are generated from the validated catalogue and committed, because they are served and loaded as-is.

## Adding or updating a record

1. Follow `research/RECORD_FORMAT.md`. Use unknown or null rather than a guess.
2. Add it to the right `data/raw/<family>.json`, then run normalise → build → audit → tests.
3. To limit a route to a specific group (youth, students, a language community and so on), add it to `data/curation.json` rather than asking users about it.

See `DECISIONS.md` for why things are the way they are, and `RESEARCH_METHODOLOGY.md` for what "verified" means here.
