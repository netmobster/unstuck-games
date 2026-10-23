# Revalidation guide (for research agents)

You are revalidating records of the Opportunity Engine catalogue for a person living in **Ontario, Canada**, and discovering routes the catalogue missed. Read `SCHEMA.md` in this folder first; it defines every field and value.

## Tooling reality (check it yourself once)
- `WebFetch` has failed with a DNS error on every host in this environment. Try it once on your first official URL. If it fails, every web source you cite is `access_status: "search_result_only"`. Never mark a page `opened_and_reviewed` because a search engine showed a snippet of it.
- `WebSearch` works. The budget is shared across all agents (roughly 200 queries per run in total, so about 30–35 for you). Combine queries: `"Platform name" Canada` covers eligibility and often availability; one negative-evidence query per record (`"Platform" "no work"` / `scam` / `"payment"`) is the minimum.
- The Indeed connector (`mcp__Indeed__search_jobs`, `get_job_details`, `get_company_data`; load via ToolSearch `select:mcp__Indeed__search_jobs,mcp__Indeed__get_job_details`) returns full postings. A posting you read through it is `opened_and_reviewed` with `source_type: "job_board"`, and can support `availability` for a `specific_job` or an `employer`. Use it for employers and programs that post jobs.

## For each record in your slice
1. Read the baseline record (`data/v2/baseline/<family>.json`). It is a mechanical mapping from v1, nothing in it is verified, and `disposition` is `"pending"`.
2. Research the central claims in this order: (a) does it exist and is `official_url` its real site, (b) can an Ontario resident take part, (c) is it open / accepting / waitlisted / closed right now, (d) pay, fees, unpaid steps, (e) negative evidence.
3. Rewrite the record: correct every field the evidence changes, set `unknown`/`null` where it doesn't say, and keep the v1 wording only where it still holds. Keep records short; no repeated boilerplate across records.
4. Replace the migrated sources with what you actually used (keep a v1 source only if you re-saw it). Every source: honest `access_status`, `accessed_at` = now (ISO-8601, UTC), `supports` = only what it really supports, a one-line `evidence_summary`, `limitations`.
5. Set `availability_status` conservatively. `availability_checked_at` only if you checked availability on this record (then also fill `availability_evidence`).
6. Set `evidence_quality` by what the sources establish (`strong` is impossible without opened sources; `moderate` needs an official/government/job_board source; `weak` otherwise; `insufficient` if you'd not include it).
7. Set `disposition`:
   - `retained` nothing material changed (rare: you still re-researched it; list `claims_verified`)
   - `updated` fields corrected or enriched (list `migration.changes`)
   - `downgraded` legitimate but availability/eligibility/pay unverified or worse than v1 claimed
   - `merged` into another id (`migration.merged_into`; keep the record, it stays in the audit trail)
   - `rejected` closed to Ontario, misleading, unsupported, unsafe, or not useful (`disposition_reason` says why; keep the record)
   Fill `disposition_reason`, `migration.claims_verified`, `migration.unresolved_claims`, `open_questions`, `contradictions`.
8. `last_researched_at` = the timestamp you actually did the work (`date -u +%FT%TZ`).
9. Leave `confidence: 0` and `production_eligible: false`; the builder computes them.

## Discovering new records
Search beyond names already in the catalogue (grep `"id"` across `data/v2/baseline/*.json` and other agents' reviewed files to avoid duplicates). A new candidate meets the **same** standard: real entity, Ontario access evidenced or honestly `unclear`, conservative status, sources with honest access, negative-evidence check. `disposition: "new"`, `migration.v1_id: null`. If a candidate fails, you may still include it with `disposition: "rejected"` and the reason, so the audit trail shows it was considered.

## Writing rules
- Do not invent URLs, pay, acceptance rates, deadlines, dates or quotes. A URL goes in only if it appeared verbatim in a result you saw.
- `advertised_rate` is what a page says; never fill `verified_rate` (no page was opened). Worker figures go in `anecdotal_effective_rate` with a `basis`.
- A registration page is not available work. A careers page is not a vacancy. A Reddit post is not current.
- Categories (`work_category`) and `service_business` use `availability_status: "not_applicable_category"`, no application URL, and a concrete `how_to_find_work`.
- `audience_restriction` lists groups the route is only open to; never speculate about who the user is.
- Use the enums exactly. Validate before finishing:

```bash
cd /home/user/unstuck-games/boop-remote && node scripts/v2/validate.mjs data/v2/reviewed/<family>.json --records
```
Fix until it prints `0 error(s)`. Warnings are fine if they're true.

## Output
- `data/v2/reviewed/<family>.json`: a JSON array of every record from your slice (whatever its disposition) plus your new ones.
- `research/v2/ledger_<family>.md`: queries run (numbered), tool conditions, per-record one-line verdicts, dropped candidates and why, open questions.
