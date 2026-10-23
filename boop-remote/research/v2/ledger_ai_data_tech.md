# Research ledger: ai_data + tech_digital slice (2026-10-13)

Agent slice: all 8 records in `data/v2/baseline/ai_data.json`, `crowdgen-canadian-french-voice-tasks` from `language_writing.json`, all 8 records in `data/v2/baseline/tech_digital.json` (uTest, Testlio, Test IO, Fable, Toronto Public Library, NPower Canada, Shopify Partner Program, ecommerce operations category; Simply.TV lives in `creative_production.json` and was not in this slice). Output: `data/v2/reviewed/ai_data_tech.json` (22 records), validated with `node scripts/v2/validate.mjs … --records` → 0 errors, 14 warnings (all true: `availability_checked_at` set on records where a check found nothing current, and `likely` eligibility carried from v1 without a re-seen eligibility source on Shopify, TELUS and the ecommerce category).

## Tool conditions

- **WebFetch**: tried once on the first official URL (`https://outlier.ai/`) at 15:19Z → `getaddrinfo ENOTFOUND`. Every web source in the output is therefore `search_result_only`; nothing was opened. `confirmed` eligibility, `strong` evidence and `accepting_applications` were impossible.
- **WebSearch**: 35 queries (budget ~34), run 15:20–15:23Z plus one at about 15:40Z. Timestamps used for `accessed_at`: batch 1 (queries 1–15) 15:21Z, batch 2 (16–28) 15:22Z, batches 3–4 (29–34) 15:23Z, query 35 15:40Z.
- **Indeed connector** (`mcp__Indeed__search_jobs`): every call from 15:20Z to 15:42Z returned `Rate limit exceeded for account 522284737 on toolset claude. Try again in N seconds` (N kept renewing at 15–58 s even after 60–120 s waits), i.e. the limit is account-wide and shared with the other agents. **No Indeed posting could be read**, so no `job_board` source is `opened_and_reviewed` in this file, the TELUS, Welo and ecommerce records rest on web evidence only, and v1's Indeed postings (not re-seen) were dropped from the ecommerce category.

## Queries run

1. `Outlier AI Canada contributors 2026 empty queue removed reddit r/outlier_ai`
2. `DataAnnotation.tech Canada eligible countries 2026 no work reddit DataAnnotationTech`
3. `Alignerr Canada eligibility 2026 review unpaid assessment no projects`
4. `Mercor supported countries Canada payments 2026 contractors offboarded complaints`
5. `TELUS Digital AI Community Canada rater jobs 2026 pay reddit no tasks`
6. `CrowdGen Appen Canada projects 2026 Trustpilot no work payment`
7. `Welo Data search quality rater Canada 2026 Welocalize rater pay reddit`
8. `uTest Canada testers 2026 invitations payout Payoneer reddit r/UTEST`
9. `Testlio Canada freelance tester 2026 projects acceptance pay`
10. `Test IO become a tester countries Canada 2026 payment reviews Trustpilot`
11. `Fable accessibility tester community Canada pay 2026 makeitfable join`
12. `Toronto Public Library eLearning LinkedIn Learning 2026 library card eligibility non-resident`
13. `NPower Canada Junior IT Analyst 2026 intake Ontario eligibility age application`
14. `Shopify Partner Program 2026 revenue share changes referral commission Canada partners`
15. `CrowdGen Appen "French (Canada)" voice rater 2026 lever jobs`
16. `Outlier AI eligible countries list "Canada" flexible working guidelines Scale AI 2026 contributors removed`
17. `DataAnnotation "no projects" OR "banned" OR "drought" 2026 reddit r/DataAnnotationTech Canada` (returned drought/climate data; wasted)
18. `Mercor contractors offboarded 2026 project ended pay cut Business Insider Forbes complaints`
19. `Alignerr jobs "Canada" hourly rate alignerr.com 2026 AI training specialist`
20. `AI training gig work 2026 Canada contributors pay cuts layoffs Scale AI Outlier Mercor xAI report`
21. `accessibility testing jobs Canada remote screen reader users paid tester 2026 -Fable`
22. `PlaytestCloud Canada paid game testing countries eligibility 2026`
23. `game tester jobs Ontario Keywords Studios OR "Lionbridge Games" OR "Side" Toronto Montreal functionality QA 2026 entry level`
24. `IT support micro-credential Ontario college work placement 2026 free OR funded help desk`
25. `ComIT free IT training Canada 2026 Ontario cohort apply`
26. `Surge AI contributor countries Canada eligible 2026 surgehq` (nothing on Surge's country list)
27. `Clickworker Canada countries available UHRS 2026 payment`
28. `Toloka AI tutor Canada countries eligible 2026 experts`
29. `DataAnnotation tech review 2026 no work available bans Canada workers` (retry of 17)
30. `PlaytestCloud reviews 2026 Trustpilot testers no tests payment PayPal`
31. `paid accessibility user testing participants Canada people with disabilities recruit testers 2026 assistive technology company`
32. `comit.org students courses Ontario 2026 free IT course application open`
33. `Code for Canada GRIT testers sign up paid e-transfer people with disabilities 2026`
34. `CNIB Access Labs become an accessibility tester paid opportunities Ontario`
35. `ecommerce coordinator OR "ecommerce assistant" Ontario job posting 2026 Shopify order processing product listings hourly pay` (run at about 15:40Z, one over the nominal budget, so the ecommerce category would not be left without sources after the Indeed connector failed)

Indeed searches attempted (all rate-limited, none returned): TELUS Digital AI Community (remote, CA); search quality rater (remote, CA); AI trainer evaluator freelance (remote, CA); accessibility tester assistive technology (Ontario); game tester QA (Ontario); IT support paid training no experience (Ontario); ecommerce order processing product listings Shopify (Ontario).

## Per-record verdicts

| id | disposition | availability | evidence | one line |
|---|---|---|---|---|
| outlier-ai-trainer | downgraded | waitlist | weak | Canada named only on Built In mirrors (one marked removed May 2025); 2026 review ("a queue, not a job"), Apr 2026 newsletter citing Bloomberg/DNYUZ (500+ slots cut, ~40 h unpaid onboarding, effective pay ~$50→~$20/hr). No official page re-seen. |
| dataannotation-ai-trainer | downgraded | waitlist | weak | Six-country list incl. Canada is third-party only; 2026 reviews: dominant complaint is "nothing to work on"; aggregators disagree on open Canada roles (contradiction recorded). Official FAQ pay tiers not re-seen → advertised rate dropped. |
| alignerr-ai-trainer | downgraded | availability_unknown | weak | Canada-tagged aggregator copies Feb 2026 (US$25–90/hr), several "may be filled"; guide: passing assessment ≠ work. |
| mercor-ai-expert-evaluator | downgraded (record_type → task_platform) | availability_unknown | weak | Canada supported per aggregators (29 roles); Business Insider Nov 2025: 5,000-person project ended, re-offer $16 vs $21/hr; May 2026 offboarding blog; official pages not re-seen. |
| telus-digital-ai-community-rater | downgraded | availability_unknown | weak | No Canada posting re-seen (only US content-reviewer postings); 2026 reviews: NTA stretches, ~45-day pay lag, hard exam, fake recruiters; pay now anecdotal ($10–18/hr). Indeed check impossible (rate limit). |
| crowdgen-appen-ai-projects | downgraded (absorbs French record) | waitlist | moderate | Official Lever French (Canada) TTS rater posting: random selection, volume not guaranteed, $1/task placeholder; Trustpilot 1.5/5 (104 reviews, NO page): onboarding then no work, ID checks stalled (Mar 2026), termination after asking about training pay (Dec 2025). |
| crowdgen-canadian-french-voice-tasks | merged → crowdgen-appen-ai-projects | waitlist | moderate | Same platform and same posting; kept for audit. |
| welo-data-search-quality-rater-canada | updated | availability_unknown | moderate | Official Lever (Welo Global) Canada postings for Simplified Chinese search rater and French maps reviewer; English (Canada) role via Jan 2026 copies (up to $15 gross/hr); French maps reviewer $20.30/hr (Jul 2026 copy). Live status unconfirmed. |
| ai-response-evaluation-category | updated | not_applicable_category | weak | how_to_find_work added; 2025–26 cuts and falling generalist pay (Business Insider, newsletter); anecdotal $16–21/hr. |
| utest-applause-crowdtester | downgraded | waitlist | weak | No official page re-seen; eligibility → unclear; 2026 review and r/UTEST: scarce invitations, country-dependent rates. |
| testlio-freelance-tester | downgraded | availability_unknown | moderate | Only open Canada project is Alberta-only, 3–5 a.m., iPhone/iPad, hourly 30 (currency unshown); Canada-wide projects closed; Greenhouse board exists. |
| test-io-crowdtester | downgraded | availability_unknown | weak | Official tester page not re-seen; Trustpilot 3.5/5: <30% bugs accepted, low pay, unexplained bans. Canada still unclear. |
| fable-accessibility-tester | updated | registration_open_work_not_guaranteed | moderate | Official community page (Dec 2025): people living with a disability in CA/US/UK; hourly contract wage, no figure; register → staff email to determine fit. No complaints surfaced. |
| toronto-public-library-free-elearning | updated | program_open_check_eligibility | moderate | Official card page: full free card needs a Toronto connection; non-resident card $50/3 mo or $150/12 mo excludes LinkedIn Learning → eligibility partial. |
| npower-canada-junior-it-analyst | downgraded | availability_unknown | moderate | Official: free, 15 weeks, ON/BC/NS/AB, Google IT Support cert; only cohort seen (7 Apr–17 Jul 2026) has ended; age rule only from dated partner sheets. |
| shopify-partner-program-freelance | updated | registration_open_work_not_guaranteed | moderate | Official blog: new earning model from 10 Aug 2026 (20% subscription share + 0.1% GMV, each 4 years; $2,500 Plus upgrade); FAQ: all payouts USD (contradiction with v1 CAD note recorded). |
| ecommerce-operations-support-category | updated | not_applicable_category | moderate | how_to_find_work added; v1 Indeed/CAFC sources not re-seen and Indeed was rate-limited, so pay was refreshed from a search summary of Indeed Canada and Job Bank Ontario postings ($18–36/hr CAD; Job Bank Etobicoke $36/hr is an LMIA posting). |
| playtestcloud-paid-game-tester | new | waitlist | moderate | Official help page: available only to UK, US and Canada; unpaid qualification test; ~$9 per 15-min test (third party); Trustpilot mostly positive on payment, long waits for tests. |
| code-for-canada-grit-user-tester | new | availability_unknown | moderate | Official: anyone living in Canada can sign up, paid by e-transfer/gift card; civic-tech directory lists Toronto GRIT inactive (Apr 2026) → contradiction recorded. |
| cnib-access-labs-accessibility-tester | new | availability_unknown | moderate | Official CNIB Access Labs pages: paid tester team for people who are blind, Deafblind or low vision; no pay, openings or process seen. |
| clickworker-uhrs-microtasks | new (rejected candidate) | rejected_insufficient_evidence | insufficient | Official support page: bank payment only in SEPA/US, "if you cannot be paid via one of these methods, please do not register"; Canada unmentioned; third-party claims conflict. |
| comit-free-it-training | new (rejected candidate) | rejected_insufficient_evidence | insufficient | Real charity; 2024 article mentions Toronto/online, ~20% acceptance; no 2026 Ontario cohort or official page seen. |

Rejected candidates carry `disposition: "new"` because the validator requires `migration.v1_id` on every non-new disposition; their `disposition_reason` starts with "Rejected candidate" and their status/evidence keep them out of production.

## Merge decision

`crowdgen-canadian-french-voice-tasks` was merged into `crowdgen-appen-ai-projects`: both describe applying project-by-project on Appen's Lever board, and the French TTS rating posting is the only Canada-specific CrowdGen project found this run, so it now anchors the general record (requirements, availability evidence, Trustpilot complaints). The merged record keeps `migration.merged_into`; the surviving record lists `merged_from`.

## Dropped discovery candidates (no record written)

- **Keywords Studios VR Game Tester (Montreal)**, $18.15/hr, on-site 1–9:30 p.m., and **Side – Associate Video Game QA Tester (Montreal, Mile-End)**, on-call on-site, posted 30 Jul 2026: real entry-level game QA, but on-site in Quebec, so not a route for an Ontario resident without relocating. Ubisoft Montreal specialist tester (1-year contract) likewise. Smilegate West Toronto QA specialist ($20/hr) wants game-dev background and Portuguese; single aggregator snippet, not pursued.
- **Welocalize/Welo Global – French Canadian Accessibility Tester**: screen-reader review of translated content, but copies list the location as remote from Europe/GB and require native French Canadian; conflicting location, undisclosed pay.
- **Insight Global – Accessibility Testing Specialist / Sr. Accessibility Auditor (Toronto)**: $40–57/hr contract, hybrid/on-site, requires WCAG and JAWS/NVDA experience; a professional role, not an entry pathway; postings may have closed (Aug 2026 deadlines).
- **Surge AI**: no contributor country list surfaced (query 26 returned a fellowship and unrelated Scale AI Canada pages).
- **Toloka**: Canada-tagged listings exist on aggregators (e.g. First-Person AI Video Trainer, Jun 2026) but the AI Tutor country list and any negative-evidence check were out of budget.
- **Ontario college IT-support micro-credential with placement**: query 24 found the Micro-credentials Challenge Fund (closed to new requests, June 2026) and OSAP eligibility for approved micro-credentials, but no specific IT-support micro-credential with a work placement; Conestoga's Network Technical Support certificate is a tuition-based college program (not researched).
- **AbilityNet / Scope disabled user tester** (UK, £40–75/hr): not Canada. **The Accessibility Exchange**: consultation participation, unpaid info session. **IHCD Toronto banking study** ($50–150 stipends): one-off, undated.

## Open questions for the next pass

- Read Indeed postings for TELUS Digital AI Community, Welo Data, "AI trainer", "game tester Ontario", "accessibility tester" and "IT support paid training Ontario" once the connector's account-wide rate limit clears; these would supply `opened_and_reviewed` job_board sources and could lift TELUS/Welo/ecommerce to `moderate` or `accepting_applications`.
- Official country lists for Outlier, DataAnnotation, Alignerr and Mercor (none re-seen).
- Whether the Lever French (Canada) CrowdGen posting and the Welo English (Canada) posting are accepting applications today.
- Fable's hourly rate; CNIB Access Labs' openings and pay; whether Code for Canada's GRIT is active in 2026.
- NPower Canada's next Ontario intake and current age rule.
- Shopify: CAD payout option for Canadian partners.
