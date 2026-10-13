# Reconciliation notes (Phase D)

Cross-slice fixes applied by the lead after the agents finished. Each is also visible in the record's `disposition_reason`.

- `angus-reid-forum-panel` (research_freelance): the agent recorded this failed candidate as `disposition: new` because the validator then required a `v1_id` on anything non-new. The validator now allows `rejected` without a `v1_id`; the record was set to `rejected`. Its reason and sources are unchanged.
