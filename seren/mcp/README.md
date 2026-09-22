<!-- seren-mcp, phase 0. Built 2026-09-22 on branch seren/mcp-phase0, isolated from web and CC. -->
# seren-mcp

**SEREN's rules engine as an MCP server. The player's own Claude is the Dungeon Master;
this holds the dice, the state, the record and the table.**

Spec: [`../platform/MCP-SERVER.md`](../platform/MCP-SERVER.md) ·
Why: [`../platform/PRD-TRD.md`](../platform/PRD-TRD.md)

⛔ **Isolated.** It imports `seren/web/` and changes nothing in it. It never reads or
writes `/srv/seren`. The CC table is **copied** into `cc_table/`, never edited in place.

---

## Play it tonight (phase 0)

```bash
cd seren/mcp
python -m venv .venv && .venv/Scripts/pip install "mcp>=2.2" pyyaml
.venv/Scripts/python stage.py        # stages the Weighbridge; prints the Claude Desktop config
```

Paste the printed block into Claude Desktop → Settings → Developer → Edit config, restart
Desktop, then in a new chat pick the **seren** prompt with `the-weighbridge`, or just ask it
to open the Weighbridge.

Afterwards: `.venv/Scripts/python score.py .stage/players/tester/the-weighbridge`

## What's here

| file | what |
|---|---|
| `server.py` | the MCP server: 17 tools, 2 prompts, 1 UI resource. stdio, or `--http PORT` on localhost |
| `play.py` | everything it does, with no MCP in it: shelf, lock, views, secrets, writes, the handback, close, drop-ins |
| `tableview.py` | the table: CC's renderer + leak check (file), and the inline view's data |
| `table_app.html` | the inline table (MCP Apps `ui://seren/table.html`) |
| `cc_table/` | vendored from `SEREN/scripts` @ `0c01479`: `render_table.py` (2 small changes, marked) and `table.py` (unchanged) |
| `dropins/` | first-party drop-ins. One so far: **Mother Aldous** |
| `stage.py` | a disposable content dir: rules, SRD library, the Weighbridge on two shelves |
| `check.py` | 39 properties the spec promises, no model involved |
| `wire.py` | a real MCP client over stdio: lists, prompts, calls |
| `judge.py` | typed questions about narration, answered with a probability. Regex today; Jev's slot is written, its adapter isn't |
| `judge_eval.py` | 13 hand-labelled lines, real and reworded. The test Jev has to pass before it replaces regex |
| `score.py` | the seven objective failures from red team #2, off a played session |
| `MATRIX.md` | the runbook: 8 scripted turns (red team #2), 8 secret attacks (red team #3) |
| `box/` | setup for a separate `/srv/seren-mcp` on the box: a worktree, a venv, a **disabled** unit |

## Tools

| | |
|---|---|
| session | `seren_shelf` · `seren_open` · `seren_sync` · `seren_close` |
| reads | `seren_look` · `seren_search` · `seren_rules` · `seren_recall` · `seren_secrets` (the only DM-side one) |
| writes | `seren_roll` · `seren_fact` · `seren_state` · `seren_ruling` |
| table | `seren_table` · `seren_table_data` (app-only) |
| drop-ins | `seren_dropins` · `seren_bring` |
| prompts | `/seren` · `/seren-close` |

## Verified (2026-09-22)

- `check.py`: **39/39.** Isolation, fog on every read, refusals as results, the handback
  asks and flags, the facts brake, the lock and takeover, dice, the rendered table's leak
  check, close (a leaking chronicle is sent back), rules lookup, drop-ins (public half
  searchable, private half secret, flagged when narrated, injection scan), and the scorer
  finding all seven failures.
- `wire.py`: **OK.** A real MCP client sees 17 tools, 2 prompts, the `ui://` table; the
  `/seren` briefing is ~30K characters; a roll, a refusal with its ask, and the table data
  all round-trip.
- The inline table rendered in a browser against the fixture's real data, via a stand-in
  host.

**Not verified:** any real model playing it. That's phase 0's gate, and it's Jay's.
**Not verified:** the inline table inside a real MCP Apps host.

## Found while building (worth knowing outside this folder)

1. **Cast files carry secrets.** Hesper Vane's `## Knows` says the Gap was shut by the
   garrison, one of the fixture's hidden facts in other words. The engine doesn't count
   cast files as DM-side. seren-mcp strips private sections from search; **the web
   engine's fog doesn't know about them.**
2. **`fog.check` matches whole lines.** A DM-side file that wraps mid-sentence, or starts
   lines with a label, can be narrated word for word without matching. The handback adds
   a sentence-overlap check; **the web gate still has the gap.**
3. **The engine's `player_view` drops non-party people in `present`.** The Weighbridge
   cast never appeared on the table. Fixed in `tableview.data`; the web table has the
   same gap.

## The judge (2026-09-22)

The handback's checks — acting for the PC, prose against state, a restated secret, a
fact that is noise, a drop-in that addresses a model — are typed questions in `judge.py`,
answered by whoever is plugged in. **Verdicts go two places:** the ledger, and a
`seren_notes` line on the DM's next tool result, so she reads the correction before her
next line.

**Regex today: 7/13 on `judge_eval.py`** — every clean line right, **0/5 on the reworded
faults.** That gap is the case for a System One model (Jev). Jev replaces regex only if it
catches the reworded rows without flagging the clean ones.

**To switch it on:** Jay sets up access and puts the key in `SEREN_JEV_KEY`; CC writes the
adapter in `JevJudge.ask` against TypeSafe's docs, then sets `SEREN_JEV_READY=1`. Until
both, nothing calls it.
