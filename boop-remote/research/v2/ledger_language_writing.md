# Ledger: language_writing (revalidation run 2026-10-13)

Agent slice: all baseline `language_writing` records except `crowdgen-canadian-french-voice-tasks` (handled by the CrowdGen agent). Work done 15:19–15:45 UTC on 2026-10-13. Output: `data/v2/reviewed/language_writing.json`.

## Tool conditions
- `WebFetch` tried once on https://www.rev.com/freelancers → `getaddrinfo ENOTFOUND` (DNS). Every web source is therefore `search_result_only`; no page was opened, so no `confirmed` eligibility, no `strong` evidence, no `accepting_applications`.
- `WebSearch` worked; 32 queries used (listed below).
- Indeed connector: `search_jobs` worked three times (remote/CA for LanguageLine and Welocalize → no results; Toronto/CA LanguageLine → no results; Ontario/CA "over the phone interpreter" and "captioner OR captioning" → listings). Every `get_job_details` call (eleven attempts between 15:22 and 15:43 UTC, spaced up to two minutes apart) returned "Rate limit exceeded for account … on toolset claude", so no full posting could be opened. Listing entries seen through the connector (title, company, location, posted date, job type, apply link) are recorded as `job_board` sources with `access_status: search_result_only`, since the posting itself was not read.

## Queries (WebSearch)
1. Rev.com freelancer transcriptionist apply waitlist Canada 2026
2. TranscribeMe transcriber entrance exam Canada pay per audio hour 2026
3. GoTranscript transcription jobs apply Canada pay per audio minute 2026
4. Cambly tutor apply "temporarily limiting new tutors" Canada 2026
5. Preply tutor Canada commission 33% 18% trial lesson become a tutor 2026
6. italki teacher application 2026 commission community tutor requirements Canada "accepting applications"
7. Scribbr editor application "not currently" OR "currently hiring" freelance editor 2026 Canada euros per hour
8. Welocalize freelance translator rates payment reddit OR proz "French Canadian" Canada 2026
9. LanguageLine Solutions interpreter Canada Cree OR Inuktitut OR Ojibwe "per minute" 2026 work from home
10. reddit r/transcription Rev "no work" OR "no files" OR "waitlist" 2026
11. TranscribeMe reddit "exam" unavailable OR "no work" OR "no audio" transcriber 2026
12. GoTranscript transcriber reviews Trustpilot OR reddit "not paid" OR "rejected" OR "no work" 2026
13. Preply tutor reviews reddit OR Trustpilot "profile deleted" OR "no students" OR "banned" 2026
14. italki teacher application rejected OR "not accepting" OR "waitlist" reddit 2026 English community tutor Canada
15. Scribbr editor reviews Glassdoor OR reddit "freelance editor" pay per word "simulation" 2026
16. Cambly tutor reddit 2026 "priority hours" OR "no calls" OR "application" Canada
17. Welocalize freelance reviews Glassdoor OR reddit "late payment" OR "low rates" OR "AI" linguist 2026
18. Job Bank editors NOC 51110 wages Ontario 2026 "Editors Canada" membership fee certification
19. Job Bank translators terminologists interpreters NOC 51114 wages Ontario 2026 Translation Bureau freelance supplier ATIO certification
20. Verbit OR VITAC freelance transcriber captioner apply Canada accepted countries pay 2026
21. 3Play Media transcript editor contractor apply Canada eligible countries 2026
22. Crowd Content writer apply Canada pay per word product descriptions 2026 reviews
23. MCIS Language Solutions community interpreter training Ontario cost OCCI CILISAT ILSAT 2026 freelance interpreter pay
24. Outschool OR "Tutor.com" OR "Paper" online tutor apply Canada residents eligible pay 2026
25. editors.ca membership fees 2026 "Editors Canada" certification exam fee directory profile
26. "Translation Bureau" freelance translators "supply arrangement" OR "supplier directory" 2026 ATIO certified translator Ontario candidate requirements
27. "3Play Media" contractor transcript editor "Canada" OR "US only" OR "United States" eligibility reddit OR review 2025 2026
28. "Crowd Content" writers "apply" OR "sign up" 2026 writer reviews pay Victoria BC crowdcontent.com
29. Paper paper.co tutor jobs Canada remote hiring 2026 pay per hour OR Skooli tutor apply Canada requirements
30. mcislanguages.com community interpreter training course fee 2026 "Language Interpreter Training" OR "Community Interpreter" Ontario tuition online
31. Cambly tutor pay "$0.17" per minute OR "$10.20" per hour tutorlanding.cambly.com 2026
32. MCIS Language Solutions freelance interpreter Toronto apply requirements training "interpreter" pay per hour reviews

Reddit never surfaced directly in queries 10–17; negative evidence comes from Trustpilot, Glassdoor, Indeed company reviews and complaint boards.

## Indeed connector calls
- search_jobs "LanguageLine interpreter" / remote / CA → none. "Welocalize" / remote / CA → none. "LanguageLine interpreter" / Toronto, ON / CA → none.
- search_jobs "over the phone interpreter" / Ontario / CA → Kelly "Danish/Korean/Japanese/Burmese/Cantonese (Medical) Interpreter + Paid Training" (Ontario, part-time, posted 1–9 Oct 2026); MCIS Language Solutions "Freelance Interpreter (English/Somali, Marathi, Morisyen, Burmese, Vietnamese)" (GTA, Woodstock, Brantford, Barrie, Durham; contract; Sep 2025–Feb 2026).
- search_jobs "captioner OR captioning" / Ontario / CA → Habitat Learn "Captioner and Note taker" (Oshawa, contract, 2 Mar 2026); Senate of Canada "Team Lead Transcription and Captioning" (Ottawa, full-time, Sep 2026; management role, not pursued); unrelated bank roles.
- get_job_details JOBSEARCH_100179 / 100173 / 100164: rate-limited on every attempt.

## Per-record verdicts
| id | disposition | availability | evidence | one line |
|---|---|---|---|---|
| rev-transcription-captioning | updated | waitlist | moderate | Waitlist still on; help centre names Canada as accepted; $0.40–1.10/min (currency unstated). |
| transcribeme-transcription | downgraded | availability_unknown | weak | Exam reported unavailable 28 Aug 2026; no-work reviews; official page not re-seen. |
| gotranscript-transcription | updated | registration_open_work_not_guaranteed | moderate | Worldwide jobs page + fr-CA page; English up to $0.60/min; 2026 payment-dispute reports. |
| cambly-english-tutor | updated | waitlist | moderate | USD 0.17/min confirmed by help centre; intake cap still official. |
| preply-online-tutor | updated | availability_unknown | moderate | 100% trial / 18–33% commission re-confirmed; saturation and account-block reports; eligibility lowered to unclear (no source). |
| italki-language-tutor | downgraded | availability_unknown | weak | Only the 2026 Teacher Policy re-seen; commission and Canada eligibility unverified. |
| scribbr-academic-editor | updated | availability_unknown | moderate | €20–30/h FAQ and 'worldwide' apply page re-seen; Scribbr admits seasonal work. |
| welocalize-freelance-linguist | updated | availability_unknown | weak | fr-CA quality rater $27.23/h (aggregator); on-time pay but low rates; impersonation scams. |
| languageline-indigenous-language-interpreter-canada | downgraded | availability_unknown | weak | No Canadian postings on Indeed; aggregator copies undated, one says USA only; CAD 0.42/min effective estimate. |
| proofreading-copyediting-category | updated | not_applicable_category | moderate | Ontario $20–48.72/h (median $34.62); Editors Canada fees frozen for 2026; how_to_find_work added. |
| bilingual-en-fr-work-category | updated | not_applicable_category | moderate | Ontario median $25.64/h; Translation Bureau RFSA 2026–2031; how_to_find_work added. |
| mcis-language-solutions-freelance-interpreter | new | registration_open_work_not_guaranteed | moderate | Ontario community interpreter employer; $20–25/h contract postings; on-call, no guaranteed hours. |
| kelly-remote-interpreter-paid-training-ontario | new | availability_unknown | weak | Oct 2026 Ontario "Interpreter + Paid Training" postings seen in listing only; details unopened. |
| habitat-learn-captioner-note-taker | new | availability_unknown | weak | Oshawa captioner/note-taker contract posting (Mar 2026) seen in listing only. |
| crowd-content-freelance-writer | new | availability_unknown | weak | Product-description writing platform; third-party, partly stale pay data; location contradiction. |
| translation-bureau-translation-supplier-directory | new | registration_open_work_not_guaranteed | moderate | CanadaBuys RFSA WS5665734815 open May 2026–Apr 2031; work not guaranteed. |
| verbit-vitac-freelance-captioner | new (rejected candidate) | rejected_insufficient_evidence | insufficient | Only listing is USA-remote and experience-gated. |
| 3play-media-contract-transcript-editor | new (rejected candidate) | rejected_insufficient_evidence | insufficient | US-based background check, 'nationwide' hiring; Canadian fr-CA listing says hiring in US. |
| paper-online-tutor-canada | new (rejected candidate) | rejected_insufficient_evidence | insufficient | Reports of 2024 Canadian tutor layoffs; US-only listing. |

Note on rejected candidates: the guide allows `disposition: "rejected"` for failed candidates, but `validate.mjs` requires `migration.v1_id` for any non-`new` disposition. The three failed candidates are therefore encoded as `disposition: "new"` with `availability_status: rejected_insufficient_evidence`, `evidence_quality: insufficient` and a `disposition_reason` beginning "Considered and rejected". The builder's `production_eligible` rule excludes them.

## Dropped or not pursued
- Outschool, Tutor.com, Skooli: query 24/29 returned nothing on Canadian tutor eligibility; not recorded.
- Senate of Canada "Team Lead Transcription and Captioning": management vacancy, outside the entry-level scope.
- Community interpreter training (OCCI, CILISAT/ILSAT, MCIS course fees): queries 23 and 30 returned only a directory listing and non-Ontario courses; folded into the MCIS record's open questions.
- v1 sources not re-seen were dropped per the guide (Gizmodo/Coworker on Rev's 2019 pay cut; italki help-centre commission pages; Scribbr quiz page; Translation Bureau service pages; RCI/Guelph bilingual-premium articles; LanguageLine Workday postings; Editors Canada fee pages).

## Open questions
- Whether Rev, GoTranscript and TranscribeMe rates are USD.
- italki commission schedule and Canada eligibility; whether English Community Tutor applications are open.
- Current Editors Canada fee amounts; Translation Bureau RFSA qualification criteria for individual freelancers; ATIO certification route.
- Whether LanguageLine has any open Canadian Indigenous-language interpreter roles.
- Kelly interpreter postings: client, pay, remote arrangement (postings could not be opened).
