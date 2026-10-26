# Research report: Opportunity Engine catalogue v2 (Ontario revalidation)

Run date: 2026-10-13. Production dataset: `data/v2/catalogue.v2.json` (98 records). Audit trail: `data/v2/catalogue.audit.json` (113 entries). Contract: `data/v2/SCHEMA.md`. Checks that ran: `VALIDATION_REPORT.md`.

Throughout, **verified facts**, **worker anecdotes** and **research inferences** are labelled. In this run almost nothing could be verified from an opened page, so "verified" below means "stated by an authoritative source as summarised by a search engine, and consistent across sources" unless an opened job posting is cited.

## 1. Scope and method

- **Perspective:** a person living in Ontario, Canada. Canadian eligibility is a hard requirement for production; Ontario-only programs carry `provinces: ["ON"]`.
- **Input:** the 77-record v1 catalogue (`data/catalogue.json`, unchanged). It was treated as a lead list, not a source of truth; a baseline audit (`data/v2/baseline_audit.json`) flagged 73 of 77 records for revalidation and 5 overlap groups.
- **Process:** a mechanical migration to the v2 contract marked every record `pending`; six research agents, each with a slice and the same review guide, re-researched every record individually and searched for routes the catalogue lacked; a lead pass reconciled cross-slice issues (`research/v2/reconcile.md`); the builder computed confidence and eligibility and refused anything still pending; two independent validators ran.
- **Tooling truth:** no web page could be opened (DNS resolution fails for every host from the research environment; direct downloads are refused). All 487 web sources are `search_result_only`. The Indeed job-board connector returned full postings for part of the run before rate-limiting; the 20 postings read through it are the only `opened_and_reviewed` sources. The shared web-search budget (about 200 queries) allowed roughly two to three searches per existing record plus discovery.
- **Timestamps:** `last_researched_at` is the UTC time the agent wrote its findings for that batch of records (22 distinct times across 98 records), not the second each search ran. `availability_checked_at` is set on the 61 records whose availability was actively checked, including 25 where the check established nothing current (`availability_unknown`).

## 2. Numbers

| | Count |
|---|---|
| Original v1 records audited | 77 |
| v1 records retained unchanged | 0 (every record was re-researched; all changed in at least one field) |
| v1 records updated | 45 |
| v1 records downgraded | 28 |
| v1 records merged | 1 (`crowdgen-canadian-french-voice-tasks` → `crowdgen-appen-ai-projects`) |
| v1 records rejected | 3 (BELAY, Apple At Home Advisor, Leger LEO) |
| New candidates researched | 36 |
| New candidates added to production | 25 |
| New candidates rejected | 11 |
| **Production records** | **98** (73 from v1, 25 new) |
| Audit entries | 113 (every v1 record and every candidate) |
| Sources on production records | 507 (20 opened, 487 search-result only) |
| Records with `evidence_quality` strong / moderate / weak | 0 / 68 / 30 |
| Confidence range | 0.20–0.68 |

By record type: 21 freelance marketplaces, 18 employers, 18 work categories, 12 task platforms, 11 research participation, 7 government supports, 6 training programs, 3 funded employment programs, 1 service business, 1 specific job.

By availability: 43 unknown, 19 not applicable (categories/services), 11 registration open with no work guaranteed, 10 programs open (check eligibility), 8 waitlist, 4 accepting applications, 2 closed, 1 specific opening.

By Ontario eligibility: 80 likely, 14 unclear, 4 partial, 0 confirmed. No production record is ineligible.

## 3. Strongest evidence-backed opportunities

These have the highest computed confidence because an opened Indeed posting supports availability (verified for the posting; the employer's broader claims are search-only):

- **Foundever work-at-home customer service (Canada)**: `accepting_applications`, 0.68. Three opened postings. Employee role, shifts, headset and wired internet typically required.
- **Intuit TurboTax seasonal tax expert**: `accepting_applications`, 0.66. Two opened postings. Requires paid tax-prep experience; seasonal.
- **MCI / Sydney Call Centre work-at-home (new)**: `accepting_applications`, 0.65. One opened posting; pay not stated.
- **Zirtual virtual executive assistant**: `accepting_applications`, 0.65. Opened posting; contractor, experience required.
- **TELUS Digital bilingual client care representative, remote (new)**: `open_specific_opportunity`, 0.63. One opened posting with a stated salary; whether the entity is TELUS Digital or TELUS Health is an open question recorded on the record.

Next tier (0.55–0.61): the virtual-assistant and appointment-setting categories (Job Bank occupation data), TTEC (province-restricted postings seen as listings only), Cambly (official waitlist notice), 99designs, Fable, MCIS Language Solutions.

Inference: the customer-operations employers rank highest because they post on job boards the connector could read, not because they are the best opportunities. A platform with an open sign-up and strong official documentation (Upwork, Rev) can be as real and score lower.

## 4. Important newly discovered opportunity types

25 new production records. Types the v1 catalogue lacked:
- **Public programs with real conditions:** Youth Employment and Skills Strategy, Opportunities Fund for Persons with Disabilities, Canada Training Credit, Ontario Skills Development Fund training stream, Toronto Public Library Career Coaches in Residence.
- **Paid-study pools beyond U of T:** McMaster, Waterloo community participants, Western OurBrainsCAN registry. All labelled participant compensation, never a wage.
- **Language work with a Canadian route:** MCIS Language Solutions freelance interpreting, the Translation Bureau supplier directory, Kelly's remote interpreter route with paid training, Habitat Learn captioning/note-taking.
- **Accessibility and game testing:** CNIB Access Labs, PlaytestCloud, Code for Canada GRIT.
- **Seasonal, microbusiness and creator routes:** H&R Block Tax Academy (paid training, no hiring promise), Rover, Etsy, Amazon KDP, QuickBooks ProAdvisor bookkeeping, an app-based delivery category with Ontario's digital-platform-worker minimum wage noted.
- **Employers:** TELUS Digital bilingual client care, MCI/Sydney Call Centre.

## 5. Major corrections to the old catalogue

- **Nothing in v1 was "confirmed", and nothing in v2 is either.** v1 had already been normalised to "likely"; v2 keeps that and makes the reason explicit on every source (`access_status`).
- **28 downgrades**, mostly from v1's `official_info_found` to `availability_unknown`: TTEC, Concentrix, Shopify merchant support, CRA contact centre, Working Solutions, Mercor, Alignerr, Testlio, Test IO, TranscribeMe, italki, Respondent, dscout, Fiverr, Freelancer.com, Contra, NPower, Simply.TV, Young Canada Works, LanguageLine. In each case no current Ontario-eligible posting or intake could be found.
- **AI task platforms moved to `waitlist`** (Outlier, DataAnnotation, CrowdGen, uTest) on consistent worker reports of empty queues and long waits after onboarding. Anecdotal, but recurring across sources and dated.
- **Digital Main Street Digital Service Squad** and **Canada Summer Jobs 2026** are `closed_or_not_open` (deadlines passed).
- **Rejected from v1:** BELAY (US residents only, re-confirmed), Apple At Home Advisor Canada (no Canadian opening in two runs; scam-impersonation magnet), Leger LEO (legitimate, fails the effective-earnings test).
- **Merged:** the two CrowdGen records, which led to the same platform.
- **Type corrections:** Mercor is a task platform, not a contract employer; Canada Summer Jobs is a funded employment program, not a generic program; 18 v1 "category" records are now `work_category` with `not_applicable_category` and a concrete `how_to_find_work`.
- **Economics separated:** 39 records carry an advertised rate, 6 an anecdotal effective rate, 53 none. 16 advertised rates have no stated currency and are stored as `unstated`. No rate is verified.

## 6. Gaps in Canadian or Ontario eligibility evidence

- **0 confirmed.** Confirmation needs an opened official page.
- **14 unclear:** Canva Creators, the content-moderation category, Contra, Crowd Content, dscout, Fiverr, Freelancer.com, italki, Preply, Respondent, Test IO, TTEC (province-restricted postings), uTest, Working Solutions. These stay in production only because nothing says they exclude Canada; a front end should show the uncertainty.
- **4 partial:** Digital Main Street and the two Toronto Public Library routes (Toronto/Ontario only), and the remote contact-centre category (postings restrict by province).
- **20 records** carry `likely` eligibility without a source that specifically supports it (validator warnings). Each is a platform that presents as international; the inference is from the absence of exclusion, not from a statement of inclusion.
- **Work authorization** is recorded where postings state it (citizenship/PR/permit) and otherwise null.

## 7. Pay and availability uncertainty

- **Availability:** 43 of 98 production records are `availability_unknown`. Only 5 have a verified current opening, all through one job board. Registration-open platforms (11) promise nothing; waitlists (8) are real and, for AI platforms, long.
- **Pay:** no `verified_rate` anywhere. Advertised rates are what a page said in a search summary; anecdotal rates are labelled with their basis. Marketplace, survey and AI-platform earnings are deliberately left without a "typical hourly" figure.
- **Timing:** `time_to_first_payment` is set only where sources support it; most platforms are `unknown` or `weeks`.

## 8. Categories where evidence is especially weak

Weak-evidence records by category: language and writing 7, AI and data 6, freelance and microbusiness 5, customer operations 4, research participation 4, tech and digital 2, structured employment 1, creative 1. The AI task platforms (Outlier, DataAnnotation, Alignerr, Mercor, TELUS AI rater) rest on worker reports and aggregator copies of postings because their official country lists could not be opened.

## 9. Coverage and limitations

- Six slices, about 32 searches each, plus Indeed where it worked (it rate-limited for three of the six agents).
- Discovery was real but shallow: each agent added three to eight candidates. Not researched: Service Canada temporary roles, ski-hill and Ontario Parks seasonal postings, Maru Voice Canada, bank and airline remote support (no 2026 remote posting found), Dribbble, the Canada Media Fund, other provinces' programs.
- No human has reviewed any record.
- Validator warnings (45) are listed in `VALIDATION_REPORT.md`; none hides an error.

## 10. What to research next

1. **Open the pages.** With page access, re-run every `search_result_only` source for the 43 `availability_unknown` records first; many can move to `registration_open_work_not_guaranteed`, `accepting_applications` or `closed_or_not_open` in one pass, and official country lists would settle the 14 unclear eligibilities.
2. **Verify pay** for the 39 advertised rates from the official page and fill the 16 unstated currencies.
3. **Re-check the five "open" records** before the postings expire; they date from one day.
4. **Human review** of the higher-risk routes: AI task platforms, moderation, anything with fees or unpaid tests.
5. **Province expansion:** the model supports it; the research doesn't yet.
