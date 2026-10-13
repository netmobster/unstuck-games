# Ledger: programs_employment (government_program + structured_employment slices)

Run date: 2026-10-13 (work done 15:19-15:49 UTC). Output: `data/v2/reviewed/programs_employment.json` (18 records: 12 slice + 6 discovery, of which 1 rejected).

## Tool conditions
- `WebFetch` tried once on https://www.ontario.ca/page/better-jobs-ontario at 15:19 UTC: `getaddrinfo ENOTFOUND`. Every web source is therefore `search_result_only`; no eligibility is `confirmed` and no `verified_rate` is set.
- `WebSearch`: 34 queries (budget). Several domain-restricted queries were used to re-see official pages (jobbank.gc.ca, digitalmainstreet.ca, skilledtradesontario.ca, elections.ca, canada.ca, ontario.ca, statcan.gc.ca, tpl.ca).
- Indeed connector: `search_jobs` ran 7 times (15:19-15:21 UTC); from 15:22 onward every call (including `get_job_details` for the Elections Canada posting, attempted 8 times until 15:48) returned "Rate limit exceeded for account ... on toolset claude", with the retry window resetting on each attempt. Consequently no posting was opened; the two Indeed listings cited (Elections Canada Federal Returning Officer, House of Commons Page) are recorded as `job_board` / `search_result_only`.

## Queries (numbered)
1. "Better Jobs Ontario" eligibility 2026 laid off unemployed living allowance apply
2. "Canada Summer Jobs" 2027 employer application period OR youth hiring canada.ca
3. "Digital Main Street" "Digital Service Squad" 2026 hiring OR grant Ontario
4. "Employment Ontario" "Integrated Employment Services" eligibility who can use 2026
5. "ODSP Employment Supports" 2026 eligibility Employment Ontario transfer Integrated Employment Services
6. jobbank.gc.ca Job Bank fake imitation website scam warning job alerts 2026 (negative evidence)
7. Ontario "pre-apprenticeship" program 2026 intake free training placement ontario.ca eligibility
8. Elections Canada poll worker pay rates 2026 OR "Elections Ontario" election officials jobs apply
9. Skilled Trades Ontario register apprenticeship 2026 sponsor requirements classroom fees "Apprenticeship Incentive Grant" OR "Ontario apprenticeship" grants
10. FSWEP 2026-2027 apply OR "Ontario Public Service" "summer employment opportunities" 2027 OR "Ontario Internship Program" 2027 applications
11. Ontario temporary help agency licence 2026 workers "cannot charge" fees OR "fake recruiter" staffing agency scam Ontario (negative evidence)
12. "Statistics Canada" "data collection clerk" OR interviewer hiring 2026 posting work from home pay
13. "Better Jobs Ontario" reddit denied OR rejected OR "took months" OR experience (negative evidence)
14. "Youth Employment and Skills Strategy" 2026 program Ontario youth 15-30 paid placement apply intake
15. "Opportunities Fund for Persons with Disabilities" eligibility participants 2026 Ontario how to access
16. "Canada Training Credit" 2026 eligibility annual accumulation $250 limit claim tuition age
17. Ontario "Skills Development Fund" training stream participants individuals free training apply 2026 Auditor General
18. Ontario college micro-credential "paid placement" OR "paid work placement" 2026 free tuition job seekers
19. "Toronto Employment and Social Services" OR "Toronto Public Library" employment services job search help free 2026 Employment Ontario
20. ODSP employment supports "Employment Ontario" integrated delivery "your area" (ontario.ca only)
21. Statistics Canada jobs in data collection "data collection clerk" as needed 35 hours (statcan.gc.ca only)
22. Job Bank safety tips "Posted on Job Bank" job alerts "report a problem" employers never ask banking (jobbank.gc.ca only)
23. Digital Main Street careers Digital Service Squad member Toronto 2026 position (digitalmainstreet.ca only)
24. starting your apprenticeship requirements sponsor 16 years training agreement register portal (skilledtradesontario.ca only)
25. "Employment Ontario" counsellor reviews OR complaints OR "waste of time" OR "actually helped" job seekers 2025 2026 (negative evidence)
26. poll worker apply election jobs Canadian citizen 16 years pay training hours (elections.ca only)
27. "Opportunities Fund for Persons with Disabilities" program eligibility participants service providers (canada.ca only)
28. "Canada training credit" eligibility who can claim age 26 65 tuition fees (canada.ca only)
29. "Youth Employment and Skills Strategy" program youth facing barriers eligibility 15 to 30 funded organizations find a program (canada.ca only)
30. Elections Canada "returning officer" OR "field liaison officer" 2026 job posting OR Service Canada "citizen services officer" 2026 inventory jobs.gc.ca Ontario
31. Ontario free training program 2026 "paid work placement" OR "paid placement" "Skills Development Fund" college job seekers eligibility unemployed
32. Toronto Public Library career coaching job search help "Career Coaches in Residence" OR "job search" free program (tpl.ca only)
33. Ontario Disability Support Program employment supports "do not need to be receiving" OR "don't need to receive" income support community providers apply (ontario.ca only)
34. "Opportunities Fund" disabilities Ontario 2026 "wage subsidy" OR "self-employment" participants program ended OR renewed OR "March of Dimes" OR "CMHA" intake (negative evidence)

Indeed searches (CA): "Statistics Canada data collection clerk interviewer" (Ontario) - none; "election worker poll official" (Ontario) - none; "Statistics Canada" (Canada) - only DataAnnotation noise; "Elections Canada" (Ontario) - Federal Returning Officer, Hastings District, posted 2026-09-15; "Service Canada Citizen Services Officer" (Ontario) - no Service Canada roles, but House of Commons Page (Ottawa, 2026-09-28); "Digital Service Squad" (Ontario) - none; "temporary administrative assistant staffing agency" (Toronto, temporary) - none. Not run (rate limit): Randstad Toronto, survey interviewer Ontario, municipal poll clerk, youth paid placement.

## Per-record verdicts
| id | disposition | availability | one line |
|---|---|---|---|
| better-jobs-ontario | updated | program_open_check_eligibility | Jan 2026 guidelines on EOPG; ontario.ca caps/allowance re-seen; citizen/PR + 12-week vs 6-month contradiction recorded; stipend up to $500/wk CAD. |
| canada-summer-jobs | updated | closed_or_not_open | 2026 cycle over (youth hiring Apr 20-Jul 20; jobs ended Aug 29); employer window Nov 4-Dec 11, 2025 closed; record_type -> funded_employment_program. |
| digital-main-street-digital-service-squad | downgraded | closed_or_not_open | 2026 Toronto posting closed May 29, 2026; Indeed negative; pay unpublished; grant status outside Toronto unconfirmed. |
| employment-ontario-employment-services | updated | program_open_check_eligibility | ontario.ca + toronto.ca (Feb 2026) + July 2026 IES procurement; eligibility from 2026 directory listings; ODSP absorption claim softened. |
| job-bank-canada | updated | registration_open_work_not_guaranteed | Safety/report pages re-seen; no Job Bank-specific 2026 scam report; official_url now site root. |
| odsp-employment-supports | updated | program_open_check_eligibility | Directives 2.1/3.1 re-seen (16+, ON resident, no income-support requirement, OW excluded, verification form); 2026-27 MCCSS objectives show program funded; EO transfer not confirmed. |
| ontario-pre-apprenticeship-training | updated | program_open_check_eligibility | 2026-27 provider call open to Oct 27, 2026; 2026 college intakes show paid 8-10 week placements at some providers; entry rules differ by provider (contradiction). |
| election-worker-paid-temporary | updated | not_applicable_category | elections.ca eligibility re-seen; municipal 2026 rates $250-$350/day; Elections Ontario RO $48.60/hr (closed); federal rate contradiction; Indeed RO listing seen but not opened. |
| ontario-registered-apprenticeship | updated | program_open_check_eligibility | STO start page + July 2026 toolkit; Portal (18+) / email (16-17); sponsor approval; incentives after registration. |
| public-service-student-new-grad-programs | updated | not_applicable_category | 2026 OPS ads closed, 2027 fall/winter; OIP January window; CBSA student stream paused 2026; House of Commons Page listing on Indeed. |
| staffing-agency-temp-placements | downgraded | not_applicable_category | Only 2021-2023 reporting re-seen; no official or job-board source; evidence weak; official_url null. |
| statcan-data-collection-clerk | updated | availability_unknown | statcan page re-seen (as needed, <=35 h, WFH/on-site, Talent Retention Bank); Indeed negative; 2026 Census over ($25.87/hr enumerator). |
| yess-youth-employment-skills-strategy-program | new | program_open_check_eligibility | canada.ca criteria (15-30, citizen/PR/protected); 2026-27 funding (QP note Jan 2026, July 2026 release); ATN London example; local intake unverified. |
| opportunities-fund-persons-with-disabilities | new | availability_unknown | canada.ca participant criteria (self-identified lasting impairment; mainly non-EI); Ontario providers via grant records; agreements ended Feb/Mar 2026, renewal unknown. |
| canada-training-credit | new | program_open_check_eligibility | CRA: 26-65, resident, $250/yr room, lifetime $5,000, 50% of fees, Canadian institutions; age-window contradiction with taxtips/2019 design. |
| ontario-skills-development-fund-training-stream | new | program_open_check_eligibility | Organisations apply (round 6 closed Oct 1, 2025); Aug 2026 health-care projects announced; participants via lead orgs; AG Oct 2025 findings as risk. |
| toronto-public-library-career-coaches-in-residence | new | availability_unknown | tpl.ca page live; free remote coaching for younger adults (18-29 in past); latest session evidence 2025. |
| ontario-college-micro-credential-paid-placement | rejected | rejected_insufficient_evidence | No 2026 college micro-credential with a paid placement found. |

## Dropped candidates (not written as records)
- Service Canada temporary roles (Citizen Services Officer etc.): no 2026 posting or inventory found in query 30 or on Indeed.
- Elections Canada Federal Returning Officer (Hastings District, Indeed, posted 2026-09-15): not written as a `specific_job` because the posting could not be opened (connector rate limit); cited inside the election-worker category instead.
- House of Commons Page (Ottawa, Indeed, 2026-09-28): same reason; cited inside the public-service student category.
- Elections Ontario Returning Officer 2026: closing date (late March 2026) passed; cited for pay/eligibility only.
- City of Toronto Employment & Social Services: its pages refer residents to Employment Ontario, so no separate record; TPL coaching chosen as the municipal/library service.
- JVS Toronto / TDSB Community Services / Humber Community Employment Services: Employment Ontario providers, covered by the EO record.

## Open questions
- Better Jobs Ontario: which unemployment threshold (12 weeks vs 6 months) the January 2026 guidelines use; approval times.
- ODSP Employment Supports: whether Integrated Employment Services deliver them in any area; current retention caps.
- Pre-apprenticeship: which 2026-27 programs are funded and their intake dates; whether every provider's placement is paid.
- Election work: current federal poll-worker rates; whether St. Catharines was still recruiting on 2026-10-13.
- Staffing agencies: current ESA fee-prohibition text and the licence-database URL (not re-seen).
- StatCan: current clerk hourly rate; Ontario regional recruiting.
- Opportunities Fund / YESS: which Ontario providers hold current agreements and accept participants.
- Canada Summer Jobs / OPS / OIP / FSWEP: 2027 dates.
