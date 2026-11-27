# Decisions — Unstuck Games

## 2026-11-26 — local Seren session — A published campaign deals hands, not fates

**Every open slot is a hand you choose from, dealt from a deck on the table.** The local `/deal`
dealt one card per slot face down and the flip was the whole choice; Jay: "If a choice isn't locked,
why isn't there a fan of options?" Now:
- **The deck sits on the table** as a stack on the campaign's card back, and each slot's hand is dealt
  from it, so the backs are seen being dealt. Deal again redeals, so every visit is different.
- **Locked** cards are face up in chains. **Hidden** cards stay sealed under wax. Everything else is a
  fan you pick from (two for companions).
- **A who-you-play slot** joins the seven: about five characters (name, class, a tie) per campaign.
- **Picks don't have to fit each other.** The weaver writes the connective tissue from whatever hand
  was laid, using every card (`seren/web/weave.py`: "It is not allowed to invent the picks... the weaver
  writes the world those cards imply"). Jay's frame is a djinn: you get what you asked for, made to work,
  and the book is the reveal. That's why the deal isn't madlibs.
- **The library isn't hand-written per campaign.** It is the shared card library (thousands of tropes
  to build from), and each published campaign carries an allow list and a block list per category.

## 2026-11-25 — CC-164, continued — The table's look, and Squint's deck

**The shelf and table preview is the base look** (Jay: "So good"). Preview:
https://claude.ai/artifact/CtxcwRYa7gPoBB9cnSUszL. It is the Loom's own world (night-blue felt, gilt,
IM Fell English and Cinzel Decorative): the three campaigns in a list beside the chosen one's header
art, facts, locked chips and fanned card backs; Build my adventure deals that campaign's deck, locked
cards face up under a chain and padlock, the rest face down on its own back and turned one by one,
the Loom's sentence filling in, then the dials limited to the campaign's ranges. Static, from the
player-safe files only.

**Squint uses the campaign's deck** (Jay: "SQUINT USES THE CAMPAIGNS DECK"). When Squint is played
inside Seren, it is dealt on that campaign's own card backs, so the game within the game looks like
it belongs to the story. **The player always carries a Squint pack in their inventory, and its backs
are always the campaign's** (Jay: "So the player is always carrying a squint pack in their inventory,
and it's always the campaigns back"). It's starting kit in every campaign, not something to find.

## 2026-11-25 — CC-164, continued — The Seren MCP MVP plan, approved with edits

Plan: `seren/MCP-MVP-PLAN.md`. Page: https://claude.ai/artifact/LaVjcgKbuuLD8Lb4HoyZkF.

- **From scratch, in Python, in Seren's code.** The old `seren/mcp` folder was nuked (Jay: "we NUKE
  the existing seren mcp server!"), backed up first to `PROJECTS/_BACKUPS/seren-mcp-old-2026-11-25/`.
  MINDER is the pattern, not code we copy. The weave moves to Claude on Bedrock (Jay: "yes bedrock").
- **The flow (Jay):** install the MCP and sign in, in either order; one tool opens the app full
  screen, MINDER-style ("interactive app has to be a tool itself").
- **Three tools, read-only split from write** (Jay: "don't we need to split read only from
  destructive tools, per anthropic guidance?"): `open_seren` read-only; `seren_deal` and
  `seren_weave` additive; none destructive. Typed and hinted as the vault server's `tool-types.js` does.
- **Steps:** the campaign format with all three (blood-and-ink selectable) · hello, fullscreen · the
  shelf · the deal · the dials · the book · **the book saved and downloadable for red team, where the
  MVP stops.** The allowlist and the deploy go alongside, for the first claude.ai test.
- **M3–M5, yes:** an allowlist for the MVP (Jay and Andy), beside the Seren web server, tested
  locally first. Real sign-up is decided after the MVP.

## 2026-11-25 — CC-164, continued — Seren milestone one

Picker: https://claude.ai/artifact/NpLYjLFgEC9hKqVWmUnNuV. **Milestone one is the first magic
moment, inside Claude:** choose a campaign (a summary card each), the deal, the dials, and the
book handed over.

- **K1: the weave stays as it is; only its inputs change.** Checked in the code: the Loom deals in
  the browser with `Math.random` and calls the server only for `/api/weave` (`seren/web/server.py`),
  which writes on Bedrock, audits, and makes one fix pass. A published campaign adds its template,
  its locked and hidden slots, and the cards dealt from its decks. No new AI step.
- **K2: our server keeps the weaver for milestone one,** so the player's Claude never holds the
  secrets it writes. Jay's edit: "yes, but to do the interactive app we'll need to start the mcp
  server, with the 2-3 tools needed for this ;)"
- **K5: an MCP MVP plan comes just before milestone one** (Jay: "The MCP MVP plan does ;)"): the
  smallest MCP server with the two or three tools milestone one needs to run the app inside
  Claude. The full MCP plan still comes last.
- **K3: tighten blood-and-ink, show all three.** Jay: "We'll tighten blood and ink, and show all 3.
  The dopamine of SEEING stuff is all over my profile". All three originals get their summary cards
  on the shelf in milestone one; blood-and-ink is the one fully reviewed and decked.
- **K4: a campaign can set each dial's range,** full range by default. The dials always stay.

## 2026-11-25 — CC-164, continued — Published campaigns: locked cards, dealt cards, two doors

**Two doors at the table, both kept.** Deal a campaign from scratch (the Loom as today), or pick a
published campaign.

**A published campaign is played through the same table.** Its author locks the cards that make
it that story (trope, world, trouble) and writes a small deck for each other slot: 3–4 origins
(ways in), the companions from its own cast, the personas it suits, and 2–3 antagonists. The
dealer deals from those decks. **Dials always stay** (Jay, in capitals). The book is written after
the deal, from the published template plus the deal plus the dials, then the Doorkeeper checks it.

**Every card slot has three modes, set per campaign: dealt, locked or hidden** (Jay: "any given
card type needs to be \"lockable\" or \"hiddne\" per campaign"). Dealt: face down, the player flips
it. Locked: arrives face up in chains. Hidden: dealt face down and sealed, so the player doesn't
see it at the table.

**The antagonist is normally shown.** Jay: "why wouldn't we tell player the baddie? ... to never
say \"hey the magistrate wants you dead\"?" Knowing who wants you dead is part of the fun, as in
the Loom today, where she turns her card over. Hiding it is a per-campaign choice, for a mystery
like blood-and-ink's "who killed Agnes". A hidden card's seal breaks when the story reveals it in
play; the chronicle breaks any still sealed at the end, and "roads not taken" can say who else it
could have been. The fog holds a hidden card on the server.

**How it looks (Jay):** published campaigns deal every card face down, with a card back made for
that campaign (generated art, "custom gpt generated backings for each"). The player flips one at a
time. **A locked card arrives already face up, in chains;** a hidden one arrives sealed.

**All three originals get published** (blood-and-ink, quire, tallage), each reviewed and
tightened, given its decks, and lifted out of `LIVE/` without Jay's own played sessions.
blood-and-ink is the starter.

## 2026-11-25 — CC-164, continued — The Seren 1.5 starter campaign

Picker: https://claude.ai/artifact/RFjPMiLe4Jp8UfGiAfHtWf.

- **S1, S2: yes. The starter is blood-and-ink**, one of the three original campaigns dealt at the
  Loom in October (level 3; Agnes Tull dead in her own pressing pit, the wake tonight). No new
  campaign is written.
- **S5: yes. The first dungeon is under the press:** the pressing pit and the cellars, about five
  rooms, holding the answer to how Agnes died.
- **S3, no "house hand".** Jay: "So the player chooses a campaign then sits at the table. The table
  deals the options inside that campaign. So I'm not sure why anything but the cards that could be
  dealt would be set?" CC had it wrong: the starter is a campaign you choose, and the table still
  deals the cards inside it. Nothing is pre-dealt.
- **S4, the book is the magic, and it stays.** Jay: "showing friends the table itself and hte
  \"book\" it made (summary handed to the player before going into claude in old system) WAS a
  MAGICAL experience". The book is the player's briefing handed over before Claude takes over (as in
  `LIVE/tallage/briefing.md`). CC's card was about something else and badly named: blood-and-ink's
  folder holds Jay's own played session one, which isn't part of what other players get. That's a
  packaging note for the build, not a design question.

## 2026-11-25 — CC-164, continued — Seren engine settings, Jay's picks

Picker: https://claude.ai/artifact/Vg8k39Q6AGPZgytviYnMsW. All numbers are starting values, tuned in play.

- **E2 How busy the story gets: yes.** Counts heat, not threads. About 3 at once, 2 on the main
  plot, up to 5 when wandering, hard ceiling 6. At the ceiling it merges or revives, never opens.
- **E3 Side quests: both.** A few dealt in the fortune teller's hand, more drawn by the Director in
  play when there's room.
- **E4 Persona limits: yes.** Each of the four personas (The Play Master, The Rulemaker, The Jester,
  Wick) gets a heat limit and a short always/never list. Cruel is off for everyone by default and
  only the tuning dials switch it on.
- **E5 Scoring: yes.** Funny, story, solo fit and cost, 1–3 each. Agents score all 215 first, Jay
  vetoes, and the top ~30 of each ship in 1.5.
- **E1 The timing floor: replaced by a judge, approach agreed, details open.** Jay's edit: "can we
  not just feed this to jev for \"is this additive or destracting\"? That's what we're really going
  for: randomness that entertains, not randomness that constantly has adhd people chasing side
  quests?" So the goal is randomness that entertains, not a timer. Before the Director fires, a
  judge model answers one question: does this add to what's happening, or distract from it? The
  Director's pick stays deterministic (A6), and the judge can only veto. Which judge is a backend
  pick, so it's a maybe until the MCP plan: Jev (outside, classify-only), or our own LABS Second
  Opinion judges first, per the check-our-own-systems rule. **Backstop under the judge: at least 7 player
  turns between Director events** (Jay: "Yes, keep it", then "the backstop should be a 7 turn gap as
  minimum"), because a judge can be wrong or slow, and so the judge isn't asked every turn (Jay:
  "otherwise we're constnatly asking jev"). Nothing fires within 7 turns of the last event,
  whatever the judge says; after that, the judge decides. Long cons waiting
  in the cold pile don't count until they fire.

## 2026-11-25 — CC-164, continued — The Seren version cut: 1.5, 1.6, later

Jay's picks on the versions picker (https://claude.ai/artifact/3oy46G41rzYB3ZaP1SqifX), 19 pieces.
Dates come later, from the specs.

- **1.5:** the one engine (A1–A8) · Seren inside Claude (MCP) with dice and fog · the table app · the
  Deal and the Doorkeeper renamed · the Director with fronts and clocks · a scored subset of mischief
  and side quests · two DM personas · session zero (see below) · an original starter campaign with
  one small dungeon · the chronicle · **turning any material into a campaign** · **the map with fog
  and the rest of the table** · **Squint inside Seren**.
- **1.6:** multiplayer · towns, castles and cities · any model as the DM.
- **Later:** the world moves while you're away · seeds as a backlog · red team's QuestBook tests.

Where Jay moved CC's picks: material-to-campaign, the map and Squint up from 1.6 to 1.5. Towns and
any-model up from later to 1.6. Away mode down from 1.6 to later (A8's clock is still built in 1.5).

**The table app, Jay's edit:** "yes to 1.5, I think this is probably table stakes now, but still, we
have one built, now that we can build interactive apps that chat can talk to and can talk back, and
we can do animations, this gets a serious rethinking. Honestly this would be a fun little thing to
work on earlier than later!" So the table app is in 1.5, gets rethought rather than ported, and is
a candidate to start early.

**Session zero: not a separate feature.** Jay's edit: "as a \"form\"???", then: "In my head we were
keeping that flow, just that it'd be in claude in an interactive app that was sexy and cool? I
don't remember ANY chat mechanic with other players negotiating the campaign?" Right: the card came
from a tabletop idea (a group agreeing tone and limits before play) that Seren, a one-player game,
doesn't have. Seren's existing start flow already does that job: the fortune teller deals the cards
(some random, some player preferences), the tuning dials, the Doorkeeper, the door, and the campaign
boots in Claude. 1.5 keeps that flow and moves it into Claude as the interactive app.

## 2026-11-25 — CC-164, continued — Seren 1.5 architecture, Jay's picks

Settled before the specs, because the specs come next and the MCP comes last. Picker:
https://claude.ai/artifact/DE7GLJ9TTc7tX92rWXmpCu. All eight are yes; one has an edit.

- **A1. One Seren, not two.** The web port's Python (`seren/web`: `state.py`, `fog.py`, `dice.py`,
  `gate.py`) becomes the one engine. Local Claude Code Seren becomes a way to play and test that
  core, not a second implementation, and its scripts (the Deal, the Doorkeeper) move into it or call
  it. The MCP will later be a thin layer over the same core. *Why:* `seren/DELTA-CC-VS-WEB.md` shows
  the two already play differently.
- **A2. State changes only through code.** `SEREN/docs/architecture.md` §1's "path 2", taken now: the
  model can only change state by asking the code, which refuses a change without a reason and the
  roll it rests on. *Why:* the founding rule ("the model never decides what is true") is otherwise
  only half true. We give up measuring unguarded drift first.
- **A3. The event log is the record.** `ledger.jsonl` is the truth, and `party.md` and `scene.md`
  are views built from it (`state-formats.md` §2.5). A fix is a correcting event, not a hand edit.
  *Why:* the chronicle, undo, away mode and multiplayer all become ways of reading or adding to it.
- **A4. Campaigns stay readable folders,** with storage behind one interface. The selfActual vault
  option wasn't taken up.
- **A5. The book is fixed; play sits on top.** The campaign is fixed and versioned when the
  Doorkeeper passes it, and play is a separate layer. *Why:* clean redeals, replays and undo, and
  the chronicle can compare what was dealt with what happened.
- **A6. The Director is code, not prompt:** deterministic, with seeded randomness, reading the log
  and the fronts. The model gets what was chosen, never why.
- **A7. Fog: hidden by default, yes for 1.5. Per-player visibility waits for multiplayer.** Jay's
  edit: "We aren't doing multiplayer yet. So yes for 1.5 but not til mP". So 1.5 builds fog that
  fails closed for one player, and the per-player lists come with multiplayer.
- **A8. A clock on the server:** one scheduler that adds timed events to the log, off unless a
  campaign switches it on. It drives away mode now and turn-waiting when multiplayer comes.

**Knock-on: multiplayer moves to 1.6** (A7's edit, then Jay: "Put it in 1.6"). It was in the 24 Nov
1.5 scope. 1.6 is the first named version after 1.5.

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

## 2026-11-26 — local Seren session — The sheep chronicle can go on the public /next

The campaign-end chronicle on /next retells Seren's first campaign, *A Wild Sheep Chase* (R.M.
Jansen-Parkes, Winghorn Press, 2016; DMs Guild content, marked `shareable: no` in SEREN's module
file). Jay's call: keep it, credited. The chronicle names the author and publisher and says the
module isn't bundled with Seren. The module files themselves still never ship.

**Why:** it's the real first game, and the chronicle is a retelling of what our table did, not the
module's text. Credited is enough for Jay.

## 2026-11-26 — local Seren session — Bring your own character: the ladder, in the MCP app

Built after Jay's YES JAY APPROVES (26 Nov). `seren/web/leveller.py` (rules from SEREN's
`library/2024/core.md`, all twelve classes; SRD checks from `library/srd-5.2/`), `ddb.py` (D&D
Beyond), `bring.py` (the store), four MCP tools and three web routes over the same code, and a
who-you-play step plus the ladder in `deal.html`.

- **Two ways in.** A D&D Beyond link to a character set to **Public** (the character service answers
  403 for private ones, even inside the owner's signed-in browser, and Seren never asks for the
  sign-in token). Anything else: the player attaches the sheet (D&D Beyond's PDF) in the chat and
  Claude passes it to `seren_character` as a sheet. *Why:* tested 26 Nov on Fingolfan (private, 403)
  and Ser'en (public, read in full).
- **What the rules on disk can't check goes to the chat** (Jay): a non-SRD subclass, item, spell or
  feat is marked, "ask in chat" posts the question as the player's message, Claude talks it over and
  records `seren_ruling`, and the ladder picks the ruling up. Every ruling is written into the build.
- **The gate is devolve.md section 2:** no build is written until every rung is decided and every
  magic item has a fate. The items step comes once, at the last tier crossed.
- **A brought character keeps its name.** The auditor's no-one-called-Seren rule (written because the
  weaver reached for the DM's name) now exempts the player's own brought PC; anything the weaver
  names itself is still refused. *Why:* Jay's own PC is Ser'en, and the full flow failed on her.
