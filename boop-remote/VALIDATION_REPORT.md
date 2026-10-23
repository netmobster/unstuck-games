# Validation report

Produced by `node scripts/v2/validate.mjs --report` on 2026-10-13T15:51:30.315Z against `data/v2/catalogue.v2.json`. Every line below is a check that actually ran.

| Check | Result |
|---|---|
| JSON parses with `JSON.parse` | pass |
| Structural validation against `catalogue.schema.json` (built-in interpreter: type, enum, const, required, additionalProperties, items, pattern, min/max) | pass |
| Unique record ids | pass |
| Required fields and controlled vocabularies | pass |
| URL and date formats | pass |
| Confidence within 0..1 | pass |
| Status claims backed by cited evidence (semantic rules) | pass |
| Eligibility "confirmed" backed by opened official sources | pass |
| Categories carry no application URL and use not_applicable_category | pass |
| Every record has an explicit disposition and production_eligible | pass (required by schema) |
| Rejected / merged records absent from production | pass |
| Duplicate boilerplate research notes | 0 warning(s) |
| Summary count: total_records | pass |
| Summary count: record_type_counts | pass |
| Summary count: availability_status_counts | pass |
| Summary count: evidence_quality_counts | pass |
| Summary count: category_counts | pass |
| Summary count: verified_records | pass |
| Summary count: records_with_unverified_availability | pass |

**Totals:** 98 records, 0 error(s), 45 warning(s).


## Warnings

- adobe-stock-contributor: canadian_residents "likely" without a source supporting eligibility
- adobe-stock-contributor: ontario_residents "likely" without a source supporting eligibility
- alignerr-ai-trainer: availability_unknown but availability_checked_at is set
- app-based-delivery-courier-category: canadian_residents "likely" without a source supporting eligibility
- cnib-access-labs-accessibility-tester: availability_unknown but availability_checked_at is set
- code-for-canada-grit-user-tester: availability_unknown but availability_checked_at is set
- concentrix-canada-customer-service: availability_unknown but availability_checked_at is set
- cra-contact-centre-agent-seasonal: availability_unknown but availability_checked_at is set
- crowd-content-freelance-writer: availability_unknown but availability_checked_at is set
- film-tv-production-assistant-category: canadian_residents "likely" without a source supporting eligibility
- habitat-learn-captioner-note-taker: availability_unknown but availability_checked_at is set
- italki-language-tutor: availability_unknown but availability_checked_at is set
- job-bank-canada: canadian_residents "likely" without a source supporting eligibility
- kelly-remote-interpreter-paid-training-ontario: availability_unknown but availability_checked_at is set
- languageline-indigenous-language-interpreter-canada: availability_unknown but availability_checked_at is set
- mcmaster-research-participant-pool: canadian_residents "likely" without a source supporting eligibility
- mercor-ai-expert-evaluator: availability_unknown but availability_checked_at is set
- npower-canada-junior-it-analyst: availability_unknown but availability_checked_at is set
- opportunities-fund-persons-with-disabilities: availability_unknown but availability_checked_at is set
- preply-online-tutor: availability_unknown but availability_checked_at is set
- public-service-student-new-grad-programs: canadian_residents "likely" without a source supporting eligibility
- scribbr-academic-editor: availability_unknown but availability_checked_at is set
- shopify-merchant-support-advisor-canada: availability_unknown but availability_checked_at is set
- shopify-partner-program-freelance: canadian_residents "likely" without a source supporting eligibility
- shopify-partner-program-freelance: ontario_residents "likely" without a source supporting eligibility
- small-business-digital-help-category: canadian_residents "likely" without a source supporting eligibility
- social-media-coordinator-category: canadian_residents "likely" without a source supporting eligibility
- spreadsheet-data-cleanup-freelancing-category: canadian_residents "likely" without a source supporting eligibility
- staffing-agency-temp-placements: canadian_residents "likely" without a source supporting eligibility
- statcan-data-collection-clerk: availability_unknown but availability_checked_at is set
- telus-digital-ai-community-rater: availability_unknown but availability_checked_at is set
- telus-digital-ai-community-rater: canadian_residents "likely" without a source supporting eligibility
- telus-digital-ai-community-rater: ontario_residents "likely" without a source supporting eligibility
- testlio-freelance-tester: availability_unknown but availability_checked_at is set
- toronto-public-library-career-coaches-in-residence: availability_unknown but availability_checked_at is set
- transcribeme-transcription: availability_unknown but availability_checked_at is set
- ttec-work-from-home-customer-service-canada: availability_unknown but availability_checked_at is set
- uoft-paid-research-pools: canadian_residents "likely" without a source supporting eligibility
- video-audio-podcast-editing-category: canadian_residents "likely" without a source supporting eligibility
- waterloo-community-research-participants: canadian_residents "likely" without a source supporting eligibility
- welo-data-search-quality-rater-canada: availability_unknown but availability_checked_at is set
- welocalize-freelance-linguist: availability_unknown but availability_checked_at is set
- western-ourbrainscan-registry: canadian_residents "likely" without a source supporting eligibility
- working-solutions-on-demand-agent: availability_unknown but availability_checked_at is set
- young-canada-works-heritage-students: canadian_residents "likely" without a source supporting eligibility
