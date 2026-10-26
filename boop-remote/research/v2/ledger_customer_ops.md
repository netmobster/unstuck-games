# Research ledger: customer_ops (revalidation run 2026-10-13)

Agent slice: all 14 records in `data/v2/baseline/customer_ops.json`, plus discovery. Output: `data/v2/reviewed/customer_ops.json` (18 records). Work done 2026-10-13 between about 15:19Z and 15:45Z; every record's `last_researched_at` and every source's `accessed_at` carry the build timestamp.

## Tool conditions

- **WebFetch**: tried once on `https://www.ttecjobs.com/en-US/search?q=remote&location=Canada` → `getaddrinfo ENOTFOUND`. Not retried. Every web source is therefore `search_result_only`.
- **WebSearch**: 29 queries (listed below), all `mode: standard`. Summaries only; no page opened.
- **Indeed connector** (`mcp__Indeed__search_jobs` / `get_job_details`): worked for the first ~30 calls, then returned "Rate limit exceeded ... try again in N seconds" repeatedly; each retry burst re-triggered the limit. 20 searches and 17 posting reads succeeded; 3 posting reads (Lifestyle Home Products bilingual lead setter, Gordian Customer Support Specialist (Canada), Tigertel inbound WFH agent) and 8 searches (Shopify ×2, trust & safety, Teleperformance, IntouchCX, Manulife/Sun Life, Air Canada/WestJet, Rogers, bank Agent@Home) failed on the limit and could not be completed. Postings read in full are cited as `job_board` / `opened_and_reviewed`.
- No other file in the repo was edited.

## Web queries (numbered)

1. `"TTEC" "Remote Canada" chat representative Ontario residents 2026` — all 2026 remote TTEC postings exclude ON and BC; no chat role open to Ontario.
2. `TTEC work from home Canada reviews scam OR complaints` — negative evidence: polarized Glassdoor/Indeed reviews (3.3/5, ~11.4k); TTEC has a recruitment-scam reporting form.
3. `Foundever Canada work from home customer service reviews OR scam` — no fraud evidence; Indeed 3.4/5 (~29k); Canadian postings $14–$18.20 by province; several spam aggregator pages ignored.
4. `Concentrix Canada work from home customer service jobs 2026` — Indeed Canada WFH listings $15–$25/hr, dates not shown.
5. `Concentrix scam warning fake recruiter job offer` — concentrix.com/scam-warning and concentrixcareers.com fraud alert (official).
6. `Shopify careers "Merchant Support" OR "Support Advisor" Canada 2026` — aggregator copies only; overnight Canada role posted 2026-07-08, est. expiry 2026-08-12; Nodesk copy "no longer available".
7. `Shopify fake job offer scam warning recruitment` — Shopify Community staff replies: all jobs on careers site; never pay deposits.
8. `Intuit TurboTax Live tax expert Canada seasonal work from home reviews` — official jobs.intuit.com postings only; no reviews surfaced (negative-evidence pass returned nothing).
9. `Canada Revenue Agency contact centre agent hiring 2026 call centre jobs` — CRA Feb 2026 update (~1,250 reps added fall 2025); Ottawa SP-03 posting closed 2026-06-15 ($59,623–$65,813); Montreal posting closed 2026-09-04 ($65,389–$73,595).
10. `"Working Solutions" agents Canada provinces accepted work from home` — official about-us: US/Canada/Jamaica contractors; no province list.
11. `"Working Solutions" agent reviews unpaid OR "no work" OR "not enough hours"` — unpaid ~2-week training, sporadic hours, one withheld-pay complaint; Glassdoor 3.5/5 (487).
12. `jobs.apple.com "At Home Advisor" Canada 2026` — no Apple pages returned; only blogs, ZipRecruiter (US pay), Glassdoor retail roles.
13. `Apple job scam fake "At Home Advisor" OR "work from home" recruitment warning` — "Apple Mall" fake Apple job scam (MalwareTips); Scamwatch (AU) recruitment-scam alert.
14. `Zirtual virtual assistant reviews pay complaints contractors` — Indeed 3.5/5 (28), pay 2.5/5; Glassdoor: 50% fee split, slow client flow.
15. `BELAY virtual assistant contractor Canada residents eligible` — US states only (excl. CA, CO, MT, NJ, NY, PA); $19–$22/hr; no Canada.
16. `CRA call centre jobs cuts 2026 union seasonal contracts ending PSAC UTE` — ~3,300 losses since May 2024 (union) vs 1,300 seasonal (CRA); 850 contracts extended; 280 more layoffs; $715M cut by 2028–29.
17. `Job Bank "customer service representative" call centre 64409 wages Ontario median hourly` — ON low/median/high $17.60/$21.50/$33.17; Canada median $22.00; updated 2025-11-19.
18. `Canadian Anti-Fraud Centre job scam employment scam warning fake recruiter Amazon TELUS impersonation` — CAFC site (fake Amazon job scam alert), London Police bulletin ($46.5M Jan–Sep 2025), TELUS Wise deepfake-recruiter article. No TELUS-impersonation bulletin found.
19. `TELUS Digital "Internet Safety Evaluator" Canada remote part-time` — Canada listing (Russian title, job 30606); US variant needs 3 yrs US residency.
20. `content moderator remote Canada 2026 "trust and safety" jobs hiring` — Centro.team remote moderation specialist (Canada, Montreal HQ); Indeed Canada moderation list incl. Concentrix ON $18/hr WFH; stale FlexJobs/VirtualVocations items.
21. `Job Bank administrative assistant NOC 13110 wages Ontario median hourly 2025` — ON $19.00/$26.67/$37.95; Canada $19.23/$26.44/$36.88; updated 2025-11-19.
22. `CRTC Unsolicited Telecommunications Rules National DNCL telemarketer registration calling hours` — rules page re-seen: 9:00–21:30 weekdays, 10:00–18:00 weekends; DNCL registration, 31-day update, internal list.
23. `"TELUS Digital" OR "TELUS Health" "Client Care Representative" remote call centre reviews Canada` — Glassdoor 3.4/5 (~5.5k); rigid scripts, isolation; one 2025 review on offshoring.
24. `MCI "Mass Markets" OR "Sydney Call Center" work from home Canada reviews` — only postings (iCIMS, Remotive) and a 2023 blog ($14.50/hr base); no reviews.
25. `bank contact centre "work from home" OR remote customer service Ontario 2026 RBC TD Scotiabank BMO CIBC careers` — no current big-bank remote postings; 2022 National Bank article; aggregators.
26. `Air Canada OR WestJet OR Porter "customer service" remote work from home agent Canada 2026` — Porter remote bilingual support posting (undated); Air Canada Saint John role on-site; WestJet nothing.
27. `Manulife OR "Sun Life" OR Intact OR Desjardins customer service representative remote work from home Ontario 2026` — Desjardins telework within 70 km of Aurora/Mississauga/Ottawa (undated); Manulife Ontario remote role $39,225–$65,375 (undated); nothing for Sun Life/Intact.
28. `Rogers OR Bell OR TELUS call centre "work from home" customer service representative Canada 2026` — Rogers customer-service layoffs (CBC July 2026 via blog); undated Rogers remote tech-support listing $23.50–$25.50/hr; nothing current.
29. `"chat support" OR "email support" remote Canada hiring 2026 "no phone" customer support specialist` — blog roundup: ZayZoon (deadline passed), Chatdesk (per-message), Outschool (US/Canada); Hex Company part-time chat $25/hr (closed 2026-10-09). No verifiable current listing.

## Indeed connector calls

Searches (country CA): TTEC customer service (remote) · Foundever customer service (remote) · Concentrix customer service (remote) · customer service representative remote (Ontario) · Shopify support advisor (remote) · Intuit TurboTax tax expert (remote) · Canada Revenue Agency contact centre agent (Ontario) · Apple At Home Advisor (remote) · virtual assistant (remote) · content moderator (remote) · appointment setter (remote) · remote customer service representative work from home (remote) · chat support representative (remote) · bank customer service remote (remote) · insurance customer service representative remote (remote) · TELUS customer service remote (remote) · Nordia customer service (remote) · paid training customer service work from home (Ontario) · Working Solutions customer service agent (remote) · airline customer service remote (remote) · email support specialist (remote) · Nordia (Canada) · customer service representative, part-time (remote). Rate-limited/failed: Rogers Bell call centre WFH, Manulife Sun Life, Teleperformance/IntouchCX/Sutherland, Shopify (×3), trust and safety (×2), contact centre Agent@Home bank, Air Canada WestJet, Rogers technical support.

Postings read in full (job_board, opened_and_reviewed): TTEC Automotive Support Remote Canada (to.indeed.com/aaljxpth2wzs) · TTEC Luxury Retail Remote Canada (aaqqx9pmfmxz) · Foundever Bilingual Customer Assistance Rep ASG (aamh4gf6q784) · Foundever Bilingual CSR NB (aa8p6bppzq8k) · Foundever Bilingual CSR ASG (aah7brf64fgg) · Intuit Tax Professional WFH Oakville (aasqj8kkr2kx) · Intuit Bilingual Tax Expert Hamilton (aa8lclhtpkg6) · Zirtual Remote Virtual EA (aat68dqxbg7d) · TELUS Digital Bilingual Call Center Rep Remote (aaw4z7kp99lt) · SelectBlinds CSR Remote (aabnclgwg68x) · MCI Remote Inbound CSR Canada (aann8zyxd8wn) · NTT DATA Remote Bilingual Customer Care (aaxx6mxjpv8z) · CIBC Universal Fraud Agent Remote Regina (aax8lrwp9l2f) · boldr Customer Representative Thunder Bay (aanzsqlxz2ds) · Peloton Technologies Client Success & Support Specialist (aambkxrnnbpb) · Red Rover Real Estate EA (aanbnbstdm6j) · Property Print Appointment Setter (aafkgpsyyws9) · Kazmir B2B Appointment Setter (aaj694vlj9cw). Not read (rate limit): Lifestyle Home Products bilingual inside sales/lead setter, Gordian Customer Support Specialist (Canada), Tigertel Inbound CS Agent WFH (Fredericton NB).

## Per-record verdicts

| id | disposition | availability | verdict |
|---|---|---|---|
| ttec-work-from-home-customer-service-canada | downgraded | availability_unknown | Two live remote postings read; both exclude Ontario and BC; $17–$18/hr; Canada eligibility partial (8 provinces), Ontario unclear. |
| foundever-work-at-home-customer-service-canada | updated | accepting_applications | Three live remote postings read (any province, must reside in Canada); $15–$19.35 + bilingual premium; all require French; equipment and paid training. |
| concentrix-canada-customer-service | downgraded | availability_unknown | No remote CSR posting via Indeed API; aggregator WFH listings undated; official scam warning re-confirmed. Evidence weak. |
| shopify-merchant-support-advisor-canada | downgraded | availability_unknown | No current posting confirmed; aggregator copy likely expired; pay estimate dropped; forum scam warning kept. |
| intuit-turbotax-seasonal-tax-expert-canada | updated | accepting_applications | Two Ontario postings (2026-09-23) read; $24.22–$30.95/hr; 2+ yrs tax prep, CRA RepID, 20 h/wk min; seasonal per official listings. |
| cra-contact-centre-agent-seasonal | downgraded | availability_unknown | Both 2026 postings found had closed; pay updated to 2026 SP-03 ($59,623–$73,595); telework unconfirmed; budget cuts. |
| working-solutions-on-demand-agent | downgraded | availability_unknown | Official pages confirm Canada contractors; per-minute rate not re-seen (dropped); unpaid-training and thin-hours reports. |
| apple-at-home-advisor-canada | rejected | rejected_insufficient_evidence | No Canadian posting in two runs; Apple site unreachable; scam magnet. Audit trail only. |
| zirtual-virtual-executive-assistant | updated | accepting_applications | Posting re-read (US or Canada residents); revenue share avg $1,500–$3,800/mo (currency unstated); 50% split and slow client flow reported. |
| belay-virtual-assistant-contractor | rejected | not_eligible_for_ontario | US states only, re-confirmed. |
| remote-contact-centre-customer-support-category | updated | not_applicable_category | Seven postings read; Job Bank ON median $21.50; Ontario eligibility partial (TTEC/NTT DATA exclude ON); CAFC/police scam sources. |
| content-moderation-trust-safety-category | updated | not_applicable_category | Thin evidence: TELUS Digital Canada evaluator (Russian title), Centro.team listing, one $18/hr Concentrix data point. Weak. |
| virtual-assistant-admin-support-category | updated | not_applicable_category | Job Bank ON median $26.67; Zirtual and Red Rover postings read; scam guidance refreshed. |
| remote-appointment-setting-category | updated | not_applicable_category | Property Print (salaried, Canada residents) and Kazmir (per-lead) read; CRTC rules re-seen. |
| telus-digital-bilingual-client-care-representative-remote | new | open_specific_opportunity | Fully remote Canada, $39,994.50/yr, bilingual, 24/7 shifts; posted 2026-09-07. Employer entity (TELUS Digital vs TELUS Health) unclear. |
| mci-sydney-call-centre-work-at-home-canada | new | accepting_applications | BPO with live work-at-home Canada posting (Feb 2026) and paid training; pay not stated; no reviews found. |
| ntt-data-remote-bilingual-customer-care-canada | new (rejected candidate) | not_eligible_for_ontario | $20/hr bilingual remote, but QC/AB/MB/NB/NS/PE only and for future vacancies. |
| cibc-universal-fraud-agent-remote-regina | new (rejected candidate) | not_eligible_for_ontario | Remote Agent@Home but tied to Regina with two-hour on-site notice. |

Note on the two rejected candidates: the validator requires `migration.v1_id` for any non-`new` disposition, so they carry `disposition: "new"` with a `disposition_reason` beginning "Rejected new candidate"; `ontario_residents: not_eligible` and `availability_status: not_eligible_for_ontario` keep them out of production.

## Candidates considered and not recorded

- **Peloton Technologies – Client Success & Support Specialist (remote, Canada-wide, $55,000–$75,000)**: read in full; legitimate and open to Ontario, but a fintech specialist role (2+ years fintech/SaaS support plus payment operations) outside the brief (bank/telco/insurer/airline/BPO/chat-only); no negative-evidence query budget left. Candidate for a future tech_digital or customer_ops record.
- **boldr – Customer Representative (Travel and Tourism), Thunder Bay ON ($38,400–$48,000 + commission)**: read in full; sales-conversion support role requiring 2–3+ years travel CS; remote status not stated. Not recorded.
- **SelectBlinds Canada – CSR Remote (Ottawa)**: read; bilingual, 3+ years; posting contradicts itself ("100% remote" vs "Work Location: In person"). Used only as evidence in the contact-centre category.
- **Tigertel – Inbound Customer Service Agent WFH (Fredericton NB, part-time)**, **Gordian – Customer Support Specialist (Canada), remote**, **Lifestyle Home Products – Bilingual Inside Sales / Lead Setter, remote**: surfaced by Indeed searches but details could not be read (rate limit); not recorded.
- **Desjardins / Manulife / Porter / Rogers remote roles**: seen only as undated search summaries (Desjardins telework within 70 km of Aurora/Mississauga/Ottawa; Manulife Ontario remote $39,225–$65,375; Porter remote bilingual support; Rogers tech support $23.50–$25.50/hr); none could be dated or opened, so none meets the standard. Worth an Indeed check next run.
- **Chat/email-only employers (ZayZoon, Chatdesk, Outschool, Hex Company)**: from a blog roundup; ZayZoon and Hex deadlines passed; others undated/unverified. Not recorded.
- **Nordia, Teleperformance, IntouchCX, Sutherland, Sun Life, Intact, Air Canada, WestJet, Bell**: no remote Canadian posting surfaced (Indeed searches returned nothing or were rate-limited).

## Open questions

- Any TTEC remote program currently accepting Ontario residents (chat-only role in particular)?
- English-only remote Foundever roles in Canada; exact Ontario wage within the provincial range.
- Current remote Concentrix CSR openings and their dates.
- Whether a Shopify Merchant Support Advisor (Canada) role is open now and its pay.
- Hiring entity for the TELUS Digital/TELUS Health remote client care posting; paid training.
- MCI Canada work-at-home wage.
- CRA: next call-centre poster date and telework status; bargaining outcome.
- Working Solutions: per-minute rate, currency, provinces served, current Canadian programs.
- Content moderation: English (Canada) evaluator availability and pay.
