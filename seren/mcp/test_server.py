"""In-process checks for the Seren MCP server (as MINDER's test/minder.test.mjs does).

    .venv/Scripts/python test_server.py

No network, no Claude: an MCP client talks to the server object directly, once advertising MCP
Apps support (as Claude does) and once without it.
"""
from __future__ import annotations

import asyncio
import sys

from mcp import Client
from mcp.client import advertise
from mcp.server.apps import APP_MIME_TYPE, EXTENSION_ID

import server as seren

# The tests run on fake AI whatever the live switch (seren/.local/ai-mode) says.
seren.AI_MODE = seren.LOCAL / 'no-such-ai-mode'
seren.os.environ['SEREN_AI'] = 'mock'

FAILS: list[str] = []


def check(ok: bool, what: str) -> None:
    print(("ok   " if ok else "FAIL ") + what)
    if not ok:
        FAILS.append(what)


def dump(model) -> dict:
    return model.model_dump(by_alias=True, exclude_none=True) if hasattr(model, "model_dump") else model


async def main() -> int:
    as_claude = [advertise(EXTENSION_ID, {"mimeTypes": [APP_MIME_TYPE]})]
    async with Client(seren.server, extensions=as_claude) as client:
        tools = dump(await client.list_tools())["tools"]
        names = sorted(t["name"] for t in tools)
        check(names == ["open_seren", "seren_character", "seren_deal", "seren_level", "seren_ruling", "seren_save_build", "seren_weave", "seren_weave_status"], f"eight tools (got {names})")
        by = {t["name"]: t for t in tools}
        vis = {n: ((by[n].get("_meta") or {}).get("ui") or {}).get("visibility") for n in names}
        check(vis["open_seren"] is None and vis["seren_deal"] == ["app"] and vis["seren_weave"] == ["app"],
              f"only open_seren is the model's; the other two are app-only ({vis})")
        w = by["seren_weave"].get("annotations") or {}
        check(w.get("readOnlyHint") is False and w.get("destructiveHint") is False,
              "seren_weave writes, and is marked non-destructive")
        tool = by["open_seren"]
        ui = (tool.get("_meta") or {}).get("ui") or {}
        check(ui.get("resourceUri") == seren.APP_URI, "open_seren points at the app's hashed address")
        check(seren.APP_URI.startswith("ui://seren/table-") and seren.APP_URI.endswith(".html"),
              f"the address carries a hash ({seren.APP_URI})")
        ann = tool.get("annotations") or {}
        check(ann.get("readOnlyHint") is True, "open_seren is marked read-only")
        check("destructiveHint" not in ann, "a read-only tool leaves out the destructive hint")

        res = dump(await client.read_resource(seren.APP_URI))["contents"][0]
        check(res.get("mimeType") == APP_MIME_TYPE, f"the app is served as {APP_MIME_TYPE}")
        html = res.get("text", "")
        check("window.McpApps={" in html and "App:" in html, "the app library is inlined and exposes App")
        check("window.serenShelf" in html and "window.serenWeave" in html, "the bridge answers the deal page's hooks")
        check("Blood and Ink" not in html and "truths" not in html.lower(), "no campaign data baked into the page")
        meta = (res.get("_meta") or {}).get("ui") or {}
        check(seren.PUBLIC in ((meta.get("csp") or {}).get("resourceDomains") or []),
              "the app's CSP allows this server's public address for art and music")
        check("export{" not in html[-2000:], "the library's trailing export was rewritten")

        old = dump(await client.read_resource("ui://seren/table-deadbeef.html"))["contents"][0]
        check(old.get("text") == html and old.get("mimeType") == APP_MIME_TYPE,
              "an old address still answers with today's page")

        result = dump(await client.call_tool("open_seren", {}))
        sc = result.get("structuredContent") or {}
        check(sc.get("app") == "seren" and sc.get("screen") == "shelf", "open_seren returns the app and screen")
        check(sc.get("note", "").startswith("The table is open."), "with app support, it says the table is open")

        deal = dump(await client.call_tool("seren_deal", {})).get("structuredContent") or {}
        camps = deal.get("campaigns") or []
        check([c["slug"] for c in camps][:1] == ["blood-and-ink"], "seren_deal returns the shelf, Blood and Ink first")
        check(all(c["back"].startswith(seren.PUBLIC + "/assets/") for c in camps), "card backs point at this server")
        import json as _json
        check("culprit" not in _json.dumps(deal) and "truths" not in _json.dumps(deal), "no truths reach the app")

        chars = (deal.get("structuredContent") or deal).get("characters") or []
        check(len(chars) == 6 and all(c["art"]["p"].startswith(seren.PUBLIC + "/assets/characters/") for c in chars),
              "seren_deal returns the shared six, art on this server")
        check("pc" not in camps[0]["deck"]["slots"], "who you play is no longer dealt from Blood and Ink's deck")
        d = camps[0]["deck"]["slots"]
        hand = {k: d[k]["card"] for k in ("trope", "world", "trouble")}
        you = chars[0]
        hand.update(pc={"id": "shared:" + you["id"], "name": you["nm"], "line": you["hook"],
                        "changes": you["core"].split(" · ")[1] + ". " + "; ".join(you["plays"])},
                    origin=d["origin"]["deck"][0], posture=d["posture"]["deck"][0],
                    persona=d["persona"]["deck"][0], companions=d["companions"]["deck"][:2])
        woven = dump(await client.call_tool("seren_weave", {"picks": {"campaign": "blood-and-ink"}, "cards": hand,
                                                           "dials": camps[0]["deck"]["dials"]["defaults"]}))
        wv = woven.get("structuredContent") or {}
        check(wv.get("ok") is True and "## Who's who" in (wv.get("book") or ""), f"seren_weave writes a full book ({wv.get('error')})")
        check((seren.BOOKS / f"{wv.get('slug')}.md").is_file(), "the book is saved for red team")

    async with Client(seren.server) as plain:
        result = dump(await plain.call_tool("open_seren", {}))
        note = (result.get("structuredContent") or {}).get("note", "")
        check("can't show apps" in note, "without app support, it says so in plain text")

    print(f"\n{'all passed' if not FAILS else str(len(FAILS)) + ' failed'}")
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
