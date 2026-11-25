# Seren MCP server

The fortune teller's table inside Claude. Plan: [`../MCP-MVP-PLAN.md`](../MCP-MVP-PLAN.md).
Written from scratch on 25 Nov 2026; the old folder that stood here is backed up at
`PROJECTS/_BACKUPS/seren-mcp-old-2026-11-25/`.

**Where it is: step 2, "hello, fullscreen".** One tool, `open_seren` (read-only), opens a
placeholder table that asks the host for full screen.

```
server.py         the server: the tool, the app resource at a hashed ui:// address, a catch-all
app/table.html    the app page; the MCP Apps library is inlined into it at start-up
vendor/           @modelcontextprotocol/ext-apps 1.7.5, browser build (MIT, licence beside it)
test_server.py    in-process checks: no network, no Claude
```

## Run it (PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install "mcp==2.2.0" uvicorn
.venv\Scripts\python test_server.py
.venv\Scripts\python server.py
```

The server listens on `http://127.0.0.1:3020/mcp` (set `SEREN_MCP_HOST` / `SEREN_MCP_PORT` to change it).
claude.ai can only reach it once it's on a public HTTPS address.
