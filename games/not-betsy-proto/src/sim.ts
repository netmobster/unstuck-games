// Not Betsy prototype — deterministic bargain sim. No DOM. Same seed + same choices → same run.
// Rough on purpose: it exists to find out whether the ideas tie together, not to be the game.
import { Rng } from "./rng";
import mutationsJson from "../content/mutations.json";
import straysJson from "../content/strays.json";
import habitsJson from "../content/habits.json";
import planetsJson from "../content/planets.json";
import wordsJson from "../content/last-words.json";
import whysJson from "../content/whys.json";

export type Vec = { scrap?: number; power?: number; smudge?: number };
export type Mutation = (typeof mutationsJson.records)[number];
export type Stray = (typeof straysJson.records)[number];
export type Habit = (typeof habitsJson.records)[number];
export type Planet = (typeof planetsJson.records)[number];
export type LastWords = (typeof wordsJson.records)[number];
export type Why = (typeof whysJson.records)[number];

export const CONTENT = {
  mutations: mutationsJson.records as Mutation[],
  strays: straysJson.records as Stray[],
  habits: habitsJson.records as Habit[],
  planets: planetsJson.records as Planet[],
  words: wordsJson.records as LastWords[],
  // Jay's taste gate: cut whys never ship
  whys: (whysJson.records as Why[]).filter((w) => (w as { review?: { status: string } }).review?.status !== "cut"),
};

export const STOPS = 3;
export const DAYS_PER_STOP = 7;

export const GOALS = {
  salvage: { label: "Salvage run", weights: { salvage: 3, trade: 1 }, power: 0 },
  hurry: { label: "Hurry to the next planet", weights: { quiet: 2, prestige: 1 }, power: -1 },
  crew: { label: "Find some crew", weights: { stray: 3 }, power: 0 },
  // smoke run 1: +1 power made lying low the dominant strategy (57% top verdict)
  low: { label: "Keep your head down", weights: { quiet: 3, prestige: -1 }, power: 0 },
} as const;
export type GoalId = keyof typeof GOALS;

type Encounter = "salvage" | "trade" | "stray" | "habit" | "prestige" | "quiet" | "repair";
const BASE_WEIGHTS: Record<Encounter, number> = { salvage: 3, trade: 1, stray: 1, habit: 1.5, prestige: 1.5, quiet: 2, repair: 0.5 };

export type LogEntry = { stop: number; day: number; who: "not-betsy" | "prestige" | "jame" | "system"; text: string };
export type Phase = "landed" | "away" | "verdict";

/** Structural questions left as toggles so Jay can feel both sides (not decisions). */
export type RunOptions = {
  /** Spec says each stop obsoletes the last (shed parts). Smoke run 1: that makes every return 100% different. */
  persistParts: boolean;
};
export const DEFAULT_OPTIONS: RunOptions = { persistParts: false };

export type Run = {
  opts: RunOptions;
  seed: number;
  rng: Rng;
  phase: Phase;
  stop: number; // 0-based stop index of the current/next landing
  day: number; // days elapsed in the current absence
  scrap: number;
  power: number;
  smudge: number;
  mutations: Mutation[];
  keptId: string | null; // God Mode: survives the end of the stop
  carried: Mutation | null; // loss carried forward from a previous archived run
  strays: Stray[];
  habits: Habit[];
  planet: Planet;
  /** the three planets, rolled at run start so foreshadowing can aim at the real next stop */
  route: Planet[];
  customsToday: "none" | "light" | "full";
  fixed: { planet: string; result: "solved" | "partial" | "failed"; with: string }[];
  fixesLeft: number;
  goal: GoalId | null;
  hand: LastWords[];
  words: LastWords | null;
  fronts: { vorian: number; tubs: number; synthesis: number };
  tags: Record<string, number>;
  seen: { mutations: Set<string>; planets: Set<string>; words: Set<string> };
  log: LogEntry[];
  returnLog: LogEntry[]; // what she logged during the last absence
  landLogIndex: number; // where this stop's landing entries start in log
  landEndIndex: number; // where landing + customs end and Jame's fix attempts begin
  ledger: { t: string; kind: string; detail: unknown }[];
  verdict: null | { score: number; band: "archived" | "deferred" | "unclassifiable"; classification: string; why: Why; carry: Mutation | null };
  history: string[][]; // mutation ids present at each landing — for divergence
  /** where each part came from, in her words (workbench hang tag) */
  origins: Record<string, string>;
  /** parts the Prestige took, and when (dashed on the hull; OPTIMIZED on the report) */
  tidied: { id: string; name: string; category: string; absurdity: number; stop: number; day: number }[];
  /** set for one encounter when Jame's last words boosted it; her next line ends "You said." */
  echo: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function newRun(seed: number, carried: Mutation | null = null, opts: RunOptions = DEFAULT_OPTIONS): Run {
  const rng = new Rng(seed);
  const run: Run = {
    opts, seed, rng, phase: "landed", stop: 0, day: 0,
    scrap: 3, power: 8, smudge: 0,
    mutations: [], keptId: null, carried, strays: [], habits: [],
    planet: CONTENT.planets[0], route: [], customsToday: "none",
    fixed: [], fixesLeft: 2, goal: null, hand: [], words: null,
    fronts: { vorian: 0, tubs: 0, synthesis: 0 },
    tags: {}, seen: { mutations: new Set(), planets: new Set(), words: new Set() },
    log: [], returnLog: [], landLogIndex: 0, landEndIndex: 0, ledger: [], verdict: null, history: [],
    origins: {}, tidied: [], echo: false,
  };
  const pool = [...CONTENT.planets];
  while (run.route.length < STOPS) run.route.push(pool.splice(rng.int(pool.length), 1)[0]);
  // she starts with two parts (and the Synthesis's "improvement", if a previous run was archived)
  // carried first, so the starting parts can never duplicate it
  if (carried) {
    run.mutations.push(carried);
    run.origins[carried.id] = "carried forward from the last Not Betsy. optimized. you are welcome.";
    say(run, "prestige", `CARRIED FORWARD: ${carried.name}, OPTIMIZED. YOU ARE WELCOME.`);
  }
  for (let i = 0; i < 2; i++) bolt(run, pickMutation(run), "start");
  land(run);
  return run;
}

// ---------- logging ----------
function say(run: Run, who: LogEntry["who"], text: string) {
  // Jay 2026-09-14: blame lives in her voice, not in a UI annotation
  if (run.echo && who === "not-betsy") { text = `${text} You said.`; run.echo = false; }
  const e = { stop: run.stop, day: run.day, who, text };
  run.log.push(e);
  if (run.phase === "away") run.returnLog.push(e);
}
function record(run: Run, kind: string, detail: unknown) {
  run.ledger.push({ t: `${run.stop}.${run.day}`, kind, detail });
}
function addTags(run: Run, tags: readonly string[], w = 1) {
  for (const t of tags) run.tags[t] = (run.tags[t] ?? 0) + w;
}
function apply(run: Run, v: Vec) {
  run.scrap = Math.max(0, run.scrap + (v.scrap ?? 0));
  run.power = clamp(run.power + (v.power ?? 0), 0, 12);
  run.smudge = Math.max(0, run.smudge + (v.smudge ?? 0));
}

// ---------- selection: math picks the role, the seed picks the object ----------
/** Target smudge rises over the bargain. Above target → she gets liability-heavy parts; below → helpful ones. */
export const targetSmudge = (run: Run) => 3 + (run.stop * DAYS_PER_STOP + run.day) * 0.9;

function pickMutation(run: Run): Mutation | null {
  const owned = new Set(run.mutations.map((m) => m.id));
  const pool = CONTENT.mutations.filter((m) => !owned.has(m.id));
  if (!pool.length) return null;
  const gap = run.smudge - targetSmudge(run); // + = too strong, - = struggling
  const net = (m: Mutation) => (m.upside.smudge + m.downside.smudge) + (m.upside.scrap + m.downside.scrap) * 0.5;
  // role: rank by how well the part's net value counters the gap, keep the best third
  const ranked = [...pool].sort((a, b) => (gap > 0 ? net(a) - net(b) : net(b) - net(a)));
  const role = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 3)));
  // foreshadow: sometimes prefer a part that solves the next planet's need
  // smoke run 2 bug: this used to guess the next planet from list order while landings were random
  const next = run.route[run.phase === "away" ? run.stop + 1 : run.stop];
  // run 1 (buggy target): 0.3 → ~25% could-solve. run 3 (fixed): 0.45 → 54%, too automatic
  if (next && run.rng.next() < 0.25) {
    const fits = role.filter((m) => m.solves.includes(next.need));
    if (fits.length) return fits[run.rng.int(fits.length)];
  }
  // object: absurdity-weighted seeded pick
  const total = role.reduce((s, m) => s + m.absurdity, 0);
  let r = run.rng.next() * total;
  for (const m of role) if ((r -= m.absurdity) <= 0) return m;
  return role[0];
}

function originText(run: Run, how: string, from?: string) {
  const when = `on day ${run.day}`;
  switch (how) {
    case "start": return "was already bolted on when Jame found her.";
    case "salvage": return `salvaged ${when}. it was already attached to something.`;
    case "trade": return `traded for the ${from} ${when}. she does not know why yet.`;
    case "pity": return `a trader felt sorry for her ${when}.`;
    case "stray": return `came with ${from}.`;
    case "panic": return "panic purchase on the approach.";
    default: return "nobody knows.";
  }
}

function tookAway(run: Run, m: Mutation) {
  run.tidied.push({ id: m.id, name: m.name, category: m.category, absurdity: m.absurdity, stop: run.stop, day: run.day });
}

function bolt(run: Run, m: Mutation | null, how: string, from?: string) {
  if (!m) return;
  run.origins[m.id] = originText(run, how, from);
  run.mutations.push(m);
  run.seen.mutations.add(m.id);
  apply(run, m.upside);
  apply(run, m.downside);
  addTags(run, m.why_tags);
  record(run, "bolt", { id: m.id, how });
  say(run, "not-betsy", m.log.bolted);
}

// ---------- present: landing, fixing, leaving ----------
function land(run: Run) {
  run.phase = "landed";
  run.day = 0;
  run.landLogIndex = run.log.length;
  run.planet = run.route[run.stop];
  run.seen.planets.add(run.planet.id);
  run.fixesLeft = 2;
  run.history.push(run.mutations.map((m) => m.id));
  // at a stop: the planet's problem and/or customs, decided by RNG
  const roll = run.rng.next();
  run.customsToday = roll < 0.35 ? "none" : roll < 0.7 ? (run.planet.customs as Run["customsToday"]) : "full";
  say(run, "system", `LANDED: ${run.planet.name}. ${run.planet.problem}`);
  if (run.customsToday !== "none") customs(run);
  run.landEndIndex = run.log.length;
  run.hand = drawWords(run);
  record(run, "land", { planet: run.planet.id, customs: run.customsToday });
}

function customs(run: Run) {
  const flagged = run.mutations.filter((m) => m.downside.tags.includes("customs-flag"));
  say(run, "prestige", `CUSTOMS INTAKE (${run.customsToday.toUpperCase()}). DECLARE ALL ATTACHMENTS.`);
  for (const m of flagged) {
    run.fronts.tubs += run.customsToday === "full" ? 2 : 1;
    if (run.customsToday === "full" && run.rng.next() < 0.5) {
      run.mutations = run.mutations.filter((x) => x.id !== m.id);
      tookAway(run, m);
      apply(run, { smudge: -1 });
      say(run, "prestige", `CONFISCATED: ${m.name}. CLASSIFICATION: CONTRABAND, PROBABLY.`);
    } else {
      say(run, "prestige", `NOTED: ${m.name}. A FORM HAS BEEN FILED ABOUT YOU.`);
    }
  }
  if (!flagged.length) say(run, "prestige", "NOTHING TO DECLARE. SUSPICIOUS.");
}

function drawWords(run: Run): LastWords[] {
  const fresh = CONTENT.words.filter((w) => !run.seen.words.has(w.id));
  const pool = fresh.length >= 3 ? fresh : CONTENT.words;
  const hand: LastWords[] = [];
  const copy = [...pool];
  while (hand.length < 3 && copy.length) hand.push(copy.splice(run.rng.int(copy.length), 1)[0]);
  return hand;
}

export function fixWith(run: Run, mutationId: string) {
  if (run.phase !== "landed" || run.fixesLeft <= 0) return;
  const m = run.mutations.find((x) => x.id === mutationId);
  if (!m) return;
  run.fixesLeft--;
  let result: "solved" | "partial" | "failed";
  if (m.solves.includes(run.planet.need)) result = "solved";
  else if (run.rng.next() < 0.25 + m.absurdity * 0.05) result = "partial";
  else result = "failed";
  run.fixed.push({ planet: run.planet.id, result, with: m.id });
  record(run, "fix", { with: m.id, need: run.planet.need, result });
  if (result === "solved") {
    apply(run, { smudge: 4, scrap: 2 });
    addTags(run, [...m.why_tags, ...run.planet.why_tags], 2);
    say(run, "jame", `Jame hooks the ${m.name} into the problem. It works. Nobody can explain why.`);
    say(run, "not-betsy", m.log.pays_off);
    run.fixesLeft = 0;
  } else if (result === "partial") {
    apply(run, { smudge: 2 });
    addTags(run, m.why_tags);
    say(run, "jame", `Jame tries the ${m.name}. It sort of helps. It also makes a noise now.`);
  } else {
    apply(run, { smudge: 1, scrap: -1 });
    say(run, "jame", `Jame tries the ${m.name}. It does not help. It does get louder.`);
  }
  // repair makes it weirder: the part stays, and it's more hers now
  addTags(run, ["repair"]);
}

export function setGoal(run: Run, goal: GoalId) {
  if (run.phase === "landed") run.goal = goal;
}
export function sayWords(run: Run, wordsId: string) {
  if (run.phase !== "landed") return;
  run.words = run.hand.find((w) => w.id === wordsId) ?? null;
}
export function keepMutation(run: Run, id: string | null) {
  run.keptId = id; // God Mode stub: no ad, no gate in the prototype
}

export function leave(run: Run) {
  if (run.phase !== "landed" || !run.goal || !run.words) return;
  run.seen.words.add(run.words.id);
  addTags(run, run.words.why_tags, 2);
  say(run, "jame", `"${run.words.line}"`);
  say(run, "not-betsy", `Understood. ${run.words.literal_reading}`);
  // each stop obsoletes the last: she sheds this epoch's parts (God Mode keeps one)
  const kept = run.mutations.find((m) => m.id === run.keptId);
  if (!run.opts.persistParts) {
    const shed = run.mutations.filter((m) => m.id !== run.keptId);
    if (shed.length) say(run, "not-betsy", `Shedding ${shed.length} parts. They were family. They are now debris.`);
    run.mutations = kept ? [kept] : [];
  }
  run.keptId = null;
  run.phase = "away";
  run.day = 0;
  run.returnLog = [];
  record(run, "leave", { goal: run.goal, words: run.words.id, kept: kept?.id ?? null });
}

// ---------- away: one day ----------
export function advanceDay(run: Run) {
  if (run.phase !== "away") return;
  run.day++;
  const goal = GOALS[run.goal ?? "salvage"];
  apply(run, { power: -1 + goal.power });
  for (const h of run.habits) apply(run, h.tiny_effect as Vec);

  if (run.power <= 0) {
    say(run, "not-betsy", "Power exhausted. Status: waiting and wondering. Solar panels deployed.");
    apply(run, { power: 7 }); // smoke run 1: +3 left her drifting ~7 of 21 days; run 2: +5 still ~5
    record(run, "drift", {});
  } else {
    const weights = { ...BASE_WEIGHTS };
    for (const [k, v] of Object.entries(goal.weights)) weights[k as Encounter] = Math.max(0, weights[k as Encounter] + v);
    const boosted = new Set<string>();
    for (const [k, v] of Object.entries(run.words?.encounter_weights ?? {})) {
      if (k === "power") apply(run, { power: v as number });
      else if (k in weights) {
        weights[k as Encounter] = Math.max(0, weights[k as Encounter] + (v as number));
        if ((v as number) > 0) boosted.add(k);
      }
    }
    const enc = weightedPick(run, weights);
    run.echo = boosted.has(enc);
    encounter(run, enc);
    run.echo = false;
  }

  // the Prestige moves on its own clocks
  run.fronts.synthesis++;
  if (run.smudge > targetSmudge(run)) run.fronts.vorian++;
  if (run.fronts.synthesis >= 9) {
    run.fronts.synthesis = 0;
    tidy(run, "THE SYNTHESIS HAS APPLIED AN UPDATE.");
  }
  // browser playtest: Vorian's clock filled by stop 2 and then did nothing (no if-full)
  if (run.fronts.vorian >= 10) {
    run.fronts.vorian = 4;
    tidy(run, "AUDITOR VORIAN HAS FILED AN INTERIM REPORT. HIS EYE-LIGHT IS FLICKERING.");
  }
  if (run.fronts.tubs >= 6) {
    run.fronts.tubs = 0;
    tidy(run, "GENERAL TUBS HAS ORDERED A PURGE.");
    tidy(run, "THE PURGE CONTINUES.");
  }

  if (run.day >= DAYS_PER_STOP) {
    // smoke run 1: 13–22% of landings arrived with no parts at all, so Jame had nothing to fix with
    if (!run.mutations.length) {
      say(run, "not-betsy", "Approaching landing with no attachments. I panicked and acquired something.");
      bolt(run, pickMutation(run), "panic");
    }
    run.stop++;
    if (run.stop >= STOPS) verdict(run);
    else land(run);
  }
}

function weightedPick(run: Run, w: Record<Encounter, number>): Encounter {
  const entries = Object.entries(w) as [Encounter, number][];
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = run.rng.next() * total;
  for (const [k, v] of entries) if ((r -= v) <= 0) return k;
  return "quiet";
}

function encounter(run: Run, enc: Encounter) {
  record(run, "encounter", enc);
  switch (enc) {
    case "salvage":
      if (run.scrap >= 1 || run.rng.next() < 0.6) {
        apply(run, { scrap: -1 });
        bolt(run, pickMutation(run), "salvage");
      } else say(run, "not-betsy", "Salvage located. Salvage too large. Salvage declined, with regret.");
      break;
    case "trade": {
      // browser playtest: repeated "nothing to trade, we waved" made weeks feel empty
      if (!run.mutations.length) { say(run, "not-betsy", "Trader encountered. Nothing to trade. The trader felt sorry for us."); bolt(run, pickMutation(run), "pity"); break; }
      if (run.words?.id === "words-9") { say(run, "not-betsy", "Trade refused. All parts are family."); break; }
      const out = run.mutations.splice(run.rng.int(run.mutations.length), 1)[0];
      apply(run, { scrap: 3 });
      say(run, "not-betsy", `Traded ${out.name} for scrap. The trader seemed frightened by it.`);
      bolt(run, pickMutation(run), "trade", out.name);
      break;
    }
    case "stray": {
      const pool = CONTENT.strays.filter((s) => !run.strays.some((x) => x.id === s.id));
      if (!pool.length || run.strays.length >= 3) { say(run, "not-betsy", "A stray approached. No seats. It is following us anyway."); break; }
      const s = pool[run.rng.int(pool.length)];
      run.strays.push(s);
      addTags(run, s.why_tags);
      say(run, "not-betsy", s.log.arrives);
      if (s.effect === "grant-mutation") bolt(run, pickMutation(run), "stray", s.name);
      if (s.effect === "remove-mutation" && run.mutations.length) {
        const gone = run.mutations.splice(run.rng.int(run.mutations.length), 1)[0];
        tookAway(run, gone);
        say(run, "not-betsy", `${s.name} has removed ${gone.name}. They say it was "for the best."`);
      }
      break;
    }
    case "habit": {
      const pool = CONTENT.habits.filter((h) => !run.habits.some((x) => x.id === h.id));
      if (!pool.length) break;
      const h = pool[run.rng.int(pool.length)];
      run.habits.push(h);
      addTags(run, h.why_tags);
      say(run, "not-betsy", h.log);
      break;
    }
    case "prestige":
      run.fronts.vorian++;
      say(run, "prestige", "AUDITOR VORIAN HAS OBSERVED YOU. HIS EYE-LIGHT FLICKERED.");
      if (run.rng.next() < 0.4) tidy(run, "A CLEANING DRONE HAS ATTENDED TO AN IRREGULARITY.");
      break;
    case "repair":
      apply(run, { smudge: 1 });
      addTags(run, ["repair"]);
      say(run, "not-betsy", "I have repaired something. It is now louder.");
      break;
    case "quiet":
      say(run, "not-betsy", run.rng.next() < 0.5 ? "Nothing happened. I have logged the nothing." : "Space remains empty. Like, really empty.");
      break;
  }
  // strays drip
  for (const s of run.strays) {
    if (s.effect === "scrap-drip") apply(run, { scrap: 1 });
    if (s.effect === "power-drip") apply(run, { power: 1 });
    if (s.effect === "smudge-drip") apply(run, { smudge: 1 });
  }
}

function tidy(run: Run, why: string) {
  say(run, "prestige", why);
  const tidyable = run.mutations.filter((m) => m.id !== run.keptId);
  if (tidyable.length) {
    const m = tidyable[run.rng.int(tidyable.length)];
    run.mutations = run.mutations.filter((x) => x.id !== m.id);
    tookAway(run, m);
    say(run, "prestige", `REMOVED: ${m.name}. PERFORMANCE IMPROVED BY 0.003%.`);
  }
  apply(run, { smudge: -2 });
  record(run, "tidy", why);
}

/** Real-time absence pays a little, never enough to force it: 1 scrap per 12 real hours, max 4 per stop. */
export function interestForAbsence(run: Run, realMs: number) {
  const gain = Math.min(4, Math.floor(realMs / (12 * 3600 * 1000)));
  if (gain > 0) { apply(run, { scrap: gain }); say(run, "system", `While you were away: ${gain} scrap accumulated.`); }
}

// ---------- the verdict (the Prestige's score) and the why (the story) ----------
const CLASSIFICATIONS = {
  archived: ["FURNITURE, HOSTILE", "A FAILED COMPANY", "DEBRIS WITH OPINIONS", "FERN (PENDING)"],
  deferred: ["PERSISTENT ANOMALY", "WEATHER EVENT", "UNSCHEDULED MAINTENANCE", "TAX WRITE-OFF"],
  unclassifiable: ["[FIELD OVERFLOW]", "FERN", "A SMALL RELIGION", "EXTREMELY ALBERTA"],
};

export function verdictScore(run: Run) {
  // smoke run 1: solving planets barely mattered (x3); passivity won
  return run.smudge + run.strays.length * 2 + run.habits.length + run.fixed.filter((f) => f.result === "solved").length * 6 - run.fronts.vorian * 0.5;
}

function verdict(run: Run) {
  run.phase = "verdict";
  const score = Math.round(verdictScore(run));
  // smoke run 2 score p10/p50/p90: thoughtful 19/30/48, absent 14/22/36
  // run 4 (Vorian if-full added): thoughtful 26/37/55, absent 16/26/39
  const band = score < 25 ? "archived" : score < 41 ? "deferred" : "unclassifiable";
  const classification = CLASSIFICATIONS[band][run.rng.int(CLASSIFICATIONS[band].length)];
  // the why: match the run's dominant tags within the verdict band
  const total = (w: Why) => w.needs_tags.reduce((s, t) => s + (run.tags[t] ?? 0), 0) / w.needs_tags.length;
  const inBand = CONTENT.whys.filter((w) => w.verdict_band === band);
  const candidates = (inBand.length ? inBand : CONTENT.whys).sort((a, b) => total(b) - total(a));
  const top = candidates.slice(0, 3);
  const why = top[run.rng.int(top.length)];
  const carry = band === "archived" && run.mutations.length ? run.mutations[run.rng.int(run.mutations.length)] : null;
  run.verdict = { score, band, classification, why, carry };
  say(run, "prestige", `AUDIT COMPLETE. CLASSIFICATION: ${classification}.`);
  record(run, "verdict", { score, band, why: why.id, carry: carry?.id ?? null });
}

/** Skip to the end of the current absence. */
export function fastForward(run: Run) {
  while (run.phase === "away") advanceDay(run);
}
