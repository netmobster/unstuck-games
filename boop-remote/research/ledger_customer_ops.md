# Research ledger: customer_ops (customer & business operations, remote employers hiring in Canada)

Date: 2026-10-13. Output: `data/raw/customer_ops.json` (12 records).

## Tool conditions (read first)
- **WebFetch failed for every domain** (DNS `ENOTFOUND`: jobs.apple.com, apple.com, canada.ca, jobs.concentrix.com, en.wikipedia.org). **curl was also blocked**: the egress proxy refused CONNECT to www.canada.ca (organization policy). So **no web page was opened directly**.
- **WebSearch worked** until the shared per-turn budget (200 calls across all agents) ran out after about 33 of my queries. Several planned searches never ran (see Open questions).
- **Indeed MCP connector** worked (job API). I used it for 9 calls: 5 job searches and 4 full job-detail reads (Carter's, MCI, Red Rover, Zirtual).
- **Consequences:**
  - All web sources are marked `accessible: false`, and their notes say "Search-summary only". The content comes from search-engine summaries of pages on official domains, and each URL appeared word for word in those results.
  - Indeed postings that I read in full are marked `accessible: true`.
  - No record uses `applications_open_confirmed`, because that status needs an official page opened today.
  - evidenceStrength is at most `moderate`.
  - Every record should be re-checked by fetching the pages once network access allows.

## Queries run (WebSearch unless noted)
1. Apple At Home Advisor Canada job; At Home Advisor AppleCare Canada (apple domains)
2. Concentrix work at home Canada; Concentrix Canada WAH (concentrix domains); Concentrix Canada remote CA-req; Concentrix recruitment scam
3. CRA seasonal call centre agent WFH 2026; CRA call centre job poster telework seasonal (canada.ca)
4. TELUS Digital WFH Canada careers (general and official domains); TELUS Digital bilingual CSR Canada; TELUS Digital recruitment fraud; TELUS "Internet Safety Evaluator" Canada
5. Amazon virtual CS Canada (amazon domains, twice); Amazon WFH CS Canada reddit
6. Intuit TurboTax seasonal Canada; Intuit "Customer Success/Product Expert" Canada; Intuit seasonal tax expert reviews
7. TTEC WFH Canada (ttec domains); TTEC chat rep Canada pay; TTEC Canada reviews (headset/monitoring)
8. Foundever Canada WAH (foundever domains); Foundever reviews
9. Teleperformance Canada WFH (tp domains)
10. Shopify Support Advisor Canada; Shopify Merchant Support Advisor salary; Shopify support layoffs/outsourcing
11. BELAY Canada eligibility; Boldly Canada eligibility; Time Etc Canada eligibility
12. Job Bank NOC 64409 call centre CSR wages (jobbank.gc.ca)
13. Content moderator remote Canada (TELUS/Accenture/TP)
14. Canadian Anti-Fraud Centre job scams / impersonation
15. Working Solutions Canada eligibility; Working Solutions reviews/fees; Working Solutions FAQ pay
16. Arise Virtual Solutions Canada fees
17. Indeed MCP: "work from home customer service advisor", "Concentrix work at home", "Apple At Home Advisor" (0 results), "virtual assistant", "content moderator" (0 results), "chat support agent" (all remote, CA)
18. Two final searches were refused by the budget limit: Working Solutions Canadian postings, and Job Bank administrative/virtual assistant.

## Candidates dropped or rejected (and why)
- **TELUS / TELUS Digital customer service (dropped as a standalone record).** The evidence was thin and conflicted:
  - The Canada careers page lists a remote bilingual CSR, but job counts differ between pages (2, 4 and 6).
  - The detailed posting (Req_00122223) sits under a "MoroccoCareers" path, says "temporary" in one place and "full time" in another, and asks for health-insurance experience.
  - TELUS-branded scam reports exist: telusjobs.ca is not TELUS, and fake interviews run over GroupMe or Telegram.
  - TELUS Digital's evaluator role is covered inside the content-moderation category record instead.
  - Recheck: jobs.telusdigital.com/search/jobs/in/country/canada and telus.com/en/about/careers/contact-centre (the at-home agent program).
- **Teleperformance (TP) Canada (dropped).** Only marketing and career pages turned up. The WFH filter page was about 585 days old. There was no pay, hours or specific opening. The pages say training is provided and no experience is needed.
- **Amazon virtual customer service Canada (dropped).**
  - No Canadian virtual CSA posting was found. Amazon's virtual-locations page lists Toronto and Montreal only with "partial remote potential".
  - The virtual postings found are US-state-restricted or Philippines-based (they name PLDT and Globe as ISPs).
  - Many look-alike "Amazon Virtual Customer Service Rep (Work At Home)" pages appear on unrelated shop and blog domains. This is a scam or SEO-spam signal; those URLs were not recorded.
- **Boldly (dropped).** Postings are US W2 roles needing 7+ years of experience. A 2020 third-party blog mentioned Canada, but nothing current confirms it.
- **Time Etc (dropped).** The official page asks for 5 to 8 years of experience. Canadian eligibility is not stated; one 2026 review says some of its assistants are Canadian. Worth rechecking at timeetc.com/freelance-with-us.
- **Arise Virtual Solutions (dropped).** No evidence was found on Canadian eligibility or fees. Arise's model is known to involve business setup and certification costs, but I could not source that today. A paid third-party course about "partnering with Arise" appeared and is a red flag.
- **Red Rover (Real Estate Executive VA), not recorded.** It is a niche role: it needs real-estate admin experience in Canada, pays $25/hr as an independent contractor, is limited to ON/AB/SK, and runs Mon–Fri 9 to 5 (Indeed, 2026-08-13). It is a possible example for a future virtual-assistant category record.
- **BELAY: recorded as `rejected`.** The official jobs page accepts US residents only.
- **Apple At Home Advisor: recorded as `not_currently_open`.**
  - Unofficial pages on `*.dedyn.io` dynamic-DNS domains advertise "Apple Home Advisor Canada" jobs. These URLs were deliberately not recorded.

## Notes on specific records
- **Working Solutions pay:** The official rate is per productive minute. I converted it to an hourly equivalent (x60) and left currency null because it was not stated. A reviewer reports unpaid training time, which conflicts with the official "free certification". Both are noted.
- **Shopify pay:** This is an Indeed aggregator estimate, not an official figure. The `employee` worker status is inferred from "fixed-term contract with benefits".
- **CRA:** Pay and remote details come from 2022 releases and are stale. The hiring cadence comes from Dec 2025 journalism (about 1,700 hires). Current telework rules are unconfirmed.
- **Concentrix:** Its Canadian remote postings are about 910 days old, and current Canadian listings are hybrid or on-site, so it is marked `stale_needs_recheck`. A Glassdoor interview review mentioning a home-office check (Ottawa, June 2025) was seen in a summary but could not be tied to a specific URL, so I left it out.
- **Zirtual:** The only source is an employer-written posting read through Indeed (2026-07-15). It says "US or Canada residents only". The official site was not verified, so the record is `uncertain` with weak evidence.

## Open questions / follow-ups
- Re-fetch every official URL to confirm postings are live. Several records (TTEC, Foundever, Shopify, Intuit) could likely be upgraded to `applications_open_confirmed`.
- Find a Job Bank occupation page for administrative / virtual assistant work (NOC 13110) to support a "Virtual assistant (category)" record. I didn't do this because the search budget ran out.
- Not researched for lack of search budget: **appointment setting**, **ecommerce order processing**, and remote CS at Canadian banks, telcos and airlines.
- TTEC: get the full list of eligible provinces and pay for chat-only roles.
- Working Solutions: which provinces are accepted, and whether Canadian programs pay in CAD or USD.
- Intuit: does the 2027 season posting keep the same pay and RepID requirements? (Postings usually appear in the fall.)
- CRA: are there fall-2026 postings for contact-centre agents, and do they allow telework?
- Content moderation: details on TELUS Digital's "Internet Safety Evaluator - English (Canada)" (pay, assessment, residency rules). Also look for any Canadian trust & safety employers that hire remotely.
