# Decisions — Unstuck Games

## 2026-11-19 — status session — SEREN on a player's own Anthropic key

Route A: the key goes into the web table, not SEREN over MCP. MCP stays on the roadmap.

- **Who:** just this player, as a per-account flag. The policy (guest list or paid) is decided later.
- **Model:** Sonnet by default, with Opus as an option on the account page.
- **Cap:** the player can set an optional per-session dollar cap; blank means none. The cost of
  each turn is shown either way. Our $3 cap doesn't apply on their key.
- **The key:** stays in the player's browser and rides each turn over TLS. The server uses it in
  memory and never writes it to disk or a log.

**Why:** it's what the player asked for, on the table they already know, and it's contained in
`seren/web/llm.py` plus an account-page field. A per-account flag avoids settling paid tiers
before anyone pays.
