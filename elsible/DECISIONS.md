# Elsible — decisions

What was decided and why, dated. Newest first.

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
