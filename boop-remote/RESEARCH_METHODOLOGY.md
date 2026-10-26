# Research methodology

How the opportunity catalogue was researched, what the evidence standards are, and what “verified” does and does not mean.

## 1. Scope

- **Geography:** Canada-first, with Ontario-specific programs where relevant. Every record carries `countries`, `regions` and `canadaEligibility`, so other regions can be added later. Nothing was checked for countries outside Canada, and the app tells users this.
- **Families researched** (one research agent each, run in parallel on 2026-10-13):
  1. Customer and business operations (remote contact-centre employers, chat and email support, virtual assistance, moderation)
  2. Language, writing and audio (transcription, tutoring, editing, localisation, interpreting, speech data)
  3. AI data evaluation and software QA (AI rating and training platforms, crowd testing, accessibility testing)
  4. Paid research participation and freelance marketplaces (study panels, UX research, Upwork and similar)
  5. Canadian and Ontario structured employment, programs and training (Job Bank, Employment Ontario, apprenticeships, public-service routes, staffing agencies, libraries)
- **A second pass** later the same day added two more agents to fill gaps the first pass couldn't reach before its search budget ran out:
  6. Creative and production work (social media, video and podcast editing, film and TV production assistants, stock contributing, design marketplaces, metadata editing, heritage student jobs)
  7. Operations and small business (virtual assistance, appointment setting, ecommerce operations, small-business digital help, spreadsheet cleanup, the Shopify Partner Program, Digital Main Street)
- **Beyond the obvious categories**, research turned up and kept: a Toronto accessibility-testing company that pays assistive-technology users, Statistics Canada data-collection clerks, CRA seasonal contact-centre work, election workers, Indigenous-language phone interpreting, Canadian French speech-data tasks, university paid-study pools, staffing-agency temp placements, free library e-learning, and pre-apprenticeship training.

## 2. Source hierarchy

Strongest first. A claim is only as strong as its best source.

1. **Official employer or platform pages:** careers pages, postings, FAQs, payment and contractor terms.
2. **Government and public-interest pages:** canada.ca, ontario.ca, Job Bank, the Canadian Anti-Fraud Centre, the Competition Bureau.
3. **Primary program documentation:** colleges, nonprofits, training providers.
4. **Independent worker experience:** Reddit, Glassdoor, Indeed, Trustpilot. These are treated as anecdote: dated where possible, never as proof of anything current.
5. **Journalism and investigations:** especially on pay, task supply, lawsuits and scams.
6. **Aggregators and search engines:** used to discover things, then traced back to a primary source where possible.

Negative signals were searched for as deliberately as positive ones: "not paid", "no tasks", "waitlist", "deactivated", "unpaid assessment", "closed to Canada", "fees", "scam", "impersonation".

## 3. What actually happened (limitations, read this)

- **No web page could be opened.** Every attempt failed with a DNS error, and direct downloads were refused by the environment's network policy. Agents could only use a web *search* tool, which returns summaries and excerpts of pages.
- **The search budget ran out.** The five agents shared about 200 searches, roughly 33 to 45 each, and some planned searches never ran. The gaps are listed in `CATALOGUE_AUDIT.md` and the per-family ledgers.
- **A job-board connector worked** for two agents. They read a handful of full Indeed postings (11 citations), and those are the only sources marked `accessible: true`.
- **The consequences, applied by `scripts/normalize-raw.mjs` and logged in `research/normalization_log.md`:**
  - Every source seen only through a search summary is marked `accessible: false`.
  - No record may claim `applications_open_confirmed`, and none does.
  - `canadaEligibility: "confirmed"` was downgraded to `"likely"` (25 records), and status `eligibility_confirmed` to `official_info_found` (16 records), because confirmation needs an opened official page.
  - Application links were cleared unless the page itself was opened (7 cleared). The URLs stay in each record's sources for re-checking.
  - Pay published without a currency is stored as `"unstated"` (8 records). We never assume USD, even for US-based platforms.
  - Evidence strength is at most `moderate`.
- **The link checker** (`scripts/check-links.mjs`) could not reach any of the 457 URLs from this environment (all `ENOTFOUND`). This tells us nothing about the sites themselves; it must be re-run with network access.

In short, the catalogue is a carefully sourced first draft. Every URL appeared word-for-word in search results (agents were told never to construct URLs), and every claim cites where it came from. None of it has been checked against the live page, and there has been no human review yet.

## 4. Evidence standards

Every record carries:
- `sources[]`, each with URL, title, type, publisher, published date where shown, accessed date, the claims it supports, a short paraphrased note, and whether it was opened.
- `status`, `legitimacy` and `evidenceStrength`, judged separately. **A legitimate company is not the same as a good opportunity for this person.**
- `lastChecked`. Records older than 180 days are treated as stale: demoted, flagged, and kept off the shortlist.
- Pay with its `basis` (official, self-reported, aggregator or unknown), kept apart from how reliable the work is (`workVolume`, `predictability`).

Writing rules: short paraphrases rather than long quotes; anecdotes labelled as anecdotes; unknown recorded as unknown.

## 5. What each status means

| Status | Meaning | Evidence needed |
|---|---|---|
| `applications_open_confirmed` | An open application or posting for this route was seen on an official page | An **opened** official or government source supporting `status`, enforced by the schema |
| `registration_open_not_work_guaranteed` | You can sign up, but the platform doesn't promise work | Official sign-up page |
| `eligibility_confirmed` | Canadians can take part; current openings not checked | An **opened** official source on eligibility |
| `official_info_found` | Official information exists; eligibility or openings are not confirmed | Official source, possibly seen via search summary |
| `waitlist_or_no_work_guarantee` | Waitlist, or credible reports of little or no work after joining | Official waitlist notice, or dated worker reports |
| `uncertain` | Thin or conflicting evidence | — |
| `not_currently_open` | Officially closed or paused | Official source |
| `rejected` | Researched and judged unsuitable (closed to Canada, poor effective earnings, scam signals) | Reason recorded in watch-outs |
| `stale_needs_recheck` | Information is old or the source is gone | — |

What is not evidence:
- A registration page is not proof that work is available.
- A generic careers page is not proof of a specific opening.
- A Reddit post is not proof that anything is current.
- A record with `type: "category"` describes a kind of work. It is never shown as an employer or opening, and the schema forbids it an application link or a confirmed status.

## 6. Inclusion rules

- **Included:** routes with a credible official presence and some plausible access for people in Canada, even when the evidence is incomplete. Uncertainty is shown rather than hidden.
- **Rejected but kept, so the reasoning isn't lost:**
  - BELAY, which is limited to US residents.
  - Leger LEO survey panel. It is legitimate, but no evidence supports a worthwhile effective hourly rate.
- **Dropped** (listed in the ledgers): TELUS customer service (conflicting postings), Teleperformance, Amazon virtual CS (no Canadian posting, plus look-alike scam pages), Boldly, Time Etc, Arise, OneForma, RWS TrainAI, Invisible, Testbirds, Scribie, Verbit, TransPerfect, and some university pools.
- **Look-alike and scam domains** spotted during research, such as fake "Apple Home Advisor Canada" and "Amazon work at home" pages, were deliberately not recorded. Impersonation risk is noted in the relevant records.

## 7. Re-verification (next run with network access)

1. Run `node scripts/check-links.mjs`.
2. For each record, open the official URL and the application page, then update `accessible`, `status`, `applyUrl`, pay currency and `lastChecked`.
3. Work through the "Open questions" sections of `research/ledger_*.md`.
4. Re-run normalise, build, audit and tests.
5. Get a human review of anything rated higher-risk: AI task platforms, moderation, and routes with fees.

---

# v2: the Ontario revalidation (2026-10-13)

The v1 catalogue above was treated as a starting point, not a source of truth. Every v1 record was re-researched individually, new candidates were held to the same standard, and the result is a new dataset (`data/v2/catalogue.v2.json`) with its own contract (`data/v2/SCHEMA.md`). `data/catalogue.json` is unchanged.

## Search strategy
- **Perspective:** a person living in Ontario, Canada. Canadian eligibility is a hard requirement for the production dataset; Ontario-only programs are labelled as such in `region_eligibility.provinces`.
- **Per record, in order:** (a) does it exist and is the official URL its real site; (b) can an Ontario resident take part; (c) is it open, accepting, waitlisted, paused or closed right now; (d) pay, fees, unpaid steps, payout terms; (e) negative evidence (`"[name]" Canada`, `"no work"`, `"payment"`, `scam`, `waitlist`, `deactivated`, r/WorkOnline, r/beermoney and platform-specific subreddits, Trustpilot, Glassdoor and Indeed reviews, journalism).
- **Discovery:** each research slice also searched for routes the catalogue lacked (banks/telcos hiring remote agents, captioning employers, Ontario university study pools, youth and disability employment programs, seasonal and unusual-schedule work, microbusiness and creator routes), judged by the same rules.
- **Six parallel agents**, one per slice, with a shared web-search budget of about 200 queries for the run (roughly 32 each), plus an Indeed job-board connector for current Canadian postings.

## Source hierarchy
1. Official employer careers pages and postings · 2. official platform documentation and terms · 3. government sites (canada.ca, ontario.ca, jobbank.gc.ca) and program documentation · 4. university and research-institution pages · 5. official payment, fee and contractor documentation · 6. worker reports and credible reporting, as corroboration only.

## Source integrity
Every source carries `access_status`: `opened_and_reviewed` (the page was read), `search_result_only` (a search-engine summary or snippet), `access_blocked`, `not_found`, `not_checked`. **In this run no web page could be opened** (DNS resolution fails for every host from the research environment, and direct downloads are refused by the egress policy). The only `opened_and_reviewed` sources are job postings read in full through the Indeed connector (`source_type: job_board`). A source lists only the claims it genuinely supports (`supports[]`).

## Evidence rules
- `strong`: central claims directly supported by current authoritative sources that were opened, with eligibility and status checked. Unreachable this run except where an opened posting covers both eligibility and availability.
- `moderate`: credible authoritative evidence, with at least one important detail unverified.
- `weak`: limited, indirect, stale or mostly anecdotal evidence.
- `insufficient`: not enough to include; the record stays in the audit trail only.
- `confidence` (0–1) is computed by `scripts/v2/build.mjs` from these fields by the rubric in `data/v2/SCHEMA.md`; nobody types it in.
- Pay: `advertised_rate` (what a page says) is separate from `verified_rate` (opened official document only; none this run) and `anecdotal_effective_rate` (worker-reported, with its basis). Maximum advertised earnings are never presented as typical.

## Date policy
- `last_researched_at` is the UTC time the record was actually worked on in this run. Records are never bulk-dated.
- `availability_checked_at` is set only when availability was checked on that record, and must be accompanied by `availability_evidence`.
- `accessed_at` on a source is when that source was seen.

## Status definitions
See the `availability_status` table in `data/v2/SCHEMA.md`. In short: `open_specific_opportunity` and `accepting_applications` need an opened authoritative source; a sign-up page is `registration_open_work_not_guaranteed`; a running program is `program_open_check_eligibility`; `availability_unknown` is the honest default; categories are `not_applicable_category`.

## Inclusion and exclusion
- **Keep** a credible identity with a useful path forward, relevant Canadian eligibility, and enough evidence to describe its limits.
- **Update** stale URLs, statuses, eligibility, economics and risk notes where evidence supports it (`disposition: updated`).
- **Downgrade** a legitimate entity whose availability, earnings or eligibility is unverified (`downgraded`).
- **Reject** what is closed to Ontario residents, misleading, unsupported, unsafe or not useful (`rejected`, kept in the audit trail with the reason).
- **Merge** records that lead to the same destination (`merged`, with `merged_into`), keeping distinct pathways apart.
- **Categories** (`work_category`) and sellable services (`service_business`) are directions, not destinations: they carry `how_to_find_work`, no application link, and `not_applicable_category`.

## Limitations of this run
- No web page opened; evidence is what search engines showed of the cited pages. Treat every `search_result_only` claim as needing a re-check once page access works.
- Search budget capped depth per record and breadth of discovery.
- No human review yet.
- Province-level modelling is Ontario-first; other provinces appear only where a restriction was found.
