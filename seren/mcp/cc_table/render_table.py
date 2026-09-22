#!/usr/bin/env python3
# VENDORED into seren-mcp from SEREN/scripts/render_table.py @ 0c01479 (2026-09-01).
# Changes, and nothing else: build() takes articles_dir; builds keyed by `pc` or `slug`.
# The original is untouched. Fix upstream first, then re-vendor.
# Copyright (c) 2026 Jeremy Wright. All rights reserved. See LICENSE.txt
"""
render_table.py - build the player-facing Seren Table

    python scripts/render_table.py LIVE/<campaign>            # -> LIVE/<campaign>/table.html
    python scripts/render_table.py LIVE/<campaign> --no-check # skip the leak check (don't)

Reads the live state and emits ONE self-contained HTML file. Then runs
table.check_render against it and REFUSES to leave a dirty file on disk.

------------------------------------------------------------------------------
WHY THIS SHAPE

pieces-table.md: "Filter alone is prevention with no proof. Check alone is
detection after the fact. Build both or neither."

So this module does the FILTER half at read time - it never loads a DM-side
field into a panel - and then hands the rendered output to table.py for the
CHECK half. If check finds anything, the file is DELETED and the process exits
1. A panel that leaked is worse than no panel, because the player has already
read it by the time anyone notices.

------------------------------------------------------------------------------
THE LIBRARY IS WIRED, NOT LISTED - 2026-08-30

The first build shipped a Library panel that searched 617 NAMES and could not
show one of them, and a Sheet whose spell list was dead text. pieces-table.md
gives Library `shows: browsable SRD` and the player's own verdict on the first
played session was "the only issues were lack of library/scratchpad" - so a
name index was the wrong half of the feature.

The whole corpus is 0.97 MB. It is embedded, every article body, and every
spell, feature and item named anywhere on the Sheet resolves into it. Rules are
not secret - that is the one panel with no `must not show`.

------------------------------------------------------------------------------
WHAT IT DELIBERATELY DOES NOT READ

  scene.md `beats`        the beat graph. Showing the-choice before it happens
                          is showing the plot.
  scene.md `clocks`       front clocks. They advance while the party is
                          elsewhere; seeing one is seeing behind the screen.
  scene.md `antagonists`  escalation state is the DM's model.
  fronts.md               entirely.
  rulings.md              DM reasoning.
  facts with visibility   `true` and `false` are DM-side. filter_fact drops
    other than known/         them, INCLUDING the `truth` flag on a `believe`,
    suspected               because if the player can see which belief is
                          flagged wrong, the flag IS the answer.

The renderer opens scene.md and takes five keys out of it by name. It is an
allow-list, not a deny-list, because a deny-list is one schema change away from
being wrong.
"""

import glob
import html
import json
import os
import re
import sys
import time

import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import table as table_gate           # noqa: E402  - the filter/check half

# scene.md keys a panel may see. ALLOW-LIST. Everything else in that file is
# the DM's model of the world and does not render.
SCENE_ALLOWED = ("where", "present", "also_present", "round", "initiative", "foes")

# Ledger types that involved a die. Record shows all of them with their inputs.
ROLL_TYPES = {"attack", "save", "check", "init", "death_save", "damage",
              "heal", "hit_dice", "temp_hp"}

ARTICLE_DIRS = ("spells", "magic-items", "rules", "feats", "classes",
                "subclasses", "backgrounds")


def frontmatter(path):
    """Return the YAML frontmatter of a markdown file as a dict, and the body."""
    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        return {}, ""
    m = re.search(r"^---\s*$(.*?)^---\s*$", text, re.M | re.S)
    if not m:
        return {}, text
    try:
        data = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        data = {}
    return data, text[m.end():]


def jsonl(path):
    out = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    out.append(json.loads(line))
    except OSError:
        pass
    return out


def e(v):
    return html.escape("" if v is None else str(v))


def norm(s):
    """Loose key for resolving a sheet's wording to an article name."""
    return re.sub(r"[^a-z0-9]+", "", str(s).lower())


# ---------------------------------------------------------------------------
# the library corpus
# ---------------------------------------------------------------------------

def load_articles(articles_dir):
    """Every SRD article, with its body. ~0.97 MB, so it all travels."""
    out = []
    for kind in ARTICLE_DIRS:
        for path in sorted(glob.glob(os.path.join(articles_dir, kind, "*.md"))):
            fm, body = frontmatter(path)
            name = fm.get("name") or os.path.basename(path)[:-3].replace("-", " ").title()
            body = re.sub(r"<!--.*?-->", "", body, flags=re.S).strip()
            body = re.sub(r"^#\s+.*$", "", body, count=1, flags=re.M).strip()
            meta = []
            for k in ("level", "school", "rarity", "category", "class",
                      "casting_time", "range", "duration", "attunement",
                      "prerequisite", "concentration", "ritual"):
                if fm.get(k) not in (None, "", False):
                    v = "yes" if fm[k] is True else fm[k]
                    meta.append(f"{k.replace('_', ' ')}: {v}")
            out.append({"n": name, "k": kind, "m": " · ".join(meta), "b": body})
    return out


# Sheets say "Potion of Healing"; the SRD files one article for all four
# rarities as "Potions of Healing". Same for the +1/+2/+3 weapon entry. These
# are wording, not gaps - anything NOT in here that fails to resolve is a real
# hole and should stay visibly dead on the panel.
ALIASES = {
    "potionofhealing":        "potionsofhealing",
    "potionofhealinggreater": "potionsofhealing",
    # ⛔ THESE THREE WERE DEAD ON ARRIVAL, found 2026-08-30.
    #
    # They read `weapon123`, `shield123`, `ammunition123` - but the SRD titles
    # these "Weapon, +1, +2, or +3", and norm() keeps the letters in "or".
    # The real key is `weapon12or3`. So the alias table has never resolved a
    # single one of them, and Balthazar's Dagger +1 - the one item the
    # equipment pass reopened FOR him - has been dead text on every render.
    #
    # ⭐ Nothing could have caught this: a miss and a deliberate gap look
    # identical on the panel. It surfaced only by auditing live-vs-dead counts.
    "weapon1":                "weapon12or3",
    "shield1":                "shield12or3",
    "ammunition1":            "ammunition12or3",
}


def build_index(articles):
    """Two indices: a flat one, and one per article KIND.

    ⛔ THE FLAT ONE ALONE IS A BUG, found 2026-08-30 rebuilding this panel.

    `norm("shield")` hits the **Shield spell**, so Korth's mundane shield - a
    plank of wood on his arm - opened a 1st-level abjuration. `Slow` is one of
    his weapon masteries and opened the **Slow spell**. Both were live on the
    rendered page and neither is a fog-of-war problem: it is the panel being
    confidently wrong about the rules, which is the failure `library/` exists
    to prevent, arriving through the renderer instead of through the model.

    ⭐ A lookup with no type is a guess. Every caller now says what it is
    holding, and a carried item can never resolve to a spell.
    """
    flat, by_kind = {}, {}
    for i, a in enumerate(articles):
        key = norm(a["n"])
        flat.setdefault(key, i)
        by_kind.setdefault(a["k"], {}).setdefault(key, i)
    for alias, real in ALIASES.items():
        if real in flat:
            flat.setdefault(alias, flat[real])
        for kind, m in by_kind.items():
            if real in m:
                m.setdefault(alias, m[real])
    return {"flat": flat, "kind": by_kind}


# What a caller is allowed to resolve into, by what it is holding. Order is
# preference; the first kind that has the name wins.
PREFER = {
    "spell":     ("spells",),
    "item":      ("magic-items",),
    "condition": ("rules",),
    "class":     ("classes",),
    "subclass":  ("subclasses",),
    "style":     ("feats",),
    "feat":      ("feats",),
    "rule":      ("rules",),
    # a limited-use resource is a class feature or an item. It is
    # NEVER a spell - that is how `Slow` became the Slow spell.
    "resource":  ("magic-items", "feats", "rules"),
    "any":       ("spells", "magic-items", "rules", "feats", "classes",
                  "subclasses", "backgrounds"),
}


def resolve(text, idx, kind="any"):
    """Return an article index for `text` read AS a `kind`, or None."""
    base = re.sub(r"\s*\([^)]*\)\s*$", "", str(text)).strip()   # drop provenance
    base = re.sub(r"\s+\d+$", "", base)                          # "Druid 3" -> "Druid"
    cands = [base, str(text)]
    # "Star Map: Guiding Bolt" is a feature that grants a SPELL. The half after
    # the colon is the thing the player actually wants to read.
    if ":" in base:
        cands.append(base.split(":", 1)[1].strip())
    for cand in cands:
        key = norm(cand)
        for k in PREFER.get(kind, PREFER["any"]):
            hit = idx["kind"].get(k, {}).get(key)
            if hit is not None:
                return hit
    # a granted spell resolves as a spell whatever the holder called it
    if ":" in base:
        hit = idx["kind"].get("spells", {}).get(norm(base.split(":", 1)[1]))
        if hit is not None:
            return hit
    return None


def pill(text, idx, kind="any", extra=""):
    """A pill that opens its article in the MODAL if the library has one.

    ⭐ If it does not, the pill stays visibly dead rather than resolving to
    something adjacent. campaign.md S3b wants the subclass gap SEEN.
    """
    i = resolve(text, idx, kind)
    cls = "pill" + (" " + extra if extra else "")
    if i is None:
        return (f"<span class='{cls} dead' title='not in library/srd-5.2'>"
                f"{e(text)}</span>")
    return (f"<button type='button' class='{cls} link' data-a='{i}'>"
            f"{e(text)}</button>")


# ---------------------------------------------------------------------------
# panels
# ---------------------------------------------------------------------------

def panel_now(scene, party, ledger):
    where = scene.get("where") or "not yet opened"
    rnd = scene.get("round")
    present = scene.get("present") or []
    also = scene.get("also_present") or []
    out = ['<p class="lede">%s</p>' % e(where)]
    out.append('<div class="row">')
    out.append('<div class="stat"><b>%s</b><span>round</span></div>'
               % e(rnd if rnd is not None else "\u2014"))
    out.append('<div class="stat"><b>%d</b><span>party</span></div>' % len(present))
    out.append('<div class="stat"><b>%d</b><span>ledger entries</span></div>' % len(ledger))
    out.append('</div>')

    init = scene.get("initiative") or []
    if init:
        out.append("<h3>Initiative</h3><ol class='init'>")
        for i in init:
            out.append("<li>%s <span class='dim mono'>%s</span></li>"
                       % (e(i.get('who')), e(i.get('total'))))
        out.append("</ol>")

    out.append("<h3>Standing</h3><div class='scroll'><table><thead><tr><th>who</th>"
               "<th>HP</th><th>conditions</th><th>concentration</th></tr></thead><tbody>")
    for slug in present:
        st = party.get(slug) or {}
        hp = st.get("hp") or {}
        conds = st.get("conditions") or []
        conc = (st.get("concentration") or {}).get("spell")
        bar = ""
        if hp.get("max"):
            pct = int(100 * (hp.get("current", 0) / hp["max"]))
            bar = "<div class='bar'><i style='width:%d%%'></i></div>" % pct
        out.append(
            "<tr><td>%s</td><td class='mono'>%s / %s%s</td><td>%s</td><td>%s</td></tr>"
            % (e(slug), e(hp.get('current')), e(hp.get('max')), bar,
               e(', '.join(str(c) for c in conds)) or "&mdash;",
               e(conc) or "&mdash;"))
    out.append("</tbody></table></div>")

    # Who else is standing here. NPCs have no sheet in party.md, so they are
    # named and nothing more - the panel says WHO IS PRESENT, not what they are.
    if also:
        out.append("<h3>Also here</h3><p>" +
                   " ".join("<span class='pill'>%s</span>" % e(a) for a in also) +
                   "</p>")

    rolls = [x for x in ledger if x.get("t") in ROLL_TYPES][-6:]
    if rolls:
        out.append("<h3>Recent rolls</h3>")
        out.append(record_table(rolls))
    return "\n".join(out)


def record_table(entries):
    out = ["<div class='scroll'><table><thead><tr><th>id</th><th>type</th><th>who</th>"
           "<th>die</th><th>mods</th><th>total</th><th>DC / AC</th>"
           "<th>result</th></tr></thead><tbody>"]
    for x in entries:
        mods = x.get("mods") or []
        modtxt = ", ".join(f"{m[0]} {m[1]:+d}" for m in mods) or "—"
        target = x.get("dc", x.get("vs", "—"))
        verdict = x.get("pass", x.get("hit", x.get("result", "—")))
        if verdict is True:
            cls, verdict = "ok", "pass"
        elif verdict is False:
            cls, verdict = "no", "fail"
        else:
            cls = "dim"
        who = x.get("who") or x.get("src") or "—"
        out.append(
            f"<tr><td class='mono dim'>{e(x.get('id'))}</td><td>{e(x.get('t'))}</td>"
            f"<td>{e(who)}</td><td class='mono'>{e(x.get('roll'))}</td>"
            f"<td class='mono dim'>{e(modtxt)}</td>"
            f"<td class='mono'><b>{e(x.get('total'))}</b></td>"
            f"<td class='mono'>{e(target)}</td>"
            f"<td><span class='{cls}'>{e(verdict)}</span></td></tr>")
        if x.get("note"):
            out.append(f"<tr class='note'><td></td><td colspan='7'>{e(x['note'])}</td></tr>")
    out.append("</tbody></table></div>")
    return "\n".join(out)


def panel_party(party, builds, idx):
    out = []
    for slug, st in party.items():
        b = builds.get(slug, {})
        hp = st.get("hp") or {}
        out.append("<section class='card'>")
        sub = " &middot; " + e(b["subclass"]) if b.get("subclass") else ""
        out.append("<h3>%s <span class='dim'>%s%s</span></h3>"
                   % (e(b.get("pc") or slug), e(b.get("class") or ""), sub))
        out.append("<div class='row'>")
        out.append("<div class='stat'><b>%s/%s</b><span>HP</span></div>"
                   % (e(hp.get('current')), e(hp.get('max'))))
        out.append("<div class='stat'><b>%s</b><span>AC</span></div>"
                   % e(b.get("ac", "\u2014")))
        hd = st.get("hit_dice") or {}
        out.append("<div class='stat'><b>%s%s</b><span>hit dice</span></div>"
                   % (e(hd.get('remaining')), e(hd.get('die', ''))))
        out.append("<div class='stat'><b>%s</b><span>exhaustion</span></div>"
                   % e(st.get('exhaustion', 0)))
        out.append("</div>")
        slots = st.get("slots") or {}
        if slots:
            out.append("<p><b>slots</b> " + " ".join(
                "<span class='pill%s'>L%s: %s</span>" % ("" if v else " spent", k, v)
                for k, v in sorted(slots.items())) + "</p>")
        uses = st.get("uses") or {}
        if uses:
            # Each use is a real thing with real rules. Link the ones the
            # library has; leave the class features visibly dead.
            out.append("<p><b>uses</b> " + " ".join(
                pill("%s: %s" % (str(k).replace("_", " "), v), idx, "any")
                if False else
                "<span class='pill%s'>%s</span>"
                % ("" if v else " spent",
                   e("%s: %s" % (str(k).replace("_", " "), v)))
                for k, v in uses.items()) + "</p>")
        out.append("</section>")
    return "\n".join(out)


def panel_sheet(builds, idx):
    out = []
    for slug, b in builds.items():
        out.append("<section class='card'>")
        out.append(f"<h3>{e(b.get('pc', slug))} <span class='dim'>level {e(b.get('level'))}</span></h3>")

        # class / subclass / species. "Rogue 2 / Bard 1" is TWO classes.
        cls = [c.strip() for c in str(b.get("class") or "").split("/") if c.strip()]
        line = [pill(c, idx, "class") for c in cls]
        if b.get("subclass"):
            line.append(pill(b["subclass"], idx, "subclass"))
        if b.get("species"):
            line.append(f"<span class='pill dead' title='species live in "
                        f"library/srd-5.2/species.md, not the article set'>"
                        f"{e(b['species'])}</span>")
        out.append("<p><b>build</b> " + " ".join(line) + "</p>")

        ab = b.get("abilities") or {}
        if ab:
            out.append("<div class='row'>")
            for k in ("str", "dex", "con", "int", "wis", "cha"):
                if k in ab:
                    mod = (ab[k] - 10) // 2
                    out.append(f"<div class='stat'><b>{ab[k]}</b>"
                               f"<span>{k.upper()} {mod:+d}</span></div>")
            out.append("</div>")

        out.append("<div class='row'>")
        for label, val in (("AC", b.get("ac")), ("HP", (b.get("hp") or {}).get("max")),
                           ("init", b.get("initiative")), ("PB", b.get("proficiency_bonus"))):
            if val is not None:
                v = f"+{val}" if label == "init" and isinstance(val, int) and val >= 0 else val
                out.append(f"<div class='stat'><b>{e(v)}</b><span>{label}</span></div>")
        out.append("</div>")

        sv = b.get("saves") or {}
        if sv:
            prof = set(b.get("saves_proficient") or [])
            out.append("<p><b>saves</b> " + " ".join(
                f"<span class='pill{' on' if k in prof else ''}'>{k.upper()} {v:+d}</span>"
                for k, v in sv.items()) + "</p>")
            if b.get("saves_note"):
                out.append(f"<p class='dim small'>{e(b['saves_note'])}</p>")

        for label, key in (("proficient", "skills_proficient"),
                           ("expertise", "skills_expertise"),
                           ("bonus proficiencies", "skills_bonus_proficiencies")):
            if b.get(key):
                out.append(f"<p><b>{label}</b> " + " ".join(
                    f"<span class='pill'>{e(str(s_).replace('_', ' '))}</span>"
                    for s_ in b[key]) + "</p>")

        if b.get("senses"):
            out.append("<p><b>senses</b> " + " ".join(
                f"<span class='pill'>{e(str(k).replace('_', ' '))} {e(v)}</span>"
                for k, v in b["senses"].items()) + "</p>")
        if b.get("resistances"):
            out.append("<p><b>resistances</b> " + " ".join(
                f"<span class='pill'>{e(r)}</span>" for r in b["resistances"]) + "</p>")
        if b.get("languages"):
            out.append("<p><b>languages</b> " + " ".join(
                f"<span class='pill'>{e(l)}</span>" for l in b["languages"]) + "</p>")

        if b.get("spell_save_dc"):
            out.append(f"<p><b>spell save DC</b> <span class='mono'>{e(b['spell_save_dc'])}</span> "
                       f"&middot; <b>attack</b> <span class='mono'>+{e(b.get('spell_attack_bonus'))}</span> "
                       f"&middot; <b>ability</b> <span class='mono'>{e(b.get('spellcasting_ability'))}</span></p>")

        sp = b.get("spells") or {}
        for label in ("known", "prepared", "always_prepared"):
            if sp.get(label):
                items = [x.get("spell", "?") if isinstance(x, dict) else x for x in sp[label]]
                out.append(f"<p><b>{label.replace('_', ' ')}</b> " +
                           " ".join(pill(x, idx, "spell") for x in items) + "</p>")

        if b.get("fighting_style"):
            out.append(f"<p><b>fighting style</b> {pill(b['fighting_style'], idx, 'style')}</p>")
        wm = b.get("weapon_mastery") or {}
        chosen = wm.get("chosen")
        if chosen:
            names = list(chosen.values()) if isinstance(chosen, dict) else list(chosen)
            # ⛔ masteries are NOT articles. `Slow` used to resolve to the Slow
            # SPELL. They stay dead on purpose - see build_index.
            out.append("<p><b>weapon mastery</b> " + " ".join(
                f"<span class='pill dead' title='weapon mastery - not a separate "
                f"SRD article'>{e(n)}</span>" for n in names) + "</p>")
        if b.get("sneak_attack"):
            out.append(f"<p><b>sneak attack</b> <span class='mono'>{e(b['sneak_attack'])}</span></p>")

        res = b.get("resources") or []
        if res:
            out.append("<p><b>resources</b> " + " ".join(
                pill(r.get("name", "?"), idx, "resource") for r in res if isinstance(r, dict)) + "</p>")

        ep = (b.get("equipment_pass") or {}).get("items") or []
        carried = [i["to"] for i in ep if i.get("to")]
        if carried:
            out.append("<p><b>carried</b> " + " ".join(
                pill(c, idx, "item") for c in carried) + "</p>")
        gone = [i["from"] for i in ep if not i.get("to")]
        if gone:
            out.append("<p class='dim small'><b>left behind at devolve</b> "
                       + e(" &middot; ".join(gone)).replace("&amp;middot;", "&middot;") + "</p>")
        out.append("</section>")
    return "\n".join(out)


def panel_codex(facts_path):
    kept, dropped, _ = table_gate.filter_facts(facts_path)
    out = []
    if not kept:
        out.append("<p class='dim'>Nothing the party knows or suspects has been "
                   "written down yet.</p>")
    for f in kept:
        vis = f.get("visibility") or f.get("to") or "—"
        out.append(f"<div class='fact'><span class='pill on'>{e(vis)}</span> "
                   f"{e(f.get('fact'))}</div>")
    out.append(f"<p class='dim small'>{len(kept)} shown &middot; {dropped} withheld "
               f"as the DM's side of the screen.</p>")
    return "\n".join(out)


CONDITIONS = ("Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
              "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
              "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious")


def panel_rules(party, scene, builds, idx):
    """Conditions in play, every condition in the ruleset, and this party's
    standing rulings. Rules are not secret - this is the one panel with no
    `must not show`."""
    active = set()
    for st in list(party.values()) + list((scene.get("foes") or {}).values()):
        if isinstance(st, dict):
            for c in st.get("conditions") or []:
                active.add(c.get("cond") if isinstance(c, dict) else c)
    out = ["<h3>In play right now</h3>"]
    if active:
        out.append(" ".join(pill(c, idx, "condition")
                            for c in sorted(x for x in active if x)))
    else:
        out.append("<p class='dim'>Nobody is under a condition.</p>")

    out.append("<h3>Every condition</h3><p>" + " ".join(
        pill(c, idx, "condition") for c in CONDITIONS) + "</p>")

    out.append("<h3>Standing rulings</h3>")
    notes = []
    for b in builds.values():
        for sp in (b.get("spells") or {}).get("always_prepared") or []:
            if isinstance(sp, dict) and sp.get("note"):
                notes.append((b.get("pc"), sp.get("spell"), sp["note"]))
        if (b.get("signature_feat") or {}).get("feat"):
            sf = b["signature_feat"]
            notes.append((b.get("pc"), sf["feat"], sf.get("unlocks") or ""))
    if notes:
        for who, what, note in notes:
            out.append("<div class='fact'><b>%s &middot; %s</b><br>"
                       "<span class='small'>%s</span></div>"
                       % (e(who), e(what), e(note)))
    else:
        out.append("<p class='dim'>None recorded.</p>")
    out.append("<p class='dim small'>Rules are not secret. The whole SRD is on the "
               "Library panel, and every spell, item and condition on this page "
               "opens into it without leaving the panel you are on.</p>")
    return "\n".join(out)


KIND_LABEL = {"spells": "Spells", "magic-items": "Magic items", "rules": "Rules",
              "feats": "Feats", "classes": "Classes", "subclasses": "Subclasses",
              "backgrounds": "Backgrounds"}


def panel_library(articles):
    counts = {}
    for a in articles:
        counts[a["k"]] = counts.get(a["k"], 0) + 1
    order = [k for k in ("spells", "magic-items", "rules", "feats", "classes",
                         "subclasses", "backgrounds") if k in counts]
    chips = " ".join(
        "<button type='button' class='pill kind' data-k='%s'>%s <span class='dim'>%d"
        "</span></button>" % (k, e(KIND_LABEL.get(k, k)), counts[k]) for k in order)
    return (
        "<p class='dim small'>SRD 5.2, CC-BY 4.0. %d articles, whole, on this page. "
        "Nothing here is fetched and nothing here is secret.</p>"
        "<p><button type='button' class='pill kind on' data-k=''>All "
        "<span class='dim'>%d</span></button> %s</p>"
        "<input id='libq' type='search' placeholder='search %d articles\u2026' "
        "autocomplete='off' aria-label='Search the library'>"
        "<div id='libout' class='libout'></div>"
        % (len(articles), len(articles), chips, len(articles)))


PAGE = r"""<title>The Seren Table</title>
<meta name="seren-stamp" content="{{STAMP}}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Light is the base set: greenbar ledger paper, neutrals biased green to match. */
:root{
  --paper:#e9ede3; --bar:#dfe6d7; --card:#f2f5ee; --ink:#1b1f18;
  --soft:#5e665a; --rule:#c3ccba; --red:#9d3227; --blue:#26456b;
  --pass:#3d6a45; --fail:#9d3227;
}
/* Un-stamped default follows the OS, unless the viewer explicitly chose light. */
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#15180f; --bar:#1c2016; --card:#1c2016; --ink:#e5e8dc;
    --soft:#8d9585; --rule:#2f3529; --red:#c9614f; --blue:#8fb2d8;
    --pass:#84ab6c; --fail:#c9614f;
  }
}
/* And the explicit dark stamp wins over a light OS. */
:root[data-theme="dark"]{
  --paper:#15180f; --bar:#1c2016; --card:#1c2016; --ink:#e5e8dc;
  --soft:#8d9585; --rule:#2f3529; --red:#c9614f; --blue:#8fb2d8;
  --pass:#84ab6c; --fail:#c9614f;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:400 15.5px/1.6 Spectral,Georgia,'Times New Roman',serif}
body::before{content:"";position:fixed;inset:0 auto 0 0;width:1px;
  margin-left:clamp(14px,3.2vw,46px);background:var(--red);opacity:.5;pointer-events:none}
.wrap{max-width:1020px;padding:0 22px 0 clamp(28px,5.4vw,68px)}
header{border-bottom:1px solid var(--rule);padding-top:26px}
.eyebrow{font:500 10.5px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.22em;text-transform:uppercase;color:var(--red);margin:0 0 9px}
h1{margin:0;font-size:27px;font-weight:600;letter-spacing:-.012em;text-wrap:balance}
.sub{margin:5px 0 0;color:var(--soft);font-size:14.5px;font-style:italic}
nav{display:flex;gap:0;flex-wrap:wrap;margin:20px 0 -1px;overflow-x:auto}
nav button{background:none;border:0;border-bottom:2px solid transparent;
  color:var(--soft);padding:9px 15px 8px;cursor:pointer;white-space:nowrap;
  font:500 10.5px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.14em;text-transform:uppercase}
nav button:hover{color:var(--ink)}
nav button[aria-selected=true]{color:var(--ink);border-bottom-color:var(--red)}
nav button:focus-visible,.link:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
main{padding:22px 0 64px}
section[role=tabpanel][hidden]{display:none}
h3{font:500 10.5px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.16em;
  text-transform:uppercase;color:var(--soft);margin:28px 0 9px}
.lede{font-size:21px;margin:16px 0 2px;text-wrap:balance}
.row{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}
.stat{background:var(--card);border:1px solid var(--rule);padding:9px 14px;min-width:84px}
.stat b{display:block;font:500 21px/1.2 'IBM Plex Mono',ui-monospace,monospace;
  font-variant-numeric:tabular-nums}
.stat span{font:400 10px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.11em;text-transform:uppercase;color:var(--soft)}
.scroll{overflow-x:auto;margin:6px 0 18px}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
th{text-align:left;font:500 10px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.12em;text-transform:uppercase;color:var(--soft);
  border-bottom:1px solid var(--rule);padding:7px 10px;white-space:nowrap}
td{padding:7px 10px;border-bottom:1px solid var(--rule);vertical-align:top}
tbody tr:nth-child(4n+1),tbody tr:nth-child(4n+2){background:var(--bar)}
tr.note td{color:var(--soft);font-size:12.5px;font-style:italic;padding-top:0}
.mono{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
  font-variant-numeric:tabular-nums}
.dim{color:var(--soft)} .small{font-size:12.5px}
.ok,.no{font:500 10px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.1em;
  text-transform:uppercase;border:1px solid;padding:3px 7px;display:inline-block}
.ok{color:var(--pass);border-color:var(--pass)}
.no{color:var(--fail);border-color:var(--fail)}
.card{background:var(--card);border:1px solid var(--rule);padding:15px 17px;margin:13px 0}
.card h3{margin-top:0;font:600 17px/1.35 Spectral,Georgia,serif;letter-spacing:-.01em;
  text-transform:none;color:var(--ink)}
.card h3 .dim{font:400 13px/1.4 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.02em}
.card p{margin:7px 0}
.card p b{font:500 10px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.12em;
  text-transform:uppercase;color:var(--soft);margin-right:5px}
.pill{display:inline-block;border:1px solid var(--rule);padding:2px 9px;
  font:400 12px/1.6 'IBM Plex Mono',ui-monospace,monospace;margin:2px 1px;
  background:none;color:var(--ink)}
.pill.on{border-color:var(--blue);color:var(--blue)}
button.pill.link{cursor:pointer;border-bottom-color:var(--blue);color:var(--blue)}
button.pill.link:hover{background:var(--bar)}
.bar{height:2px;background:var(--rule);margin-top:5px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--pass)}
.fact{border-left:2px solid var(--red);padding:6px 0 6px 12px;margin:9px 0}
.init{list-style:none;padding:0;margin:6px 0}
.init li{border-bottom:1px solid var(--rule);padding:5px 0}
input,textarea{background:var(--card);border:1px solid var(--rule);color:var(--ink);
  padding:9px 12px;font:400 14.5px/1.5 Spectral,Georgia,serif;width:100%}
input{max-width:430px;margin:9px 0}
textarea{min-height:300px}
.libout div{padding:5px 0;border-bottom:1px solid var(--rule);font-size:14px;cursor:pointer}
.libout div:hover{background:var(--bar)}
  color:var(--soft);margin:4px 0 12px}
  text-transform:uppercase;color:var(--red);margin:16px 0 6px}
footer{border-top:1px solid var(--rule);color:var(--soft);font-size:12.5px;
  padding:14px 0 40px;max-width:640px}
footer code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* --- pills: three states, and they must be distinguishable --------------- */
.pill.dead{border-style:dotted;color:var(--soft);cursor:default}
.pill.spent{color:var(--soft);opacity:.65}
button.pill.kind{cursor:pointer}
button.pill.kind.on{border-color:var(--red);color:var(--red)}
/* --- the article modal --------------------------------------------------- */
dialog#art{border:1px solid var(--rule);background:var(--card);color:var(--ink);
  padding:0;max-width:640px;width:calc(100% - 32px);max-height:82vh;
  box-shadow:0 18px 60px rgba(0,0,0,.34)}
dialog#art::backdrop{background:rgba(10,12,8,.58)}
#artbar{position:sticky;top:0;display:flex;align-items:center;gap:8px;
  background:var(--card);border-bottom:1px solid var(--rule);padding:9px 12px}
#artbar .sp{flex:1}
#artbar button{background:none;border:1px solid var(--rule);color:var(--soft);
  cursor:pointer;padding:4px 10px;
  font:500 10px/1.6 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.12em;text-transform:uppercase}
#artbar button:hover{color:var(--ink);border-color:var(--ink)}
#artbar button[hidden]{display:none}
#artbody{padding:16px 20px 26px;overflow-y:auto;max-height:calc(82vh - 44px)}
#artbody h4{margin:0;font:600 20px/1.3 Spectral,Georgia,serif}
#artbody .meta{font:400 12px/1.6 'IBM Plex Mono',ui-monospace,monospace;
  color:var(--soft);margin:4px 0 14px}
#artbody h5{font:500 10.5px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.14em;text-transform:uppercase;color:var(--red);margin:17px 0 6px}
#artbody p{margin:9px 0}
#artbody ul{margin:9px 0;padding-left:20px}
/* a cross-reference inside an article body */
button.xref{background:none;border:0;border-bottom:1px solid var(--blue);
  color:var(--blue);cursor:pointer;padding:0;font:inherit}
button.xref:hover{background:var(--bar)}
.libout div{padding:6px 2px;border-bottom:1px solid var(--rule);font-size:14px;
  cursor:pointer;display:flex;gap:10px;align-items:baseline}
.libout div:hover{background:var(--bar)}
.libout div span.dim{margin-left:auto;font:400 11px/1 'IBM Plex Mono',ui-monospace,monospace;
  letter-spacing:.1em;text-transform:uppercase}
</style>
<div class="wrap">
<header>
<p class="eyebrow">Campaign register &middot; {{CAMPAIGN}}</p>
<h1>The Seren Table</h1>
<p class="sub">Every roll, with its inputs and its target.</p>
<nav role="tablist">{{TABS}}</nav>
</header>
<main>{{PANELS}}</main>
<footer>Rendered by <code>scripts/render_table.py</code>, then cleared by
<code>scripts/table.py check</code> &mdash; which deletes the file rather than
publish a dirty one. Front clocks, the beat graph and <code>true</code> /
<code>false</code> visibility are the DM's side of the screen and are never
loaded into this page.<br><span class="mono" style="font-size:11px">{{STAMP}}</span></footer>
</div>
<dialog id="art" aria-label="Library article">
<div id="artbar"><button type="button" id="artback" hidden>&larr; back</button><span class="sp"></span><button type="button" id="artclose">close</button></div>
<div id="artbody"></div>
</dialog>
<script>
const LIB={{LIB}};
const btns=[...document.querySelectorAll('nav button')];
const pans=[...document.querySelectorAll('section[role=tabpanel]')];
function show(i){
  btns.forEach((x,j)=>x.setAttribute('aria-selected',j===i?'true':'false'));
  pans.forEach((p,j)=>p.hidden=(i!==j));
}
btns.forEach((b,i)=>b.onclick=()=>show(i));

/* ------------------------------------------------------------------ ARTICLES
   The article opens in a MODAL over whatever panel you are on.

   The first build sent you to the Library TAB to read it, which lost your
   place on the Sheet. pieces-table.md asked for the opposite in its own
   words: "click Wall of Fire, get the text, WITHOUT LEAVING THE PANEL."
   ------------------------------------------------------------------------- */
const dlg=document.getElementById('art');
const body=document.getElementById('artbody');
const backBtn=document.getElementById('artback');
let stack=[];

/* Names worth turning into links inside an article body. Short names are
   ordinary English - linking every "Light", "Slow", "Shield" and "Attack"
   makes the prose unreadable and most of those matches are the wrong sense
   of the word anyway. Conditions are always worth it. */
const CONDS=new Set(['blinded','charmed','deafened','exhaustion','frightened',
 'grappled','incapacitated','invisible','paralyzed','petrified','poisoned',
 'prone','restrained','stunned','unconscious']);
const STOP=new Set(['spellcasting','concentration','proficiency']);
const BYNAME={};
LIB.forEach((a,i)=>{const k=a.n.toLowerCase(); if(!(k in BYNAME)) BYNAME[k]=i;});
const XNAMES=Object.keys(BYNAME)
  .filter(n=>(n.length>=8||CONDS.has(n))&&!STOP.has(n))
  .sort((a,b)=>b.length-a.length);
const XRE=new RegExp('\\b('+XNAMES.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
  .join('|')+')\\b','gi');

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function md(s){
  return s.split(/\n{2,}/).map(p=>{
    p=p.trim(); if(!p) return '';
    p=esc(p);
    p=p.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>');
    if(/^#{2,}\s/.test(p)) return '<h5>'+p.replace(/^#+\s*/,'')+'</h5>';
    if(/^[-*]\s/.test(p)) return '<ul>'+p.split(/\n/).map(l=>
      '<li>'+l.replace(/^[-*]\s*/,'')+'</li>').join('')+'</ul>';
    return '<p>'+p.replace(/\n/g,' ')+'</p>';
  }).join('');
}

/* Linkify only the TEXT between tags, so we never rewrite an attribute. */
function xref(htmlStr,selfName){
  const self=(selfName||'').toLowerCase();
  return htmlStr.replace(/>([^<]+)</g,(m,txt)=>'>'+txt.replace(XRE,w=>{
    const k=w.toLowerCase();
    if(k===self||!(k in BYNAME)) return w;
    return '<button type="button" class="xref" data-a="'+BYNAME[k]+'">'+w+'</button>';
  })+'<');
}

function render(i){
  const a=LIB[i]; if(!a) return;
  body.innerHTML='<h4>'+esc(a.n)+'</h4><p class="meta">'+esc(a.k.replace('-',' '))+
    (a.m?' &middot; '+esc(a.m):'')+'</p>'+xref(md(a.b),a.n);
  backBtn.hidden=stack.length<2;
  body.scrollTop=0;
}
function openArt(i,push){
  if(push===false){}else{stack.push(i);}
  render(i);
  if(!dlg.open) dlg.showModal();
}
backBtn.onclick=()=>{ if(stack.length>1){stack.pop(); render(stack[stack.length-1]);} };
document.getElementById('artclose').onclick=()=>dlg.close();
dlg.addEventListener('close',()=>{stack=[];});
/* click the backdrop to dismiss */
dlg.addEventListener('click',ev=>{ if(ev.target===dlg) dlg.close(); });

document.addEventListener('click',ev=>{
  const b=ev.target.closest('button.pill.link, button.xref');
  if(b){ openArt(+b.dataset.a); }
});

/* ------------------------------------------------------------------- LIBRARY */
const out=document.getElementById('libout');
const q=document.getElementById('libq');
let kind='';
function list(){
  const v=(q?q.value:'').trim().toLowerCase();
  let hits=LIB.map((a,i)=>[a,i]);
  if(kind) hits=hits.filter(([a])=>a.k===kind);
  if(v) hits=hits.filter(([a])=>a.n.toLowerCase().includes(v));
  const total=hits.length;
  hits=hits.slice(0,300);
  out.innerHTML=total
    ? hits.map(([a,i])=>'<div data-i="'+i+'">'+esc(a.n)+'<span class="dim">'+
        esc(a.k.replace('-',' '))+'</span></div>').join('')
      +(total>hits.length?'<div class="dim">'+(total-hits.length)+
        ' more \u2014 narrow the search.</div>':'')
    : '<div class="dim">No article by that name.</div>';
}
if(q) q.oninput=list;
if(out) out.onclick=ev=>{const d=ev.target.closest('div[data-i]'); if(d) openArt(+d.dataset.i);};
[...document.querySelectorAll('button.pill.kind')].forEach(b=>b.onclick=()=>{
  kind=b.dataset.k;
  document.querySelectorAll('button.pill.kind').forEach(x=>x.classList.toggle('on',x===b));
  list();
});
if(out) list();

/* --------------------------------------------------------------------- NOTES */
const t=document.getElementById('notes');
if(t){try{t.value=localStorage.getItem('seren-notes-{{CAMPAIGN}}')||'';
  t.oninput=()=>{try{localStorage.setItem('seren-notes-{{CAMPAIGN}}',t.value)}catch(e){}};}catch(e){}}

/* ----------------------------------------------------------------------- LIVE
   The Table is LIVE (pieces-table.md, decided 2026-08-28). scripts/live.py
   re-renders this file whenever the campaign state changes, so the page has
   two jobs of its own: don't lose the player's place when it does, and notice
   that it happened.
   ------------------------------------------------------------------------- */
const KEY='seren-tab-{{CAMPAIGN}}';
try{const k=sessionStorage.getItem(KEY); if(k!==null&&btns[+k]) show(+k);}catch(e){}
btns.forEach((b,i)=>b.addEventListener('click',()=>{
  try{sessionStorage.setItem(KEY,i)}catch(e){}}));
try{
  const y=sessionStorage.getItem(KEY+'-y');
  if(y) window.scrollTo(0,+y);
  addEventListener('beforeunload',()=>{
    try{sessionStorage.setItem(KEY+'-y',window.scrollY)}catch(e){}});
}catch(e){}

/*POLL-START*/
/* Poll for a newer render. file:// cannot fetch itself, so this only arms when
   the page is being SERVED - which is the mode that can reload cleanly.

   ⛔ STRIPPED IN --artifact BUILDS. A published artifact is served over https,
   so this would arm, fetch claude.ai every four seconds forever, and reload on
   a stamp that only ever changes when the artifact is REPUBLISHED - by which
   point the page has already been replaced. Live-by-polling and
   live-by-republish are different mechanisms and running both is a loop. */
const STAMP=(document.querySelector('meta[name=seren-stamp]')||{}).content||'';
if(location.protocol.startsWith('http')&&STAMP){
  setInterval(async()=>{
    try{
      const r=await fetch(location.href,{cache:'no-store'});
      const txt=(await r.text()).slice(0,4000);
      const m=txt.match(/name="seren-stamp" content="([^"]*)"/);
      if(m&&m[1]&&m[1]!==STAMP) location.reload();
    }catch(e){}
  },4000);
}
/*POLL-END*/
</script>
"""


def build(live_dir, artifact=False, articles_dir=None):
    campaign = os.path.basename(live_dir.rstrip("/\\"))
    root = os.path.dirname(os.path.dirname(os.path.abspath(live_dir)))
    state = os.path.join(live_dir, "state")
    articles_dir = articles_dir or os.path.join(root, "library", "srd-5.2", "articles")

    party_fm, _ = frontmatter(os.path.join(state, "party.md"))
    scene_fm, _ = frontmatter(os.path.join(state, "scene.md"))
    scene = {k: scene_fm.get(k) for k in SCENE_ALLOWED}     # ALLOW-LIST

    party = {k: v for k, v in party_fm.items()
             if isinstance(v, dict) and "hp" in v}

    builds = {}
    bdir = os.path.join(live_dir, "builds")
    if os.path.isdir(bdir):
        for name in sorted(os.listdir(bdir)):
            if name.endswith(".md") and not name.startswith(("_", "README")):
                fm, _ = frontmatter(os.path.join(bdir, name))
                key = fm.get("pc") or fm.get("slug")   # seren-mcp: web builds say slug
                if key:
                    builds[key] = fm

    ledger = jsonl(os.path.join(state, "ledger.jsonl"))
    articles = load_articles(articles_dir)
    idx = build_index(articles)

    tabs_spec = [
        ("Now",     panel_now(scene, party, ledger)),
        ("Party",   panel_party(party, builds, idx)),
        ("Sheet",   panel_sheet(builds, idx)),
        ("Record",  "<p class='dim small'>Every roll, with its inputs and its "
                    "target. This is the trust surface.</p>" +
                    (record_table(ledger) if ledger
                     else "<p class='dim'>Nothing has been rolled.</p>")),
        ("Codex",   panel_codex(os.path.join(state, "facts.jsonl"))),
        ("Rules",   panel_rules(party, scene, builds, idx)),
        ("Library", panel_library(articles)),
        ("Notes",   "<p class='dim small'>Yours. Stored in this browser only "
                    "&mdash; Ser'en never reads this panel.</p>"
                    "<textarea id='notes' aria-label='Your notes'></textarea>"),
    ]
    tabs = "".join(
        f'<button role="tab" aria-selected="{"true" if i == 0 else "false"}">{t}</button>'
        for i, (t, _) in enumerate(tabs_spec))
    panels = "".join(
        f'<section role="tabpanel"{"" if i == 0 else " hidden"}>{body}</section>'
        for i, (_, body) in enumerate(tabs_spec))

    # ⛔ SECONDS ARE LOAD-BEARING. The page polls this string to decide
    # whether to reload; at minute granularity two renders inside the same
    # minute are indistinguishable and the live loop silently does nothing.
    stamp = (f"rendered {time.strftime('%Y-%m-%d %H:%M:%S')} · "
             f"{len(ledger)} ledger entries · {len(builds)} builds · "
             f"{len(articles)} articles")

    page = (PAGE.replace("{{LIB}}", json.dumps(articles, ensure_ascii=False))
                .replace("{{STAMP}}", html.escape(stamp))
                .replace("{{CAMPAIGN}}", html.escape(campaign))
                .replace("{{TABS}}", tabs)
                .replace("{{PANELS}}", panels))

    if artifact:
        # 1. The self-poll must not ship. See POLL-START.
        a, b = page.index("/*POLL-START*/"), page.index("/*POLL-END*/")
        page = page[:a] + "/* live-poll stripped: this build is republished, "                       "not polled */\n" + page[b + len("/*POLL-END*/"):]

        # 2. ⛔ THE SRD ATTRIBUTION IS A LICENCE CONDITION, NOT A COURTESY.
        #
        # library/srd-5.2/monsters.md carries it because that file reproduces
        # SRD text. THIS PAGE EMBEDS 616 ARTICLES OF IT and carried only a
        # four-word note on one panel. CC-BY requires attribution wherever the
        # material travels, and an artifact is the first build that leaves the
        # machine.
        page = page.replace(
            "</footer>",
            "</footer>\n"
            '<footer class="attrib">This work includes material from the System '
            'Reference Document 5.2 (&ldquo;SRD 5.2&rdquo;) by Wizards of the '
            'Coast LLC, available at '
            '<span class="mono">https://www.dndbeyond.com/srd</span>. '
            "The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 "
            "International License, available at "
            '<span class="mono">'
            "https://creativecommons.org/licenses/by/4.0/legalcode</span>."
            "<br><br>Everything else on this page is campaign state and is "
            "&copy;&nbsp;2026 Jeremy Wright, all rights reserved. "
            "<b>Private &mdash; not for distribution.</b></footer>")
        page = page.replace(
            "</style>",
            "footer.attrib{border-top:1px solid var(--rule);color:var(--soft);"
            "font-size:11.5px;line-height:1.65;padding:12px 0 48px;max-width:640px}"
            "footer.attrib .mono{word-break:break-all}</style>")

    return page


def main(argv):
    if len(argv) < 2:
        print("usage: render_table.py LIVE/<campaign> [--artifact] [--no-check]",
              file=sys.stderr)
        return 2
    live_dir = argv[1].rstrip("/\\")

    # --artifact writes a SEPARATE file, because the two builds differ and the
    # difference matters: the local one polls itself and reloads; the published
    # one is replaced by a redeploy and must not poll. One file serving both
    # would ship the poll to claude.ai.
    as_artifact = "--artifact" in argv
    out_path = os.path.join(live_dir,
                            "table-artifact.html" if as_artifact else "table.html")

    open(out_path, "w", encoding="utf-8").write(build(live_dir, artifact=as_artifact))

    if "--no-check" in argv:
        print(f"rendered {out_path}  (CHECK SKIPPED)")
        return 0

    leaks = table_gate.check_render(out_path, live_dir)
    if leaks:
        os.remove(out_path)
        print(f"REFUSED  {len(leaks)} leak(s). The file was deleted.", file=sys.stderr)
        for lk in leaks[:20]:
            print(f"  {lk.what!r}\n      {lk.why}  [{lk.where}]", file=sys.stderr)
        return 1

    size = os.path.getsize(out_path) / 1024 / 1024
    print(f"rendered {out_path}  ({size:.2f} MB)")
    print("checked  no leaks - clocks, beats, fronts and true/false all absent.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
