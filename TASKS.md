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

## P2: Later

- [ ] Decide whether SEREN and Elsewhere move from Nova to Claude on Bedrock (SA's quota allows it).
- [ ] SEREN own key for more players: today it's one email list (`SEREN_BYOK`). Decide the
      policy (guest list or paid) when there's a paid tier.
