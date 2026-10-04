# The door

What happens between the reader's table and the story. You hand the doorkeeper your envelope; your
life is written and checked out of your sight; you're told how her card landed if you turned it; and
the life you're stepping into opens in your browser, ending *and then...*

The doorkeeper is Claude Code, reading `CLAUDE.md` in this folder. It needs no Python and no
server: the roll for her card comes from the shell, and the reveal is a page Claude Code writes and
opens itself.

| file | what it is |
|---|---|
| `CLAUDE.md` | the doorkeeper: one voice, only the transition, and the eight steps from "I'm ready. Open the door." |
| `.claude/agents/weaver.md` | the sub-agent that writes the life (`life/reveal.json`) and what's moving underneath it (`life/hidden.md`) |
| `.claude/agents/auditor.md` | the sub-agent that checks the two agree and that nothing visible gives the hidden half away |
| `reveal.template.html` | the reveal page, in the parlor's look |
| `new-life.ps1` | sets up a life folder from an envelope: the files above, the deck, and your envelope |

The weaver and the auditor are pinned for speed: Sonnet, medium effort, read and write only, a
few turns, and none of the user's own instructions loaded. The roll for her card is made by the
doorkeeper straight into `life/roll.txt`, which nobody on screen reads.

## Play the first part

1. Deal a life at elsible.unstuck-games.com/play/ and download your envelope.
2. In PowerShell, from this repo:

   ```powershell
   .\elsible\door\new-life.ps1 -Envelope "$HOME\Downloads\elsible-envelope.md"
   ```

3. Open Claude Code in the folder it prints, and say: *I'm ready. Open the door.*

Each life gets its own folder under `~\Elsible\lives\`. **Don't open `life\hidden.md`:** it's the
narrator's.

## Not yet

Play: the narrator you picked, with the engine's facts, bonds, tension and live table. The door
ends where play begins. For people other than Jay, the parlor's download will carry this kit with
the envelope, so step III ("open Claude Code in that folder") works on its own.
