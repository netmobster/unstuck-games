# Elsible — decisions

What was decided and why, dated. Newest first.

## 2026-10-04 — CC — Test 1 at the door

Jay dealt a life at the live parlor and took it through the door on 3 Oct, late. It came out as
Maren Okafor-Lind, 29, a creator who walked through a laundrette door into a lantern city. **The
whole door ran: the weave took 36 seconds, the audit 16, under a minute from envelope to page**
(the pinned sub-agents, against 12 to 15 minutes before). Findings from the session that ran it,
and what changed:

1. **It opened in the wrong folder** (SEREN, with the life folder added alongside), so the
   doorkeeper's `CLAUDE.md` never loaded and the kit's relative paths pointed at SEREN. The weaver and
   auditor loaded anyway. *Changed:* the README and `new-life.ps1` say to start a new session whose
   own folder is the life.
2. **"elsible test 1" isn't the trigger phrase.** *Changed:* the doorkeeper opens the door on the
   first message in a life folder, whatever it says.
3. **The auditor couldn't catch a misread roll.** *Changed:* it reads `life/roll.txt` and checks the
   number in `hidden.md` matches; if they differ, the roll wins.
4. The auditor mended something on its first pass; what, only `audit.md` says. Working as intended.
5. **`pitch` was in the core deck and the business pack.** The pack's copy was a v3 leftover in a
   slot v4 no longer has. *Changed:* removed, and the pack's two roles got a want and a conflict like
   the core roles.
6. **"Out of sight" means out of the main conversation:** the weaver's and auditor's cards can be
   expanded to show what they wrote. *Accepted as an honour system,* like the files on disk; the
   README and `new-life.ps1` say not to.
7. **The reveal's footer read "Told by The true-crime podcast".** *Changed:* the template lower-cases
   it.

## 2026-10-03 — CC — The door, built

Jay signed off the parlor and it went live (PR #130). The door is the next piece: what happens
between the envelope and the story. Built locally in `elsible/door/`.

1. **The doorkeeper is Claude Code reading `door/CLAUDE.md`,** in a folder made from the kit and
   the player's envelope (`new-life.ps1`; each life under `~\Elsible\lives\`). One voice, only the
   transition: it opens the envelope, has the life written and checked, says how her card landed,
   shows the reveal and steps aside.
2. **The weave and the audit run in sub-agents,** so the hidden half is written where the player's
   screen never shows it. The doorkeeper never reads `life/hidden.md`.
3. **No Python and no server.** The roll for her card is a real roll from the shell (PowerShell's
   `Get-Random` or bash's `$RANDOM`), and the reveal is a page Claude Code fills from a template and
   opens itself. *Why:* the home page promises one install and one typed line.
4. **The rehearsals worked:** a throwaway hand (fake dating, the bridesmaid, the wedding weekend)
   became Hattie, 31, a florist (Opus), and Josie, 32, a Year 4 teacher (Sonnet); the audit passed
   both. Jay: *"that's... phenomenal...."*
5. **The weaver and the auditor ship as the door's own sub-agents** (`door/.claude/agents/`):
   Sonnet, `effort: medium`, read and write only, a few turns, `omitClaudeMd`. *Why:* the
   rehearsals took 12 to 15 minutes a weave, whatever the model or brief, because sub-agents
   launched ad hoc inherit the session's effort (here, the maximum) and load the user's whole
   CLAUDE.md. The roll moves to the doorkeeper, written straight to `life/roll.txt` unseen, so the
   sub-agents need no shell. Jay's first real run is the timing test.
6. **Play is the next build.** The door ends with "The door's open. Your narrator takes it from
   here."

## 2026-10-03 — CC — Her card: one card, in the river

Jay, playing the parlor: her card sat in three places, two of them turnable, and nothing said that
turning it had consequences. His fix: *"card is only in the 'river'... and there are two buttons:
'open the door' and 'turn her card... but be careful'"*. **This entry supersedes the ones below
where they differ.**

1. **Her card is one card, face down in the river** (the table's last slot) once the life is set.
   The corner card goes back to Claude Design's decoration, "Hers. It stays down.", and there is no
   red anywhere (Jay: "no to the red card/overly texty card").
2. **Two choices under the sentence: open the door, or turn her card.** Turning is the risk: the
   doorkeeper sees what you turned and judges you for it (the djinn). Open the door without turning
   and the life comes as picked, near enough. *Supersedes* "seal it in, or leave it with her" at the
   door, and makes the dealer's complication optional (3 Oct, "back to the Loom's feel", #2).
3. **Once turned, she can play another.** Every refusal is seen by the doorkeeper too.
4. **The envelope:** `djinn: sealed` when her card was turned, with that card as `pressure`; `left`
   when it wasn't. The severity ladder and "upright or reversed, told at the door" stand.

## 2026-10-03 — CC — The djinn card, and who builds the parlor

Jay's answers on the Djinn Card page (https://claude.ai/artifact/QYPBKiY89Bw3DUYrgZXr6F).
**This entry supersedes the ones below where they differ.**

1. **Turning her card is the player's choice.** At the end of the deal she offers her last card:
   seal it into the envelope, or leave it with her. Left, you get the life you picked, *ish*: the
   doorkeeper still makes the pieces fit, and the dials change how the cards are read, never which
   cards you hold.
2. **Sealed, the doorkeeper rolls how hard it bites.** Jay's severity ladder:
   1. a boon: purely additive and surprising (a gift, or a detail like the age you start at);
   2. the hidden half turns against you;
   3. one of your cards bends;
   4. the whole life tilts;
   5. every card turned to its extreme.

   *Djinn rules: mostly worse.* Turning is a cost, with a chance of a boon. The default roll is
   2d3−1 (1 and 5 one in nine each, 3 one in three), to tune after test 1. The doorkeeper rolls;
   the player never does.
3. **At the door you're told upright or reversed, not what it changed.** Upright is the boon,
   reversed is a cost. *Why (Jay):* "add tension, the player is LOOKING for the cost, but doesn't
   know what it is."
4. **Three roles, one voice each.** The reader is just the cards. The doorkeeper is just the
   transition. The narrator picked under Told by is the DM. *Why (Jay):* Seren had a stretch where
   the narrator and the AI both talked as characters.
5. **The parlor first, and CC builds it.** Claude Design is done unless new assets are needed. CC
   takes its files into `elsible/site/` and makes the fixes itself. The door gets built after Jay
   signs the parlor off. Jay: *"You keep wanting to pass stuff back and I'm not sure why?"*
6. **The contact address is jay@unstuck-games.com** (it takes mail: MX at IONOS, checked).

## 2026-10-03 — CC — The sealed envelope, and Claude Design's first pass

Claude Design built a parlor and a home page from the briefs. CC played the parlor and read both
(the read-back: https://claude.ai/artifact/5Vx133aRJN5NKL5MM7PRyh). These are Jay's answers, and
one call he made in chat. **This entry supersedes the ones below where they differ.**

1. **The web hands you a sealed envelope; the doorkeeper weaves.** The parlor deals and your cards
   go into an envelope. Claude Code is the doorkeeper: it opens the envelope, weaves and audits out
   of the player's sight, and reveals the life at the door. *Supersedes* 2 Oct #11 (the web writes
   the reveal). *Why:* the AWS account moved to a new box this morning without Bedrock (a bug is
   filed), so nothing can weave on the web today. And it holds up on its own terms: nothing secret
   exists until the door, the web needs no model, and it is what Claude Design built. Jay: *"It
   works narratively, and technically, and we can build today without needing bedrock."*
2. **The first part is finished before play is built.** The deal, the envelope, the doorkeeper and
   the reveal get played end to end and signed off by Jay first. Jay: *"Why would we move on if the
   first part isn't done?"*
3. **The reader's last card is a djinn.** Your cards are the wish; her face-down card is how it is
   granted: what you wanted, better, or worse. *"You pick your cards, but there's always a bit of
   unknown."* The doorkeeper turns it at the door. How it works is open (the Djinn Card page).
   *Changes* the read-back's objection to "upright or reversed is decided when the door opens":
   under the djinn that is the grant, not the ending, so it stands.
4. **The premise is a second go.** Jay's wording for the home page: *"A life, maybe yours, taken at
   the other fork."* It is not necessarily your life. The deck never asks for your real one, and
   every Other stays invented (2 Oct #10).
5. **Dice stay, at knife-edge moments only.** The home page says "Nothing to roll."
6. **Contact is an unstuck-games.com address.**
7. **The invitation to pack writers stays** on the home page.

## 2026-10-03 — CC, the server move — the deal prototype goes up at elsible.unstuck-games.com

Jay asked for the push: *"Yes: push the committed deck-v4 state and put the deal prototype up as
a static page."* It's the first game on the new box. SEREN was first in the order, but it waits
for the new account's Bedrock quotas.

1. **What's live is the deal prototype from deck v4, as a static page.** Away from claude.ai the
   weave falls back to the plain version, so the site runs no AI. The web model is still decided
   at go-live (decision 11 below).
2. **`build.py --publish` writes `elsible/site/index.html`, and that's committed.** The subdomain
   serves `elsible/site/` and nothing else, so the docs and engine stay off the address. They
   are still public in this repo.
3. **Pushing is per ask.** Decision 2 below still holds: this push was asked for, and the next
   one needs asking for too.
4. **Later that day: a holding page at the root, a place on the switcher, and the prototype
   moved to `/play/`.** Jay: *"just build elsible in as a blank page on the switcher, another CC
   is building it and will build those pages."* Every Unstuck game has its page at the root and
   its game at `/play/`, and Elsible follows that now. `build.py --publish` writes
   `elsible/site/play/index.html`. The holding page is `elsible/site/index.html`, for the session
   building Elsible to replace.

## 2026-10-03 — CC — Elsible moves to unstuck-games, and builds local

Elsible started inside the SEREN repo (branch `seren/story-deck`), because the engine it plays on
lives there. Jay: *"Why are you in Seren for pushes??? Should be unstuck Games repo under elsible
dir? But also why are you pushing when we are building local?"*

1. **Elsible lives here, in `elsible/`.** Everything, including copies of the Seren engine pieces
   it plays on (bonds, tension, the Bonds tab, story hands, the live-table charset fix), in
   `engine/`. *Jay's pick:* everything to `elsible/`, two copies of the engine pieces, over
   leaving them in SEREN.
2. **Local only.** Commits stay on this machine; nothing is pushed unless Jay asks for that push.
   The branch already pushed to SEREN (`seren/story-deck`) is left as it is, and not pushed again.

## 2026-10-03 — CC, story-game fork — back to the Loom's feel

Jay played the Loom on seren.unstuck-games.com with CC watching, and corrected the course:
*"I feel like you've lost seren ... and tried to over-engineer something that worked."* The
prototype had three cards a slot, a pointless turn-them-over step, three passive card backs, and
a deck tilted to startups (written straight after Rina's VC story). **This entry supersedes the
one below where they differ.**

1. **No dealt face-down cards.** The weave invents what is underneath (the undercurrent, the
   secret, what happens if nobody intervenes) from the random hand, and the auditor makes it
   true. "and then..." becomes the last line of the reveal. *Why:* that is how the Loom already
   works, "Seren has not read your hand, only the campaign it became"; dealing the hidden layer
   from a list took the weave's job away from it. *Supersedes* item 10 below and the face-down
   slots of deck v2.
2. **The dealer plays a complication back at you**: the pressure on your life, with "make her
   play another". The player picks everything else. *Why:* Seren's one counter-card is the
   tension beat of the deal.
3. **Five cards a slot, never locked:** redeal a slot, a whole new hand, or "play it out for
   me" for a complete random hand at once. The hand's sentence writes itself as you pick.
   *Supersedes* item 9 below ("a few cards").
4. **Not the Loom's deck: Elsible's own, made generic.** The trope research, settings and
   backstory stay. The inputs change: people instead of job titles, broader than one world.
   **Packs come later** (romance, thriller, horror, business); the investor, the raise and the
   audit move to a future business pack. The core does not try to cover every path.
5. **The 14 undercurrents are the weave's reference material**, never dealt.
6. **The reveal is the magic.** Elsible's version of "your loom is woven": the hand's sentence,
   the weaver and the auditor working in view, a title, and a real person (a name, a past, what
   they want, the people around them with history), one line into the first morning, drama
   hinted, ending "and then...". Jay: *"that's a world you're stepping INTO."*

## 2026-10-02 — CC, story-game fork — Elsible, locked

**Name: Elsible.** *"You were dealt a life, and then..."* Locked with the design after red team
revision 1 (whiteboard), CC's read-back, and a second round of questions. The design is
[`docs/elsible.md`](docs/elsible.md). **This entry supersedes the two below where they differ.**

From red team revision 1, taken: the undercurrent (latent narrative pressure, not a plot); the
authority boundary (the player acts, the world answers); audience as a hypothesis, genre-agnostic
engine; PG-13 product-wide, fade to black; test 1 is a fresh hand, deal → weave → play, "was that
fun?"; delivery parked (web deals, Claude Code weaves and plays); face down is a feature.

From the read-back, Jay's picks:
1. **The face-down ending becomes the `if full:`**: what happens if nobody intervenes. The clock
   runs; the engine never steers. *Supersedes* "the ending is dealt face down and the engine
   steers toward it". *Why:* the undercurrent can be derailed, and a destination the engine steers
   to is a branch.
2. **Each card's beats become signals**: evidence the narrator can surface, in any order or never.
3. **The life is dealt first; the face-down cards are dealt from what that life makes possible.**
   *Why:* dealt the other way, the face-up cards gave the hidden one away.
4. **The weave makes two outputs:** a player-facing "your life" briefing (what you are stepping
   into, not the opening scene) and the hidden folder.
5. **Impulse:** a mood can start something at a charged moment; the player can say "not me"
   before the world answers. *Supersedes* the court as pure comedy; the goal is surprise.
6. **Jay tests first, knowing the deck.** The weave makes the undercurrent specific; a guess log
   records whether and when he guessed. *Jay:* knowing "a bad origin, a partner and a town" says
   nothing about how they combine.
7. **One deck, no packs yet. Who may play: parked.**
8. **Principles 11 and 12 added:** the story starts in the middle of a life; the world grows where
   you look.

From the second round:
9. **The life is picked Loom-style:** a few cards dealt per slot, pick one, redeal any slot,
   nothing locked until the player says so.
10. **Three card backs land on screen after the life is locked**, marked "and then...".
11. **The web writes the "your life" reveal; the full weave and the hidden folder stay in Claude
    Code.** The web model is decided at go-live; prototype locally with Claude first.
12. **"Undercurrent" is internal only.** Players see "and then...". *Why:* the word is crowded.
13. **Build order:** docs and decisions, then the deck, the engine, the weave, a local web
    prototype, then test 1. Local first, each piece shown working before the next.

## 2026-10-02 — CC, story-game fork — the concept, and a working name

- **Core concept:** you're dealt a life; the story is dealt face down. Wake up inside a
  story you didn't choose and co-write it with a narrator who never forgets. Isekai is the
  shape of it ("I woke up as the villainess"): a role you didn't pick, a plot you don't know.
- **The Spine is dealt face down**, with the Secret and the ending. The player sees Role,
  World, the Other, Pressure, the Circle, Told by and the Modifier. *Why:* the turn has to
  be a reveal; Rina's worked because she didn't see it coming.
- **Audience (assumed, not measured):** people who want to co-author a story or live a
  fantasy, likely mostly women (otome, Choices, otome-isekai), plus isekai readers. Not D&D,
  never "AI boyfriend".
- **Working name: Storybound.** Not final; red team does the name research.

## 2026-10-02 — CC, story-game fork — a second deck, and an engine it can run on

From the MultiChoice reports *The Story Deck* and *The Rina File*, Jay's picks.

**The goal is the engine, not a game.** A deck and an engine from which a story like Rina's
*could* come out of a dealt hand. Rina's six-week GPT roleplay is the acceptance test, not
content: if a hand only produces her story because we wrote her in, the deck has failed.

1. **A second deck, nine slots:** Spine, Modifier (optional), the Other, Pressure, Secret,
   the Circle (two), Role, World, Told by. *(The report said eight; the count was wrong.)*
2. **Role replaces Origin.** Who you are here and what your days are made of. *Why:* Rina
   was interesting because she inhabited her world from the start: a job gave her a reason to
   be in every scene and a lens on all of it, and the romance grew in its cracks. Backstory
   cards (Made, Chosen) cannot do that.
3. **The weave opens mid-life:** an ordinary day in the role, the spine not yet visible.
4. **First spines (14):** the pitch got personal, enemies to lovers, fake dating, second
   chance, friends to lovers, marriage of convenience, forbidden, betrayal, the impostor, the
   long con, the mole, rise and fall, found family, and the file on them.
5. **One optional Modifier per hand** (slow burn, hurt and comfort, only one way out).
   Readers stack tropes; the deck should not multiply.
6. **Bonds:** a word, a direction and a lock on the table, the number DM-side, **plus a
   tension value that cannot be reset and forces the point of no return** (Star Crossed).
7. **The danger dial becomes cost:** what losing takes.
8. **Mixed genre:** romance, intrigue and the con in one deck.
9. **The ending is dealt face down at the start.** The engine steers toward it. *CC's call,
   same reasoning:* the Secret is dealt face down too; the report already said the engine
   holds it DM-side.
10. **The Other is always fictional.** No real person in that seat, Jay's own playtests
    included.
11. **New cards from Rina's week:** the file on them (spine), the one who doesn't know
    (Other), conflict of interest (Secret), the scene (World), the one with the rule and the
    committee in your head (Circle). **The confidant is an optional Circle card**, not a
    second narrator voice.
12. **Three mechanics the week invented get built, all three:** the ding (messages from the
    Other between scenes), draft here and send there (two channels), and the court (your
    moods argue out loud).
