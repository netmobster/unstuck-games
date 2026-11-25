# Decisions — Unstuck Games

## 2026-11-24 — CC-162 — The fortune teller's flow: spread, book, guard, door

Jay's framing for how a campaign begins, agreed in principle. **It's a rename, not a build:** the
local Claude Code Seren (`PROJECTS/SEREN`) already has every step. The Loom deals the hand
(`scripts/loom.ps1`, `hand.py check`) = the spread. `hand.py scaffold` plus `docs/weave-from-hand.md`
= the book. `scripts/preflight.py` (and `library.py`, "let the import BE the gate") = the guard at
the door. The session opening with `live.py` = the door. (CC had first read the web code in
UNSTUCK, which doesn't have these.)

1. **The spread** is your deal: the Deal lays out the cards (premise, cast, fronts, persona, heat,
   side content), drawn from your own material if you brought any.
2. **Your choices:** keep, swap or discard cards in the deal. When corpus import lands (SRN-17:
   not built as a feature, but run once locally to prove the mechanic, per Jay), its human gates
   become these same choices.
3. **The book:** the fortune teller presents the finished campaign object, fixed, versioned and
   yours. Its blank last pages are where the chronicle will be written.
4. **The Doorkeeper** checks the book at the door before you walk through: every front has a clock, no
   secret leaks into the player's view, heat and lines/veils are honoured, licences are credited,
   nothing is missing. This is the correction loop that has to pass (c3, held as a maybe). A
   failure sends you back to the table with reasons.
5. **The door:** session one starts and the Director takes over.

**The guard's in-world name is the Doorkeeper** (Jay, same night). "Guard" stays free for his
Claude Code plugin. `preflight.py` is the Doorkeeper in the fiction; renaming files waits for
the build.

## 2026-11-24 — CC-162 — The Loom becomes the Deal

QuestBook's builder is publicly "The Weave" and internally "the Loom", so both of Seren's words
collided. **The campaign builder is now the Deal, and the verb is "deal": "deal this hand"
replaces "weave this hand".** Jay: it "goes with the fortune teller vibe". It's one deck: a
campaign is dealt, its starting cards are the hand (already Seren's word, `hand.json`), and, if
ever needed, the laid-out opening is "the spread". Renaming the code (`loom.html`, `loom.ps1`,
the "weave" wording in the Seren skill and docs) waits for the 1.5 build, because of its blast
radius. Everything else from the open-questions list waits too.

## 2026-11-24 — CC-162 — Seren 1.5 scope, Jay's picks

Picker: https://claude.ai/artifact/CvXAmxKXvRrV1rR8aiusWd. How the platform pieces get built is
still open until the MCP plan (see the entry below).

- **In:** Seren inside Claude (MCP) · the table as an app inside Claude · secrets the model never
  holds · dice the model can't fudge · the Director · fronts and clocks as the villain system ·
  DM mischief · the side-quest library · DM personas with their own lists · instances (dungeons, then
  towns, castles, cities) · the campaign chronicle · turning any material into a campaign · an
  original starter campaign · session zero as a form · multiplayer, each player with their own
  Claude · rename the Loom · Squint inside Seren.
- **In, with an edit:** the world moves while you're away, **as a player option** (Jay: "Yes but
  player optional").
- **Later:** any model can be the DM.
- **No:** "confess your worst DM crime".

## 2026-11-24 — CC-162 — Seren 1.5 additions, Jay's picks

From the competitive dive (red team + Campfire, QuestBook and corpus-gap follow-ups). Page:
https://claude.ai/artifact/BGxKCy8jjgGsE3aXDnnePd

**Jay's rule: every MCP or backend pick is a MAYBE**, until a plan asks "how do we build the MCP?"
rather than "build the obvious MCP". Check our own systems first (Imprint sessions and MCP v2,
guard approvals, Judgement OS, MINDER) before lifting from rivals.

- **Yes, held as maybe (backend):** f1 the AI always reads as a player · f2 secrets hidden by default,
  fog fails closed · f3 a tool policy that changes with the phase of play · m1 one tool registry,
  strict arguments, one error shape · m2 building writes directly, table moves wait for approval ·
  c1 two-step import with preview and rollback · c2 undoable weaves · c3 a correction loop that has
  to pass · h1 a scribe that drafts into a review queue.
- **Yes (design and content):** d1 fronts from Dungeon World's open text (CC BY 3.0) · d2 clocks and
  the faction game from Blades in the Dark (CC BY 3.0) · o2 the SRD 5.2.1 attribution done properly ·
  p2 rename the Loom (QuestBook's builder is internally "the Loom"; the new name is still to choose).
- **Later:** d4 seeds as a backlog and an active list · p1 run red team's five QuestBook tests.
- **No:** c4 "faithful or loose?" · d3 a player-visible tempo dial.
- **No:** o1 Ironsworn's oracles (Jay, same night). They mostly overlap with Seren's own seeded
  randomness and libraries, and commercial use needs per-item licence filtering and credit. If an
  oracle is ever wanted, we write our own.

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
