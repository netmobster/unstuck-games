# Research ledger: language, writing, audio and communication

- **Family:** language_writing
- **Researched on:** 2026-10-13
- **Output:** `data/raw/language_writing.json` (12 records, valid JSON, all enum values checked)

## Access limitations (read first)

- **WebFetch failed for every host** with `getaddrinfo ENOTFOUND`. Hosts tried: rev.com, www.rev.com, transcribeme.com and jobbank.gc.ca.
- **curl was also blocked.** The egress proxy refused the CONNECT with a 403 (organization policy) for every host tested: rev.com, jobbank.gc.ca, reddit.com, cambly.com, wikipedia.org and google.com.
- **No official page was opened directly.** All evidence comes from WebSearch result titles and URLs plus the search tool's summaries of indexed page content. That is why:
  - Every source has `"accessible": false`.
  - Every `applyUrl` is `null`, because the format requires an apply URL to have been opened.
  - Signup URLs seen in results are cited as sources only.
  - `officialUrl` values are official-domain URLs seen word for word in search results. They are not "verified by opening".
  - No record uses `applications_open_confirmed` or `registration_open_not_work_guaranteed`, because both require an official page opened today.
  - `canadaEligibility: "confirmed"` is used only where indexed official content names Canada: the LanguageLine "Interpreter in Canada" postings, the CrowdGen fr-CA posting ("currently located in Canada"), and the Job Bank / Translation Bureau category records.
- **Unpinned claims.** Search summaries sometimes made claims without naming the page they came from. In those cases the source note says "not pinned to this page", or the claim was left out.
- **Search budget ran out.** The shared limit of 200 WebSearch calls per turn ran out after 37 queries. Two planned queries could not run: Welocalize negative signals, and a Welocalize talent page check.
  - Also not run: content/product-description writing, a TranscribeMe- or GoTranscript-specific Reddit search, and a Defined.ai follow-up.
- **Interpretation of `assessment`:**
  - `unpaid_test` means an unpaid work sample, such as an audio transcription sample.
  - `free_test` means a short free quiz only.

## Queries run (WebSearch)

1. Rev freelancer transcription apply Canada pay per minute 2026
2. Rev.com freelancer waitlist applications countries eligible Canada PayPal (extended)
3. reddit r/transcription Rev no work waitlist pay cut 2025
4. TranscribeMe transcriptionist apply entrance exam pay per audio hour countries (extended)
5. GoTranscript transcriptionist jobs apply test pay per audio minute PayPal Payoneer worldwide (extended)
6. gotranscript.com transcription jobs work from home English (domain-limited)
7. transcribeme.com transcriptionist jobs work from home apply (domain-limited)
8. Scribie transcriber apply 2026 pay per audio minute test countries
9. Verbit transcriber freelance apply Canada pay
10. Cambly tutor requirements non-native speakers Canada pay per minute payment (extended)
11. Preply tutor commission tiers requirements (extended)
12. Preply help center tutor commission (domain-limited)
13. italki teacher application community tutor professional teacher requirements commission (extended)
14. italki not accepting English teacher applications closed
15. italki support teacher commission rate (domain-limited)
16. Cambly tutor reddit no students low pay priority hours complaints
17. Preply tutors complaints trial lesson commission reddit
18. tutorlanding.cambly.com become a tutor (domain-limited)
19. Cambly "limiting the number of new tutors" / waitlist 2026
20. Cambly "Unsupported Tutoring Locations"
21. Editors Canada Online Directory of Editors listing membership fee certification (extended)
22. Scribbr become an editor requirements apply test pay (extended)
23. Job Bank Canada editors NOC 51110 wages outlook (gov domains)
24. Job Bank Canada translators terminologists interpreters NOC 51114 wages (gov domains)
25. Translation Bureau Canada freelance translators suppliers (gov domains)
26. Statistics Canada bilingual English French earnings advantage
27. LanguageLine interpreter jobs Canada remote French bilingual contractor (extended)
28. Welocalize freelance linguist talent community LQA Canadian French (extended)
29. languageline.wd5.myworkdayjobs.com French interpreter Canada
30. LanguageLine interpreter reviews contractor pay per minute call volume
31. LanguageLine Cree / Inuktitut Interpreter in Canada posting details
32. Appen CrowdGen speech data collection Canada contributors pay (extended)
33. Defined.ai / Neevo voice recording tasks Canada pay
34. CrowdGen Appen reviews no projects payment issues 2025 2026
35. jobs.lever.co appen CrowdGen French Canada speech (domain-limited)
36. CrowdGen by Appen official site join (domain-limited)
37. TransPerfect freelance linguist vendor portal Canada French
38. *(blocked by budget)* Welocalize freelance translator reviews rates payment
39. *(blocked by budget)* talent.welocalize.com freelance linguists apply

## Sources blocked or inaccessible

- All official, government and review pages cited in the JSON are blocked: WebFetch DNS failure and proxy 403. Each is marked `accessible: false`.
- Pages tried with WebFetch:
  - https://www.rev.com/freelancers
  - https://rev.com/freelancers
  - https://www.rev.com/freelancers/transcription
  - https://www.transcribeme.com/jobs/
  - https://www.jobbank.gc.ca/marketreport/summary-occupation/1300/ca

## Records kept (12)

| id | status | Canada | evidence |
|---|---|---|---|
| rev-transcription-captioning | waitlist_or_no_work_guarantee | likely | moderate |
| transcribeme-transcription | official_info_found | likely | weak |
| gotranscript-transcription | official_info_found | likely | weak |
| cambly-english-tutor | waitlist_or_no_work_guarantee | likely | moderate |
| preply-online-tutor | official_info_found | likely | moderate |
| italki-language-tutor | official_info_found | unclear | moderate |
| proofreading-copyediting-category | official_info_found | confirmed | moderate |
| scribbr-academic-editor | official_info_found | likely | moderate |
| bilingual-en-fr-work-category | official_info_found | confirmed | moderate |
| languageline-indigenous-language-interpreter-canada | eligibility_confirmed | confirmed | moderate |
| crowdgen-canadian-french-voice-tasks | waitlist_or_no_work_guarantee | confirmed | moderate |
| welocalize-freelance-linguist | official_info_found | likely | weak |

Captioning and subtitling are folded into the Rev record, using Rev's captioner and subtitle-translator rates. Editors Canada is folded into the proofreading category record as the professional route.

## Rejected or dropped candidates

- **Scribie:**
  - Official page cites $5–25 per audio hour. A third-party guide says the standard rate is about $6 per audio hour.
  - TechRadar describes competition for files.
  - No Canada or country information was found.
  - Dropped as low-value, with weaker evidence than Rev, TranscribeMe and GoTranscript. Could be added later as a low-pay option.
- **Verbit:**
  - Postings are for experienced legal transcribers; editing AI drafts is paid per audio minute or per page.
  - Some copies of the postings are closed, and they are US- or "Global"-focused.
  - Canadian eligibility is not stated, and New York/California rules apply to US postings.
  - Dropped as not entry-level, with Canada unclear.
- **TransPerfect:** The only evidence is a 2024 ProZ copy of an English to Canadian French game-translator posting, which is closed. No current vendor portal was found. Dropped.
- **Defined.ai / Neevo:**
  - Only third-party pay estimates were found.
  - Nothing shows Canadian voice tasks.
  - A "Canadian English speech recording" posting ($18/h, 17 h/week, external mic) appeared only on aggregators and was attributed to Lionbridge, not Neevo.
  - Dropped as unverified.
- **LanguageLine French interpreting in Canada:** French postings found were US-only. The Canadian LanguageLine record is therefore limited to Indigenous-language roles (Cree, Inuktitut; Ojibway also mentioned).
- **Content/product-description writing:** Not researched because the search budget ran out. No record was created.

## Open questions and items to recheck when fetch access works

1. Open every official URL to confirm current content. Several statuses could then move up to `applications_open_confirmed` or `registration_open_not_work_guaranteed`, and `applyUrl` values could be filled in.
2. **Rev:** check the current official list of accepted countries, whether the waitlist is still active, and whether pay is in USD.
3. **TranscribeMe:** one search summary said a reviewer reported that the English entrance exam is sometimes closed because supply is sufficient. This was not pinned to a source, so it was left out of the record. Also verify the rates and whether Canada is accepted.
4. **GoTranscript:** the official English pay rate is unknown. Run a Reddit/Trustpilot negative-signal pass.
5. **Cambly:**
   - Worker status is not stated explicitly. The help article says contracts are "terminated" in unsupported states, which suggests contractor status.
   - Is the limit on new tutors still in place?
   - The summary of the unsupported-locations list is from a 2024 article and may have changed.
6. **Preply and italki:** no explicit statement on Canadian residency was found. Check whether italki accepts no-credential English Community Tutors, given that its English page mentions certification.
7. **Scribbr:** are the Academy and simulation orders paid? Does Scribbr accept applicants resident in Canada, and in which currency does it pay?
8. **LanguageLine:** are the Canada postings still open? What screening or test is used, and what currency is the per-minute pay in?
9. **CrowdGen fr-CA:** what is the real per-task pay (the postings show placeholders)? Is there any Canadian French recording project, as opposed to rating?
10. **Welocalize:** negative signals (rates, payment timeliness) and whether Canadians are accepted into the freelance pool. The fr-CA linguist postings found were EU/UK-located.
11. **Bilingual category:** confirm the Statistics Canada source for the bilingual earnings premium. The figures used here come from secondary reports: RCI 2019 on the Conference Board study, and a University of Guelph news item. Consider adding the federal public-service bilingualism bonus once it is verified.
12. **Possible additions for a later pass:**
    - Content and product-description writing
    - Captioning-specific employers such as CART/real-time captioning
    - Provincial court transcription
    - NWT Indigenous Languages Interpreter/Translator List (https://www.ece.gov.nt.ca/en/interpreter-translator-list, seen in results but not assessed)
