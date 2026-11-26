# Seren MCP server

The fortune teller's table inside Claude. Plan: [`../MCP-MVP-PLAN.md`](../MCP-MVP-PLAN.md).
Written from scratch on 25 Nov 2026; the old folder that stood here is backed up at
`PROJECTS/_BACKUPS/seren-mcp-old-2026-11-25/`.

**Where it is: the whole first magic moment, inside Claude, from this laptop** (26 Nov).
`open_seren` (the one tool Claude sees, read-only) opens the deal full screen: the shelf, the deal,
her card, tune, the weave and the book. The app is the web table's own `seren/web/static/deal.html`,
and its work goes through two app-only tools on the web port's own engine:

| tool | type | what it does |
|---|---|---|
| `open_seren` | read-only, model-visible | opens the app |
| `seren_deal` | read-only, app-only | the shelf, decks and dials (never truths) |
| `seren_weave` | create, app-only | weaves the hand, the auditor reads it (one mend), writes the book, saves it |

Books are saved to `seren/.local/books/` (for red team) and downloadable from the app. Claude is told
what was woven (`updateModelContext`), so the player can talk about the book in the chat.

```
server.py          the server: tools, the app resource (hashed ui://), asset and book routes
run-tunnel.ps1     Cloudflare quick tunnel + the server; prints the address for Claude
test_server.py     in-process checks: no network, no Claude
vendor/            @modelcontextprotocol/ext-apps 1.7.5, browser build (MIT, licence beside it)
bin/               cloudflared.exe (gitignored)
```

## Play it in Claude (PowerShell)

```powershell
.\seren\mcpun-tunnel.ps1
```

Then in claude.ai: Settings > Connectors > Add custom connector, paste the printed `https://....trycloudflare.com/mcp`,
and ask Claude to open Seren. `-Real` uses the real weaver on Bedrock (run `aws login` first); `-Tier paid`
uses the paid model. The address changes every run. No sign-in: anyone with the address can use the tools
while it's up (accepted by Jay, 26 Nov); the tools never serve truths.

## Run it (PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install "mcp==2.2.0" uvicorn
.venv\Scripts\python test_server.py
.venv\Scripts\python server.py
```

The server listens on `http://127.0.0.1:3020/mcp` (set `SEREN_MCP_HOST` / `SEREN_MCP_PORT` to change it).
claude.ai can only reach it once it's on a public HTTPS address.
