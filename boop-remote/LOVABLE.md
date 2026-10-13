# Building the front end in Lovable

This repo is the **data layer** for Opportunity Engine: the researched catalogue, the questionnaire, the matching rules and the research-prompt generator. The UI in `index.html` is a working reference, but the front end can be rebuilt in Lovable (or anything else) on top of what's here. This page says how.

## What the data layer gives you

| Need | Where | Notes |
|---|---|---|
| Every opportunity, full | `api/catalogue.json` | 77 records + 6 safety sources. Also `api/opportunities/{id}.json` for one |
| List view | `api/opportunities.json` | Slim rows with `recommendable: true/false` |
| Labels and counts | `api/meta.json` | Human labels for every enum, category and status, plus the matching weights |
| The questionnaire | `api/questions.json` | 15 questions as data, including the `when` conditions |
| Record shape | `api/schema.json`, `types/index.d.ts` | JSON Schema and TypeScript types |
| Scam-safety tips | `api/safety.json` | Official Canadian sources with short tips |
| Matching | `src/engine.js`, `src/questions.js`, `src/prompt.js`, `src/schema.js` | Dependency-free ES modules, typed by `types/index.d.ts` |
| A database | `supabase/schema.sql`, `supabase/seed.sql` | Postgres DDL with RLS (public read) and an idempotent seed |

Once this branch is merged and deployed, the JSON is served at **`https://unstuck-games.com/boop-remote/api/`** with `Access-Control-Allow-Origin: *`, so a Lovable app on its own domain can fetch it directly. Until then, use the files from the repo.

## Three ways to wire it up

**A. Fetch the static JSON (simplest).** No database. On load, fetch `meta.json`, `questions.json` and `catalogue.json`; run matching in the browser. The whole catalogue is about 570 KB (most of it source notes), which is fine to load once; `opportunities.json` is a tenth of that if you only need a list.

**B. Supabase (Lovable's native choice).** In the Supabase SQL editor run `supabase/schema.sql`, then `supabase/seed.sql`. You get:
- `opportunities` (scalar columns for filtering, jsonb for the nested groups, and `record` holding the full original object)
- `sources` (one row per citation), `safety_sources`
- the view `opportunities_live` (nothing rejected or closed)
- RLS enabled with public `select` only. Load data with the service role, never from the client.

Query `select record from opportunities_live` and pass the `record` objects straight to `match()`. Re-running `seed.sql` after a catalogue update upserts.

**C. Copy the engine in.** Copy `src/engine.js`, `src/questions.js`, `src/prompt.js` and `src/schema.js` into the Lovable project (for example `src/lib/opportunity-engine/`) along with `types/index.d.ts` renamed to sit beside them. They have no imports outside each other and no DOM access. In TypeScript:

```ts
import { match, pickThree, uncertainties, contrast } from '@/lib/opportunity-engine/engine';
import { QUESTIONS, visibleQuestions, emptyProfile, conditionHolds } from '@/lib/opportunity-engine/questions';
import { buildPrompt, GEMINI_URL } from '@/lib/opportunity-engine/prompt';
import type { Opportunity, Profile, Match, Pick } from '@/lib/opportunity-engine';

const today = new Date().toISOString().slice(0, 10);
const { ranked, excluded } = match(records, profile, today);   // excluded[].reason is user-facing text
const three: Pick[] = pickThree(ranked, { liked, passed });      // ids the person liked/saved and passed
const prompt = buildPrompt(three[0].rec, profile, today);       // for "Copy prompt"
```

Use A or B for data and C for matching. Do not re-implement the matching rules in the front end; they're tested here (`test/engine.test.js`), and the weights are documented in `DECISIONS.md` §7.

## The contract, in short

- **Unknown is neutral.** A skipped question is `null` (`{}` for the strengths matrix). The engine never treats it as a negative. A multi-select with nothing ticked is `null`, not `[]`; `[]` means the person chose "None of these".
- **Hard filters come with reasons.** `excluded[].reason` is plain language. Show it: "Why N routes are hidden".
- **Labels, not percentages.** `match.label` is one of "Strong fit", "Good fit", "Possible fit", "Long shot" or "Not enough answers yet". Never display `score`.
- **Three picks with roles.** `pickThree` returns `role` (best / alternative / stretch / flexible) and `title`. `contrast(pick, best)` gives the "compared with the best fit" sentence.
- **Category records are not jobs.** `type === 'category'` means a kind of work. Show it with a distinct chip, never an "apply" button; link to its first source instead.
- **Audience-restricted records** (`audience` non-empty) must be labelled "Only for: …" and only enter the shortlist if liked or saved. The engine already does the second part. Never ask users whether they belong to such a group.
- **Stale** (`match.stale`) is shown, demoted and kept out of the three.
- **Every record carries evidence.** Show `sources` with `type`, `accessed` and whether it could be opened (`accessible`). Show `status` with the label from `meta.enums.statuses` and `lastChecked`.
- **Pay** may be `null` (not published), may be `currency: 'unstated'`, and has a `basis` (official / self-reported / aggregator). Show all three facts.
- **Outbound links**: `applyUrl` if set, else `officialUrl`, else the first source (label it as not an official site). New tab, `rel="noopener noreferrer"`, marked as external.
- **Research handoff**: "Copy prompt" and "Open Gemini" (`https://gemini.google.com/app`) are separate actions. Don't rely on URL prefill.
- **No accounts, no identifying data.** Keep profile and swipes in `localStorage`. Nothing about health, diagnosis, exact age or immigration status is asked.

## A build prompt for Lovable

Paste this after adding the data layer (option A or B, plus C).

> Build "Opportunity Engine", a mobile-first web app that helps people in Canada find realistic ways to earn. It is not a job board and not a quiz that assigns a persona. Tone: calm, honest, low-pressure. No streaks, no urgency, no percentages, no promises of income.
>
> Data: use the Opportunity Engine data layer already in the project (the `opportunities` records, `questions.json`, `meta.json`, and the matching functions in `src/lib/opportunity-engine`). Do not invent opportunities and do not change the matching rules.
>
> Screens:
> 1. **Intro**: one headline, a short explanation that there is no account and answers stay on the device, "Start" and "Just show me everything".
> 2. **Questions**: render `questions.json` one question at a time with a progress bar. Kinds: `single` (radios), `multi` (checkboxes; an option with `exclusive: true` clears the others), `matrix` (one row per `rows[]`, each with the `options` plus a "Not sure" choice). Only show a question when `conditionHolds(question.when, profile)` is true. Every question has "Not sure / skip" and "Back"; Back keeps answers. Store answers in a `Profile` object (null when skipped).
> 3. **Explore**: call `match(records, profile, today)`. Show `ranked` as a swipeable card deck, one card at a time, with visible buttons Pass / Details / Save / Like and keyboard arrows. Each card: fit label chip, type chip (category records get an amber "Kind of work to investigate" chip), status chip, name, organization, summary, four facts (pay, worker status, where, hours), two "why it might fit" lines from `why` (fall back to `appeal`), two "watch out for" lines from `cautions` + `watchOuts`. Offer Undo. Below the deck, a collapsed "Why N routes are hidden" list from `excluded` with each `reason`. If `ranked` is empty, say nothing fits every limit, show the hidden list, and offer "Edit answers". Never loosen limits silently.
> 4. **Details** (modal or page): summary, what you'd do, why it fits, watch-outs, "Still uncertain" from `uncertainties(rec, today, profile)`, the terms (pay with currency and basis, work volume and predictability, fees, schedule, interaction, eligibility, requirements, equipment, training, time to first pay), application steps, one primary external link (applyUrl, else officialUrl, else first source labelled "Best source found (not an official site)"), the evidence list (each source: type, title as a link, publisher, accessed date, and "could not be opened" when `accessible` is false), and a research section with a read-only textarea containing `buildPrompt(rec, profile, today)`, a "Copy prompt" button (with a select-the-text fallback if the clipboard API fails) and a separate "Open Gemini" link to https://gemini.google.com/app. If `audience` is non-empty show a notice "Only open to: …". If `type` is `category` show "This is a kind of work to investigate, not a specific employer or job opening."
> 5. **My three**: `pickThree(ranked, { liked, passed })` where liked = ids liked or saved, passed = ids passed. For each pick: role title, chips, name, organization, summary, `contrast(pick, best)`, three columns (why it fits, watch out for, still uncertain), buttons "Details" and the primary external link. If fewer than three, say why. If none, say so and offer "Edit answers".
> 6. **Saved**: lists liked, saved and passed with "Put back", plus "Clear likes, saves and passes" and "Clear everything".
> 7. **About**: how matching works (hard limits first, then ranked on fit, words not percentages, unanswered = neutral), the status definitions from `meta.enums.statuses`, scam-safety tips from `safety.json` with their source links, and a privacy note.
>
> Rules: all state in localStorage, wrapped in try/catch. Keyboard accessible with visible focus, semantic controls, `prefers-reduced-motion` respected, no horizontal scroll at 390px. External links open in a new tab with `rel="noopener noreferrer"` and an external-link marker. Show negatives with the same prominence as positives. Light and dark themes.

## Keeping the data fresh

Edit `data/raw/*.json` (format in `research/RECORD_FORMAT.md`), then:

```bash
cd boop-remote && npm run data      # normalise → validate → api/ → supabase/ → audit
bun test test/                      # includes api/ and SQL consistency checks
bash scripts/check-sql.sh           # loads the SQL into a scratch Postgres (needs psql)
```

Commit `api/` and `supabase/` with the data change; they're generated but served as-is. For Supabase, re-run the new `seed.sql`.

## Caveats that carry over to any front end

The catalogue has not been verified against live pages (see `RESEARCH_METHODOLOGY.md` §3). The front end must keep showing `status`, `lastChecked`, the evidence list and the "still uncertain" notes, so that uncertainty reaches the person rather than being smoothed over.
