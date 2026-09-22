"""Over the wire: start server.py on stdio, speak MCP to it, open a campaign, roll a die.

    python seren/mcp/wire.py

check.py proves the play layer. This proves the MCP layer on top of it: that a real client
sees the tools and prompts, and that a call round-trips.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import stage  # noqa: E402
from mcp.client.session import ClientSession  # noqa: E402
from mcp.client.stdio import StdioServerParameters, stdio_client  # noqa: E402


async def main() -> int:
    root = stage.stage(Path(tempfile.mkdtemp(prefix="seren-wire-")) / "content")
    params = StdioServerParameters(
        command=sys.executable, args=[str(HERE / "server.py")],
        env={**os.environ, "SEREN_CONTENT_DIR": str(root), "SEREN_ACCOUNT": "tester", "SEREN_PC": "wick"},
    )
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = sorted(t.name for t in (await s.list_tools()).tools)
            prompts = sorted(p.name for p in (await s.list_prompts()).prompts)
            print(f"tools   ({len(tools)}): {', '.join(tools)}")
            print(f"prompts ({len(prompts)}): {', '.join(prompts)}")
            p = await s.get_prompt("seren", {"campaign": stage.SLUG})
            text = p.messages[0].content.text
            print(f"/seren  briefing {len(text):,} chars, opens: {text[:60]!r}")
            res = await s.call_tool("seren_roll", {"dice": "1d20", "t": "check", "dc": 12,
                                                   "who": "wick", "skill": "insight",
                                                   "note": "Hesper's stillness; DC 12 from the table"})
            body = json.loads(res.content[0].text)
            print(f"roll    {body.get('tell_the_player') or body}")
            res = await s.call_tool("seren_state", {"op": "move", "where": "x"})
            body = json.loads(res.content[0].text)
            print(f"refused {bool(body.get('refused'))}  asks: {body.get('seren_asks', {}).get('send')}")
            ok = len(tools) == 14 and {"seren", "seren-close"} <= set(prompts)
            print("WIRE OK" if ok else "WIRE FAIL")
            return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
