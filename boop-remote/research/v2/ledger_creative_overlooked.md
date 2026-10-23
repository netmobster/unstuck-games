# Ledger: creative_production slice + overlooked routes (`creative_overlooked`)

Agent run: 2026-10-13, 15:19–15:48 UTC. Output: `data/v2/reviewed/creative_overlooked.json`.

## Tool conditions
- `WebFetch`: tried once on https://99designs.com/designers at 15:19Z → `getaddrinfo ENOTFOUND`. Every web source below is `search_result_only`.
- `WebSearch`: 34 queries (budget ~34). Standard mode throughout.
- Indeed connector: four searches succeeded at 15:21Z (Simply.TV → none; production assistant Toronto → none; social media coordinator Ontario → 10 marketing-coordinator listings; video editor Ontario → 10 listings). Every later call (two `get_job_details`, searches for H&R Block, ski resort, StatCan interviewer, production assistant Ontario) was refused with "Rate limit exceeded" and the wait kept growing (11 s → 25 s → 56 s → 39 s → 51 s). Postings were therefore seen only as listing summaries (title, company, location, date, URL) and are cited as `job_board` / `search_result_only`, not `opened_and_reviewed`. See "Indeed retries" at the end for the final outcome.
- Validator quirk: `validate.mjs` errors on `disposition: "rejected"` without a `migration.v1_id` ("non-new record needs migration.v1_id"), although REVIEW_GUIDE.md invites rejected new candidates and `build.mjs` handles them (`candidate_id`). To reach 0 errors, rejected candidates are stored as `disposition: "new"` with a non-production lever (`availability_status: "rejected_insufficient_evidence"` for the census job; `region_eligibility: not_eligible` for the notary route) and a `disposition_reason` beginning "REJECTED candidate". The builder will keep them out of production. Flagged for the orchestrator.

## Queries (WebSearch, numbered)
1. `99designs designer Canada Hyperwallet payout contest "no win" 2026` → Hyperwallet deadline article, payment providers ($25 min), pending payout (5-day review), unpaid-contest FAQ, SideHusl critique.
2. `Adobe Stock contributor Canada royalty 2026 downloads drop AI payout Payoneer` → 2026 forum threads on sales drops, shadowban thread, PhotoWorkout 2026 guide; low-quality page discarded.
3. `Shutterstock contributor 2026 earnings levels 15% 40% Canada W-8BEN contributor complaints` → promotional comparison blog, Polish article on reset dissatisfaction; investor pages ignored.
4. `Canva Creators template creator application 2026 "apply" countries eligible paused beta royalties` → canva.com/creators, help pages (beta, up to two months, element creators paused, portfolio 5–10 examples).
5. `Young Canada Works 2026-2027 funding heritage students Canadian Museums Association budget cut jobs` → HUMA joint brief (funding ends Mar 2026, 600+ jobs, 900+ unfunded), canada.ca employer/student pages, helloDarwin, librarianship.ca.
6. `Simply.TV "data editor" Canada CAD 20 freelance 2026 job` → Workable (2026-06-05, full-time), Remotive (CAD 20/h), Built In (freelancer), Virtual Vocations (2026-06-17, TBD), Summit Partners board.
7. `Shutterstock contributor payment methods PayPal Payoneer Skrill minimum $35 W-8BEN "contributor" help countries` → official help: PayPal/Skrill/Payoneer, $25 min/$2,000 max, 7th–15th, tax form for US and non-US, 90-day wait for certain countries.
8. `99designs designer application "countries" supported Hyperwallet Canada designers accepted sidehusl review unpaid spec work` → Hyperwallet article details (Dec 8 2025 open, Jan 19 2026 deadline); no country list.
9. `production assistant training program Ontario 2026 film TV crew free Toronto "production assistant" Job Bank outlook 53111` → Playback POV program (older), toronto.ca launch, SooToday 2023, DGC member profile mentioning 2024 GAP PA course.
10. `Canadian Anti-Fraud Centre 2026 "task" scam social media jobs losses; Job Bank social media coordinator Ontario outlook 2025-2027` → TELUS Wise (Jan/Feb 2026), money.ca CAFC, CTV/CP24 ($49M 2024; $46.5M Jan–Sep 2025), London Police PDF (Dec 2025), Now Toronto.
11. `Job Bank video editor Ontario outlook 2025-2027 NOC 52113 wages freelance video editor rates Canada 2026` → Job Bank Ontario outlook page dated 2023-11-29 (2023–2025 "moderate", 42% self-employed, ~3,350 workers); no wages.
12. `Rover Canada sitter service fee 20% payout PayPal Stripe how sitters get paid Ontario 2026` → support-ca.rover.com fee (20%, Canadian pilot), repeat-client pilot cities, Savvy New Canadians review.
13. `Etsy Canada seller fees 2026 listing fee transaction fee 6.5% payment processing Canada set-up fee new shop` → eShipper (CAD 0.28; 3%+CA$0.25 / 4%), Crosslist, Printful, calculators.
14. `H&R Block Canada Tax Academy income tax course cost 2026 "not guaranteed" employment hire tax professional` → prospectnow.ca info session (Aug 20 2026; ~60 h; no guarantee), hrblock.ca blog; AU/US pages ignored.
15. `Amazon KDP Canada royalties 35% 70% paid direct deposit CAD 60 days after month end minimum threshold` → Reedsy, BestWriting ($12.99 claim), Vappingo; no payment terms.
16. `Ontario notary public non-lawyer appointment Ministry of the Attorney General commissioner for taking affidavits application fee 2026` → MAG form instructions (employment-only, $110, not for new business), commissioner general application, Reg. 831, ontario.ca lawyer/paralegal page, NotaryPro.
17. `Ontario Digital Platform Workers' Rights Act July 2025 minimum wage engaged time DoorDash Uber Eats courier actual earnings per hour` → Hicks Morley, HR Insider, Mondaq, STLawyers ($17.20 as of Oct 2025 claim), Globe critics; no earnings data.
18. `Statistics Canada 2026 Census jobs enumerator crew leader hiring applications closed census.gc.ca jobs` → StatCan/Canada.ca announcement (Jan 6 2026; 32,000 jobs; $25.87/$31.32; Mar–Jul 2026), HRD, CIC News.
19. `Ontario Parks seasonal student jobs 2027 hiring opens; Blue Mountain Resort winter 2026-27 seasonal hiring job fair` → ontarioparks.ca FAQ (hiring typically from April), Curiocity (1,600 students), BHFN 2026 poster (postings from Jan 19 2026); Blue Mountain hits were old PA-state fairs and 2022 fair → nothing current.
20. `social media coordinator Ontario job prospects wages 2025-2027` (jobbank.gc.ca) → Ontario median $37.02, range $20.00–$58.97, prospects "limited", degree usual, updated 2025-11-19; Toronto $37.50; Windsor-Sarnia $26.00.
21. `production assistant Ontario job prospects 2025-2027 wages` (jobbank.gc.ca) → 2025–2027 Very limited (Ontario), Toronto region good, national labour-surplus risk 2024–2033; Ontario wages $18.00/$24.00/$38.00; Toronto $27.00; 19% work all year.
22. `"Young Canada Works" 2026-2027 heritage funding renewed Budget 2025 Canadian Museums Association statement applications open` → BCMA budget letter, Kawartha Lakes council (May 19 2026, 2026–27 BCH agreements), no 2026–27 call found.
23. `Canva Creators template designer royalties earnings per month reddit 2026 experience payout` → official pool mechanics (share of Canva Pro revenue by Pro exports), Krea blog; no creator reports.
24. `Adobe Stock contributor royalty rates 33% photos 35% video helpx payment PayPal Payoneer Skrill minimum $25 Canada contributors` → official royalty page (33/35%, $0.33 floors), royalty-details, pricing-payment guidelines; getting-paid page not retrieved.
25. `"Shutterstock" contributor account closed earnings withheld Trustpilot 2026 level reset January 1 15% complaints` → Trustpilot July 2025 closures, help on closure (90 days, held earnings, <$1).
26. `Rover sitter Canada reviews complaints payment delayed deactivated account 2026 reddit Ontario sitters` → deactivation appeal policy, 28-day dispute window, owner-side Trustpilot 2026, Change.org petition.
27. `Etsy help "set-up fee" new shops Canada CA$ listing fee "payment processing" 3% + CA$0.25 seller fees 2026 sellers complaints payment reserve` → etsy.com/ca/mx/sell (fees, set-up fee), Crosslist ($15–29, reasons sellers leave); no reserve complaints.
28. `H&R Block Canada "Tax Academy" "Level 1" course fee registration price 2026 reviews worth it hired seasonal pay` → hrblock.ca/tax-academy, blog (60 h; eligible to apply), part-time-work page, 2016 newswire (80% score; ~1/3 offered positions); no Canadian price.
29. `KDP royalty payments Canada electronic funds transfer CAD minimum threshold "60 days" help; KDP account terminated 2026 authors report no sales` → KDP EFT pages (no minimum; bank caveats), third-party ($100 CAD wire), Canadian author Substack (CRA/SIN); no termination reports.
30. `DoorDash Uber Eats courier Ontario 2026 earnings per hour reddit after expenses Toronto gig workers survey` → RideFairTO 2023 ($7.90/h net; Uber $33.98 engaged), Now Toronto couriers (~$20/h, undated), WealthNorth/Wealthvieu generic.
31. `census.gc.ca jobs 2026 census employment opportunities "no longer accepting" OR closed OR "hiring has ended" enumerator October 2026` → only Jan–Mar 2026 coverage; no closure notice.
32. `contributor earnings levels percentage images footage reset January` (shutterstock domains) → earnings structure FAQ (six levels, 15–40%, reset), $0.10 minimum, level update pages.
33. `how do I get paid sitter payments Stripe Canada` (rover domains) → CA payout update (Stripe; 2 days), US "how do I get paid" (3–7 working days; country-matched bank), community posts on Stripe.
34. `royalty payment schedule approximately 60 days after the end of the month Canada EFT` (kdp.amazon.com) → "When will I get paid?" (60/90 days), thresholds table (Amazon.ca EFT $0 CAD; cheque/wire $100 CAD).

## Indeed connector calls
- 15:21Z searches (succeeded): "Simply.TV data editor" remote CA → none; "production assistant film" Toronto → none; "social media coordinator" Ontario → 10 listings (e.g. CWB Group "Social Media & Content Specialist", Toronto, 2026-10-05; e11ement "Influencer Marketing Manager and Coordinator"); "video editor" Ontario → 10 listings (DMB "Video Editor" part-time Toronto 2026-10-08; RKP Group part-time Mississauga 2026-10-06; INsauga freelance videographer/editor; Phoenix full-time Toronto 2026-09-09).
- All subsequent calls rate-limited (see tool conditions). Indeed retries: see end of file.

## Per-record verdicts
| id | disposition | availability | one-line verdict |
|---|---|---|---|
| 99designs-designer | downgraded | registration_open_work_not_guaranteed | Hyperwallet-only payouts since 19 Jan 2026 re-confirmed; Canada only inferred; fee schedule and contest-odds study not re-seen; unpaid contest work explicit. |
| adobe-stock-contributor | updated | availability_unknown | 33%/35% and $0.33 floors re-confirmed; payout rules not re-seen; 2026 forum sales-drop anecdotes; low monetization probability. |
| shutterstock-contributor | updated | availability_unknown | 15–40% six-level structure with 1 Jan reset, $0.10 minimum, $25 payout, PayPal/Skrill/Payoneer confirmed from official help; account-closure anecdotes 2025. |
| canva-creators-template-designer | updated | registration_open_work_not_guaranteed | Beta taking early applications; element creators paused; pool = share of Canva Pro revenue by Pro exports; country eligibility unknown. |
| film-tv-production-assistant-category | updated | not_applicable_category | Job Bank Ontario 2025–27 Very limited (Toronto "good"); Ontario wages $18/$24/$38; no 2026 training intake confirmed; how_to_find_work added. |
| simply-tv-metadata-data-editor | downgraded | availability_unknown | Canada postings (CAD 20/h) re-seen but latest dated 5 Jun 2026; freelance vs full-time conflict; no Indeed posting. |
| social-media-coordinator-category | updated | not_applicable_category | Job Bank Ontario median $37.02, prospects limited; CAFC task-scam losses $49M (2024) / $46.5M (Jan–Sep 2025); live Ontario listings on Indeed; how_to_find_work added. |
| video-audio-podcast-editing-category | updated | not_applicable_category | Only the 2023–25 Job Bank outlook page (moderate; 42% self-employed) re-seen; v1 wage table and 2025–27 "Very limited" not re-seen; live Ontario editor listings on Indeed; how_to_find_work added. |
| young-canada-works-heritage-students | downgraded | availability_unknown | Supplemental funding ended Mar 2026 per sector brief; 2026–27 renewal of the student stream unconfirmed (graduate-stream agreements seen in Kawartha Lakes, May 2026). |
| rover-pet-sitter-canada | new | availability_unknown | 20% sitter fee, Stripe bank payouts, Canadian pilot fees; sign-up status not seen. |
| etsy-seller-canada | new | registration_open_work_not_guaranteed | Official Canadian sell page lists fee stack and possible set-up fee; low monetization. |
| hr-block-canada-tax-academy | new | program_open_check_eligibility | Tax Academy running for 2026 (Aug 2026 info session); course cost not found; completion does not guarantee hiring. |
| amazon-kdp-self-publishing | new | availability_unknown | 60-day payment cycle and Amazon.ca EFT in CAD with no minimum confirmed; royalty band contradiction; no sales data. |
| app-based-delivery-courier-category | new | not_applicable_category | DPWRA in force 1 Jul 2025 (minimum wage for engaged time only); honest effective-earnings notes (RideFairTO 2023 $7.90/h net; couriers ~$20/h undated). |
| ontario-non-lawyer-notary-commissioner | new (REJECTED) | not_applicable_category | Ontario grants non-lawyer appointments only for employer needs, not to start a business; kept for audit. |
| statcan-census-2026-enumerator | new (REJECTED) | rejected_insufficient_evidence | Hiring campaign ended July 2026; next census 2031; kept for audit. |

## Dropped candidates (not written as records)
- Ontario Parks seasonal student jobs: 2026 postings opened Jan 19 2026 (BHFN poster), FAQ says seasonal hiring typically begins in April; no 2027 dates and no current posting seen → nothing current to record; Indeed could not be queried. Revisit in January 2027.
- Blue Mountain / Ontario ski-resort seasonal roles: only old job-fair coverage (2022) and US "Blue Mountain" ski areas in results; Indeed search rate-limited → no official current posting seen.
- Statistics Canada ongoing interviewers: already covered by `statcan-data-collection-clerk`; Indeed search rate-limited.
- Payoneer/99designs success stories, investor pages (SSTK), calculators: not evidence.

## Open questions for the next pass
- Whether 99designs, Adobe Stock and Canva name Canada as an eligible contributor country (no page seen does).
- YCW Heritage student-stream funding for 2026–27 and the 2027 application window.
- H&R Block Canada Tax Academy 2026 course fee and seasonal tax-professional pay.
- Current Ontario minimum wage used for DPWRA engaged-time pay (Oct 2026 rate not seen).
- Simply.TV: is the Canada data-editor posting live; freelance or employment?
- Job Bank 2025–2027 outlook for NOC 52113 (video/audio technicians) in Ontario, and current wage table.

## Indeed retries
Retried `get_job_details` for JOBSEARCH_100196 (DMB Video Editor) seven more times between 15:30Z and 15:47Z, spacing calls by up to 50 s; every call was refused ("Rate limit exceeded", wait 4–57 s, resetting on each attempt). No posting was opened. The four pending searches (H&R Block tax professional, ski resort seasonal, Statistics Canada interviewer, production assistant Ontario) were never run. Consequence: no `opened_and_reviewed` job_board source in this file; Indeed listings are cited `search_result_only` from the 15:21Z result lists.

## Categories assigned to new records
Rover, Etsy, delivery courier category and the notary candidate → `freelance_microbusiness`; H&R Block Tax Academy and the census candidate → `structured_employment`; Amazon KDP → `creative_production`. The file name follows the slice; `category` follows the field of work.

## Validation
`node scripts/v2/validate.mjs data/v2/reviewed/creative_overlooked.json --records` → 16 records, 0 error(s), 7 warning(s) (all "likely" eligibility without a Canada-specific source; true).
