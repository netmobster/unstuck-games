"""seren-mcp — SEREN's rules engine as an MCP server. The player's own model is the DM.

    python seren/mcp/server.py                 # stdio: Claude Desktop, Claude Code (phase 0)
    python seren/mcp/server.py --http 8793     # streamable HTTP on 127.0.0.1 (phase 1, no auth yet)

Phase 0 has no sign-in: the account is SEREN_ACCOUNT and the content is SEREN_CONTENT_DIR.
`stage.py` assembles a local content dir with the Weighbridge fixture on the shelf.

Every tool is a thin wrapper over play.py. Nothing here decides anything; this file only
turns results into text and attaches `seren_asks` when the server wants a handback.

Spec: ../platform/MCP-SERVER.md
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Literal, Optional

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from mcp.server.apps import Apps  # noqa: E402
from mcp.server.mcpserver import MCPServer  # noqa: E402

import play   # noqa: E402
import tableview as table  # noqa: E402

ACCOUNT = os.environ.get("SEREN_ACCOUNT", "tester")
T = play.Table(account=ACCOUNT, holder=f"mcp:{ACCOUNT}:{os.getpid()}")

# The inline table (MCP Apps). Tools bound to it are registered on APPS, and APPS must be
# fully populated before MCPServer consumes it, so the server is built in main().
APPS = Apps()
TABLE_URI = "ui://seren/table.html"


class _Deferred:
    """Collects @mcp.tool / @mcp.prompt registrations until the server exists."""
    def __init__(self):
        self.calls = []

    def tool(self, **kw):
        return lambda fn: (self.calls.append(("tool", fn, kw)), fn)[1]

    def prompt(self, **kw):
        return lambda fn: (self.calls.append(("prompt", fn, kw)), fn)[1]


mcp = _Deferred()


def build() -> MCPServer:
    server = MCPServer(
        "seren",
        title="SEREN",
        instructions=("SEREN is a solo tabletop RPG. You are the Dungeon Master; this server "
                      "holds the dice, the state and the record. Start with the /seren prompt, "
                      "or call seren_shelf then seren_open."),
        version="0.1.0-phase0",
        extensions=[APPS],
    )
    for kind, fn, kw in mcp.calls:
        getattr(server, kind)(**kw)(fn)
    return server




def _out(payload: Any) -> str:
    """Every result is text (every client renders text), with the handback ask attached."""
    if not isinstance(payload, dict):
        payload = {"result": payload}
    ask = T.asks()
    if ask:
        payload["seren_asks"] = ask
    notes = T.take_notes()
    if notes:
        payload["seren_notes"] = notes     # the judge, to the DM: read before the next line
    return json.dumps(payload, ensure_ascii=False, indent=1, default=str)


def _write(fn, *a, **kw) -> str:
    """A write, then the table redrawn, so an open table tab is never behind the record."""
    out = _run(fn, *a, **kw)
    table.redraw(T)
    return out


def _run(fn, *a, **kw) -> str:
    try:
        result = fn(*a, **kw)
    except play.Refused as exc:
        T.log_call(fn.__name__, True)
        return _out({"refused": str(exc)})
    T.log_call(fn.__name__, isinstance(result, dict) and "refused" in result)
    return _out(result)


# ── prompts ──────────────────────────────────────────────────────────────────

@mcp.prompt(name="seren", title="Play SEREN",
            description="Open a campaign and become its Dungeon Master.")
def seren_prompt(campaign: str = "") -> str:
    if not campaign:
        rows = T.shelf()["campaigns"]
        listing = "\n".join(f"- `{r.get('slug')}` — {r.get('title')}: {r.get('premise', '')[:140]}"
                            for r in rows) or "- (the shelf is empty)"
        return ("Show the player their shelf and ask which campaign to play. Then call "
                "seren_open with its slug and follow the briefing it returns.\n\n" + listing)
    try:
        T.open(campaign)
        return T.briefing()
    except play.Refused as exc:
        return f"Tell the player: {exc}"


@mcp.prompt(name="seren-close", title="End the session",
            description="Close the session: the chronicle and the handback.")
def seren_close_prompt() -> str:
    return ("The player is stopping. Write the chronicle of this session following the chronicle "
            "brief you were given at the start. Then call seren_close with: chronicle, summary "
            "(three lines), decisions, threads, introduced, and the narration and player lines "
            "since your last seren_sync, verbatim.")


# ── session ──────────────────────────────────────────────────────────────────

@mcp.tool(description="The player's campaigns. 20 a page.")
def seren_shelf(page: int = 1) -> str:
    return _run(T.shelf, page)


@mcp.tool(description=("Open a campaign and start a session. Returns the briefing: the contract, "
                       "the campaign, where things stand. Read it all before narrating."))
def seren_open(campaign: str, takeover: bool = False) -> str:
    try:
        opened = T.open(campaign, takeover=takeover)
        return _out({**opened, "briefing": T.briefing()})
    except play.Refused as exc:
        return _out({"refused": str(exc)})


@mcp.tool(description=("Answer a `seren_asks` block: what happened in the chat since the last "
                       "sync. narration and player verbatim; the rest one line each."))
def seren_sync(narration: Optional[list[str]] = None, player: Optional[list[str]] = None,
               introduced: Optional[list[str]] = None, decisions: Optional[list[str]] = None,
               threads: Optional[list[str]] = None, dm_notes: Optional[list[str]] = None) -> str:
    return _write(T.sync, dict(narration=narration, player=player, introduced=introduced,
                             decisions=decisions, threads=threads, dm_notes=dm_notes))


@mcp.tool(description=("End the session. Send the chronicle (the session as a story, per the "
                       "chronicle brief), a three-line summary, decisions, open threads, and "
                       "everything since the last sync."))
def seren_close(chronicle: str, summary: str = "", decisions: Optional[list[str]] = None,
                threads: Optional[list[str]] = None, introduced: Optional[list[str]] = None,
                narration: Optional[list[str]] = None, player: Optional[list[str]] = None,
                dm_notes: Optional[list[str]] = None) -> str:
    return _write(T.close, dict(chronicle=chronicle, summary=summary, decisions=decisions,
                              threads=threads, introduced=introduced, narration=narration,
                              player=player, dm_notes=dm_notes))


# ── reads ────────────────────────────────────────────────────────────────────

@mcp.tool(description=("Check the record before you say it. Player-visible only. "
                       "`fronts` gives names, never clocks."))
def seren_look(what: Literal["scene", "party", "sheet", "facts", "ledger", "present", "fronts"]) -> str:
    return _run(T.look, what)


@mcp.tool(description="Search this campaign's canon, cast, past chronicles and known facts.")
def seren_search(query: str) -> str:
    return _run(T.search, query)


@mcp.tool(description="Look up a rule in the SRD 5.2 library.")
def seren_rules(query: str) -> str:
    return _run(table.rules_lookup, query)


@mcp.tool(description=("DM-side only: hidden facts, fronts, antagonists. For your reasoning. "
                       "Never said aloud until the fiction reveals it."))
def seren_secrets() -> str:
    return _run(T.secrets)


@mcp.tool(description="The chronicle of an earlier session.")
def seren_recall(session: int) -> str:
    return _run(T.recall, session)


# ── drop-ins ─────────────────────────────────────────────────────────────────

@mcp.tool(description="People, places and threats that can be brought into this campaign mid-session.")
def seren_dropins() -> str:
    return _run(T.dropins)


@mcp.tool(description=("Bring a drop-in into the open campaign. It arrives in the world, not the "
                       "scene: you get its hooks and use one when the story allows."))
def seren_bring(dropin: str) -> str:
    return _write(T.bring, dropin)


# ── writes ───────────────────────────────────────────────────────────────────

@mcp.tool(description=("Ask for dice when the outcome is in doubt. The server rolls and writes "
                       "the ledger. Never supply an outcome. A d20 needs dc (or vs); say in "
                       "`note` where the target came from."))
def seren_roll(dice: str, t: str, note: str, who: Optional[str] = None, skill: Optional[str] = None,
               ability: Optional[str] = None, dc: Optional[int] = None, vs: Optional[int] = None,
               advantage: Optional[Literal["advantage", "disadvantage"]] = None,
               mods: Optional[list[list[Any]]] = None, why: Optional[str] = None) -> str:
    return _write(T.roll, dict(dice=dice, t=t, note=note, who=who, skill=skill, ability=ability,
                             dc=dc, vs=vs, advantage=advantage, mods=mods, why=why))


@mcp.tool(description=("What is TRUE IN THE WORLD: establish, flip, or record a belief. Not a "
                       "log of the session. Weather and small talk are not facts."))
def seren_fact(op: Literal["establish", "flip", "believe"], fact: str,
               visibility: Optional[Literal["true", "known", "suspected", "false"]] = None,
               from_: Optional[Literal["true", "known", "suspected", "false"]] = None,
               to: Optional[Literal["true", "known", "suspected", "false"]] = None,
               truth: Optional[bool] = None, how: Optional[str] = None,
               src: Optional[Literal["module", "play", "player"]] = None,
               note: Optional[str] = None) -> str:
    args = dict(op=op, fact=fact, visibility=visibility, to=to, truth=truth, how=how, src=src, note=note)
    if from_ is not None:
        args["from"] = from_
    return _write(T.fact, args)


@mcp.tool(description=("Record what something cost: hp, a condition, a slot or use, a move, "
                       "someone arriving or leaving, initiative. Say the CHANGE, never the total. "
                       "If the result says refused, it did not happen."))
def seren_state(op: Literal["hp", "condition", "slot", "use", "move", "present", "round"],
                who: Optional[str] = None, delta: Optional[int] = None,
                condition: Optional[str] = None, key: Optional[str] = None,
                where: Optional[str] = None, round: Optional[int] = None,
                remove: Optional[bool] = None, note: Optional[str] = None) -> str:
    return _write(T.change, dict(op=op, who=who, delta=delta, condition=condition, key=key,
                               where=where, round=round, remove=remove, note=note))


@mcp.tool(description="A call the rules do not cover. Says out loud that you are making it.")
def seren_ruling(note: str, who: Optional[str] = None, scope: Optional[str] = None) -> str:
    return _write(T.ruling, dict(note=note, who=who, scope=scope))


# ── the table ────────────────────────────────────────────────────────────────

@mcp.tool(description=("The player's table: party, dice, what they know. Returns a local link "
                       "to give the player; it redraws after every write and reloads itself. "
                       "Use this one by default."))
def seren_table() -> str:
    return _run(table.publish, T)


@APPS.tool(resource_uri=TABLE_URI, name="seren_table_view",
           description=("The same table as an inline panel, only for clients that show MCP Apps "
                        "panels. Claude Desktop chat does not: use seren_table there."))
def seren_table_view() -> str:
    return _run(table.publish, T)


@APPS.tool(resource_uri=TABLE_URI, visibility=["app"], name="seren_table_data",
           description="The table's data, for the table view itself. Player-visible only.")
def seren_table_data() -> str:
    try:
        return json.dumps(table.data(T), ensure_ascii=False, default=str)
    except play.Refused as exc:
        return json.dumps({"held": str(exc)})


APPS.add_html_resource(TABLE_URI, (HERE / "table_app.html").read_text(encoding="utf-8"),
                       name="seren-table", title="The Seren Table", prefers_border=True)


def main() -> None:
    if "--http" in sys.argv:
        port = int(sys.argv[sys.argv.index("--http") + 1])
        build().run("streamable-http", host="127.0.0.1", port=port)
    else:
        build().run("stdio")


if __name__ == "__main__":
    main()
