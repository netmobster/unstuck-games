# Research ledger: Canada / Ontario programs family

Date: 2026-10-13. Output: `data/raw/canada_programs.json` (13 records), `data/raw/safety_sources.json` (6 sources).

## Method and important limitation

- **No page was opened directly.** WebFetch failed with `getaddrinfo ENOTFOUND` for every domain tried (jobbank.gc.ca, ontario.ca, canada.ca, antifraudcentre-centreantifraude.ca, npowercanada.ca, elections.ca). A curl check through the sandbox proxy returned `CONNECT tunnel failed, 403` (egress policy) for canada.ca and ontario.ca. These are research-environment blocks, not the sites blocking users.
- All evidence comes from **WebSearch result summaries**. They quote or paraphrase official pages but may be stale or wrong. Every URL in the records appeared verbatim in a search result. No URL was guessed.
- Consequences, applied on purpose:
  - Every source has `accessible: false`.
  - `applyUrl` is `null` on every record, because none was opened.
  - `canadaEligibility` is `likely` everywhere. The schema allows `confirmed` only with an accessible official source.
  - No record is `applications_open_confirmed` or `eligibility_confirmed`. Statuses are `official_info_found`, except Canada Summer Jobs, which is `not_currently_open` because the official 2026 dates (April 20–July 20) have passed.
  - `evidenceStrength` is at most `moderate`.
- **Recommended:** re-run the fetch step in an environment with web access. Then upgrade the statuses and eligibility fields, and add apply URLs.
- The WebSearch budget (shared across agents) ran out late in the session. One planned query, for the ontario.ca ESA guide to temp agencies, returned nothing. Several checks listed below could not be done.
- `schema.js` `validateCatalogue` returns 0 problems for all 13 records, and JSON.parse succeeds on both files.

## Queries run (WebSearch)

1. Better Jobs Ontario eligibility laid off training funding
2. Job Bank jobbank.gc.ca job search tool, job alerts, verify employer
3. Employment Ontario employment services, free job search help, eligibility
4. ontario.ca Better Jobs Ontario "basic living allowance" 2026
5. Skilled Trades Ontario: become an apprentice, registration steps, sponsor requirement
6. Canada Summer Jobs 2026, youth 15 to 30, Job Bank
7. Youth Employment and Skills Strategy eligibility, age 15 to 30, canada.ca
8. NPower Canada free tech training, eligibility 2026, Junior IT Analyst
9. Statistics Canada interviewer jobs, work from home
10. statcan.gc.ca careers interviewer pay requirements (domain-limited)
11. FSWEP eligibility, apply 2026
12. Ontario municipal election October 2026, election workers, paid
13. Elections Canada poll worker pay, eligibility, age 16
14. toronto.ca 2026 municipal election jobs, pay, deadline
15. OPS internship / Summer Experience Program 2026 eligibility
16. Opportunities Fund for Persons with Disabilities, job seekers, eligibility
17. ODSP employment supports eligibility; whether income support is needed
18. ODSP employment supports transition to Employment Ontario (IES) 2025–2026
19. CAFC job scam warning signs
20. Competition Bureau job scams, work-from-home guidance
21. Job Bank job scams / fake job offers
22. job scams employment fraud (antifraudcentre domain)
23. Competition Bureau job and employment scams, Little Black Book (domain-limited)
24. Job Bank job search safety tips (domain-limited)
25. Ontario pre-apprenticeship training, free, eligibility
26. Canada Training Credit eligibility
27. Toronto Public Library digital skills, LinkedIn Learning
28. Ontario micro-credentials, OSAP eligible
29. Randstad / Adecco / Robert Half temporary admin, remote, Canada
30. Ontario ESA temp help agency fees ban
31. CRA student / seasonal / call-centre hiring
32. Better Jobs Ontario reddit: wait times, denials (negative signals)
33. Better Jobs Ontario "12 weeks" low-income eligibility
34. reddit NPower Canada experience (negative signals)
35. reddit Employment Ontario experience (negative signals)
36. reddit StatCan interviewer experience (negative signals)
37. StatCan "Jobs in data collection" (domain-limited)
38. Job Bank wages, survey interviewers, Ontario (domain-limited)
39. Elections Ontario election-day jobs, by-election 2026
40. Youth Job Connection Ontario, 15–29 eligibility
41. FSWEP (canada.ca domain-limited)
42. OPS Summer Employment Opportunities (ontario.ca domain-limited)
43. Elections Canada poll worker apply (elections.ca domain-limited)
44. ESA guide, temp help agencies (failed: search budget exhausted)

**Negative-signal searches:** none of the Reddit searches returned Reddit threads. The only first-hand material found was:
- Indeed reviews for NPower (interview experience about 6/10) and StatCan (mostly part-time; the public often assumes calls are scams)
- CMHA/ODEN advocacy criticism of moving ODSP employment supports into Employment Ontario
- college notes that the Better Jobs Ontario application can take several months

No wait-time data was found for Employment Ontario or Better Jobs Ontario.

## Blocked / inaccessible sources

- Fetch blocked: every official page cited, including jobbank.gc.ca, ontario.ca, canada.ca, statcan.gc.ca, skilledtradesontario.ca, npowercanada.ca, elections.ca, toronto.ca, torontopubliclibrary.ca, antifraudcentre-centreantifraude.ca and competition-bureau.canada.ca.
- I tried the Canada Summer Jobs program URL `canada.ca/.../funding/canada-summer-jobs.html`. It was a guessed URL, the fetch failed, and it is **not used** in the records.

## Candidates not recorded / merged, and why

| Candidate | Outcome | Reason |
|---|---|---|
| Youth Employment and Skills Strategy (YESS) | Not recorded | Funding flows to organizations. Individuals go through local funded projects. The Service Canada youth page and a 2024 ESDC backgrounder confirm ages 15–30, citizen/PR/refugee status and legal right to work. Kept the record count at 13. Could be added as a program record later. |
| Opportunities Fund for Persons with Disabilities | Not recorded | The official canada.ca pages found are aimed at organizations. Individual criteria (unemployed or under 20 hrs/week, not on EI) come only from older third-party sites. ODSP Employment Supports and Employment Ontario cover similar needs with better evidence. |
| Canada Training Credit (CRA) | Not recorded | No CRA page was retrieved. Third-party sources conflict on age limits (25/26–65/66) and income thresholds. It is a refundable tax credit on tuition you pay, not an earning route. |
| OSAP for micro-credentials / Ontario college micro-credentials | Not recorded | No ontario.ca page was found. Sources were universities plus an aggregator, which claimed up to $5,000 per study period (unverified). Needs the official Ministry of Colleges and Universities list. |
| CRA seasonal / call-centre jobs | Not recorded | Only news and aggregator posts. One was undated, about hiring 1,700 call-centre staff. Some postings were bilingual and outside Ontario, with past closing dates. No canada.ca posting was found. |
| Elections Ontario election workers | Merged into the `election-worker-paid-temporary` category | No hiring posting found. The 2026 provincial by-elections were held September 3, 2026. |
| Elections Canada / municipal election workers | Recorded as a category | Toronto's hiring for the October 26, 2026 municipal vote is officially closed. Other cities' training ran late September to early October. |
| FSWEP and OPS (Summer Employment Opportunities, Ontario Internship Program) | Merged into one category record | Same audience of students and new grads. Ontario's 2026 Summer Employment Opportunities ads are closed, the Internship Program is closed (recruitment starts in December), and FSWEP is a year-round inventory. |
| Youth Job Connection (Ontario) | Mentioned in the Employment Ontario record only | Materials are older (2020–21). One provider says it is "currently unavailable" in its region. It may now sit inside Integrated Employment Services. |
| Robert Half / Adecco / Randstad as separate records | Category record only | Found one mostly-remote Randstad admin posting (Quebec). Other admin listings were on-site or tied to one city. No evidence of steady remote temp work, and each agency's job-seeker terms were not verified. |
| StatCan 2026 Census jobs | Noted in the StatCan record | Census field work (May–July 2026) is over. |
| "Summer Experience Program" (Ontario) | Rejected | The name does not match a current OPS program. The only hit was an old University of Windsor item. |

## Open questions (to verify when fetching works)

1. Better Jobs Ontario:
   - Does ontario.ca still state the 12-week low-income route and the $28k/$35k caps?
   - What is the current transport allowance?
   - Do the January 2026 guidelines change citizen/PR eligibility?
2. Employment Ontario / IES:
   - Are virtual services available, and are French services evidenced?
   - Is there any published wait-time data?
3. NPower Canada:
   - When is the next Ontario intake after the April–July 2026 cohort?
   - What is the current age range (18–29 vs 17–30)?
   - Is delivery online or in person?
4. StatCan data collection clerks: are there current Ontario postings, what is the pay (CR-level), and is bilingualism required?
5. Canada Summer Jobs: when will the 2027 youth hiring period be announced?
6. Election workers:
   - Are any Ontario municipalities still hiring for October 26, 2026 (e.g., Ottawa, Kitchener)?
   - What are Elections Canada's current hourly rates?
7. Ontario Internship Program: when does the 2027 cycle open (expected December)?
8. ODSP Employment Supports: what is the current intake route after the move into Employment Ontario, and is the 15-month retention cap still in effect?
9. Toronto Public Library: what are the card eligibility rules for non-residents?
10. The ontario.ca ESA guide page on temp help agencies (fee prohibition, licence lookup) needs to be found and cited directly.
11. Job Bank: confirm the alert frequency and the "only source validated by the Government of Canada" wording.

## Safety sources

Six sources were recorded:
- Canadian Anti-Fraud Centre (CAFC): job page, money-mule feature, and Top 10 frauds 2025
- Competition Bureau job and employment scams page
- Job Bank safety tips
- Ontario O. Reg. 99/23 (temp agency licensing)

Two were left out:
- Competition Bureau *Little Black Book of Scams*: the job-scam section appears to be in the original edition only, and no specific tips were retrieved.
- CAFC "Protect yourself from fraud": its content was not summarized in results.

The CAFC phone number 1-888-495-8501 appeared only in secondary sources, so it is not used as a tip.
