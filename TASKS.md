# Tasks — Unstuck Games

Decided work, in priority order. `[ ]` open · `[x]` done. Ideas that aren't decided live in
[`IDEAS.md`](IDEAS.md). Where things run: [`INFRA.md`](INFRA.md). The 19 Nov audit behind this
list: [`STATUS-2026-11-19.md`](STATUS-2026-11-19.md).

## P0: Elsewhere back out (Roman asked to play)

- [x] **Reset Elsewhere's password**: 19 Nov, the one set on 16 Nov didn't open the door.
- [x] **Test Bedrock in a real Elsewhere turn**: 19 Nov, briefing narrated, order interpreted, watch sealed.
- [x] **Find the player's request**: 24 Nov. It came by Gmail on 15 Oct, before the move. The
      new box holds no contact messages.
- [x] **Mail in SA's account**: 24 Nov. It was already set up: the domain is verified with DKIM
      live, Jay's Gmail is verified, and sending is on. SES is still in sandbox, which is fine,
      because the contact form only ever sends to Jay.
- [x] **Set the budget**: 24 Nov. "Unstuck monthly", $25, alerts to Jay's Gmail. Jay confirms the
      AWS subscription email.
- [x] **The note to the player**: 24 Nov, Jay emailed Roman the password.
- [x] **`/play/` 404 fixed** (#157, 24 Nov): every PLAY button linked to `/play/`, and the
      server only answered `/play`.
- [x] **No play clock** (#158, 24 Nov): `ELSEWHERE_SESSION_MINUTES` defaults to 0. An open tab
      used to spend the 30 minutes. The AI caps (16 interpret, 14 narrate, 1 chronicle, 20¢) are
      the only limit now, and the pill reads "N OF 14 BRIEFINGS". The owner link skips the caps too.
- [x] **One panel, the turn as an accordion, bigger type** (#159, 24 Nov): live and checked in
      Chrome. Mockup: `elsewhere/mockups/layout-2026-11-24.html`.
- [ ] **Owner link**: set `ELSEWHERE_OWNER_TOKEN` (the command is in the 24 Nov session), open
      `/play?owner=…` once, and click New World. Unlimited only applies to worlds made after.
- [ ] **Jay plays a session himself** on the new layout.
- [ ] At 960px tall, the order step scrolls 72px inside the panel. It fits at 1120. Tighten it
      if it bothers anyone.

## P0: SEREN with the player's own Anthropic key

- [x] **Route and the three calls** (19 Nov, `DECISIONS.md`): web table · just this player ·
      Sonnet with Opus optional · a cap the player sets.
- [x] **Test Bedrock in a real SEREN turn**: 19 Nov, Nova Pro narrated, `/api/turn` returned 200.
- [x] **Built, merged and deployed** (#156, 24 Nov). `SEREN_BYOK` holds Jay's Gmail.
- [x] **Tested on prod with Jay's key**: 24 Nov. Opus narrated a turn, asked for a roll and
      resolved it, for 30¢ in total.
- [x] **Asked Andy for his Google email**: 24 Nov, in #andy-chats.
- [ ] **When Andy replies:** add his email to `SEREN_BYOK`, `SEREN_ALLOW` and the Google test
      users, then `seren-env` and `seren-start`.

## P1: After the move

- [ ] Re-send Bunny's new link (`box.ps1 bunny-links`).
- [ ] Retire the old account (P4 of `PLAN-SA-MOVE.md`): root sign-in → Troubleshoot MFA.
- [ ] Disable the old Google client secret once the old box is gone.
- [ ] Update the README's game list and the `INFRA.md` box table: it still names account
      `968053968391` and `18.225.22.191`, but the box is now `i-0d7871ef3ccb0364c` at `18.190.113.119`.
- [ ] Andy's 10 Nov messages in #andy-chats (couldn't pay at imprint.selfactual.ai/billing;
      unclear what to do after setup) look unanswered. That's SA, not UG; noted here so it isn't lost.

## P1: Seren 1.5 (scoped 24 Nov, CC-162)

Scope and every pick are in [`DECISIONS.md`](DECISIONS.md) (two 24 Nov entries). The vault super task is
SAI-1013. Pages: [launch](https://claude.ai/artifact/8DMghfTBSYgL6VXtLvJMWM) ·
[scope picker](https://claude.ai/artifact/CvXAmxKXvRrV1rR8aiusWd) ·
[additions](https://claude.ai/artifact/BGxKCy8jjgGsE3aXDnnePd) ·
[mischief](https://claude.ai/artifact/SfK3hUoUka2khhqeMAcPyF) ·
[side quests](https://claude.ai/artifact/Be3W7tTkgiSPPkjGnQsB4E) ·
[chronicle sample](https://claude.ai/artifact/554MdoTUMKSMEqaKuYdd8i) (private: licensed module).
Data, in the private SEREN-AI repo (moved off this public one 25 Nov): `libraries/mischief/pass-1.json`
(118), `libraries/sidequests/pass-1.json` (97). Published campaigns: `campaigns/published/` there too.

- [ ] **First: spec the game and the features** (Jay, 25 Nov: the MCP comes last, because it has to
      carry what the specs decide). Then a version roadmap and timeline. **Architecture settled 25 Nov**
      (A1–A8 in `DECISIONS.md`): one engine (the web port's Python), state only through code, the log
      is the record, the book fixed with play on top, the Director in code, fog fails closed, a server clock.
- [ ] **Last: plan how to build the MCP** rather than building the obvious one. Check Imprint (sessions,
      MCP v2), guard approvals, Judgement OS and MINDER before lifting from Campfire or QuestBook.
      Until then every platform and backend pick is a maybe.

**The cut, decided 25 Nov** ([versions picker](https://claude.ai/artifact/3oy46G41rzYB3ZaP1SqifX); `DECISIONS.md`).

**Milestone one (Jay, 25 Nov): the first magic moment, in Claude via MCP.** Choose a campaign
(a summary card each: title, header graphic, key info, description, starting level, tags for what's
locked and how much chaos is allowed), then the deal, the dials, and the book presented.
Decided (`DECISIONS.md`, 25 Nov): all three originals shown on the shelf, blood-and-ink tightened
and decked; the weave unchanged except its inputs, on our server; campaigns set dial ranges; an
**MCP MVP plan first**: the smallest server with the 2–3 tools the app needs.
**The order (Jay, 26 Nov): local, then web, then the interactive app.** The real dream is the deal
(the three campaigns plus generate-your-own) and the book, downloadable as markdown.
- [ ] **1. Local:** the Seren site running on Jay's machine with fake AI (`SEREN_AI=mock`), the
      approved shelf-and-deal look at `/deal`, and the book with a markdown download. Click it all in Chrome.
- [ ] **Then the campaigns:** tighten blood-and-ink, deck quire and tallage, felt in the local build.
- [ ] **2. Web:** a new `seren.unstuck-games.com/next` that holds it, wired to the real weave.
- [ ] **3. The interactive app:** the whole flow working inside Claude off the MCP.
- [ ] **Build the MCP MVP** (step 3 above) per `seren/MCP-MVP-PLAN.md` (approved with edits 25 Nov): seven visible
      steps from the campaign format to the book saved and downloadable for red team.

**1.5**
- [ ] The one engine, A1–A8 built.
- [ ] Seren inside Claude (MCP), SAI-1014 · dice the model can't fudge · fog that fails closed.
- [ ] **The table app, rethought** (Jay: "a fun little thing to work on earlier than later"). We have one
      built; now that apps can talk to chat and back, and animate, it gets a serious rethink. Includes
      the map with fog and the rest of the table. Goes with the animated fortune teller in `IDEAS.md`.
- [ ] **The Loom is now the Deal**, and preflight.py the Doorkeeper. Rename the code at build time:
      `loom.html`, `loom.ps1`, and the "weave" wording in the Seren skill and docs.
- [ ] The Director and the randomness engine, SAI-1017 · fronts and clocks (Dungeon World and Blades,
      both CC BY 3.0).
- [ ] DM mischief, SAI-1015, and the side-quest library: score both (SAI-1016), ship a subset.
- [ ] DM personas with their own allow/block lists. Local Seren already has four in `SEREN/dm/personas/`
      (The Play Master, the default; The Rulemaker; The Jester; Wick), so this adds the lists to them.
- [ ] **The existing start flow, moved into Claude as the app:** the table with the fortune teller deals
      the cards (some random, some player preferences), then the tuning dials, then the Doorkeeper and
      the door, then the campaign boots in Claude. Same flow as local Seren today, made sexy. (Replaces
      "session zero as a form", which was never a separate thing; settled 25 Nov.)
- [ ] **Publish the three originals** (blood-and-ink, quire, tallage): review and tighten each, write
      its decks (origins, companions, personas, 2–3 antagonists), lock its spine, and lift it out of
      `LIVE/` without Jay's played sessions. SRD 5.2.1 attribution copied from the PDF.
      **blood-and-ink is the starter**, with the first dungeon under the press.
- [ ] **Published campaigns at the table:** every card dealt face down on a card back made for that
      campaign (generated art), flipped one at a time. Each slot is dealt, locked (face
      up, in chains) or hidden (sealed until the story reveals it), set per campaign. The antagonist
      is normally shown. Dials always stay. Part of the table-app rethink.
- [ ] The campaign chronicle, SAI-1019.
- [ ] Turn any material into a campaign (corpus → campaign, SRN-17), SAI-1020.
- [ ] Squint inside Seren, SAI-589 (the trust model first). **Squint uses the campaign's deck**
      (Jay, 25 Nov): played at a campaign's table, it's dealt on that campaign's own card backs. The player
      always carries a Squint pack in their inventory, with the campaign's backs.

**1.6**
- [ ] Multiplayer, each player with their own Claude. Jay and Andy first, needs Andy's email;
      per-player fog (A7) and turn-waiting on the clock (A8) come with it.
- [ ] Towns, castles and cities (the instance ladder after the first dungeon).
- [ ] Any model as the DM.

**Later**
- [ ] The world moves while you're away (a player option; A8's clock is built in 1.5 regardless).
- [ ] Seeds as a backlog and an active list · red team's five QuestBook tests.

## P2: Later

- [ ] Decide whether SEREN and Elsewhere move from Nova to Claude on Bedrock (SA's quota allows it).
- [ ] SEREN own key for more players: today it's one email list (`SEREN_BYOK`). Decide the
      policy (guest list or paid) when there's a paid tier.
