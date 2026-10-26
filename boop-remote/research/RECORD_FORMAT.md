# Opportunity record format (for research agents)

Each researched opportunity is ONE JSON object. Files in `data/raw/<family>.json` hold a JSON array of these.
Use exactly these keys. Unknown → use the explicit "unknown" value or null, never a guess.

```jsonc
{
  "id": "kebab-case-stable-slug",                // e.g. "rev-transcription"
  "name": "Freelance transcriptionist",          // what the user would call the route
  "organization": "Rev.com" ,                    // org/platform; for category records use "Various"
  "type": "employment|contract|freelance|task_platform|research_participation|training_pathway|program|category",
  "category": "customer_ops|language_writing|ai_data|tech_digital|research_participation|creative_production|structured_employment|freelance_microbusiness|government_program",
  "tags": ["transcription","text-only"],
  "summary": "One plain-language sentence.",
  "whatYouDo": "2-3 sentences describing the actual day-to-day.",
  "appeal": ["short bullet", "..."],              // why it may appeal
  "watchOuts": ["short bullet", "..."],           // drawbacks – be as specific as the appeal
  "officialUrl": "https://...",                   // official homepage of the org/program (verified by opening it)
  "applyUrl": "https://..." ,                     // direct signup/apply/careers URL ONLY if you opened it; else null
  "geography": {
    "countries": ["CA"],                          // ISO codes the route is evidenced to accept; [] if unknown
    "regions": ["ON"],                            // province limits if any, else []
    "canadaEligibility": "confirmed|likely|unclear|not_eligible",
    "setting": "remote|hybrid|onsite|varies"
  },
  "languages": ["en"],                            // required working languages
  "requirements": {
    "experience": "none|some|significant",
    "credentialRequired": false,                  // true only if a degree/cert/licence is mandatory
    "credentials": ["e.g. secondary school diploma"],
    "equipment": ["computer","headset","quiet space","smartphone","webcam","fast internet"],
    "minAge": 18,                                 // null if unknown
    "assessment": "none|free_test|unpaid_test|paid_test|interview|unknown"
  },
  "schedule": {
    "flexibility": "flexible|shifts|fixed|varies|unknown",
    "windows": ["day","evening","night","weekend"],  // windows the work CAN be done in
    "hoursMinWeekly": null, "hoursMaxWeekly": null   // numbers only if evidenced
  },
  "interaction": {
    "modes": ["text","voice","video","in_person","independent"],
    "realtime": "none|some|high",               // how much live, on-the-spot responsiveness
    "phone": false                              // true if phone/voice calls are a core part
  },
  "skills": {                                     // demand level 0 (not needed) .. 3 (core, high bar)
    "computer": 1, "writing": 0, "numeracy": 0, "detail": 2,
    "customer": 0, "technical": 0, "creative": 0, "language": 0
  },
  "training": { "required": false, "cost": "free|paid_to_you|user_pays|none|unknown", "notes": "" },
  "compensation": {
    "min": null, "max": null,                     // numbers only if a source supports them
    "currency": "CAD|USD|null",
    "unit": "hour|task|minute_audio|study|project|month|year|null",
    "basis": "official|self_reported|aggregator|unknown",
    "notes": "where the number comes from, caveats"
  },
  "reliability": {
    "workVolume": "steady|variable|sporadic|unknown",
    "predictability": "high|medium|low|unknown",
    "notes": "evidence about task supply / hours"
  },
  "workerStatus": "employee|contractor|participant|student|varies|unknown",
  "fees": null,                                   // string describing fees/commission/expenses, or null if none known
  "applicationSteps": ["step", "..."],
  "timeToFirstEarnings": "days|weeks|months|unknown",
  "horizon": "now|bridge|career",                 // now = earn soon; bridge = near-term stepping stone; career = longer route
  "status": "official_info_found|eligibility_confirmed|applications_open_confirmed|registration_open_not_work_guaranteed|waitlist_or_no_work_guarantee|not_currently_open|uncertain|rejected|stale_needs_recheck",
  "legitimacy": "established|likely|unclear",
  "evidenceStrength": "strong|moderate|weak",
  "riskFlags": ["unpaid_assessment","variable_work","contractor_no_benefits","fees","account_deactivation_reports","emotional_content","payment_delay_reports","waitlist","scam_impersonation","phone_heavy","equipment_cost"],
  "fitsIf": "One sentence: who this suits.",
  "notFitIf": "One sentence: who this does not suit.",
  "lastChecked": "2026-10-13",
  "sources": [
    {
      "url": "https://...",
      "title": "Page title",
      "type": "official|government|independent_review|forum|journalism|aggregator",
      "publisher": "Rev",
      "published": null,                         // ISO date if shown
      "accessed": "2026-10-13",
      "claims": ["canada_eligibility","pay","status","requirements","worker_status","reliability","legitimacy","risk","schedule"],
      "notes": "Short paraphrase of what this source says (no long quotes).",
      "accessible": true                         // false if blocked / 403 / login wall
    }
  ]
}
```

## Status definitions (be strict)
- `applications_open_confirmed` – an OFFICIAL page opened today shows an open application/posting for this route. Requires an `official` source with `status` in claims.
- `registration_open_not_work_guaranteed` – you can sign up (official page) but the platform does not guarantee work/tasks.
- `waitlist_or_no_work_guarantee` – waitlist, closed in some regions, or evidence of long waits for any work.
- `eligibility_confirmed` – official source confirms Canadians can take part; current opening not confirmed.
- `official_info_found` – official info exists; neither eligibility for Canada nor openings confirmed.
- `not_currently_open` – officially closed/paused.
- `uncertain` – conflicting or thin evidence.
- `rejected` – researched and found unsuitable (scam signals, closed to Canada, pay-to-work). Still record it with reasons in watchOuts – the app hides rejected records from recommendations.
- `stale_needs_recheck` – info older than ~6 months or source inaccessible.

Rules: a generic careers page ≠ a specific opening. A Reddit post ≠ current hiring. A registration page ≠ available work.
Category records (`type: "category"`) describe a kind of work to investigate, set organization "Various", applyUrl null, and should cite at least one source (e.g. Job Bank occupation page, government guidance) describing the work.
Forum/review sources are anecdotes: say so in notes and date them if possible.
