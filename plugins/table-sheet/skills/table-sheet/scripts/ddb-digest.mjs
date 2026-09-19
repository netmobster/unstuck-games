#!/usr/bin/env node
// Turn a raw D&D Beyond character into a compact digest plus a list of
// things worth checking before play.
//
//   node ddb-digest.mjs <raw.json> [--out=digest.json]
//
// Raw sheets run to hundreds of kilobytes, most of it rules text the sheet
// already shows. This keeps what a player needs at the table and drops the
// rest. Spell and item wording stays as-is here so the skill can rewrite it
// in plain English; nothing from this file is meant to be republished.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith("--"));
const outFlag = args.find((a) => a.startsWith("--out="));
if (!src) {
  console.error("usage: ddb-digest.mjs <raw.json> [--out=digest.json]");
  process.exit(64);
}

const c = JSON.parse(readFileSync(src, "utf8"));
const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const SHORT = ["str", "dex", "con", "int", "wis", "cha"];
const ACTIVATION = {
  1: "Action", 2: "No action", 3: "Bonus action", 4: "Reaction",
  6: "1 minute", 7: "1 hour", 8: "Special",
};
const allModifiers = () => Object.values(c.modifiers || {}).flat().filter(Boolean);

// ---- ability scores -------------------------------------------------------
const mods = allModifiers();
const scores = ABILITIES.map((ability, i) => {
  const override = c.overrideStats?.[i]?.value ?? null;
  if (override) return { ability, short: SHORT[i], score: override, source: "override" };
  const base = c.stats?.[i]?.value ?? 10;
  const bonus = c.bonusStats?.[i]?.value ?? 0;
  const fromMods = mods
    .filter((m) => m.type === "bonus" && m.subType === `${ability}-score` && typeof m.value === "number")
    .reduce((sum, m) => sum + m.value, 0);
  return { ability, short: SHORT[i], score: base + bonus + fromMods, source: "derived" };
});
const mod = (short) => Math.floor((scores.find((s) => s.short === short).score - 10) / 2);
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

// ---- level, proficiency, hit points ---------------------------------------
const level = (c.classes || []).reduce((sum, k) => sum + (k.level || 0), 0);
const prof = 1 + Math.ceil(level / 4);
const conMod = mod("con");
const hpFromMods = mods
  .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && typeof m.value === "number")
  .reduce((sum, m) => sum + m.value * level, 0);
const maxHp = c.overrideHitPoints ?? (c.baseHitPoints || 0) + (c.bonusHitPoints || 0) + conMod * level + hpFromMods;

// ---- classes and spellcasting ---------------------------------------------
const classes = (c.classes || []).map((k) => ({
  name: k.definition?.name,
  level: k.level,
  subclass: k.subclassDefinition?.name ?? null,
  spellAbility: SHORT[(k.definition?.spellCastingAbilityId ?? k.subclassDefinition?.spellCastingAbilityId ?? 0) - 1] ?? null,
  features: [...(k.classFeatures || [])]
    .map((f) => f.definition)
    .filter((f) => f && f.requiredLevel <= k.level)
    .sort((a, b) => a.requiredLevel - b.requiredLevel)
    .map((f) => ({ level: f.requiredLevel, name: f.name, text: strip(f.description) })),
}));
const caster = classes.find((k) => k.spellAbility) || null;
const spellMod = caster ? mod(caster.spellAbility) : 0;

// ---- spells ---------------------------------------------------------------
function spellRow(entry, origin) {
  const d = entry.definition || {};
  const range = d.range?.origin === "Ranged"
    ? `${d.range.rangeValue} ft`
    : d.range?.origin || "";
  const area = d.range?.aoeType ? `${d.range.aoeValue} ft ${d.range.aoeType}` : null;
  const costly = /worth\s+[\d,]+\+?\s*gp/i.test(d.componentsDescription || "");
  return {
    name: d.name,
    level: d.level,
    school: d.school,
    origin,                                   // prepared | always | class-feature | feat | species | item
    activation: ACTIVATION[d.activation?.activationType] || "Action",
    range: [range, area].filter(Boolean).join(" · "),
    duration: d.duration?.durationType === "Concentration"
      ? `Concentration, ${d.duration.durationInterval} ${d.duration.durationUnit}`
      : d.duration?.durationType === "Instantaneous"
        ? "Instantaneous"
        : [d.duration?.durationInterval, d.duration?.durationUnit].filter(Boolean).join(" ") || "",
    concentration: !!d.concentration,
    ritual: !!d.ritual,
    componentsDescription: d.componentsDescription || "",
    costlyComponent: costly,
    consumed: /spell consumes|which it consumes/i.test(d.componentsDescription || ""),
    uses: entry.limitedUse ? { max: entry.limitedUse.maxUses, used: entry.limitedUse.numberUsed } : null,
    text: strip(d.description),
    atHigherLevels: strip(d.atHigherLevels?.higherLevelDefinitions?.map((h) => h.details).join(" ") || ""),
  };
}

const classSpells = (c.classSpells || []).flatMap((cs) => cs.spells || []);
// Cantrips sit in the class list with prepared=false: they are known, not prepared.
const known = classSpells.filter((s) => s.definition?.level === 0).map((s) => spellRow(s, "known"));
const prepared = classSpells.filter((s) => s.definition?.level > 0 && s.prepared && !s.alwaysPrepared).map((s) => spellRow(s, "prepared"));
const alwaysPrepared = classSpells.filter((s) => s.definition?.level > 0 && s.alwaysPrepared).map((s) => spellRow(s, "always"));
const granted = Object.entries(c.spells || {}).flatMap(([source, list]) =>
  (list || []).map((s) => spellRow(s, source)),
);
// D&D Beyond lists a granted spell twice when it has both a free use and a
// slot-cast version. Keep one row, preferring the one that carries the uses.
const byKey = new Map();
for (const s of [...known, ...prepared, ...alwaysPrepared, ...granted]) {
  const key = `${s.name}|${s.origin}`;
  const kept = byKey.get(key);
  if (!kept || (!kept.uses?.max && s.uses?.max)) byKey.set(key, s);
}
const everySpell = [...byKey.values()];
const cantrips = everySpell.filter((s) => s.level === 0);
const leveled = everySpell.filter((s) => s.level > 0);
const slots = (c.spellSlots || []).filter((s) => s.available > 0 || s.used > 0);

// ---- kit ------------------------------------------------------------------
const inventory = (c.inventory || []).map((i) => ({
  name: i.definition?.name,
  quantity: i.quantity,
  equipped: !!i.equipped,
  attuned: !!i.isAttuned,
  attunable: !!i.definition?.canAttune,
  rarity: i.definition?.rarity || null,
  armorClass: i.definition?.armorClass ?? null,
  magic: !!i.definition?.magic,
  text: i.definition?.magic || i.definition?.canAttune ? strip(i.definition?.description) : "",
}));
const customItems = (c.customItems || []).map((i) => ({
  name: i.name, quantity: i.quantity, cost: i.cost, notes: i.notes, text: strip(i.description),
}));
const resources = Object.entries(c.actions || {}).flatMap(([source, list]) =>
  (list || [])
    .filter((a) => a.limitedUse)
    .map((a) => ({
      name: a.name, source,
      max: a.limitedUse.maxUses, used: a.limitedUse.numberUsed,
      reset: a.limitedUse.resetType === 1 ? "short rest" : a.limitedUse.resetType === 2 ? "long rest" : "other",
      activation: ACTIVATION[a.activation?.activationType] || null,
    })),
);

// ---- saves, skills, defences ---------------------------------------------
const SKILLS = {
  acrobatics: "dex", "animal-handling": "wis", arcana: "int", athletics: "str",
  deception: "cha", history: "int", insight: "wis", intimidation: "cha",
  investigation: "int", medicine: "wis", nature: "int", perception: "wis",
  performance: "cha", persuasion: "cha", religion: "int", "sleight-of-hand": "dex",
  stealth: "dex", survival: "wis",
};
const hasProf = (subType) => mods.some((m) => m.type === "proficiency" && m.subType === subType);
const hasExpertise = (subType) => mods.some((m) => m.type === "expertise" && m.subType === subType);
const saves = ABILITIES.map((ability, i) => ({
  ability: SHORT[i],
  proficient: hasProf(`${ability}-saving-throws`),
  bonus: signed(mod(SHORT[i]) + (hasProf(`${ability}-saving-throws`) ? prof : 0)),
}));
const skills = Object.entries(SKILLS).map(([slug, ability]) => {
  const p = hasProf(slug), e = hasExpertise(slug);
  return {
    name: slug.replace(/-/g, " "),
    ability,
    proficient: p,
    expertise: e,
    bonus: signed(mod(ability) + (p ? prof : 0) + (e ? prof : 0)),
  };
});
const armour = (c.inventory || []).filter((i) => i.equipped && i.definition?.armorClass);
const darkvision = mods.find((m) => m.subType === "darkvision" && m.value) || null;
const defenses = {
  armourWorn: armour.map((i) => ({ name: i.definition.name, ac: i.definition.armorClass, type: i.definition.type })),
  dexMod: signed(mod("dex")),
  note: "D&D Beyond does the real AC maths (armour type caps Dex, magic items stack). Read AC off the sheet rather than adding these up.",
  darkvision: darkvision ? `${darkvision.value} ft` : null,
  passivePerception: 10 + Number(skills.find((s) => s.name === "perception").bonus),
  passiveInsight: 10 + Number(skills.find((s) => s.name === "insight").bonus),
  resistances: mods.filter((m) => m.type === "resistance").map((m) => m.friendlySubtypeName || m.subType),
  immunities: mods.filter((m) => m.type === "immunity").map((m) => m.friendlySubtypeName || m.subType),
};

// ---- who they are ---------------------------------------------------------
const roleplay = {
  personality: c.traits?.personalityTraits || null,
  ideals: c.traits?.ideals || null,
  bonds: c.traits?.bonds || null,
  flaws: c.traits?.flaws || null,
  appearance: c.traits?.appearance || null,
  backstory: strip(c.notes?.backstory || ""),
  allies: c.notes?.allies || null,
  enemies: c.notes?.enemies || null,
  organizations: c.notes?.organizations || null,
  otherNotes: c.notes?.otherNotes || null,
  age: c.age, height: c.height, weight: c.weight, eyes: c.eyes, hair: c.hair, skin: c.skin,
  gender: c.gender, pronouns: c.pronouns ?? null,
};

// ---- things to check before play ------------------------------------------
const flags = [];
const preparedNames = new Set(prepared.map((s) => s.name));
for (const s of [...alwaysPrepared, ...granted]) {
  if (s.level > 0 && preparedNames.has(s.name)) {
    flags.push(`"${s.name}" is ticked as prepared AND granted free by ${s.origin} — the prepared tick is being wasted.`);
  }
}
for (const s of [...prepared, ...alwaysPrepared]) {
  if (!s.costlyComponent) continue;
  const want = (s.componentsDescription.match(/([A-Za-z' -]+?)\s+worth\s+([\d,]+)\+?\s*gp/i) || []);
  const noun = (want[1] || "").trim().toLowerCase();
  const held = [...inventory, ...customItems].some((i) => noun && i.name?.toLowerCase().includes(noun.split(" ").pop()));
  if (!held) {
    flags.push(`${s.name} needs ${want[0] || "a costed material component"}${s.consumed ? ", used up on casting" : ""} — nothing matching it is in the inventory.`);
  }
}
const attuned = inventory.filter((i) => i.attuned).length;
if (attuned > 3) flags.push(`${attuned} items are attuned; the limit is 3.`);
// Only worth raising when it is a gap, not a spare: a second suit of armour in
// the pack is normal, and a shield is no use to someone swinging a halberd.
const wearingArmour = inventory.some((i) => i.equipped && i.armorClass >= 10);
const carryingShield = inventory.some((i) => i.equipped && /shield/i.test(i.name || ""));
const twoHanding = (c.inventory || []).some((i) =>
  i.equipped && (i.definition?.properties || []).some((p) => /two-handed/i.test(p.name || "")),
);
for (const i of inventory) {
  if (!i.armorClass || i.equipped) continue;
  const isShield = /shield/i.test(i.name || "");
  if (isShield && (carryingShield || twoHanding)) continue;
  if (!isShield && wearingArmour) continue;
  flags.push(`${i.name} (${isShield ? `+${i.armorClass} AC` : `AC ${i.armorClass}`}) is carried but not equipped.`);
}
const spentSlots = slots.filter((s) => s.used > 0);
if (spentSlots.length) {
  flags.push(`Spell slots still spent: ${spentSlots.map((s) => `${s.used} of level ${s.level}`).join(", ")} — take a long rest on the sheet if the session starts fresh.`);
}
if (c.removedHitPoints > 0) flags.push(`Sheet shows ${maxHp - c.removedHitPoints} of ${maxHp} HP — damage carried over from last session.`);
for (const r of resources) {
  if (r.used > 0) flags.push(`${r.name}: ${r.used} of ${r.max} uses spent (resets on a ${r.reset}).`);
}
const concentrationSpells = [...prepared, ...alwaysPrepared, ...granted].filter((s) => s.concentration);
if (concentrationSpells.length > 1) {
  flags.push(`${concentrationSpells.length} spells need concentration and only one can run at a time: ${concentrationSpells.map((s) => s.name).join(", ")}.`);
}

// ---- output ---------------------------------------------------------------
const digest = {
  name: c.name,
  level,
  classes,
  species: c.race?.fullName || c.race?.baseName || null,
  speciesTraits: (c.race?.racialTraits || []).map((t) => ({ name: t.definition?.name, text: strip(t.definition?.description) })),
  background: c.background?.definition?.name || null,
  feats: (c.feats || []).map((f) => ({ name: f.definition?.name, text: strip(f.definition?.description) })),
  proficiencyBonus: prof,
  scores: scores.map((s) => ({ ...s, mod: signed(Math.floor((s.score - 10) / 2)) })),
  hitPoints: { max: maxHp, current: maxHp - (c.removedHitPoints || 0), temp: c.temporaryHitPoints || 0 },
  saves, skills, defenses,
  spellcasting: caster
    ? { ability: caster.spellAbility, saveDc: 8 + prof + spellMod, attack: signed(prof + spellMod), slots }
    : null,
  cantrips, spells: leveled, resources, inventory, customItems,
  currencies: c.currencies,
  roleplay,
  flags,
  source: { characterId: c.id, dateModified: c.dateModified, pulled: new Date().toISOString() },
};

const out = outFlag ? outFlag.slice(6) : null;
if (out) writeFileSync(out, JSON.stringify(digest, null, 2));

console.error(
  [
    `${digest.name} — ${classes.map((k) => `${k.name} ${k.level}${k.subclass ? ` (${k.subclass})` : ""}`).join(", ")}`,
    `HP ${digest.hitPoints.current}/${digest.hitPoints.max} · prof ${signed(prof)}${digest.spellcasting ? ` · spell DC ${digest.spellcasting.saveDc}` : ""}`,
    `${leveled.length} spells, ${cantrips.length} cantrips, ${resources.length} limited-use features`,
    flags.length ? `\nWorth checking:\n${flags.map((f) => `  • ${f}`).join("\n")}` : "\nNothing flagged.",
    out ? `\nDigest → ${out}` : "",
  ].join("\n"),
);
if (!out) process.stdout.write(JSON.stringify(digest, null, 2));

function strip(html) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&rsquo;|&#39;/g, "'").replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
