# Research ledger: research participation, freelance marketplaces, creative and microbusiness routes

- Agent family: paid research participation, freelance marketplaces, creative production and microbusiness routes
- Date: 2026-10-13
- Output: `data/raw/research_freelance.json`, 12 records (validated with `JSON.parse` and an enum/key check against RECORD_FORMAT.md)

## Tooling constraints (read first)

1. **Direct page fetching was blocked for the whole session.**
   - `WebFetch` failed with `getaddrinfo ENOTFOUND` on every host tried: www.prolific.com, participant-help.prolific.com, www.upwork.com and www.jobbank.gc.ca.
   - `curl` through the agent proxy got `CONNECT tunnel failed, response 403` (egress policy denial) for www.prolific.com.
   - The proxy status showed other agents hitting the same denials (rev.com, canada.ca).
   - As a result, **no page was opened directly**. Every source in the JSON has `"accessible": false` and the note "Direct fetch was blocked".
2. **WebSearch worked but ran out after 37 queries.** The shared per-turn cap of 200 WebSearch calls is spread across all agents. The 38th and 39th queries were refused, and per the tool's instruction I didn't try to work around the limit.
3. **How evidence was used.** Facts come only from WebSearch result summaries, and URLs only from verbatim search-result links.
   - The summariser sometimes merges several pages. Where I couldn't tell which URL a claim came from, the source note says "attribution approximate".
   - `officialUrl` is an official-domain URL seen verbatim in results, not one I opened. It's sometimes a help-centre or landing page rather than the homepage.
   - `applyUrl` is `null` on every record, because no signup page was opened.
4. **Status choices.**
   - No record uses `applications_open_confirmed` or `registration_open_not_work_guaranteed`, because both require an official page opened today.
   - Records use `eligibility_confirmed` only where an official help or support page, as summarised by search, names Canada. Otherwise they use `official_info_found` or `uncertain`.
   - `evidenceStrength` is never above `moderate`.
   - **Every record should get a direct-open recheck once fetching works.**

## Queries run (WebSearch)

1. Prolific participant eligible countries Canada minimum pay per hour
2. Prolific participant help "which countries" can take part Canada (extended)
3. Prolific participant waitlist 2026 reddit ProlificAc no studies Canada (irrelevant results)
4. reddit ProlificAc waitlist accepted how long Canada (extended; irrelevant results)
5. Prolific participant help how do I get paid PayPal minimum cashout fee
6. Prolific participant "account on hold" OR "account restricted" reddit beermoney 2025
7. Prolific participants earnings per hour study availability few studies complaints 2025 2026
8. User Interviews participants Canada eligible incentive average payment Tremendous PayPal (extended)
9. userinterviews.com reddit "never get selected" screener participant experience
10. Respondent.io participant help fees PayPal Canada eligible countries participant service fee (extended)
11. Respondent.io participant reviews reddit rarely selected LinkedIn verification 2025
12. help.respondent.io participant "what countries" Respondent available participants
13. UserTesting contributor tester pay $10 per test Canada eligible PayPal requirements 2026 (extended)
14. help.usertesting.com contributor practice test "countries" sign up UserTesting tester eligibility
15. UserTesting contributor reddit few tests screener disqualified account deactivated 2025 (only 2020 Reddit-mirror FAQ copies came back; not used)
16. participant-support.usertesting.com payment how much will I be paid test PayPal 14 days
17. dscout scouts Canada eligible pay missions PayPal how much (extended)
18. dscout helpscoutdocs international scouts outside United States can I participate
19. Leger Opinion LEO panel Canada points rewards value per survey review
20. University of Toronto psychology paid research studies community participants sign up (extended)
21. UBC psychology paid studies participate community members compensation sona
22. Rotman Behavioural Research Lab paid participant pool sign up eligibility age paid per hour
23. Upwork freelancer service fee 2026 percentage variable fee connects price (extended)
24. support.upwork.com freelancer service fees variable fee 0% 15% connects $0.15 (restricted to upwork domains)
25. Upwork withdraw Canada direct to local bank CAD fee freelancer
26. r/Upwork connects cost new freelancer no interviews proposals wasted 2025 2026
27. Upwork profile rejected "too many freelancers" new freelancer profile not approved
28. Fiverr seller fee 20% commission revenue clearance period 14 days withdrawal Canada 2026 (extended)
29. r/Fiverr no orders new seller impressions dropped account disabled warnings 2025
30. Fiverr help center seller revenue 20% service fee clearance (restricted to fiverr domains)
31. Contra freelancers commission-free 0% fees how Contra makes money payouts Canada
32. Contra help freelancer fees "Contra Pro" independent fee on payments 2025 2026
33. Freelancer.com fees freelancer 10% or $5 project fee membership Canada withdrawal
34. freelancer.com fees and charges project fee freelancer (restricted to freelancer domains)
35. Freelancer.com reviews scam complaints account suspended withheld funds trustpilot freelancers
36. Canadian freelance job board for freelancers Canada remote gigs writers designers 2026 (extended)
37. Canadian Freelance Union Unifor freelancers membership job resources
38. Canadian Freelance Guild formerly PWAC job bank membership fee access (**refused: search budget exhausted**)
39. Workhoppers Canada freelance site reviews legit fees freelancers (**refused: search budget exhausted**)

Reddit itself almost never came back from search. Negative signals therefore come mostly from official help pages (for example Prolific's "On hold" rules), the Upwork and Fiverr community forums, G2, SmartCustomer, ComplaintsBoard and third-party reviews. These are anecdotes and are labelled as such.

## Blocked or inaccessible sources

| Source | Failure |
|---|---|
| https://www.prolific.com/participants (a URL I guessed; not used in records) | WebFetch DNS fail; curl CONNECT 403 |
| https://participant-help.prolific.com/en/ | WebFetch DNS fail |
| https://www.upwork.com/legal | WebFetch DNS fail |
| https://www.jobbank.gc.ca/ | WebFetch DNS fail (I wanted it for category-record sources) |
| All URLs cited in the JSON | Not attempted individually after the egress block was confirmed; all marked `accessible: false` |

## Records produced (12)

| id | status | Canada | evidence |
|---|---|---|---|
| prolific-paid-studies | waitlist_or_no_work_guarantee | confirmed | moderate |
| user-interviews-participant | eligibility_confirmed | confirmed | moderate |
| respondent-research-participant | eligibility_confirmed | confirmed (via researcher-facing market list) | moderate |
| usertesting-contributor | eligibility_confirmed | confirmed (standard contributor country) | moderate |
| dscout-scout | official_info_found | likely | weak |
| uoft-paid-research-pools | eligibility_confirmed | confirmed (ON) | moderate |
| leger-leo-survey-panel | **rejected** (earnings not justified) | confirmed | weak |
| upwork-freelance | official_info_found | likely | moderate |
| fiverr-gigs | official_info_found | unclear (not evidenced in results) | moderate |
| contra-freelance | official_info_found | unclear | weak |
| freelancer-com | official_info_found | unclear | moderate |
| canadian-freelance-boards-associations (category) | eligibility_confirmed | confirmed | weak |

All research-participation records use `type: research_participation`, `workVolume: sporadic` and `workerStatus: participant`, and their summaries and watch-outs say "not a job".

## Rejected or dropped candidates and why

- **Leger LEO (recorded as `rejected`).** Leger is legitimate and Canadian, but no source supports a meaningful effective hourly rate.
  - Third-party reviews: about $0.50–$35 per survey, 1,000 points = $1, and roughly 20,000 points needed for cash or PayPal.
  - Rejected under the brief's rule ("only if effective earnings justify"). The rejection is about earnings, not legitimacy.
- **Maru (Maru Voice Canada).** Not researched because the search budget ran out. Same earnings test as LEO applies; probably the same outcome, but unverified.
- **Rotman Paid Participant Pool (UofT).** About $10/hr and aimed at students, so it's mentioned only as a watch-out in the UofT record.
- **UBC Sauder SONA paid studies.** The only evidence was a lab blog (ubc "immoralitylab") giving $5–10 per study. It may be dated and is business-school, not psychology, so it was excluded. No UBC Psychology page was found.
- **Workhoppers.** Only its own "#1" self-description was seen. It's folded into the Canadian boards category as unverified, with no standalone record.
- **Social media / community management, video captioning/editing, podcast support, digital asset tagging.** **Dropped: no searches were possible before the budget ran out**, so there's no evidence to cite.
- **Category records "Digital help for local small businesses" and "Spreadsheet/data cleanup freelancing".** **Dropped.** RECORD_FORMAT requires category records to cite at least one source describing the work, and the Job Bank occupation pages were unreachable (WebFetch DNS fail) before search ran out. I didn't write them rather than leave them unsourced.
- **Reddit-mirror FAQ for r/usertesting (2020 copies on third-party mirror domains).** Too old and on untrusted mirror hosts, so not cited.
- **Metaintro "Prolific study participant" listings.** Aggregated job ads, not official, so not cited.

## Notable evidence conflicts

- **Upwork fee:** current Upwork pages say a variable 0–15% fee (since May 1, 2025), while older pages and calculators still say a flat 10%. I used 0–15%.
- **Respondent payout:** older reviews say PayPal, while the official help and current site say Tremendous gift cards. I used Tremendous.
- **Fiverr clearance tiers:** third-party guides disagree for Level 2 and Pro sellers. I used the help-centre figures (14 days standard, 7 days for Seller Plus, Top Rated and Pro).
- **Freelancer.com:** withdrawal fees are about $1 per official pages versus "free except $25 wire" per Wise AU. Upgrade prices also differ across official pages.
- **Contra:** client contract fee is $29 on the current help page versus $19 on an older page. Pro pricing ($29/month) comes from third-party sources only.
- **Prolific minimum cash-out:** £6/$6 on current help versus £5 in older sources. I used £6/$6.

## Open questions and next steps (for whoever has working fetch and search)

1. Open each `officialUrl` directly. Add `applyUrl` values after opening the signup pages for Prolific, User Interviews, Respondent, UserTesting, dscout, Upwork, Fiverr, Contra and Freelancer.com.
2. **Canada payouts:**
   - Confirm Fiverr, Contra and Freelancer.com accept Canadian residents and which payout methods and fees apply in Canada (Fiverr withdrawal options, Contra's "supported payout methods by country", Freelancer.com withdrawals).
   - Confirm Upwork's Direct to Local Bank currency for Canada (CAD only?).
3. **Prolific waitlist:** is the participant waitlist currently open or closed for Canada (only third-party reviews mention it)? Also, how long do Canadian applicants wait?
4. **dscout:** find an official dscout statement on Canadian eligibility.
5. **UofT pools:** confirm the Adult Volunteer Pool's $18/hr and "currently looking for 55–80" are still live. Get pay rates for the UTM and UTSC community pools.
6. **Other Canadian universities:** look for pools that pay community members, such as McMaster, York, Western, Waterloo, UBC Psychology and McGill.
7. **Dropped records:** research the creative and microbusiness routes. Social media management, captioning, podcast support and asset tagging could use Job Bank NOC pages and Rev/3Play-type platforms. The two category records (small-business digital help; spreadsheet cleanup) need a Job Bank, Canada Business App or provincial small-business guidance source.
8. **Maru Voice Canada:** apply the same effective-earnings check as LEO.
9. **Canadian Freelance Guild:** check job-bank access terms and membership cost.
10. **Reddit:** search r/ProlificAc, r/beermoney, r/Upwork and r/Fiverr directly for recent Canada-specific complaints. Search engines returned almost no Reddit threads.
