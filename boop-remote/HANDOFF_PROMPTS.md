# Handoff prompts

Two prompts written 2026-10-13 after the v2 revalidation. The first finishes the research in a tool that can open web pages (Claude Desktop); the second builds the app in Lovable on the test data. Links point at the PR branch; after merge, swap `ccr-f1aca2a0-qtruys` for `main`.

---

## 1. Claude Desktop: complete the research

```
You are the research lead finishing the Opportunity Engine catalogue before it goes to a front-end build. The dataset was revalidated on 2026-10-13 by agents that could NOT open any web page (DNS was blocked), so 487 of its 507 sources are search-engine summaries. You can open pages. Your job is to turn search-only claims into opened-and-reviewed evidence, settle what is unknown, and hand back the same JSON, improved.

Files (read in this order):
- Contract: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/data/v2/SCHEMA.md
- Review rules: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/data/v2/REVIEW_GUIDE.md
- What was found and what is still unknown: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/RESEARCH_REPORT.md
- The dataset (98 records): https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/data/v2/catalogue.v2.json
- JSON Schema it must keep validating against: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/data/v2/catalogue.schema.json
- Audit trail incl. rejected records: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/data/v2/catalogue.audit.json
- Validation checks that ran: https://raw.githubusercontent.com/netmobster/unstuck-games/ccr-f1aca2a0-qtruys/boop-remote/VALIDATION_REPORT.md
- Per-slice research ledgers with open questions: https://github.com/netmobster/unstuck-games/tree/ccr-f1aca2a0-qtruys/boop-remote/research/v2
- Pull request for context: https://github.com/netmobster/unstuck-games/pull/145

Perspective: a person living in Ontario, Canada. Canadian eligibility is a hard requirement for production. Where a route is open internationally, say so in region_eligibility.eligibility_notes ("open to residents of: …") so the app can show it to people outside Canada as well.

Work in this priority order, and work record by record (do not bulk-edit):
1. The 5 records marked accepting_applications or open_specific_opportunity (Foundever, Intuit seasonal tax, MCI/Sydney Call Centre, Zirtual, TELUS Digital bilingual client care). Open the actual employer posting. Confirm it is live, who can apply (province, work authorization), pay, and the employer identity (TELUS Digital vs TELUS Health is an open question). If the posting is gone, downgrade and say so.
2. The 43 records with availability_status "availability_unknown". Open each official_url and sign-up or careers page. Set the honest status: registration_open_work_not_guaranteed, accepting_applications, program_open_check_eligibility, waitlist, temporarily_paused or closed_or_not_open. Fill availability_evidence with what you saw and availability_checked_at with when.
3. The 14 records whose ontario_residents eligibility is "unclear" (Canva Creators, content-moderation category, Contra, Crowd Content, dscout, Fiverr, Freelancer.com, italki, Preply, Respondent, Test IO, TTEC, uTest, Working Solutions). Find the official country list, terms, or payout-country page. Only an opened official page can move a record to "confirmed"; if the page excludes Canada, set not_eligible and move the record out of production.
4. The 20 records whose eligibility is "likely" but has no source that supports it (listed as warnings in VALIDATION_REPORT.md). Find a source that does, or downgrade to unclear.
5. Pay. 39 records carry an advertised_rate and 16 of those have currency "unstated". Open the pay or fee page, fill the currency, and where the page itself states the rate, copy it into verified_rate with the source marked opened_and_reviewed and supports ["pay"]. Never put a worker-reported figure in verified_rate; those go in anecdotal_effective_rate with a basis.
6. Fees and payout for marketplaces (Upwork, Fiverr, Freelancer.com, Contra, Etsy, Rover, Respondent, Prolific, BetaTesting): current fee schedule, payout methods available to Canadians, minimum payout, hold periods.
7. The 8 waitlist records (AI task platforms and Rev, Cambly): find an official statement about onboarding or queues if one exists; keep the worker reports labelled as anecdotes.
8. A negative-evidence pass for any record that lacks a worker_anecdote or independent_reporting source: search "<name> Canada", "<name> no work", "<name> payment", "<name> scam", with dates.
9. Discovery, only after 1–8: Service Canada temporary roles, Ontario Parks and ski-hill seasonal postings, Maru Voice Canada, bank and airline remote support with a 2026 posting, Dribbble, the Canada Media Fund, paid study pools at Ottawa and York. Same standard as everything else; a candidate that fails goes in with disposition "rejected" and a reason.

Rules that do not bend:
- Every source you add carries access_status "opened_and_reviewed" only if you actually loaded the page. A snippet is "search_result_only". Keep the five access states honest.
- A source lists only the claims it genuinely supports in supports[].
- Do not invent URLs, pay, acceptance rates, deadlines, quotes or dates. Unknown stays unknown or null.
- A registration page is not available work. A careers page is not a vacancy. A program's existence is not the user's eligibility.
- last_researched_at and availability_checked_at change only on records you actually worked on, to the real time you worked on them.
- Leave confidence as it is; it is recomputed by the build script from the evidence fields.
- Keep ids stable. Keep the schema exactly (same enums; catalogue.schema.json is authoritative). Do not add fields.
- Category records (work_category, service_business) keep availability_status "not_applicable_category" and no application URL.

Deliverables (as downloadable files, valid JSON, no commentary inside the JSON):
1. catalogue.v2.json, the whole dataset with your changes, schema_version "2.0.0", a new generated_at, and the summary counts recomputed from the records.
2. revalidation_changes.json: an array of { "id", "fields_changed": ["availability_status", …], "before": {…}, "after": {…}, "new_sources": [urls], "note" } for every record you touched, plus any new or rejected candidates.
3. A short written report: how many records you opened pages for, what moved from unknown to a definite status, what moved to confirmed, what you rejected and why, and what you still could not settle.
The repository's validator will be run on your output; if it fails, you will get the error list back.
```

---

## 2. Lovable: build the app on the test data

```
Build "Opportunity Engine": a calm, mobile-first web app that helps a person find realistic ways to earn or move toward better work, using the attached catalogue.v2.json (98 records) and catalogue.schema.json. This is TEST DATA from a research pass that could not open most web pages: show its uncertainty, never hide it, and label the app "test data" in the footer.

Read catalogue.schema.json for every field and enum. The contract in short:
- record_type says what kind of thing a record is (employer, specific_job, task_platform, freelance_marketplace, service_business, research_participation, training_program, funded_employment_program, government_support, work_category). category says the field of work. Never let a work_category or service_business look like a job: no apply button, an amber "kind of work to investigate" chip, and show its how_to_find_work text.
- availability_status is separate from region_eligibility. availability_unknown is the normal state in this data (43 of 98); show it as "Not checked yet" with last_researched_at, not as a warning.
- Every source has access_status; show "could not be opened" when it is search_result_only. Show confidence as evidence strength ("Evidence: thin / moderate / strong"), never as a match score.
- audience_restriction lists groups a route is only open to. Show it as "Only for: …" and never ask the user whether they belong to such a group.
- economics: advertised_rate is what a page says, verified_rate is confirmed from the page, anecdotal_effective_rate is worker-reported (label it so). Currency "unstated" is shown as "currency not stated", never assumed.

Screens:
1. Intro. One headline, one line that there is no account and answers stay on the device, "Start" and "Just show me everything".
2. Questions, one per screen, every one skippable with "Not sure / skip", Back keeps answers, progress bar.
   The FIRST question is location: "Where do you live?" with three answers: "Ontario" / "Elsewhere in Canada" / "Outside Canada". It is a hard filter applied before anything else:
   - Ontario: show all 98 records.
   - Elsewhere in Canada: hide records whose region_eligibility.provinces is non-empty and does not include the user's province (we only model Ontario, so hide every record with provinces ["ON"]). Show a note on those hidden: "Ontario-only".
   - Outside Canada: this catalogue was researched for Canada, so hide anything tied to Canada: every record with record_type employer, specific_job, government_support, funded_employment_program or training_program; every record with non-empty region_eligibility.provinces; every record whose audience_restriction or eligibility_notes mention Canada or a province. Keep task platforms, freelance marketplaces, service businesses, research participation and work categories, and show a persistent banner on them: "Researched for Canada. Eligibility in your country was not checked; confirm on the official site." Record these hidden counts and show "Why N routes are hidden" with the reason.
   Then ask, in this order: hours per week (under 10 / 10–20 / 20–30 / 30+); when you can work (day, evening, night, weekend; multi); how you prefer to deal with people (mostly text / live calls or video are fine / mostly on my own / a mix); phone or voice calls specifically (fine / prefer not / rule them out), only if the previous answer was not "live is fine"; what would help most (first earnings soon / steady income / flexible side income / a longer-term route / just exploring; multi); computer comfort today (3 levels); how these kinds of work feel (writing, detail checking, numbers, troubleshooting, helping customers, creative, second language; each: like it / would learn / prefer not / not sure); open to training before earning (yes / a little / not now); what you have access to (computer, reliable internet, headset, quiet space, webcam, smartphone, none of these; multi); firm no's (unpaid tests, fees or commission, disturbing content, contractor status, going in person; multi); pay floor (none / ~$18 / ~$22 / ~$28 per hour) and whether it is firm; 18 or older (yes / no, optional).
   Skipped answers are neutral. Never treat "not sure" as a negative.
3. Explore. Apply hard filters, then rank, then show one card at a time with swipe AND four visible buttons: Pass / Details / Save / Like (keyboard ← → S D), with Undo. Under the deck, a collapsed "Why N routes are hidden" list with a plain-language reason per record.
   Hard filters (hide with a reason): location rule above; work_conditions.phone_or_video_required "yes" when calls are ruled out; work_location onsite/hybrid when "going in person" is a firm no; economics.unpaid_work non-empty when unpaid tests are a firm no; economics.fees non-empty or costs.upfront_cost moderate/high when fees are a firm no; work_conditions.emotional_content_risk "yes" when disturbing content is a firm no; relationship_type contractor/platform/freelance/participant when the user wants employee status; requirements.equipment containing "computer" when the user has no computer; requirements.minimum_age ≥ 18 when the user is under 18; hours_min_weekly above the user's band; a firm pay floor when advertised_rate or verified_rate in CAD or USD tops out below it (convert USD at 1.37; never filter on unknown pay); availability_status closed_or_not_open.
   Ranking: a weighted score from these comparisons, each in -1..1, with unanswered questions contributing 0: interaction (text_based_work, real_time_interaction, independent_work, phone_or_video_required vs preferences) weight 3; skills (skill_demands ≥ 2 vs "like it" +, "prefer not" −, "would learn" small +; computer demand vs comfort) weight 3; goals ("first earnings soon" vs time_to_first_payment and horizon "now"; "steady" vs income_predictability and work_guaranteed; "flexible" vs schedule_type flexible/task_based; "longer-term" vs horizon career and progression_potential) weight 3; time windows overlap weight 2; evidence (evidence_quality, confidence, waitlist or unknown availability slightly down) weight 2; training_required vs openness weight 1; pay vs soft floor weight 1; equipment gaps weight 1. Tie-break by fewer risks, then id. Show words only: "Strong fit" ≥ 0.45, "Good fit" ≥ 0.25, "Possible fit" ≥ 0.05, else "Long shot"; "Not enough answers yet" when fewer than two preference comparisons applied. Never show a percentage.
   Card: fit chip, record_type chip, availability chip (from availability_status, with a short label), name, organization, summary, four facts (pay from economics with its currency and whether advertised/anecdotal, relationship_type, work_location, schedule_type), two "why it might fit" lines from the comparisons, two "watch out for" lines from risks and who_it_may_not_fit, "Only for: …" when audience_restriction is set.
4. Details (modal or page): what_you_do, who_it_may_fit, who_it_may_not_fit, a "Still uncertain" list built from open_questions, contradictions, availability_unknown, eligibility "unclear"/"likely", missing pay and unstated currency; the terms (economics, costs, requirements, work_conditions, time_to_first_payment); eligibility (region_eligibility with provinces and notes); one primary external link (application_or_registration_url, else official_url, else the first source labelled "best source found, not an official site"), opening in a new tab with rel="noopener noreferrer" and an external marker; the evidence list (each source: source_type, title linked, publisher, accessed_at, and "could not be opened" when access_status is not opened_and_reviewed); and a research handoff: a read-only textarea with a prompt that includes the record name, official_url, the user's non-sensitive answers (location, hours, interaction, goals, pay floor only) and asks an assistant to check current eligibility for the user's country, availability, pay, fees, worker reports and red flags with dated primary sources and to say "unknown" rather than guess; a "Copy prompt" button with a select-the-text fallback, and a separate "Open Gemini" link to https://gemini.google.com/app.
5. My three: a best fit (never a work_category or government_support when a concrete route exists), a second from a different category and record_type, a third with a different horizon or category; audience-restricted records only if the user liked or saved them; stale records never. Each with why it fits, watch out for, still uncertain, a "compared with the best fit" line, Details and the primary link. If fewer than three remain, say why. If none, say nothing fits every limit, show the hidden list, offer "Edit answers"; never loosen a limit silently.
6. Saved: liked, saved, passed with "Put back"; "Clear likes, saves and passes"; "Clear everything".
7. About: how matching works (hard limits first, ranked on fit, words not percentages, unanswered is neutral), what each availability_status and evidence_quality means, a "this is test data" note with the dataset's generated_at and research_scope.limitations, and a privacy note.

Rules: all state in localStorage wrapped in try/catch; no accounts, no analytics, no identifying questions; keyboard accessible with visible focus; semantic controls; prefers-reduced-motion respected; no horizontal scroll at 390px; light and dark; negatives shown with the same weight as positives; no streaks, urgency or promises of income. Load the catalogue from a bundled JSON file for now, behind one data-access module so it can later point at an API URL instead.
```
