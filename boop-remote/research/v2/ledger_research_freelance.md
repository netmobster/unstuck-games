# Ledger: research_participation + freelance_microbusiness revalidation

Run date: 2026-10-13 (work done 15:19–15:30 UTC). Output: `data/v2/reviewed/research_freelance.json` (14 slice records + 6 new candidates, 20 in all).

## Tool conditions
- `WebFetch` tried once on `https://www.prolific.com/participants` at 15:19Z → `getaddrinfo ENOTFOUND`. Every web source in the output is `access_status: "search_result_only"`; nothing is `confirmed`, nothing `strong`, no `verified_rate`.
- `WebSearch` worked. 32 queries run (budget ~32). Several queries returned off-topic results (Canadian immigration waitlists for "Prolific waitlist"; Scouts Canada for "dscout scouts").
- Indeed connector not used (no employer/specific_job records in this slice).
- The Shopify Partner Program record named in the brief lives in `tech_digital.json`, not in my file, so it was left to that slice. `freelance_microbusiness.json` holds exactly 7 records.
- Validator note: `REVIEW_GUIDE.md` allows a failed new candidate to carry `disposition: "rejected"`, but `validate.mjs` rule 8 requires `migration.v1_id` on every non-new record. The Angus Reid Forum candidate therefore stays `new` with `evidence_quality: "insufficient"` and `availability_status: "rejected_insufficient_evidence"`, which the builder never marks production-eligible.

## Queries (numbered)
1. Prolific participants Canada waitlist 2026 … cash out minimum PayPal → cash-out rules (help 445063/445067); waitlist not found here.
2. "User Interviews" participants Canada eligible countries Tremendous → Recruit list (8 countries incl. Canada; newer page "34 countries" unlisted), Hub = any Tremendous country, 10 business days.
3. Respondent.io participant fulfillment fee 5% $1 Canada payout → fee 5%/$1 (2.75%+2.25%), staged Tremendous rollout from 2025-05-28, 7–10 business days.
4. UserTesting contributor Canada 2026 payment PayPal $10 … r/beermoney → PayPal-only, recruits where PayPal operates; third-party pay $4/$10/$30–120; 7-day blog claim.
5. dscout scouts Canada eligible countries PayPal → "Receiving your reward": PayPal only, 10 business days. No eligibility info (off-topic Scouts results).
6. "Prolific" participant waitlist "no studies" r/ProlificAc 2026 → official waitlist blog + help article; "why am I not receiving any studies"; r/ProlificAc 2026-02-04 snapshot; on-hold escalation Notion page.
7. dscout "Canada" reddit OR trustpilot → Trustpilot/G2 complaints (partial pay, rarely matched, 2026 upload bug); Budget Diet $25–150/mission. No Canada statement.
8. UofT adult volunteer pool $18 … UTSC … Rotman → AVP confirmed ($18/h, 55–80, 1–2 h, once or twice a year, online form, adultpool@utoronto.ca); UTSC "small payment where funding permits"; Rotman not found.
9. Leger Opinion LEO points redemption 20,000 … earnings per hour → tiers confirmed (1,000 pts≈$1; 20,000 cash-type; 10,000 Air Miles; cheque $50); $0.50–$5 (one site to $35); no hourly data.
10. Upwork service fee 2026 variable 0–15% Connects … Canada → variable fee since 2025-05-01, Connects $0.15; no Canadian figure; AiProposer "flat 10%" contradiction.
11. r/Upwork new freelancer 2026 "no jobs" … → community posts 2019/2022 (no interviews), Connects not returned for interviews since Sept 2022, 6–16 / 16–24 Connects per job; no win-rate data.
12. Fiverr seller fee 20% 2026 clearance 14 days withdrawal Canada → 20% flat incl. tips; 14/7 days; withdrawal fees conflict; $5,000 cap; nothing on Canada.
13. r/Fiverr new seller 2026 "no orders" → Fiverr Community threads (no orders for weeks/months, since April 2024), r/Fiverr 2026-04-21 snapshot (low sales, writing/AI).
14. Contra fees 2026 commission-free payout Canada … → 0% to freelancers; Pro $29/mo vs US$199/yr; client fee ~$2–$29; no Canada payout info.
15. Freelancer.com fees 2026 "10%" "$5" … Trustpilot → fee trackers 10%/$5, Preferred ~3%, arbitration $5/5%, withdrawal PayPal $0.30/Skrill 1%/wire $6; terms.law watchdog concerns; no Trustpilot pages.
16. Canadian Freelance Guild membership fee … Canadian Freelance Union dues → CFU join page (tiered dues $125/150–$300; media/communications/information; Canadian connection); CFG $150/yr (2020); no Unifor mention.
17. Digital Main Street Ontario 2026 Digital Service Squad grant status → official DSS grant page (BIAs/municipalities/chambers/SBECs); helloDarwin "verified 2026-03-04, open"; Toronto 2024 doc (funded since 2018 via TABIA); last explicit renewal 2021 FES $40M.
18. Job Bank data entry clerk NOC 14111 wages Ontario → ON median $23.00 (17.60–34.87), updated 2025-11-19; outlook Limited 2025–2027, ~15,500 employed, updated 2025-12-10.
19. McMaster paid research studies community participants → CHEPA Sona pool (request account, pre-screen, free, HiREB, non-students); LIVELab fall 2024 $20 non-credit; Financial Affairs guidelines 2025-01-27; "no studies currently available" page.
20. Western University paid research participants … Brain and Mind → only Owen Lab/BMI intranet; pointer to OurBrainsCAN.
21. York University OR University of Ottawa paid research studies → nothing for York/uOttawa; UofT PSA pages ($10/h, 2016–2019) and a 2017 Ryerson article.
22. University of Waterloo paid research studies community → CORE $20/h (ORE ethics); WRAP FAQ (1–3 h on campus, pay not shown); REG/SONA students only.
23. Angus Reid Forum OR Maru Voice Canada OR Asking Canadians … → Angus Reid Forum About page only (points or sweepstakes); no values.
24. BetaTesting.com testers Canada pay … → official tester page ($15–$30 for 45–60 min; Tremendous within 14 days; PayPal/bank/gift cards; catalog by country); review: weeks/months before invites.
25. QuickBooks ProAdvisor program Canada free certification Find a ProAdvisor → generic Intuit pages; directory listing free with certification; country list incl. Canada (community).
26. OBIAA Ontario BIA directory count → Ontario 270+ / 300+ BIAs (sources differ), 83 active in Toronto (June 2026 audit doc), 2010 handbook ~200.
27. "Angus Reid Forum" review points worth … → Terms of Service: $0–$5 equivalent per survey; redemption $25 increments (2,500 pts), e-gift card within 2 weeks; 100 pts=$1 (third party); Savvy New Canadians says renamed Maru Voice Canada 2018 (contradiction).
28. "BetaTesting" reddit OR trustpilot "no invites" … → G2/Trustpilot: invites infrequent (weeks; ~5/yr), paid on time; official help: 18+, 0–5 opportunities/month, must apply + device check + screeners.
29. quickbooks.intuit.com/ca ProAdvisor program Canada join free → Intuit Canada page: QBO Accountant sign-up = ProAdvisor, free training, Find-a-ProAdvisor listing, CPD; "Canadian Cloud ProAdvisor" PDF suspicious (excluded).
30. OurBrainsCAN participant registry Western → ourbrainscan.uwo.ca sign-up, participants page, 2023-11-22 consent form, 2019 launch news; no compensation info.
31. Upwork "Direct to Local Bank" Canada CAD $0.99 … Trustpilot → support.upwork.com 211063888 / 211060578: $0.99 USD (+ bank incoming fees); Wise Canada guide; community "4 business days" vs Skydo "up to 7"; no Trustpilot.
32. "User Interviews" participant reviews Trustpilot 2026 … → ca.trustpilot.com complaints (match score, never-paid rescheduled interview, silence); Visu Network 3.6/5 of 1,223 (Aug 2026); unverified 8% acceptance (alidropship); possible UserTesting acquisition (one low-quality blog; UI support articles now also on help.usertesting.com).

## Per-record verdicts
| id | disposition | availability | evidence | one line |
|---|---|---|---|---|
| prolific-paid-studies | updated | waitlist (checked) | moderate | Official waitlist post + help article; cash-out £6/$6 PayPal/Hyperwallet; min-rate claim dropped (not re-seen). |
| user-interviews-participant | updated | availability_unknown | moderate | Tremendous-only, USD display, 10 business days re-seen; Canada in older 8-country list; Trustpilot complaints added. |
| respondent-research-participant | downgraded | availability_unknown | moderate | Fee 5%/$1 confirmed; staged move to gift cards since 2025-05-28; Canada eligibility not re-seen → unclear. |
| usertesting-contributor | updated | availability_unknown | moderate | PayPal-only, unpaid sample test; third-party pay moved to anecdotal; 7 vs 14-day payout contradiction. |
| dscout-scout | downgraded | availability_unknown | weak | PayPal-only, 10 business days; no official country list in two passes → unclear; partial-pay complaints. |
| uoft-paid-research-pools | updated | registration_open_work_not_guaranteed (checked) | moderate | AVP $18/h, 55–80, once or twice a year, online form; UTSC small funding-dependent pay; Rotman dropped. |
| leger-leo-survey-panel | rejected | rejected_insufficient_evidence | weak | Tiers confirmed; $0.50–$5/survey; no hourly basis; fails earnings test. |
| upwork-freelance | updated | availability_unknown | moderate | 0–15% variable fee, Connects $0.15 (6–16/16–24 per job), US$0.99 local bank (official); newcomer odds anecdotal. |
| fiverr-gigs | downgraded | availability_unknown | weak | 20% + 14-day hold consistent but no official page re-seen; withdrawal fees conflict; 2026 no-orders anecdotes. |
| freelancer-com | downgraded | availability_unknown | weak | 10%/$5 third-party only; dispute fees; withdrawal figures conflict with v1; ToS watchdog concerns. |
| contra-freelance | downgraded | availability_unknown | weak | 0% to freelancers (guides); Pro price conflict; Canada payout unknown; no negative-evidence source exists. |
| canadian-freelance-boards-associations | updated | not_applicable_category | weak | CFU dues/eligibility from join page; CFG $150 (2020); how_to_find_work added; Unifor claim removed. |
| small-business-digital-help-category | updated | not_applicable_category | moderate | DSS grant page + Toronto funding docs + BIA counts (270–300+ ON, 83 Toronto); how_to_find_work via BIAs. |
| spreadsheet-data-cleanup-freelancing-category | updated | not_applicable_category | moderate | Job Bank ON $23.00 median (Nov 2025), outlook Limited 2025–27; how_to_find_work added; scam claim labelled v1. |
| mcmaster-research-participant-pool | new | availability_unknown | weak | CHEPA Sona pool (non-students welcome, free); LIVELab $20 (2024); live status unknown. |
| waterloo-community-research-participants | new | availability_unknown | weak | CORE $20/h + WRAP (1–3 h); psychology SONA students only; CORE domain (ocular) unverified. |
| western-ourbrainscan-registry | new | registration_open_work_not_guaranteed (checked) | weak | Public registry, sign-up page, 2023 consent form; pay not evidenced. |
| betatesting-tester | new | availability_unknown | moderate | Official $15–$30/45–60 min, Tremendous in 14 days, 18+, 0–5 invites/month; Canada not named. |
| angus-reid-forum-panel | new (rejected candidate) | rejected_insufficient_evidence | insufficient | ToS $0–$5/survey, $25 gift-card minimum; Maru Voice naming conflict; fails earnings test. Disposition stays "new" because the validator requires a v1_id on any other value; evidence "insufficient" keeps it out of production. |
| quickbooks-proadvisor-bookkeeping-canada | new | not_applicable_category | moderate | Intuit Canada: free QBO Accountant → ProAdvisor, free certification, directory listing; rates unknown; skill required. |

Counts by disposition value: updated 8 · downgraded 5 · rejected 1 (Leger LEO) · new 6 (5 accepted candidates + Angus Reid Forum, which is a rejected candidate carried as "new" with insufficient evidence) · retained 0 · merged 0.

## Dropped candidates (not written as records)
- York University and University of Ottawa community pools: one combined query returned only UofT/Ryerson pages; no budget for a second attempt.
- Maru Voice Canada / Asking Canadians: no results in the combined panel query; Maru appears only as a possible rename of Angus Reid Forum (recorded as a contradiction there).
- Western psychology / Owen Lab: no community-pool or pay information; superseded by the OurBrainsCAN registry record.
- Waterloo psychology REG/SONA pool: students only.
- Rotman Behavioural Research Lab paid pool (v1): not found this pass; removed from the UofT record body, kept in unresolved_claims.
- "Canadian Cloud ProAdvisor" (ThinkQuickBooks PDF): appeared on unrelated domains, unverifiable; excluded.
- Workhoppers (v1 source): not re-checked; dropped from the boards record.
- OBIAA as its own record: folded into `small-business-digital-help-category.how_to_find_work` instead.

## What could not be verified
- Any page content directly (DNS failure), so no `confirmed` eligibility, no `strong` evidence, no `verified_rate`.
- Canada-specific payout methods/fees for Upwork (CAD conversion), Fiverr, Freelancer.com, Contra, Respondent (Tremendous vs PayPal by location), BetaTesting (reward currency).
- dscout country eligibility; Canada in User Interviews' current 34-country list; UserTesting's current standard country list (seen only in v1).
- Prolific's minimum £6/$8 hourly reward rule (not re-seen); UofT UTM pool; McMaster pool live status; WRAP pay; OurBrainsCAN compensation.
- Any measured acceptance/win rate for new freelancers on Upwork or Fiverr, or a per-hour figure for any survey panel.

## Open questions for a pass with page access
1. Open Prolific's waitlist help article for current wait guidance and the Ethical Rewards page for the minimum rate.
2. Open Fiverr's and Freelancer.com's official fee/withdrawal pages and check Canadian options.
3. Open Upwork's withdrawal page for the Canada/CAD row.
4. Open dscout's participant help for eligible countries.
5. Open UTSC panel and CHEPA pool pages to confirm they are live and what they pay.
