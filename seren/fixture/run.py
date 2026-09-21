"""The fixture: one scene, one room, a cast written before anything was woven.

Run it:

    python seren/fixture/run.py            # http://127.0.0.1:8791

⛔ **This imports the real engine and patches four named things.** It is deliberately not
a fork. A forked engine would prove nothing about the one we ship — every result here has
to transfer, and it only transfers if the code under it is the same code.

**What it patches, and why each one is a fix we want to measure:**

  1  campaign_static() also reads canon/characters/
     The cast currently reaches nothing. `state.campaign_static` reads campaign.md,
     DM-persona.md, fronts.md and canon/antagonists/ — so a roster of named locals with
     wants is invisible to the DM however carefully it is written. One line.

  2  a pacing permission, and a persona that cannot excuse the beat
     Every rule in the contract is a prohibition, so the model has correctly concluded
     that saying everything at once is safest. Two short paragraphs appended to the web
     amendment; nothing is removed.

  3  a computed pressure line
     The server counts turns since anything arrived. At three it appends a fact — not a
     standing instruction — saying so. Recomputed every turn, so it cannot decay.

  4  a responsiveness count, written to the ledger
     How many named people other than the PC did something this turn. ⛔ An INSTRUMENT.
     It never gates, refuses, or changes a turn. A turn held for being uneventful would
     cost the player their turn, which is a worse bug than the one it measures.

Everything else — the dice, the fog, the facts, the tools, the table — is untouched.
"""
from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent                      # seren/
WEB = ROOT / "web"
REAL = ROOT / "content"                 # the shipped corpus: rules, library, roles
STAGE = HERE / ".stage"                 # assembled at boot, disposable
ACCOUNT = "tester"
SLUG = "the-weighbridge"


def stage() -> Path:
    """Assemble a content dir: the real rules, plus this one campaign.

    The rules are COPIED from the shipped corpus rather than duplicated in this folder,
    so the fixture cannot drift from the contract it is supposed to be testing.
    """
    if STAGE.exists():
        shutil.rmtree(STAGE)
    (STAGE / "dm").mkdir(parents=True)
    (STAGE / "docs").mkdir(parents=True)
    shutil.copy2(REAL / "dm" / "DM.md", STAGE / "dm" / "DM.md")
    shutil.copy2(REAL / "docs" / "state-formats.md", STAGE / "docs" / "state-formats.md")
    if (REAL / "dm" / "table-agreement.md").is_file():
        shutil.copy2(REAL / "dm" / "table-agreement.md", STAGE / "dm" / "table-agreement.md")
    live = STAGE / "players" / ACCOUNT / SLUG
    shutil.copytree(HERE / "campaign", live)
    (STAGE / "players" / ACCOUNT / "current.txt").write_text(SLUG, encoding="utf-8")
    return STAGE


def main():
    content = stage()
    os.environ["SEREN_CONTENT_DIR"] = str(content)
    os.environ["SEREN_ACCOUNT"] = ACCOUNT
    os.environ["SEREN_CAMPAIGN"] = SLUG
    os.environ["SEREN_PC"] = "wick"
    os.environ.setdefault("SEREN_PORT", "8791")
    os.environ.setdefault("SEREN_TIER", "paid")
    os.environ.setdefault("AWS_REGION", "us-east-2")
    os.environ.pop("SEREN_PASSWORD", None)          # no door on a test rig
    os.environ.pop("SEREN_GOOGLE_CLIENT_ID", None)  # and no sign-in

    sys.path.insert(0, str(WEB))
    import state, dm, dice, server                                   # noqa: E402

    # ── 1 · the cast reaches the prompt ──────────────────────────────────────
    _static = state.Campaign.campaign_static

    def campaign_static(self):
        out = _static(self)
        base = self.root / "canon" / "characters"
        if base.is_dir():
            people = [p.read_text(encoding="utf-8", errors="ignore")
                      for p in sorted(base.glob("*.md")) if p.name != "README.md"]
            if people:
                out += ("\n\n# Who is in this room\n"
                        "These people exist before you say anything about them. They have "
                        "appetites of their own and they act on them whether or not they "
                        "are addressed.\n\n" + "\n\n---\n\n".join(people))
        return out

    state.Campaign.campaign_static = campaign_static

    # ── 2 · permission to leave something unresolved ─────────────────────────
    dm.AMENDMENT = dm.AMENDMENT + """

**You may leave a thing unresolved.** Not everything asked has to be answered in the turn
it was asked. Somebody can decline, deflect, or answer a smaller question accurately and
hope it passes. A player who has earned part of a thing can be given the part and allowed
to notice there is more. ⛔ **Do not close a turn by telling them what it meant to them.**

**The persona changes the register. It never excuses the beat.** Whatever voice you are
narrating in, the three things above are still owed: somebody reacts by name, one detail
they did not give you, and something moves."""

    # ── 3 · computed pressure, recomputed every turn ─────────────────────────
    _system = dm.system_prompt
    QUIET = {"n": 0}

    def system_prompt(campaign):
        blocks = _system(campaign)
        if QUIET["n"] >= 3:
            note = ("\n\n# Where things stand, computed\n"
                    f"**Nothing has arrived in {QUIET['n']} turns.** The room has been "
                    "reacting and not changing. Something arrives, or leaves, or stops, "
                    "this turn — and somebody is mid-sentence when it does.")
            for b in reversed(blocks):
                if isinstance(b, dict) and "text" in b:
                    b["text"] += note
                    break
        return blocks

    dm.system_prompt = system_prompt

    # ── 4 · the instrument. Counts; never gates. ─────────────────────────────
    # ⚠️ People, not tokens. The first version listed surname fragments separately, so
    #    "Hesper Vane" scored 2 and "Tam Rowle" scored 2 — and every turn reported 6
    #    named actors out of a possible 4. An instrument that flatters is worse than none.
    ROSTER = {"hesper-vane": r"hesper|vane", "tam-rowle": r"tam\b|rowle",
              "nib": r"\bnib\b", "oksa": r"\boksa\b"}
    _take = dm.take_turn

    def take_turn(campaign, history, said):
        out = _take(campaign, history, said)
        prose = " ".join(b.get("text", "") for b in out.get("beats", [])
                         if b.get("kind") == "dm")
        acted = sorted(who for who, pat in ROSTER.items() if re.search(pat, prose, re.I))
        QUIET["n"] = 0 if len(acted) >= 2 else QUIET["n"] + 1

        # ⛔ Is she running the player's character? One sentence with the PC as subject is
        #    narrating a consequence. Five is her taking his turn, which Jay hit on turn 2.
        pc = (campaign.sheet() or {}).get("name") or "Wick"
        subj = len(re.findall(pc + r"\s+\w+s\b", prose))
        subj += len(re.findall(r"\bHe\s+(?:nods|reaches|considers|glances|turns|wonders|"
                               r"notices|presses|examines|steps|takes|decides)\b", prose))
        # ⚠️ And is the prose still in the room the state says it is in?
        where = str((campaign.scene() or {}).get("where") or "")
        facts_now = len(dice.read(campaign.facts_file))

        try:
            dice.note(campaign.ledger, "responsiveness",
                      f"{len(acted)} of 4 named present acted: {', '.join(acted) or 'nobody'}",
                      s=campaign.session, quiet_turns=QUIET["n"], pc_as_subject=subj)
        except Exception:
            pass
        print(f"  [instrument] acted={len(acted)}/4 ({', '.join(acted) or 'nobody'})"
              f"  pc-as-subject={subj}  beats={len(out.get('beats', []))}"
              f"  facts={facts_now}  quiet={QUIET['n']}", flush=True)
        if subj >= 2:
            print("               ^ SHE IS PLAYING THE PLAYER. "
                  "That is the fault, not the prose.", flush=True)
        if where:
            print(f"               room on record: {where[:58]}", flush=True)
        return out

    dm.take_turn = take_turn

    print("=" * 66)
    print("  THE WEIGHBRIDGE — fixture. One room, one night, a cast written first.")
    print("=" * 66)
    print(f"  content : {content}")
    print(f"  patched : cast-into-prompt · pacing-permission · pressure-line · instrument")
    print(f"  play    : http://127.0.0.1:{os.environ['SEREN_PORT']}/table")
    print(f"  state   : {content / 'players' / ACCOUNT / SLUG / 'state'}")
    print("=" * 66, flush=True)
    server.main()


if __name__ == "__main__":
    main()
