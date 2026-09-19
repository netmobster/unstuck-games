# Hard Pass — engine assessment

Filed 2026-09-16. **Not designed. Nothing built.** A record of what Jay's existing Hard//Pass
app contains and whether it can be the feedback black box for the game. See the IDEAS.md row
for the pitch and lineage.

Source repo: [netmobster/hardpass-your-idea-s-first-check](https://github.com/netmobster/hardpass-your-idea-s-first-check)
(Lovable-built React + Supabase, one commit in the clone reviewed, "Replace Start UI with
3-button entry").

## Verdict

**Liftable as a black box.** The portable value is about 60 lines of prompt text, two JSON
shapes and one end-session rule. None of it depends on Supabase or React. **Nothing about
its quality is proven:** there are no tests (one placeholder) and no evaluation data.

## What the app does

The founder describes an idea by PDF upload, a six-question interview, or a direct form. That
becomes a pitch payload (`IDEA / PROBLEM / TARGET CUSTOMER / CURRENT SOLUTION / REVENUE MODEL /
CREDENTIALS / EXTRA`). They enter **The Room**, a chat where six investors question them while a
hidden evaluator scores every turn. They leave with a report: verdict, one-line reason, a 9-row
canvas, what's working, what to fix, and "What Will Kill This" or "What to Do This Week".

## The engine

Four Supabase edge functions, each calling **Anthropic directly** (`claude-sonnet-4-20250514`,
`api.anthropic.com/v1/messages`, key from `ANTHROPIC_API_KEY`). No temperature set, no streaming.

| Function | Job | max_tokens |
|---|---|---|
| `room-dialogue` | One call plays a facilitator voicing 1–2 of six investors per turn | 1000 |
| `room-evaluate` | Hidden scorer, JSON only | 1000 |
| `generate-report` | Final report, JSON only | 2000 |
| `distill-pdf` | Pitch fields from an uploaded PDF (optional) | 1000 |

### The evaluator: the part the game needs

Nine axes, each `strong | moderate | weak | undefined`:

**problem · market · revenueModel · behaviourChange · buildFeasibility · competitiveMoat ·
customerClarity · personas · twoSidedRisk**

Plus a one-sentence gap per axis, a room temperature (`cold | warming | hot`) and a verdict
(`hard_pass | interested | sign_here`). The verdict is the model's judgment from a one-line
rule, not computed. The client ends a session automatically on `sign_here` with 5+ axes strong;
there is no automatic end for `hard_pass`.

### The six investors

All voiced by **one** model call; they are not independent agents. Rules forbid verdicts in
dialogue, require specific references to what the founder said, and make silence meaningful.

| Investor | Type | Axes |
|---|---|---|
| **Marcus Webb** | Thesis-driven VC | problem, market, timing, behaviour change |
| **Grant Holloway** | Revenue-obsessed (O'Leary type) | revenue model, moat, margin |
| **Riko Tanaka** | Ex-CTO advisor | build feasibility, two-sided risk |
| **Simone Adeyemi** | CMO-for-hire | customer clarity, personas, behaviour change, GTM |
| **Viktor Manz** | Serial founder, adversarial | moat, cloneability — his silence is the highest signal |
| **Priya Nair** | The actual target customer | customer clarity, behaviour change, problem |

Inconsistencies to settle: the UI and About page call Priya a behavioural economist; timing,
margin, GTM and cloneability are named in personas but not scored.

## Why it fits the game

- **It is literally "find out why they passed."** The evaluator is the black box; the gaps are
  the feedback.
- **Refusals can be readable per investor, and deterministic.** Each investor already maps to
  axes, so the game can decide in code, from the evaluator's scores, that *Grant passed because
  revenue model scored weak*. Same principle as Deadline Dungeon's "every no has a reason", and
  the eye can show it.
- **It drops into the Elsewhere pattern.** Our server already calls Bedrock through boto3, with
  a per-session spend cap. Live AI in play has precedent.

## Porting plan (when it's designed)

1. Copy the three prompts (four with PDF), the two JSON shapes and `buildPayload` into Python.
2. Call Bedrock instead of Anthropic; use **tool use** with the JSON shapes as schemas so output
   is guaranteed, validate all nine axes, retry on bad output, check HTTP status.
3. Rebuild the turn loop server-side: history must start with a user message; run the evaluator
   after the room's reply so it sees it; keep the `sign_here && strong >= 5` end and add a
   `hard_pass` end.
4. **Cost controls:** turn cap, transcript truncation, rate limit, Elsewhere's spend cap. Two
   Sonnet calls per turn is the expensive part; consider a cheaper evaluator model or evaluating
   every N turns.
5. Split room text into `{speaker, text}` on the server.
6. Derive **per-investor verdicts deterministically** from their axes.
7. Leave behind: Supabase storage, share links, the React UI.

## Problems found in the Hard Pass app itself

Out of scope for Unstuck; recorded so they aren't forgotten.

- **All pitches and transcripts are publicly readable.** Every table's policy is
  `USING (true)` / `WITH CHECK (true)`.
- **The AI functions are open:** CORS `*`, `verify_jwt = false`, no login, rate limit or turn
  cap, with the Anthropic key behind them.
- **Likely turn-2 failure:** the opening user message is saved but never added to the message
  history, so the second call starts with an assistant message; the error is swallowed. Not run
  to confirm.
- **Errors are swallowed generally:** no `response.ok` checks; failures return empty content
  with HTTP 200. Retry does nothing (input already cleared).
- **Two verdicts can disagree:** the report prompt receives the evaluator's verdict, but the UI
  shows the report model's own.
- Duplicate prompts in the frontend (dead) and edge functions; unused `report_gated`; shared
  report links have no transcript; speaker parsing breaks on early colons.
