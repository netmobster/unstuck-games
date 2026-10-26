# Research ledger: AI/data evaluation and software/digital QA

- Family file: `data/raw/ai_data_qa.json` (12 records)
- Date: 2026-10-13
- Researcher: research agent (Opportunity Engine)

## Method limits (read first)

1. **No pages could be opened directly.** WebFetch failed with `getaddrinfo ENOTFOUND` for every domain tried (outlier.ai, dataannotation.tech, telusdigital.com, utest.com, builtinvancouver.org, en.wikipedia.org). Plain `curl` through the sandbox proxy returned `CONNECT tunnel failed, response 403`. All evidence therefore comes from **WebSearch result titles, URLs and the search engine's summaries of those pages**.
   - Every source has `"accessible": false`. This means our sandbox could not open the page. It does not mean the site is blocked for users.
   - No record uses `applications_open_confirmed`, because that status needs an official page opened today.
   - Every `applyUrl` is `null`, because the format allows an apply URL only if we opened it.
   - The most any record gets for `evidenceStrength` is `moderate`.
   - Each `officialUrl` is a URL that appeared verbatim in search results from the official domain, but none was opened.
2. **Search budget ran out.** WebSearch hit its shared per-turn limit after about 37 queries. Several planned checks could not be run (see Open questions).
3. **Attribution caveat.** Search summaries sometimes merged several pages. Where a claim could not be pinned to one URL, the source note says so ("exact page not identified").

## Queries run (WebSearch)

| # | Query (domain filter) | Useful? |
|---|---|---|
| 1 | Outlier AI contributor Canada eligibility pay rate | Yes: Built In mirrors of Canada postings |
| 2 | DataAnnotation.tech supported countries Canada | Yes: third-party lists |
| 3 | TELUS Digital AI Community search engine evaluator Canada | Partly |
| 4 | Outlier AI trainer contributor countries supported (outlier.ai) | Yes |
| 5 | DataAnnotation pay per hour FAQ countries (dataannotation.tech) | Yes: pay tiers |
| 6 | AI Community careers Canada rater evaluator (telusdigital / telusinternational) | Yes: Canada postings |
| 7 | "Online Data Analyst" Canada TELUS Digital hours pay exam (jobs.telusdigital.com) | Yes |
| 8 | Internet Safety Evaluator English Canada TELUS hours requirements (jobs.telusdigital.com) | Yes: US$13.50/hr est. |
| 9 | TELUS AI Community rater no work available payment delay reddit 2026 | Blogs only |
| 10 | Outlier Scale AI lawsuit contractors misclassification wage theft | Yes |
| 11 | r/outlier_ai empty queue "EQ" deactivated no tasks 2026 | Guides plus one old thread |
| 12 | Outlier Canada contributors pay currency PayPal (outlier.ai) | Yes |
| 13 | Alignerr Labelbox AI trainer Canada eligibility pay | Partly |
| 14 | Mercor AI expert contractor Canada pay hourly reviews 2026 | Aggregators |
| 15 | Invisible Technologies AI trainer freelance Canada eligible pay | Aggregators only |
| 16 | Alignerr apply AI training expert remote freelance hourly (alignerr.com, greenhouse) | Yes |
| 17 | Mercor experts apply contractor countries Canada (mercor.com) | Yes |
| 18 | Mercor contractors complaints unpaid assessment pay cut lawsuit | Yes: People/AOL |
| 19 | Mercor supported countries for payment (talent.docs.mercor.com) | Conflicting |
| 20 | "Generalist Expert (US/Canada)" Mercor | Yes |
| 21 | DataAnnotation reddit Canada accepted starter assessment never heard back 2026 | Blogs, 2024 threads |
| 22 | DataAnnotation Canada workers paid PayPal country requirement (dataannotation.tech) | Partly |
| 23 | DataAnnotation account deactivated without warning reddit | Off-target |
| 24 | CrowdGen Appen Canada contributor projects pay 2026 reviews | Reviews |
| 25 | dataannotation.tech FAQ "which countries" … (extended) | Confirms no official list |
| 26 | CrowdGen Appen contributor sign up Canada projects (crowdgen.com, appen.com) | Yes: Canada projects |
| 27 | OneForma freelancer Canada jobs pay payoneer reviews 2026 | Yes: negatives |
| 28 | CrowdGen Project Coffee en-ca pay (crowdgen.com) | Yes |
| 29 | Welocalize AI rater search evaluator Canada remote part-time | Yes |
| 30 | RWS TrainAI community Canada data annotation freelance pay | Partly |
| 31 | Welo Data Search Quality Rater English Canada (lever, welocalize, welodata) | Yes |
| 32 | Welocalize Welo Data rater payment late complaints reddit | Reviews |
| 33 | uTest Applause testers Canada pay per bug payout | Partly |
| 34 | uTest join community testers payments (utest, applause) | Yes |
| 35 | uTest reddit no invitations few projects 2025 2026 | Yes: forum anecdotes |
| 36 | Test IO freelance tester sign up payment countries (test.io) | Yes |
| 37 | Test IO tester reviews reddit bugs rejected low pay 2026 | Reviews |
| 38 | Testlio freelance tester Canada apply hourly pay | Yes: closed Canada postings |
| 39 | Fable accessibility testing assistive technology users paid Canada | Yes |
| 40 | Fable tester pay per hour (makeitfable.com) | No rate published |
| 41 | CBC Canadians AI training gig work chatbots raters pay | No CBC hit; found Globe and Mail |
| 42 | Testlio freelance testers community join requirements payment (testlio.com) | Yes |
| 43 | Globe and Mail AI data gig workers raters (theglobeandmail.com) | Yes: 2023 article |
| 44 | Testbirds tester Canada eligible payout nest community | No Canada info |
| 45 | BetaTesting tester signup countries Canada paid tests (betatesting.com) | Partly |
| 46–48 | uTest Canada (official); Outlier unpaid onboarding; CRA gig-economy guidance | **Not run: search budget exhausted** |

## Blocked or inaccessible sources

- **All direct page fetches** (WebFetch DNS failure; curl proxy 403). This applied to every domain tried.
- Reddit was never reached directly. The forum evidence comes from **third-party Reddit mirrors** (reddit.birdcat.cafe, lr.in.psf.lt, reddit.sentinel-team.org) that appeared in search results, and is labelled as such.
- Mercor help centre "Supported Countries for Payment": two search summaries gave conflicting readings on whether Canada is on the not-supported list. **Needs a direct look.**

## Records kept (12)

| id | status | Canada | evidence |
|---|---|---|---|
| outlier-ai-trainer | waitlist_or_no_work_guarantee | confirmed | moderate |
| dataannotation-ai-trainer | uncertain | likely | moderate |
| alignerr-ai-trainer | uncertain | likely | weak |
| mercor-ai-expert-evaluator | eligibility_confirmed | confirmed (role-specific) | moderate |
| telus-digital-ai-community-rater | eligibility_confirmed | confirmed | moderate |
| crowdgen-appen-ai-projects | stale_needs_recheck | confirmed (older project pages) | moderate |
| welo-data-search-quality-rater-canada | eligibility_confirmed | confirmed | moderate |
| utest-applause-crowdtester | waitlist_or_no_work_guarantee | likely | moderate |
| testlio-freelance-tester | waitlist_or_no_work_guarantee | likely | weak |
| test-io-crowdtester | official_info_found | unclear | weak |
| fable-accessibility-tester | eligibility_confirmed | confirmed | moderate |
| ai-response-evaluation-category | official_info_found | likely | moderate |

Fable was added beyond the brief. It is a Toronto-founded accessibility-testing company that pays people with disabilities, and its Canada eligibility is official. It covers the "website accessibility QA" angle better than any generic option we found.

## Rejected or dropped candidates and why

- **OneForma / Centific (formerly Pactera EDGE).** No evidence on Canada eligibility. Reviews show strong negative signals:
  - accounts deactivated with no human support
  - reports of approved work going unpaid
  - PayPal capped at about US$300 a year, and Tipalti fees passed on to workers
  - one source says postings fell more than 60% in late 2025

  Dropped as unevidenced for Canada. Revisit only with an official Canada listing.
- **RWS TrainAI.** The official community page says no experience is needed, and roles include rater, annotator and search/ad evaluator. The only Canada evidence was one RWS Lever posting: a full-time, 12-month, German-language annotator contract (US$33/hr, degree required). That does not represent general freelance access. One 2026 review reports payment and support complaints. Dropped because the Canada evidence is too thin.
- **Invisible Technologies / Meridial.** Canada listings appeared only on aggregators, with "$0/task" placeholder pay. Reported hiring takes 3–6 weeks. No official page was confirmed. Dropped.
- **Testbirds.** No Canada eligibility found. Payout guidance is SEPA/EU-focused. Dropped.
- **BetaTesting.** Official pages say anyone 18+ can join, Canada is a large tester population, tests pay $15–30 for 45–60 minutes, and testers get 0–5 opportunities a month. This is closer to user-research participation, so it was **handed to the research-participation family** rather than recorded here.
- **TELUS Digital, separate per-role records.** Merged into one record (Internet Safety Evaluator, Online Data Analyst, Media Search Analyst) to avoid near-duplicates.
- **Prolific AI tasks and Handshake AI.** These came up incidentally: Prolific is a research-participation platform, and Handshake AI was mentioned in a review as having documented payment complaints. Neither was researched. Out of scope or not evidenced.

## Key negative signals found

- **Outlier/Scale AI:**
  - California lawsuits from Dec 2024 and Jan 2025 allege misclassification and unpaid training time. A settlement is reported only by an aggregator and is unverified.
  - Many reports of empty queues and silent removals.
  - A blog reports mass cuts in early 2026.
- **Mercor:** People/AOL, citing Forbes and Business Insider, reported a project ending and contractors being re-offered lower rates; Mercor disputed this. A blog reports a mass offboarding in May 2026.
- **DataAnnotation:** No official country list. Silent non-acceptance is common, and "droughts and bans" are reported.
- **TELUS:** Blogs report no-task periods, "under review" account holds, and pay arriving about a month after the work. In 2023 the Globe and Mail quoted TELUS saying hours can't be guaranteed.
- **uTest and Test IO:** Few invitations for new or low-tier testers. Test IO pays only for accepted bugs, and reviewers say team-lead decisions are inconsistent.
- **CrowdGen:** Pay varies by country, with one review citing a very low effective rate. A Trustpilot reviewer reported non-payment (China-based work, not Canada).

## Open questions / next steps (for a run with working fetch)

1. Open every official page to confirm current openings. Several records could then move up to `applications_open_confirmed` or `registration_open_not_work_guaranteed`, and `applyUrl` values could be filled in.
2. **Mercor:** does the supported-countries page exclude Canada? Is the $50–70/hr in USD?
3. **DataAnnotation:** is Canada on the eligible list at signup, what currency does the FAQ use, and is the starter assessment unpaid?
4. **Outlier:** are screening and onboarding assessments paid? Is Canada in the Flexible Working Guidelines list (the snippet was cut off)?
5. **Welo Data:** what currency is the "$15 gross" in, and is the posting live or an evergreen pipeline?
6. **CrowdGen:** are any Canada projects open now? The pages found are 1–2 years old.
7. **uTest and Test IO:** is Canada explicitly eligible, and which payout methods work for Canadian residents?
8. **Fable:** what is the current hourly rate and typical monthly volume?
9. **TELUS Internet Safety Evaluator:** does it involve exposure to harmful content? (Not flagged as `emotional_content` because it wasn't evidenced.)
10. Add a CRA source on reporting self-employment and gig income to the category record; the search was blocked by the budget limit.
