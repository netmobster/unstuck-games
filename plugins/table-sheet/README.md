# Table Sheet

Your character sheet lists Moonbeam. It doesn't tell you that it keeps burning
for ten rounds without costing another action, that moving it costs your whole
turn, or that 2024 rules only let you spend one spell slot per turn. Most
players find that out by losing a fight.

Point this at a D&D Beyond character and it builds the page you actually want at
the table: what every spell and feature does in plain English, what fits in one
turn, playbooks for the fights you keep having, roleplay notes from your own
backstory, and a checklist for before next session.

On the way it checks the sheet against itself. The first character we ran it on
had Revivify prepared and no diamond to cast it with.

## Install

```
/plugin marketplace add netmobster/unstuck-games
/plugin install table-sheet@unstuck-games
```

Then paste a D&D Beyond character link and ask for a table sheet.

## What it needs

- **Node 18+** for the two scripts.
- **A character it can read.** Public and link-shared sheets work on their own.
  Somebody else's sheet needs a token from a browser signed in to an account
  that can see it; the skill explains how, and never stores it.

## What it won't do

- Republish rules text from the books. Everything on the page is rewritten in
  plain language, for your character, from the sheet you point it at.
- Change your sheet. It tells you what it found; the edits are yours to make.
- Keep your character data. Raw sheets stay on your machine.

MIT. Built by [Unstuck Games](https://unstuck-games.com).
