# Reconciliation notes (Phase D)

Cross-slice fixes applied by the lead after the agents finished. Each is also visible in the record's `disposition_reason`.

- `angus-reid-forum-panel` (research_freelance): the agent recorded this failed candidate as `disposition: new` because the validator then required a `v1_id` on anything non-new. The validator now allows `rejected` without a `v1_id`; the record was set to `rejected`. Its reason and sources are unchanged.
- `clickworker-*` and `comit-*` (ai_data_tech): same case as Angus Reid; set to `rejected`, reasons unchanged.
- `verbit-vitac-*`, `3play-media-*`, `paper-*` (language_writing): same case; set to `rejected`, reasons unchanged.
- `ontario-non-lawyer-notary-commissioner`, `statcan-census-2026-enumerator` (creative_overlooked): same case; set to `rejected` and the parenthetical about the validator removed from the reason.
- `cibc-universal-fraud-agent-remote-regina`, `ntt-data-remote-bilingual-customer-care-canada` (customer_ops): candidates whose postings exclude Ontario were recorded as `new` with `not_eligible_for_ontario`; set to `rejected` so the audit trail reads plainly. Reasons unchanged.
- Validator warning "availability_unknown but availability_checked_at is set" (25 records): the agents did check availability on those records and could establish nothing current; the timestamp records that a check happened. Kept as a warning, not an error.
