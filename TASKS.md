# Tasks — Unstuck Games

Decided work, in priority order. `[ ]` open · `[x]` done. Ideas that aren't decided live in
[`IDEAS.md`](IDEAS.md). Where things run: [`INFRA.md`](INFRA.md). The 19 Nov audit behind this
list: [`STATUS-2026-11-19.md`](STATUS-2026-11-19.md).

## P0: Elsewhere back out (one player is asking)

- [x] **Reset Elsewhere's password**: 19 Nov, the one set on 16 Nov didn't open the door.
- [x] **Test Bedrock in a real Elsewhere turn**: 19 Nov, briefing narrated, order interpreted, watch sealed.
- [ ] **Find the player's request.** If it came through "Ask for a key" before 16 Nov, it's on the
      old box or in Gmail. If it came after, it's on the new box and was never emailed:
      `.\infra\box.ps1 contact-log -Live`.
- [ ] **Mail in SA's account** (move open loop #1): SES identity `unstuck-games.com`, 3 DKIM
      CNAMEs at IONOS, verify Jay's Gmail. Until then "Ask for a key" saves to disk and nobody hears.
- [ ] **Set the budget** that `sa-account.ps1` skipped: rerun with `-AlertEmail`. Do it before
      handing out keys.
- [ ] **Draft the note to the player** with the new password. The password changed in the
      16 Nov move, and the old world didn't carry over. Jay approves and sends it.
- [ ] **Jay plays a session himself** before the note goes out.

## P0: SEREN with the player's own Anthropic key

- [ ] **Jay picks the route:** BYO key on the web table, or SEREN over MCP in the player's
      own Claude. The plan in `STATUS-2026-11-19.md` §5 lays out both.
- [x] **Test Bedrock in a real SEREN turn**: 19 Nov, Nova Pro narrated, `/api/turn` returned 200.
- [ ] **Add the player to the guest list:** `SEREN_ALLOW` in Parameter Store, plus Google
      test users. Both lists are needed.
- [ ] Build the chosen route (one PR), test it in Chrome with a test key, and deploy it.

## P1: After the move

- [ ] Re-send Bunny's new link (`box.ps1 bunny-links`).
- [ ] Retire the old account (P4 of `PLAN-SA-MOVE.md`): root sign-in → Troubleshoot MFA.
- [ ] Disable the old Google client secret once the old box is gone.
- [ ] Update the README's game list and the `INFRA.md` box table: it still names account
      `968053968391` and `18.225.22.191`, but the box is now `i-0d7871ef3ccb0364c` at `18.190.113.119`.

## P2: Later

- [ ] Decide whether SEREN and Elsewhere move from Nova to Claude on Bedrock (SA's quota allows it).
