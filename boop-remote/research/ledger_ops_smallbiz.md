# Research ledger: ops_smallbiz (gap-filling: VA/admin, appointment setting, ecommerce ops, small-business digital help, spreadsheet clean-up, Digital Main Street)

Date: 2026-10-13. Output: `data/raw/ops_smallbiz.json` (7 records, all `official_info_found`). It passes `validateCatalogue` (prints `[]`), and none of its ids duplicate an existing raw file.

## Tool conditions (read first)
- **WebFetch failed on the one attempt**: `https://digitalmainstreet.ca/` returned `getaddrinfo ENOTFOUND`. In line with the brief, I made no further fetch attempts, so **no web page was opened directly**.
- **WebSearch worked** for all 30 queries below; no budget refusal was hit.
- **The Indeed MCP connector worked** (13 calls: 8 searches, 7 full job-detail reads, country CA, location "remote"). I read 7 postings in full, and those are the only sources marked `accessible: true`. They are aggregator postings, not official employer pages.
- **Consequences:**
  - Every web source is `accessible: false`, and its notes say "Search-summary only".
  - `applyUrl` is null everywhere.
  - No `confirmed` eligibility, no `eligibility_confirmed`, and no `applications_open_confirmed`.
  - Evidence strength is at most `moderate`.
  - Every URL appeared word for word in search or connector results; none was constructed.
- **Where search summaries blended pages**, the source notes say so: the ontario.ca DMS figures, the Job Bank VA outlook wording, and the BDC June 2026 study. Re-check the attribution when pages can be opened.

## Queries run
WebSearch unless noted.
1. Digital Main Street Digital Service Squad 2026
2. "Digital Service Squad" member position description 2026 wage/hours/eligibility (no relevant results)
3. Digital Main Street Ontario 2026 program funding / DSS grant intake
4. "Digital Service Squad" hiring 2026 BIA Ontario job
5. "Digital Service Squad" job posting wage per hour contract Ontario
6. Digital Main Street Ontario funding announcement 2025 2026 news
7. Canada Digital Adoption Program status 2026
8. CDAP closed new applications (ised)
9. Job Bank administrative assistant NOC 13110 wages (jobbank.gc.ca)
10. Job Bank data entry clerk NOC 14111 wages/prospects (jobbank.gc.ca)
11. Data entry job scam Canada fake cheque CAFC
12. Reshipping / "quality control" package job scam Canada (results were US/general only)
13. CAFC task-based job scam / product optimization crypto 2025
14. Remote appointment setter jobs Canada commission
15. Job Bank appointment/scheduling clerk wages (jobbank.gc.ca)
16. "appointment setter" Job Bank wages occupation (no Job Bank occupation profile found)
17. CRTC Unsolicited Telecommunications Rules / National DNCL obligations
18. Job Bank e-commerce coordinator / order processing clerk wages (jobbank.gc.ca)
19. Remote ecommerce operations assistant (orders/returns/listings) Canada 2026
20. Shopify Partner Program free / revenue share / Canada
21. Ontario Digital Main Street demand (website, GBP, social)
22. Statistics Canada small-business web presence / e-commerce adoption
23. BDC digital adoption studies (bdc.ca, canada.ca, ised, ontario.ca)
24. Indeed MCP: "appointment setter", "ecommerce coordinator order processing" (0 results), "virtual assistant" part-time (0 results), "ecommerce assistant", "virtual assistant", "data entry", "bank contact centre advisor work from home" (0 results), "Shopify product listing", "Amazon Seller Central"
25. Indeed MCP details: Property Print, TopTier Cleaning Agency, Kazmir Consulting Group, Red Rover, Medole, Tsb Communications, Express Employment Professionals
26. "virtual assistant" job scam Canada fake cheque police
27. CRA GST/HST registration threshold (canada.ca)
28. DSS 2026 Toronto posting details (digitalmainstreet.ca)
29. DSS 2025/2026 city launches
30. WestJet / Air Canada work-from-home contact centre 2026
31. Shopify Partner payouts / Canada (shopify domains)
32. Shopify Partner Directory requirements
33. Upwork data entry / Excel expert rate pages (upwork.com)
34. Job Bank admin assistant outlook 2025–2027 / virtual assistants (jobbank.gc.ca)
35. Job Bank "virtual assistants … multiple clients" (jobbank.gc.ca)
36. Data Input Clerk NOC 14111 Ontario outlook 2025–2027 (jobbank.gc.ca)
37. news.ontario.ca / ontario.ca Digital Main Street (ontario.ca)

## Records written
| id | type | status | key evidence |
|---|---|---|---|
| virtual-assistant-admin-support-category | category | official_info_found | Job Bank NOC 13110 wages and outlook (VA wording); Indeed: Medole $19–23/hr part-time, Red Rover $25/hr contractor; York U and CP24 scam evidence; CRA GST/HST |
| remote-appointment-setting-category | category | official_info_found | CRTC telemarketing rules; Indeed: Property Print (must reside in Canada, salaried), TopTier (temporary), Kazmir ($50 per lead, no base) |
| ecommerce-operations-support-category | category | official_info_found | Job Bank e-commerce coordinator wages; Indeed: Medole, Tsb ($25/hr hybrid), Express ($70–90k, in person); offshore $400–550 USD/month listing; reshipping and crypto task-scam evidence |
| shopify-partner-program-freelance | freelance | official_info_found | Shopify partner page (free, 20% revenue share); help-centre payout page (Canadian partner CAD example); conflicting USD FAQ; directory tier limits |
| small-business-digital-help-category | category | official_info_found | ontario.ca DMS reports and strategy (40% no website); DMS Toronto squad services (website, GBP, social); StatCan 2021; BDC 2026; CDAP closure (BDC, The Logic); Brampton notice |
| spreadsheet-data-cleanup-freelancing-category | category | official_info_found | Job Bank NOC 14111 wages, Ontario outlook "Limited", AI/OCR automation; Upwork rate pages; York U data-entry scam alert; CAFC/FCNB |
| digital-main-street-digital-service-squad | contract | official_info_found | 2026 DMS position PDF (hybrid Toronto, closed May 29 2026); 2020 PDF (TABIA contract, 35 h/week); Ontario (1,600+ students and grads hired by 2021); Brampton (funding uncertain, contract ended 2025-06-30) |

## Judgement calls
- **Digital Service Squad status.** I chose `official_info_found` rather than `not_currently_open`. The only evidence of closure is a closing date (May 29, 2026) on the 2026 PDF, and I saw that only through a search summary. Nothing official says the program has ended. The watch-outs state plainly that no current opening was confirmed. The category is `government_program` because the role is publicly funded and the jobs are short contracts.
- **Appointment-setting pay.** I left it null. The structures (salary per year, mislabelled hourly, per-lead) cannot be expressed as one range without misleading. TopTier's "$20.00–$22.00 per year" is recorded as shown, with a note that it is apparently hourly.
- **Ecommerce pay.** I used $19–$25/hr CAD, employer-stated in two Indeed postings, with basis `official`, following the convention of earlier records for employer-stated pay seen on Indeed. I did not use Job Bank's e-commerce sales coordinator median ($35.58/hr) as the range. It is a professional marketing occupation, and using it would overstate pay for order processing.
- **Spreadsheet pay** is Upwork's own marketing figures with currency `unstated`, and basis `aggregator` because they are aggregated platform data.
- **The Shopify Partner Program** is recorded as a route, not an opening: Shopify supplies no work. Its `countries: ["CA"]` rests only on the help centre's Canadian-partner payout example.

## Candidates dropped or not recorded (and why)
- **Remote customer service at a Canadian bank, telco or airline (optional item): dropped.** 2026 Air Canada postings found were on-site (Saint John $17.75/hr unionized; Vancouver). WestJet's home-based Moncton program dates from 2016, and WestJet consolidated its contact centres to Calgary in 2020. An Indeed search for remote bank contact-centre roles in CA returned 0 results. TELUS was already dropped by the customer_ops agent.
- **Look-alike or SEO-spam pages: deliberately not recorded.** Pages about "Remote Air Canada call centre jobs" are hosted on unrelated domains (`zabbix.monitoring.qredits.adwise.nl`, `partnerwithscphealth-jitsi.bluetext.com`). This matches the impersonation pattern noted in earlier ledgers.
- **Individual appointment-setter employers (Property Print, TopTier, Kazmir): not given their own records.** Each is a single small-company posting that will go stale quickly and has no verified official site, so each would have to be `uncertain`. They serve as evidence inside the category record instead. Kazmir is per-lead only, with no base pay.
- **Red Rover real-estate executive VA: not given its own record** (also flagged by customer_ops). It is a niche role needing Canadian real-estate admin experience and limited to ON, AB and SK. It is used as an example in the VA category.
- **Medole, Tsb Communications and Express (London, ON): not given their own records.** These are single postings used as category evidence. Tsb is hybrid in Vancouver, and the Express role is in person.
- **Lifestyle Home Products bilingual lead setter, Clash Nexus AI, Defiant Media, Savant (SDR): not read.** Indeed search listings only; there were no pay details and the call budget was kept for other work.
- **CDAP as an earning route: rejected.** It was a business-side grant that closed to new advisor-grant applications in February 2024 (BDC, The Logic, GlobeNewswire). It is mentioned only as context for falling subsidised demand.
- **Digital Main Street Digital Transformation Grant: not recorded.** It is a grant for businesses, not a way for individuals to earn.
- **Alberta Digital Service Squad postings (albertacf.com, 2021–2022): not recorded.** They are old, and no current Alberta program was found.
- **Jooble appointment-setter salary estimate (~$34.73/hr, ~$69,736/yr): rejected as unreliable.** It is far above every posting seen.
- **Softhouse.ai "B2B Sales Appointment Setter (Commission-Based)" on SimplyHired and Workopolis: not used.** The summary gave a $35,500–$50,000 salary while the title says commission-based, and I could not tell which URL held which claim.
- **Job Bank "personnel scheduling clerk" wages: not used.** The pages conflict on NOC (14402 vs 14100), and the occupation is staff-shift scheduling rather than client appointment setting.
- **A "Toronto man lost $2,800 to a VA cheque scam" example: not cited.** It appeared in a summary but could not be tied to a specific URL.
- **A "CREATE MEDIA: no earnings until first closed deal" listing: not cited** for the same reason.
- **A vendor-blog claim that Shopify paid partners $1.3B in 2025: not used.** It is unverified and secondhand.

## Open questions (for the next run with network access)
1. Open the DSS 2026 PDF and https://digitalmainstreet.ca/careers/: pay, contract length, eligibility (student or graduate?), and whether a fall or winter 2026 round exists.
2. Is Ontario's Digital Main Street grants program (DSS Grant, Digital Transformation Grant) funded for 2026–27? Check news.ontario.ca and the OBIAA/TABIA pages. Brampton's notice and the third-party listings conflict.
3. Shopify Partner payouts: CAD or USD for Canadian partners (the help pages conflict)? What are the current directory tier rules (Plus vs Select)?
4. Confirm the source page for each blended claim: the ontario.ca DMS figures (17,600 businesses, 1,600+ students, 87 squads), the BDC 96% figure (June 2026 study URL), and the Job Bank "virtual assistants support multiple clients" wording.
5. Upwork rate pages: confirm the currency (likely USD, but not shown).
6. Is there a Job Bank occupation profile that covers appointment setters or telemarketers (NOC 2021 code)? None was found.
7. Are there remote order-processing or returns employee roles in Canada? None truly remote at entry level was found. Try Job Bank's remote filter.
8. CDAP: is the $2,400 "Grow Your Business Online" stream fully closed? The Logic (2024) said it continued at the time.
9. Re-run `scripts/check-links.mjs` on all URLs in this file.
