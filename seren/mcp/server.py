"""Seren's MCP server: the fortune teller's table inside Claude.

Written from scratch on 25 Nov 2026 (step 2 of seren/MCP-MVP-PLAN.md: "hello, fullscreen").
MINDER on the selfActual vault server is the pattern we follow, not code we copy:

- The app is a tool. `open_seren` is the one tool Claude sees; it opens the app.
- One HTML resource, served as `text/html;profile=mcp-app`, at an address that carries a hash of
  the HTML, so a redeploy never serves a cached page under the old address. A catch-all template
  answers old addresses, because claude.ai keeps the tool list it saw when it connected.
- Tools are typed read-only or write, with matching hints (the vault server's tool-types.js).
- Streamable HTTP, stateless.

Run it locally:  .venv/Scripts/python server.py          (http://127.0.0.1:3020/mcp)
Test it:         .venv/Scripts/python test_server.py
"""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Any

from mcp.server.apps import Apps, client_supports_apps
from mcp.server.mcpserver import Context, MCPServer
from mcp_types import ToolAnnotations

HERE = Path(__file__).parent
VENDOR = HERE / "vendor" / "ext-apps-1.7.5-app-with-deps.js"
APP = HERE / "app" / "table.html"

# The vault server's tool types, by name. Read-only tools leave out the destructive and
# idempotent hints: the MCP spec says those only mean something when a tool writes.
READ = ToolAnnotations(readOnlyHint=True, openWorldHint=False)


def _library() -> str:
    """The MCP Apps browser library, made loadable inline.

    The vendored build is an ES module ending in one `export{a as B,...}`. An inline module
    can't be imported from, so the export becomes `window.McpApps = {B: a, ...}`.
    """
    src = VENDOR.read_text(encoding="utf-8")
    match = re.search(r"export\{([^}]*)\};?\s*$", src)
    if not match:
        raise RuntimeError(f"{VENDOR.name}: no trailing export statement to rewrite")
    pairs = []
    for item in match.group(1).split(","):
        local, _, public = item.strip().partition(" as ")
        pairs.append(f"{(public or local).strip()}:{local.strip()}")
    return src[: match.start()] + "window.McpApps={" + ",".join(pairs) + "};"


def app_html() -> str:
    page = APP.read_text(encoding="utf-8")
    return page.replace("/*__MCP_APPS_LIBRARY__*/", _library())


HTML = app_html()
HASH = hashlib.sha256(HTML.encode("utf-8")).hexdigest()[:8]
APP_URI = f"ui://seren/table-{HASH}.html"

apps = Apps()
apps.add_html_resource(APP_URI, HTML, name="Seren", title="Seren · the fortune teller's table",
                       prefers_border=False)


@apps.tool(
    resource_uri=APP_URI,
    name="open_seren",
    title="Open Seren",
    description=(
        "Open Seren, the fortune teller's table, full screen. Use this when the player wants to "
        "play Seren, start or choose a campaign, or sit at the table. It takes no arguments."
    ),
    annotations=READ,
)
def open_seren(ctx: Context) -> dict[str, Any]:
    """The one tool Claude sees. Read-only: it opens the app and changes nothing."""
    note = ("The table is open." if client_supports_apps(ctx) else
            "Seren's table is an app, and this client can't show apps. Try it in Claude.")
    return {"app": "seren", "screen": "hello", "note": note}


server = MCPServer(
    "seren",
    title="Seren",
    version="0.1.0",
    instructions="Seren is a single-player tabletop RPG. Call open_seren to open the table.",
    extensions=[apps],
)


@server.resource("ui://seren/{file}", mime_type="text/html;profile=mcp-app", name="Seren (any address)")
def any_address(file: str) -> str:
    """Old app addresses still answer, with today's page (MINDER's catch-all, apps.js 376-382)."""
    return HTML


def main() -> None:
    server.run(
        "streamable-http",
        host=os.environ.get("SEREN_MCP_HOST", "127.0.0.1"),
        port=int(os.environ.get("SEREN_MCP_PORT", "3020")),
        streamable_http_path="/mcp",
        stateless_http=True,
    )


if __name__ == "__main__":
    main()
