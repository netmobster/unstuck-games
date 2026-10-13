# Research ledger: creative and production work

- **Family:** creative_production
- **Researched on:** 2026-10-13
- **Output:** `data/raw/creative_production.json` contains 9 records. `validateCatalogue` returns `[]`, and no ids collide with other raw files.
- **Records:**
  - 3 category records: social media coordinator; video, audio and podcast editing; film and TV production assistant.
  - 6 specific routes: Shutterstock, Adobe Stock, 99designs, Canva Creators, Simply.TV metadata editor, Young Canada Works (heritage).
- **Status breakdown:** all 9 are `official_info_found`.
  - No record could reach `registration_open_not_work_guaranteed`, `eligibility_confirmed` or `applications_open_confirmed`, because no page could be opened.

## Tool conditions (read first)

- **WebFetch was tried once** on `https://www.jobbank.gc.ca/marketreport/summary-occupation/5332/ca`. It failed with `getaddrinfo ENOTFOUND www.jobbank.gc.ca`, the same DNS failure seen in earlier runs. No further fetches were attempted, as instructed.
- **WebSearch worked.** 46 queries were run.
  - All evidence comes from result titles, URLs and the search tool's summaries of indexed content.
- **Consequences:**
  - Every source is `"accessible": false`.
  - Every `applyUrl` is `null`.
  - `canadaEligibility` is never `"confirmed"`. It is `"likely"` for 8 records and `"unclear"` for Canva.
  - `evidenceStrength` is at most `moderate`.
  - `officialUrl` values are official-domain URLs that appeared word for word in search results. None were "verified by opening".
- **URL rule:** every URL in the file appeared verbatim in a search result. None were constructed.
- **Unpinned claims:** some search summaries mixed several pages. Where a claim could not be pinned to one page, the source note says "not pinned".
- **Currency:** stock and Canva amounts without a stated currency are described in notes only. No numeric compensation was entered for them, so no currency was assumed.
  - Numeric pay is used only for these records, each with a stated currency:
    - Job Bank categories, in CAD
    - Simply.TV, at CAD 20/h as stated in the posting

## Queries run (WebSearch, standard mode)

1. Job Bank Canada social media manager NOC 11202 wages
2. Job Bank Canada social media coordinator NOC 11202 summary outlook self-employed
3. Job Bank Canada graphic designer NOC 52120 wages outlook self-employed
4. Job Bank Canada video editor wages NOC
5. Shutterstock contributor earnings per download 2026 Canada payout minimum
6. Adobe Stock contributor royalty 33% payout minimum PayPal Skrill tax Canada
7. reddit stock photography contributor earnings dropping Shutterstock Adobe Stock not worth it 2025
8. Adobe Stock contributor royalties percentage (domain-limited: helpx.adobe.com, adobe.com, contributor.stock.adobe.com)
9. Shutterstock contributor sign up requirements 18 government ID countries (domain-limited: submit.shutterstock.com etc.)
10. Shutterstock contributor earnings structure levels 15% to 40% reset January
11. 3Play Media freelance transcription captioning contractor eligibility US residents only Canada
12. Amara on Demand paid subtitler captioner join linguist pay countries
13. 3Play Media transcription editor contractor pay per media minute reddit work availability
14. 99designs by Vista designer join contests entry level designer fee platform fee designer levels
15. 99designs designers complaints spec work contests low win rate reddit
16. 99designs become a designer apply portfolio review designer fees (domain-limited: 99designs.com, support.99designs.com)
17. Young Canada Works heritage organizations both official languages 2026-2027 students apply wage
18. Ontario Creates film television production assistant training program entry level trainee 2026
19. Young Canada Works students eligibility age 16 30 citizen PR heritage (domain-limited: canada.ca)
20. City of Toronto screen industry youth training program production assistant 2025 2026 paid
21. Creative BC Reel Opportunities / film crew training BC entry level PA program 2026
22. 3Play Media freelance contractor "United States" residency requirement
23. Job Bank Canada production assistant film television wages NOC 52119 / 55109
24. Job Bank Canada podcast producer / podcast editor / sound editor wages
25. 99designs designers countries Hyperwallet payout Canada
26. Adobe Stock contributor sales dropped AI generated flood complaints forum 2025 2026
27. Canva Creators program apply template designer royalties requirements portfolio countries
28. Job Bank graphic designers and illustrators Ontario outlook 2025-2027 self-employed (domain-limited: jobbank.gc.ca)
29. Digital Main Street Digital Service Squad hiring 2026 Ontario
30. Canva Creator earnings reddit royalties low application rejected
31. "Digital Service Squad" member 2026 position description hourly wage
32. Job Bank audio and video recording technicians NOC 52113 (domain-limited: jobbank.gc.ca, noc.esdc.gc.ca)
33. Shutterstock contributor reddit account suspended payments withheld complaints 2025 2026
34. Reel Canada Reel Opportunities film TV crew training youth eligibility cities 2026
35. Canadian Anti-Fraud Centre job scam paid to like social media posts task scam warning
36. Job Bank production assistant film NOC 53111 outlook requirements (domain-limited: jobbank.gc.ca)
37. Canadian contributor Shutterstock W-8BEN tax treaty withholding Canada
38. remote metadata tagger video content tagging freelance job Canada entry level cataloguing
39. Adobe Stock contributor sign-up age 18 countries Adobe ID (domain-limited: helpx.adobe.com, contributor.stock.adobe.com)
40. Canva Creators program template creator monthly earnings 2025 royalty pool payout
41. Simply TV data editor freelance Canada metadata TV listings remote
42. Young Canada Works students summer jobs museums wages 2026 job postings portal heritage
43. Simply.TV reviews Glassdoor data editor contractor pay hours
44. Simply.TV metadata provider careers (domain-limited: simply.tv, workable)
45. film production assistant Toronto day rate long hours non-union Canada
46. 99designs designers 2025 2026 fewer contests Vista changes complaints

### Negative-signal searches

- Queries 7, 13, 15, 26, 30, 33, 35, 43, 45 and 46 searched specifically for negative signals.
- No Reddit threads surfaced in any of them. Negative evidence instead came from:
  - Adobe Community forum threads
  - Trustpilot
  - Fstoppers, Amateur Photographer, TechCrunch
  - an AAAI academic study
  - a contributor blog
  - CAFC-derived scam warnings
- All of these are labelled as anecdote or journalism in the source notes.

## Rejected / dropped candidates

- **Rev captions:** already recorded (`rev-transcription-captioning` in language_writing). Skipped.
- **3Play Media (captioning/transcription contractor):** dropped. Reasons:
  - Current postings (Live Voice Writer; French audio describer) are tagged "Hiring Remotely in U.S.". Even the French audio-describer role that asks for Canadian French expertise is tagged US.
  - Older posts (2021–2022) say "hiring nationwide", meaning the US.
  - No source states whether Canadians can contract.
  - Applicants must pass a series of proficiency tests.
  - Pay of about $0.55–$1.20 per media minute comes only from Glassdoor-based summaries.
  - Fails the brief's "only if entry-level and Canada-eligible" test.
  - Worth rechecking with page access.
- **Verbit:** not re-researched. The language_writing ledger had already dropped it as legal-transcription, not entry level, with Canada unclear.
- **Amara (Amara On Demand):** dropped. Search found only customer-facing descriptions; there was no recruitment process, linguist application, rate card or country information.
- **Dribbble:** not researched because of the time and budget priority given to better-evidenced routes. Not recorded.
- **Canada Media Fund:** not researched in depth. It funds productions and producers rather than offering individual entry-level earning routes, so it was a poor fit for this catalogue.
- **Ontario Creates trainee program:** no current (2026) Ontario Creates entry-level trainee or PA program was found. Related evidence is folded into the film/TV PA category record:
  - City of Toronto and POV PA training (2019–2021)
  - Northern Ontario crew training
  - Reel Canada
- **Creative BC / North Island College / INFilm PA training:** only 2021–2023 cohorts were found; nothing confirmed for 2026. Mentioned in general terms in the PA category record only.
- **Podcast production support:** no Job Bank podcast-specific occupation page was found. It is folded into the video/audio editing category record, citing:
  - NOC 52113
  - a Podnews posting
  - a Scotiabank posting that requires 5+ years of experience
- **Graphic design category record:** Job Bank NOC 52120 data was gathered, but it went into the 99designs record (outlook, self-employment share, wages) to keep category records at three. Job Bank data:
  - national $20.00 / $31.25 / $52.88 per hour (updated November 2025)
  - Ontario outlook Very limited for 2025–2027
  - 34% self-employed
  - A standalone `graphic-design-category` record could be added later from the same sources.
- **Digital asset tagging / metadata cataloguing (generic):**
  - The generic category was not recorded.
  - The one concrete Canada-open route found (Simply.TV) was recorded instead.
  - Other leads were rejected:
    - Toloka "Video AI Data Associate": belongs to the ai_data family.
    - LAC Group metadata specialist: 2021 posting, MLIS-level.
    - Harbor "Remote Tagger": US-tagged.
    - Crawford Media cataloguer: 2017.
    - arenaflex "YouTube data entry": looked unreliable.
- **Digital Main Street, Digital Service Squad (Ontario):**
  - Not recorded here, because it is a small-business digital-adoption role, which fits tech_digital or customer_ops better.
  - Leads:
    - A 2026 position description PDF exists at digitalmainstreet.ca.
    - The City of Brampton says its squad contract ended 30 June 2025, pending provincial funding clarity.
  - Suggested lead for the family that covers small-business digital help.
- **Stock-site alternatives (Pond5, Dreamstime, 500px):** not researched. They were mentioned only in passing as places where contributors moved after Shutterstock's 2020 cut.

## Judgement calls to review

- **Canada eligibility:**
  - Shutterstock, Adobe Stock and 99designs are marked `likely`, inferred from global sign-up and payouts:
    - treaty-country tax handling (Shutterstock)
    - PayPal available globally (Adobe)
    - worldwide designer base with Hyperwallet country selection (99designs)
  - No source names Canada for these three; each record says so.
  - Canva is `unclear` because creator-country rules were not found and element applications are paused.
- **Simply.TV:**
  - `countries: ["CA"]`, because the record describes the Canada-located posting. The company hires in many other countries at much lower rates.
  - `legitimacy: likely` and `evidenceStrength: weak`, because there are no independent worker reviews and a recent board snapshot did not show a Canada data-editor opening.
- **Young Canada Works:**
  - The heritage organizations student stream is placed under creative_production as a Canadian arts/culture/heritage entry route. Canadian Heritage runs it, so it could equally sit under government_program.
  - Compensation numbers are left null, because the only figure ($18.25/h) is one employer's.
- **PA category:**
  - Uses Job Bank 'Production Assistant' wages last updated November 2023.
  - The Playback day-rate article is undated and probably old; it is cited only as a caveat.
- **Stock and Canva compensation:** numbers left null (basis `unknown`). Per-download amounts vary by buyer plan and aren't a meaningful unit for the engine. Details are in the notes.

## Open questions / recheck when page access works

1. Open every official URL. Possible upgrades:
   - Shutterstock, Adobe Stock, 99designs and Canva could move to `registration_open_not_work_guaranteed`.
   - YCW could move to `eligibility_confirmed`.
2. Shutterstock:
   - current level thresholds
   - minimum payout amount
   - which countries face the 90-day first-payment wait
3. Adobe Stock: the Canada withholding rate under the US treaty, and the current payout threshold.
4. 99designs:
   - whether the fee pages are current
   - whether Hyperwallet supports Canadian bank payouts
   - contest payout share to winners
5. Canva: creator-eligible countries, the current status of the template program (beta or open), and the payout threshold.
6. Simply.TV:
   - whether a Canada data-editor posting is open now
   - contract length and real hours
   - whether the assessment applies to Canada roles
7. YCW:
   - 2026–27 funding level after the CMA's funding-cliff warning
   - typical posting window for summer 2027
8. 3Play Media: whether Canadian residents can contract. If yes, add a record.
9. Re-run Job Bank pages for updated wages. The NOC 52113 videotape editor and production assistant pages showed November 2023 data.
