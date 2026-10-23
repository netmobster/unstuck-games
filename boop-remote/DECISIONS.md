# Opportunity Engine: decision log

Built 2026-10-13 by Claude Code, working autonomously from the product brief (`Opportunity Engine: Product Brief v0.1`) and the build mission prompt. No questions were asked during the build. Every assumption is recorded here.

## 1. What was built

A working, static, mobile-first web app in `boop-remote/`:

- **Intro** that explains you can explore with no account and that nothing leaves the browser.
- **Adaptive questionnaire.** 13 core questions plus 2 follow-ups that only appear when they change matching. Every question can be skipped, and Back keeps your answers.
- **Swipe deck.** Swipe left or right, or use the Pass / Details / Save / Like buttons, or the ← → S D U keys. Undo is available. A disclosure lists every hidden route with the reason it was hidden.
- **Detail view:**
  - what the work is, why it might fit, what to watch for, and what's still uncertain
  - the terms: pay, worker status, fees, schedule, interaction, eligibility, requirements, equipment, training
  - application steps, a clearly labelled outbound link, and the evidence list with dates
  - the research handoff: Copy prompt and Open Gemini
- **Three-pick shortlist:** a best fit, a different trade-off, and a longer-term or other-angle pick. Each has why it fits, watch-outs, uncertainties, a "compared with the best fit" line, and a next step.
- **Saved view** for likes, saves and passes, with "put back" and two levels of reset.
- **About** page covering methodology, status definitions, scam-safety tips from official sources, and privacy.
- **Catalogue:** 77 researched records across 9 categories (73 can be recommended), 460 source citations, and 6 official job-scam guidance sources. The catalogue was built in two passes; the second filled the biggest gaps of the first.
- **Pipeline:** normalise, build/validate, audit, plus a link checker and a CSV ledger.
- **Tests:** 44 unit tests and 26 browser checks across two viewports.

## 2. Key product and architecture decisions

| Decision | Why |
|---|---|
| **New `boop-remote/` folder, vanilla HTML/CSS/ES modules, no build step** | The repo is a GitHub Pages static site (`.nojekyll`) whose tools are mostly single-page vanilla HTML. A static folder deploys with zero config and keeps the project light. |
| **Data as JSON fetched at runtime** | Keeps data separate from code, validated by the same module in the app, the build and the tests. The cost: it doesn't work from `file://`, and the app shows a clear error saying so. |
| **No backend, accounts, analytics, database or LLM runtime** | Not needed for the MVP, and the brief defers them. Matching is deterministic and local. |
| **Research split across 5 parallel agents with a shared record format** | Breadth within the time available. Each family has a ledger, and one format makes merging mechanical. |
| **A normalisation step between research and the app** | Agents interpreted the policy unevenly. One script applies it consistently and logs every change. |
| **Canada-first, with Ontario as the province option** | The brief's working hypothesis. Eligibility and pay rules are country-specific. Other countries are a filter state ("Outside Canada"), not unverified listings. |

### 2a. The data layer (added later on 2026-10-13)

Jay said the front end could just be a Lovable build, and asked for the data layer to live here. Decisions:

| Decision | Why |
|---|---|
| **Three delivery forms, all generated from the one validated catalogue:** static JSON in `api/`, Postgres DDL + seed in `supabase/`, and the engine modules with `types/index.d.ts` | Lovable projects usually pair a Vite/TypeScript front end with Supabase, but a static fetch is the least work. Generating all three from `data/catalogue.json` means they can't disagree. |
| **`api/` and `supabase/` are committed, not built on deploy** | The site is static files served by nginx (`INFRA.md`); there is no build step on the box. |
| **CORS header on `/boop-remote/api/` only** (`infra/nginx/unstuck.conf`) | A front end on another origin can't fetch the JSON without it. Scoped to the read-only API path, nothing else on the apex changes. Needs an nginx reload on deploy. |
| **The JSON Schema and the SQL check constraints are generated from `src/schema.js`** | One list of enums. A test asserts the generated artefacts still mirror the validator. |
| **The questionnaire's `when` conditions became data** (`{ key, not, gt, minLength, maxLength }`) | They were functions, which don't survive JSON. `conditionHolds()` interprets them; a test checks the JSON round trip gives the same visible questions. |
| **Supabase tables keep scalar columns for filtering, jsonb for nested groups, and the full `record`** | A front end can filter in SQL and still hand the exact object to `match()` without reassembling it. RLS allows public `select` only. |
| **The SQL was loaded into a real Postgres 16 twice** (`scripts/check-sql.sh`) | Proves the DDL and the upsert path, not just the syntax. |
| **Matching stays in the client, in these modules** | `LOVABLE.md` tells the front end not to re-implement the rules. The rules are tested here and documented in §7. |

## 3. Alternatives considered and rejected

- **Vite + TypeScript, like `games/orbis`:** rejected. It would add a build and dependencies for a small app; plain modules with a validator give most of the type safety at runtime and in tests.
- **Ask about disability, age bands or credentials to filter more precisely:** rejected on privacy and dignity grounds. Instead, routes limited to a specific group carry an `audience` label. They stay visible and labelled, but only enter the shortlist if the person likes or saves them.
- **Percentage match scores:** rejected. They imply precision we don't have. Words are used instead ("Strong / Good / Possible fit", "Long shot", "Not enough answers yet"), and the score breakdown is kept internally.
- **Silently relaxing constraints when nothing matches:** rejected. The empty state says so and lists exactly what was hidden and why.
- **Prefilling Gemini through a URL query string:** not built. It isn't a documented contract. "Open Gemini" opens `https://gemini.google.com/app`, and "Copy prompt" is the primary action, with a select-and-copy fallback.
- **Assuming USD for US platforms' unlabelled pay:** rejected. Such pay is shown as "currency not stated".

## 4. Data model choices and consequences

- One record per route, with **identity, geography/eligibility, requirements, schedule, interaction, skill demands (0–3), training, compensation, reliability, worker status, fees, steps, horizon, status, legitimacy, evidence strength, risk flags, fits-if / not-fit-if, sources and lastChecked.** See `research/RECORD_FORMAT.md`.
- **Legitimacy, evidence strength, status, pay and reliability are separate fields.** That's how "real company, little work" can be represented honestly.
- **Explicit unknowns:**
  - `experience: "unknown"`, `realtime: "unknown"`, `phone: null`, empty `modes`, `officialUrl: null`, `currency: "unstated"`.
  - The engine never treats an unknown as a pass for a hard constraint it can't check. It keeps the record, adds a caution, and docks a little score. For example, someone who ruled out phone work sees "We couldn't confirm whether phone calls are part of it."
- **The validator encodes the evidence policy:**
  - "applications open" needs an opened official source supporting `status`
  - a "confirmed" Canadian eligibility needs an opened official source
  - an `applyUrl` must be an opened source
  - category records can't have application links or confirmed statuses
  - a specific route with no verified official site must be uncertain, closed, stale or rejected
- **Consequence:** with the network as it was, the strongest statuses are unreachable, so the whole catalogue currently looks conservative. That is the intended behaviour.

## 5. Research scope and inclusion

See `RESEARCH_METHODOLOGY.md` and `CATALOGUE_AUDIT.md`.

- **Categories covered:** customer operations (14), language and writing (12), creative and production (9), AI and data (8), software and digital (8), paid research (7), public programs and training (7), freelance (7), structured employment (5).
- **Found beyond the obvious families:**
  - accessibility testing paid to assistive-technology users (Fable)
  - Statistics Canada data-collection clerks
  - CRA seasonal agents
  - election workers
  - Indigenous-language interpreting
  - Canadian French speech-data tasks
  - university paid-study pools
  - staffing agencies
  - free library e-learning
  - Ontario pre-apprenticeship
  - Better Jobs Ontario
  - ODSP employment supports
- **Dropped for thin evidence or no Canada access:** TELUS CS, Teleperformance, Amazon virtual CS, Boldly, Time Etc, Arise, OneForma, RWS TrainAI, Invisible, Testbirds, Scribie, Verbit, TransPerfect.
- **Rejected but kept with reasons:** BELAY (US residents only) and Leger LEO (effective earnings unsupported).
- **Filled by a second pass** (two more agents, after the first pass's search budget ran out): creative and production work (9 records, including stock contributing, 99designs, Canva Creators, a TV-metadata editor contract and Young Canada Works), virtual assistance, appointment setting, ecommerce operations, small-business digital help, spreadsheet cleanup, the Shopify Partner Program, and Digital Main Street's Digital Service Squad.
- **Still not researched:** see the coverage gaps in `CATALOGUE_AUDIT.md`.
- **Target versus result:** the brief asked for about 50 if the evidence supports it. There are 77 records, but evidence depth is uneven. Quality was preferred over padding: agents dropped candidates rather than invent sources.

## 6. Evidence and confidence policy

- **"Confirmed" means an opened official page.** A search summary of an official page counts as `official_info_found` with eligibility "likely".
- **Anecdotes are labelled and dated.** They lower confidence, and they are never the basis for a positive status.
- **Freshness:** records older than 180 days (`CONFIG.staleDays`) are treated as stale. They are shown with a "Stale" chip, demoted, and never shortlisted.
- **Every automated change to the agents' output is logged** in `research/normalization_log.md`: 76 changes across three runs.

## 7. Matching weights and hard-filter rules

**Hard filters** (`hardFilter` in `src/engine.js`). Any one of these hides a route and records the reason:

1. Status `rejected` or `not_currently_open`
2. User in Canada and the route is `not_eligible`; the route is province-limited and the user is in a different province (or didn't name one)
3. User outside Canada and the route is Canada-only
4. Phone ruled out, and phone/voice is a core part of the route
5. Dealbreakers:
   - contractor (excludes contractor and participant routes)
   - on-site (excludes on-site and hybrid)
   - unpaid tests
   - fees or commission
   - disturbing content
6. Said they have no computer, and the route needs one
7. Under 18, and the route's minimum age is 18 or more
8. The route's minimum weekly hours exceed the time band the person gave
9. Firm time windows, and fixed or shift hours that don't overlap them
10. Firm pay floor, and published hourly pay (converted at `usdToCad: 1.37`) that tops out below it. Unknown or unstated-currency pay is kept, with a caution.

**Soft scoring:** a weighted sum of components in the range −1..1, divided by the sum of *all* weights. An unanswered question therefore contributes exactly 0: neutral, never negative.

| Component | Weight | What it looks at |
|---|---|---|
| interaction | 3 | text / live / independent / mix versus the route's modes and real-time demand; phone preference |
| skills | 3 | per-skill "I like it / would learn / prefer not" against demand of 2 or more; computer comfort against demand |
| goals | 3 | fast (time to first pay), stable (employee or steady volume), flexible (schedule), career (horizon) |
| schedule | 2 | overlap between preferred windows and route windows |
| evidence | 2 | evidence strength; uncertain or waitlist status; stale; unclear legitimacy |
| predictability | 1.5 | only if the person wants stable or fast income |
| learning | 1 | training required versus openness to training |
| pay | 1 | published hourly pay versus a soft floor |
| equipment | 1 | equipment needed beyond what the person listed |

**Labels:**
- Strong fit ≥ 0.45
- Good fit ≥ 0.25
- Possible fit ≥ 0.05
- otherwise Long shot
- "Not enough answers yet" when fewer than two preference components apply

**Ordering** is deterministic: score, then evidence strength, then fewer risk flags, then id. A test checks that shuffled input gives the same order.

**Three picks** (`pickThree`):
- The pool excludes passes, stale records, scores at or below −0.15, and audience-restricted routes the person hasn't liked. Likes and saves add +0.25.
- **Best** is the top route that isn't a category or support program.
- **Alternative** is the best route from a different category and type.
- **Third** prefers a new horizon *and* category. It is titled "Longer-term or stretch route" when its horizon is new and isn't "now", otherwise "Another angle".
- If fewer than three remain, the app says so.

All weights and thresholds live in `WEIGHTS`, `CONFIG` and `fitLabel()`, and are calibrated by judgement only (see §13).

## 8. UX and accessibility

- Mobile-first and responsive with no horizontal scroll (tested at 390 px and 1280 px). Light and dark themes follow the system.
- **Swipe is optional.** Four labelled buttons and the ←/→/S/D/U keys do everything a swipe does. Undo is always offered.
- Semantic structure: fieldset/legend questions, native radios and checkboxes, a `<dialog>` for details with Escape to close and focus returned, a skip link, visible focus rings, `aria-live` toasts and copy status, and focus moved to each new view's heading.
- `prefers-reduced-motion` disables animation, including the swipe fling.
- **Copy rules:**
  - no streaks, scores in percent, urgency or shame
  - "Not sure" is always offered and treated as neutral
  - skill questions separate "prefer not" from "would learn"
  - negatives get equal space with positives on every card
- External links open in a new tab with `rel="noopener noreferrer"` and an ↗ marker. A link that isn't official is labelled "Best source found (not an official site)".

## 9. Privacy and safety

- No identifying information is asked for: no name, email, postal code, diagnosis, immigration status or exact age. Age is a single optional "18 or older?".
- State lives in `localStorage` under `opportunity-engine:v1`, wrapped in try/catch so the app still works when storage is blocked. "Clear everything" removes it.
- The research prompt includes only the preferences the person gave, and leaves out skill self-ratings, equipment and age (tested). It tells the assistant to state unknowns, and says the app's data may be out of date.
- The About page carries official scam guidance, and every detail view repeats "never pay a fee to get a job".

## 10. Dependencies added

**None at runtime.** For development the project uses tools already installed in the environment: Bun for unit tests, the globally installed Playwright with its bundled Chromium for browser tests, and ESLint 10 with a minimal flat config. `boop-remote/package.json` only declares `"type": "module"` and scripts. The repo root `package.json` is untouched.

## 11. Tests, build commands and results (2026-10-13)

| Command | Result |
|---|---|
| `node scripts/normalize-raw.mjs && node scripts/build-catalogue.mjs` | 77 records from 7 files, 6 safety sources, **0 validation problems** |
| `node scripts/build-api.mjs && node scripts/build-sql.mjs` | `api/` with 77 records, `supabase/schema.sql` and `seed.sql` |
| `bash scripts/check-sql.sh` | Loaded into local Postgres 16.15 twice: 77 opportunities, 460 sources, 73 live, 6 safety sources |
| `bun test test/` | **53 pass, 0 fail** (44 before the data layer; 9 added for `api/`, the questionnaire's JSON round trip and the SQL). Covers schema validation of every record; unique ids; every link a valid URL backed by a same-site source; "open" only with official evidence; categories never posing as jobs; research participation never shown as employment; stale and rejected kept off the shortlist; hard filters across 300 generated profiles; deterministic ranking; unknowns neutral; distinct picks; audience restrictions; prompt contents and privacy |
| `node test/ui.mjs` | **26 pass, 0 fail** (13 checks × mobile 390×844 and desktop 1280×860). Covers onboarding; answer, skip and back; the adaptive follow-up; all four card controls; details with evidence, `noopener` links and the prompt; clipboard copy plus the forced fallback; like, save, pass and undo; touch swipe (mobile) and arrow keys (desktop); the shortlist; the saved view; the impossible-limits empty state; clear everything; no overflow; no console errors |
| `npx eslint src scripts test` | clean |
| `node scripts/check-links.mjs` | **0 of 457 URLs reachable from this environment** (all DNS `ENOTFOUND`, the network policy). Not a statement about the sites |

Bugs the tests caught and that were fixed during the build:
- An unanswered multi-select was stored as "I have none of these", which hid every route needing a computer. Empty now means skipped, and there is an explicit "None of these" option.
- Averaging over answered components only meant "would learn" could score below skipping. The denominator is now all weights.
- A generic profile's best fit was a disability-specific route. This led to the `audience` restriction.
- A support program could take the best-fit slot.

## 12. Limitations, failed methods and unverified claims

- **No source page was opened during research.**
  - WebFetch failed on DNS for every domain, and curl was blocked by the egress policy.
  - All evidence is search-engine summaries, plus a few Indeed postings read through a connector.
  - No record is `applications_open_confirmed`, and no application links are published.
  - **Every record needs re-verification before real users rely on it.**
- The shared search budget (about 200 searches per pass) ran out in the first pass. A second pass filled the largest gaps; what's still missing is listed in `CATALOGUE_AUDIT.md`.
- There has been no human review of any record, including the higher-risk ones (AI task platforms, moderation, fee-charging marketplaces).
- Pay figures are often missing, in an unstated currency, or self-reported. The USD→CAD factor is a fixed approximation.
- Weights and label thresholds were tuned by inspecting about five personas, not by user research.
- Province eligibility is only modelled for Ontario. A user in another province is treated as "Canada", and Ontario-only routes are hidden from them.
- Not deployed by me. It becomes reachable at `/boop-remote/` only if this branch is merged into the Pages branch.

## 13. Remaining risks and the next three improvements

**Risks:**
- Stale or wrong listings could mislead someone.
- A platform in the catalogue could change its terms.
- People may read "Good fit" as a promise.

The UI hedges each of these: dates, statuses, "still uncertain", and "none of these is a promise of work or income". Hedging doesn't remove them.

**Next three, highest value first:**
1. **Re-verify the catalogue with working network access.** Open every official and application page, fill in `applyUrl`, upgrade statuses where justified, fix currencies, and run the link checker. Then have a person review the higher-risk records.
2. **Fill the remaining coverage gaps:** remote customer service at Canadian banks and telcos, captioning employers, other provinces' programs, more paid-study pools, and the 2026–27 funding status of Digital Main Street and Young Canada Works.
3. **Test with real people who have different preferences,** as the brief asks. Watch what they reject, misunderstand and pursue, then recalibrate the weights and thresholds against that.

## 14. How to run locally

```bash
cd boop-remote
npx http-server -c-1 -p 8080 .        # or python3 -m http.server 8080
# open http://localhost:8080
```

Tests: `bun test test/` and `node test/ui.mjs`. Data: `node scripts/normalize-raw.mjs && node scripts/build-catalogue.mjs && node scripts/audit.mjs`.

---

# v2: the Ontario revalidation (2026-10-13)

Jay's second brief changed the product shape: Lovable builds the app, this repo owns the data, and the existing catalogue was to be audited, revalidated and extended into a new, documented dataset. Decisions:

| Decision | Why | Consequence |
|---|---|---|
| **A new dataset (`data/v2/`) with its own contract, not an edit of v1** | The brief asked to preserve the original and to separate concepts v1 conflated (relationship vs. destination type, eligibility vs. availability, advertised vs. verified pay, boolean "accessible" vs. five access states). | Two files coexist. The reference app still runs on v1; Lovable targets v2. A later pass can retire v1. |
| **`record_type` (10 values) separate from `category` (9 fields of work)** | A category must never look like an employer; a marketplace must never look like a job. | Filtering by "what kind of thing is this" is now a single field. |
| **`availability_status` includes `not_applicable_category`** (added to the brief's enum) | Categories and sellable services have no availability; forcing them into `availability_unknown` would rank them like unverified employers. | Validator enforces it, and that such records carry `how_to_find_work` and no application link. |
| **"Confirmed" and "accepting applications" need an opened authoritative source** | A search snippet of an official page is not the page. | Both are rare in this run; the dataset reads conservatively, which is the truthful state. |
| **Confidence is computed, never typed** | The brief wants confidence to reflect evidence and completeness, not plausibility; a formula is auditable. | Rubric in `data/v2/SCHEMA.md`; a test checks moderate-evidence records average above weak ones. |
| **A mechanical migration produces a baseline marked `pending`; the builder refuses `pending`** | Guarantees every record was revalidated by someone, and makes the mechanical part reproducible and separate from judgement. | `scripts/v2/migrate.mjs` → `data/v2/baseline/`; judgement lives in `data/v2/reviewed/` and the audit trail. |
| **Research split into six slices with a shared review guide** | Breadth within a ~200-query search budget; one guide keeps dispositions and vocab consistent. | Per-slice ledgers in `research/v2/`. |
| **Audience-restricted routes carry `audience_restriction[]`; the app never asks who the user is** | The brief forbids inferring demographics or health; the data can still say "students only". | Lovable shows the label and keeps such routes out of automatic shortlists. |
| **`skill_demands` kept from v1** | A matcher needs something to compare preferences against; demand levels are factual descriptions of the work. | Carried over 0–3 scale. |
| **The Indeed connector counts as `opened_and_reviewed`, typed `job_board`** | It returns full posting text; that is a read page, though an aggregator copy. | Such sources can support availability for `specific_job`/`employer`, flagged by type so a reader can discount them. |
| **Validation by two independent implementations** | The in-repo validator is dependency-free; ajv (installed outside the repo) cross-checks the schema file. | `VALIDATION_REPORT.md` lists only checks that ran. |

Rejected alternatives: editing v1 in place (loses the audit trail and the contract separation); asking agents to score confidence (unauditable); treating a search snippet of an official page as opened (false precision); dropping categories entirely (they help discovery when labelled honestly).

Unresolved: page access. Until a run can open pages, no record can honestly reach `strong`, `verified_rate` stays empty, and `accepting_applications` depends on job-board copies of postings.

## v2 results (2026-10-13)

- **113 audit entries:** 77 v1 records (45 updated, 28 downgraded, 1 merged, 3 rejected, 0 retained unchanged) and 36 new candidates (25 added, 11 rejected). **98 production records.**
- **Validation (all ran):** JSON parse; structural validation by the in-repo interpreter and independently by ajv against `catalogue.schema.json`; unique ids; required fields and enums; URL and date formats; confidence range; status-evidence rules; eligibility-evidence rules; category rules; summary reconciliation. 0 errors, 45 warnings (25 "checked but still unknown", 20 "likely without a specific eligibility source"). `bun test test/`: 70 pass.
- **Consequences for the product:** only five records can honestly be shown as "open now", and all five come from one job board on one day; the front end should treat `availability_unknown` as the normal state and say so, and should treat `confidence` as evidence strength, not as fit.
- **Unresolved:** page access (blocks `confirmed`, `verified_rate` and `strong`); province coverage beyond Ontario; human review.
