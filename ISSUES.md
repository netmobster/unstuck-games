# Issues — Unstuck Games

Known problems, grouped by the release they must be fixed in. A row stays here until it is fixed
and says how; a fixed row moves to **Closed** with its commit. Ideas go in `IDEAS.md`, decided work in
`TASKS.md`. IDs are `<game>-<version>-<n>` and are never reused.

Status: **Open** · **In progress** · **Fixed** (with commit) · **Won't fix** (with why).

## Seren 1.5

| ID | Area | Issue | Found | Evidence | Blocks | Status |
|---|---|---|---|---|---|---|
| SRN-1.5-01 | Model | **Opus 5.5 rejects `temperature`.** `llm.converse` always sends `inferenceConfig.temperature` (`seren/web/llm.py:200`); Opus 5.5 on Bedrock fails every call with `ValidationException: temperature is deprecated for this model`. Every turn and every teller run breaks the moment `SEREN_MODEL_PAID` points at Opus. | 26 Nov, /next session | Rerun of the teller on `us.anthropic.claude-opus-5-5`, us-east-2 | Moving paid tier to Opus | Open |
| SRN-1.5-02 | Teller | **The teller's token limit is too small for Opus.** `SEREN_GEN_TOKENS` defaults to 4000 (`seren/web/weave.py:26`). Opus 5.5 reasons before it answers, the reasoning spends the budget, `stopReason` is `max_tokens` and the campaign JSON is cut off mid-object, so `json.loads` fails. 16000 worked; each run used ~4.7–5k output tokens. `mend()` uses the same limit. | 26 Nov, /next session | `outputTokens: 4000`, content blocks `reasoningContent` + `text` | Moving paid tier to Opus | Open |
| SRN-1.5-03 | Teller | **The real teller never sees the published campaign.** `/api/weave` adds sealed cards but passes only the dealt cards and dials to `weave.weave()`; the campaign's `template/` (its canon, fronts and cast) is never read. A Blood and Ink hand on Bedrock comes back as a generic orchard murder: no Agnes Tull, no Thornby, no wake. | 26 Nov, /next session | `seren/web/server.py` `/api/weave`; `weave.brief()` has no template input | Published campaigns on the real teller | Open |
| SRN-1.5-04 | Teller | **The real teller writes no book.** The book (`briefing.md`, the player's briefing) is only written by the fake AI (`mock_book.py`). On Bedrock `campaign_obj["briefing"]` is empty, so `/api/weave` returns `book: ""` and the book modal shows no chapters and the download is empty. Applies to published and generated (Loom) campaigns alike. | 26 Nov, /next session | `weave.weave()` real path; `server.py` `"book": campaign_obj.get("briefing") or ""` | The book on the real teller; MCP MVP step 7 | Open |
| SRN-1.5-05 | Fake AI | **The fake book ignores the dials.** `mock_book.py` never reads them, so local play shows the same book at any setting, and the dials look like they do nothing. | 26 Nov, /next session | No dial code in `seren/web/mock_book.py` | Judging the dials locally | Open |
| SRN-1.5-06 | Teller | **Nova reads the "told by" card as a person.** On Nova Pro, "told by The Archivist" became a character who walks into the opening scene. Opus 5.5 got it right (it narrated as the Archivist). | 26 Nov, /next session | `seren/web/static/next/teller-runs-2026-11-26-nova.json` | Free tier on Nova | Open |
| SRN-1.5-07 | Teller | **Nova barely moves with the dials.** One hand at three settings gave three openings with the same title ("Ledger of Lies") and small changes of scale. Opus gave three different stories. | 26 Nov, /next session | `next/teller-runs-2026-11-26-nova.json` vs `-opus.json` | Free tier on Nova | Open |
| SRN-1.5-08 | Deal page | **The deck image went blank once while the cat pawed a card.** In a headless capture the pile on the felt showed a broken image during the cat's paw. Seen once; not reproduced by hand. | 26 Nov, /next session | Screenshot `seren/web/static/next/cat.jpg` (left edge) | — | Open, needs a repro |

## Closed

*(none yet)*
