# Opportunity Engine (boop-remote)

**Find work that fits. Not another job board.** A low-pressure tool that asks about how a person likes to work, filters out routes that can't work for them, ranks the rest on fit, and leaves them with three realistic next steps. Each step comes with its trade-offs and its evidence, including what couldn't be verified.

Canada-first (Ontario where relevant). No accounts, no tracking. Answers stay in the browser.

> **Status (2026-10-13):** working prototype with a 77-record researched catalogue. The research environment could not open web pages, so **every record rests on search-engine summaries of its sources, and no record claims a confirmed open application.** Read `CATALOGUE_AUDIT.md` before relying on any listing.

## Run it

It is a static site: plain HTML, CSS and ES modules, with no build step and no dependencies. It must be served over http, because the catalogue is fetched.

```bash
cd boop-remote
npx http-server -c-1 -p 8080 .     # or: python3 -m http.server 8080
# open http://localhost:8080
```

Once merged, it is also served by the repo's GitHub Pages at `/boop-remote/`.

## What's in it

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `src/app.js` | The UI: intro → questions → swipe deck → details → three-pick shortlist → saved → about |
| `src/questions.js` | The adaptive questionnaire (13 core questions plus 2 follow-ups that only appear when they matter; every one can be skipped) |
| `src/engine.js` | Deterministic matching: hard filters → weighted soft scoring → three distinct picks. Weights are in `WEIGHTS`/`CONFIG` |
| `src/schema.js` | Record enums and the validator that encodes the evidence policy |
| `src/prompt.js` | The "investigate this further" research-prompt generator (Copy prompt / Open Gemini) |
| `data/raw/*.json` | Research output, one file per family, plus `safety_sources.json` |
| `data/curation.json` | Editorial overrides (audience restrictions) |
| `data/catalogue.json` | Built, validated catalogue the app loads |
| `research/` | Record format, per-family research ledgers, normalisation log, `ledger.csv` export |
| `scripts/` | `normalize-raw.mjs` → `build-catalogue.mjs` → `audit.mjs`; `check-links.mjs` |
| `test/` | Unit tests (bun) and browser tests (Playwright) |

## Working on it

```bash
cd boop-remote
node scripts/normalize-raw.mjs && node scripts/build-catalogue.mjs   # after editing data/raw or curation
node scripts/audit.mjs            # regenerate CATALOGUE_AUDIT.md
bun test test/                    # 44 unit tests: schema, catalogue rules, engine, prompt
node test/ui.mjs                  # 26 browser checks at mobile and desktop sizes; screenshots in test/screens/
npx eslint src scripts test       # lint
node scripts/check-links.mjs      # needs network; unreachable ≠ fake
```

`build-catalogue.mjs` exits non-zero if any record breaks the schema or the evidence rules. For example, "applications open" without an opened official source fails, as does a category record with an application link.

## Adding or updating a record

1. Follow `research/RECORD_FORMAT.md`. Use unknown or null rather than a guess.
2. Add it to the right `data/raw/<family>.json`, then run normalise → build → audit → tests.
3. To limit a route to a specific group (youth, students, a language community and so on), add it to `data/curation.json` rather than asking users about it.

See `DECISIONS.md` for why things are the way they are, and `RESEARCH_METHODOLOGY.md` for what "verified" means here.
