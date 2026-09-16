// Lucy smoke tests: thousands of machine sessions, so Jay only judges the specimens.
// Hard invariants PASS/FAIL. Everything else is a distribution, with a focus on runs 5–10:
// is she still generating new behaviour, habits and weirdness, or has she gone flat?
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOMS, THINGS } from "../src/house";
import {
  COMBOS, ITEMS, ITEM_IDS, MAX_TICKS, comboKey, finishRun, newProfile, replay, runToEnd, startRun, unlockedItems,
  type ItemId, type Profile, type RunSpec, type RunSummary,
} from "../src/sim";
import { Rng } from "../src/rng";

const SEEDS = Number(process.env.SEEDS ?? 400);
const RUNS = 12;

type Policy = { name: string; choose: (p: Profile, rng: Rng, run: number) => RunSpec };
const pairsOf = (items: ItemId[]) => items.flatMap((a, i) => items.slice(i + 1).map((b) => [a, b] as ItemId[]));

const POLICIES: Policy[] = [
  { name: "explorer (random 1–2 items, squeaks sometimes)", choose: (p, rng) => {
    const items = unlockedItems(p);
    const prep = rng.next() < 0.7 ? pairsOf(items)[rng.int(pairsOf(items).length)] : [items[rng.int(items.length)]];
    return { prep, squeakAt: rng.next() < 0.35 ? 60 + rng.int(500) : undefined };
  } },
  { name: "combo hunter (tries untried pairs)", choose: (p, rng) => {
    const tried = new Set(p.runs.map((r) => comboKey(r.prep)).filter(Boolean));
    const pairs = pairsOf(unlockedItems(p));
    const fresh = pairs.filter((x) => !tried.has(comboKey(x)));
    return { prep: (fresh.length ? fresh : pairs)[rng.int((fresh.length ? fresh : pairs).length)], squeakAt: rng.next() < 0.3 ? 100 + rng.int(400) : undefined };
  } },
  { name: "loyal (snacks + sock every time)", choose: () => ({ prep: ["snacks", "sock"] }) },
  { name: "single item", choose: (p, rng) => { const items = unlockedItems(p); return { prep: [items[rng.int(items.length)]] }; } },
  { name: "no prep, never squeaks", choose: () => ({ prep: [] }) },
  { name: "God Mode bather (explorer + a bath whenever she's grudgy)", choose: (p, rng) => {
    const items = unlockedItems(p);
    const prep: ItemId[] = rng.next() < 0.7 ? pairsOf(items)[rng.int(pairsOf(items).length)] : [items[rng.int(items.length)]];
    if (p.leftover?.kind === "grudgy") prep.push("bath");
    return { prep, squeakAt: rng.next() < 0.35 ? 60 + rng.int(500) : undefined };
  } },
];

// ---------- helpers ----------
const q = (xs: number[], f: number) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
const med = (xs: number[]) => q(xs, 0.5);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");
const f1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "—");
const acts = (r: RunSummary) => new Set(r.events.filter((e) => e.target && e.verb !== "sniff").map((e) => `${e.verb}:${e.target}`));
const jaccard = (a: Set<string>, b: Set<string>) => { const u = new Set([...a, ...b]); if (!u.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return 1 - i / u.size; };

const out: string[] = [];
const log = (s = "") => { out.push(s); console.log(s); };
const failures: string[] = [];
const fail = (msg: string) => { if (failures.length < 20) failures.push(msg); };

log(`# Lucy smoke — ${new Date().toISOString().slice(0, 16)}`);
log(`${SEEDS} sessions × ${RUNS} runs × ${POLICIES.length} player styles = ${SEEDS * RUNS * POLICIES.length} runs.`);
log();

const leftoverStats: Record<string, Record<string, number>> = {};
type PerRun = { ticks: number[]; rooms: number[]; newE: number[]; dead: number; stash: number[]; habits: number[]; journal: number[]; novelty: number[]; words: number[]; verbs: number[]; forced: number };
const unlockRun: Record<string, Record<string, number[]>> = {};
const comboStats: Record<string, { tried: number; fired: number }> = {};

for (const pol of POLICIES) {
  const per: PerRun[] = Array.from({ length: RUNS }, () => ({ ticks: [], rooms: [], newE: [], dead: 0, stash: [], habits: [], journal: [], novelty: [], words: [], verbs: [], forced: 0 }));
  unlockRun[pol.name] = {};
  for (let s = 1; s <= SEEDS; s++) {
    const seed = s * 7919;
    const rng = new Rng(seed ^ 0xabcdef);
    const p = newProfile(seed);
    const specs: RunSpec[] = [];
    const seen = new Set<string>();
    const unlockedAtStart = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const spec = pol.choose(p, rng, i);
      specs.push(spec);
      const run = runToEnd(startRun(p, spec.prep), spec.squeakAt);
      const sum = finishRun(p, run);
      const d = per[i];
      d.ticks.push(sum.ticks); d.rooms.push(sum.rooms.length); d.newE.push(sum.newEntries.length);
      if (!sum.newEntries.length) d.dead++;
      d.stash.push(sum.stashSize); d.journal.push(p.journal.size);
      d.habits.push(Object.values(p.habits).filter(Boolean).length);
      const a = acts(sum);
      d.novelty.push(a.size ? [...a].filter((x) => !seen.has(x)).length / a.size : 0);
      for (const x of a) seen.add(x);
      d.words.push(sum.events.reduce((w, e) => w + e.text.split(/\s+/).length, 0));
      d.verbs.push(new Set(sum.events.map((e) => e.verb)).size);
      if (sum.events.some((e) => e.cause === "fell asleep mid-thought") && sum.ticks >= MAX_TICKS) d.forced++;
      const lk = sum.leftoverIn?.kind ?? "none";
      (leftoverStats[pol.name] ??= {})[lk] = (leftoverStats[pol.name][lk] ?? 0) + 1;
      if (i >= 1 && sum.leftoverIn && sum.leftoverIn.strength > 0.2) fail(`${pol.name} seed ${seed}: leftover strength ${sum.leftoverIn.strength} above 20%`);
      const k = comboKey(spec.prep);
      if (k && COMBOS[k]) { comboStats[k] ??= { tried: 0, fired: 0 }; comboStats[k].tried++; if (sum.comboFired) comboStats[k].fired++; }
      for (const rm of ROOMS) if (rm.unlockAt > 0 && p.journal.size >= rm.unlockAt && !unlockedAtStart.has(rm.id)) { unlockedAtStart.add(rm.id); (unlockRun[pol.name][rm.name] ??= []).push(i + 1); }
      for (const it of ITEM_IDS) if (ITEMS[it].unlockAt > 0 && p.journal.size >= ITEMS[it].unlockAt && !unlockedAtStart.has(it)) { unlockedAtStart.add(it); (unlockRun[pol.name][ITEMS[it].name] ??= []).push(i + 1); }

      // invariants
      if (!sum.events.some((e) => e.verb === "nap")) fail(`${pol.name} seed ${seed} run ${i + 1}: never napped`);
      if (sum.ticks > MAX_TICKS) fail(`${pol.name} seed ${seed} run ${i + 1}: ran past MAX_TICKS`);
      const ids = [...p.things.map((t) => t.id), ...p.stash.map((t) => t.id)];
      if (new Set(ids).size !== ids.length) fail(`${pol.name} seed ${seed} run ${i + 1}: duplicate thing ${ids.find((x, j) => ids.indexOf(x) !== j)}`);
      const base = THINGS.filter((t) => !ids.includes(t.id));
      if (base.length) fail(`${pol.name} seed ${seed} run ${i + 1}: things vanished: ${base.map((t) => t.id).join(",")}`);
      if (sum.events.some((e) => !e.text)) fail(`${pol.name} seed ${seed}: empty log line`);
    }
    if (s <= 20) {
      const again = replay(seed, specs);
      const a = JSON.stringify(p.runs.map((r) => [r.sentence, r.ticks, r.newEntries.length]));
      const b = JSON.stringify(again.runs.map((r) => [r.sentence, r.ticks, r.newEntries.length]));
      if (a !== b) fail(`${pol.name} seed ${seed}: replay not deterministic`);
    }
  }

  log(`## ${pol.name}`);
  log(`| run | length s (p50) | rooms | distinct verbs | new journal entries (p50 / p90) | no new entry | new actions (share) | stash | habits | journal total | reading s |`);
  log(`|---|---|---|---|---|---|---|---|---|---|---|`);
  per.forEach((d, i) => {
    log(`| ${i + 1}${i >= 4 && i <= 9 ? " ◆" : ""} | ${f1(med(d.ticks) / 10)} | ${med(d.rooms)} | ${med(d.verbs)} | ${med(d.newE)} / ${q(d.newE, 0.9)} | ${pct(d.dead, SEEDS)} | ${pct(Math.round(med(d.novelty) * 100), 100)} | ${med(d.stash)} | ${med(d.habits)} | ${med(d.journal)} | ${f1(med(d.words) / 3.3)} |`);
  });
  const ls = leftoverStats[pol.name] ?? {};
  const lt = Object.values(ls).reduce((a, b) => a + b, 0);
  log(`\nMood carried in from the last run: ${["none", "hyper", "sleepy", "grudgy"].map((x) => `${x} ${pct(ls[x] ?? 0, lt)}`).join(" · ")}`);
  const u = unlockRun[pol.name];
  log();
  log(`Unlocks (median run, share of sessions that got there): ${Object.entries(u).map(([k, v]) => `${k} → run ${med(v)} (${pct(v.length, SEEDS)})`).join(" · ") || "none"}`);
  log();
}

log(`## Combos: tried vs. actually happened`);
log(`| combo | tried | fired |`);
log(`|---|---|---|`);
for (const [k, v] of Object.entries(comboStats).sort((a, b) => b[1].tried - a[1].tried)) log(`| ${COMBOS[k].name} (${k}) | ${v.tried} | ${pct(v.fired, v.tried)} |`);
log(`Combos never tried by any policy: ${Object.keys(COMBOS).filter((k) => !comboStats[k]).map((k) => COMBOS[k].name).join(", ") || "none"}`);
log();

// ---------- twin probe: same house, same run, same Lucy dice; only the prep differs ----------
log(`## Twin probe: does prep produce a different Lucy?`);
log(`Same seed, same history (3 explorer runs), same run index and dice. Only the prep changes. 1.00 = nothing in common.`);
log(`| prep A vs prep B | what she did (distance) | rooms (distance) | where she napped differs | events explained by prep |`);
log(`|---|---|---|---|---|`);
const base4: ItemId[] = ["snacks", "sock", "insult", "salmon"];
// leftover probe: same prep, same everything, but she comes in grudgy/hyper/sleepy vs. ordinary
log(`### Leftover probe: same prep, different mood coming in`);
log(`| prep | she came in | what she did vs. ordinary (distance) | squeak answered | nap in her shoe |`);
log(`|---|---|---|---|---|`);
for (const pr of [["sock"], ["snacks", "sock"], ["insult"]] as ItemId[][]) {
  for (const kind of ["hyper", "sleepy", "grudgy"] as const) {
    const dd: number[] = []; let sqA = 0, sqB = 0, shoe = 0; const N = Math.min(SEEDS, 200);
    for (let s = 1; s <= N; s++) {
      const seed = s * 15485863;
      const pa = replay(seed, [{ prep: ["salmon"] }]), pb = replay(seed, [{ prep: ["salmon"] }]);
      pa.leftover = null; pb.leftover = { kind, strength: 0.15, why: "probe" };
      const a = finishRun(pa, runToEnd(startRun(pa, pr), 150));
      const b = finishRun(pb, runToEnd(startRun(pb, pr), 150));
      dd.push(jaccard(acts(a), acts(b)));
      if (a.events.some((e) => e.cause === "the squeak" && e.text.includes("came")) || a.events.some((e) => e.cause === "ritual:show-and-tell")) sqA++;
      if (b.events.some((e) => e.cause === "the squeak" && e.text.includes("came")) || b.events.some((e) => e.cause === "ritual:show-and-tell")) sqB++;
      if (b.events.some((e) => e.target === "shoe" && (e.verb === "doze" || e.verb === "nap"))) shoe++;
    }
    log(`| ${pr.join(" + ")} | ${kind} | ${med(dd).toFixed(2)} | ${pct(sqA, N)} → ${pct(sqB, N)} | ${pct(shoe, N)} |`);
  }
}
log();
const twins: [ItemId[], ItemId[]][] = [
  [["snacks"], ["snacks"]],
  [["snacks"], ["sock"]], [["sock"], ["insult"]], [["insult"], ["salmon"]], [["snacks"], ["salmon"]],
  [["sock", "snacks"], ["sock", "insult"]], [["salmon", "snacks"], ["salmon", "sock"]],
  [[], ["salmon"]], [[], ["insult"]],
  [["insult"], ["insult", "bath"]], [["sock"], ["sock", "bath"]],
];
for (const [A, B] of twins) {
  const dist: number[] = [], rooms: number[] = []; let napDiff = 0; const explA: number[] = [];
  const N = Math.min(SEEDS, 300);
  for (let s = 1; s <= N; s++) {
    const seed = s * 104729;
    const hist: RunSpec[] = [{ prep: ["snacks"] }, { prep: ["sock", "insult"] }, { prep: ["salmon"] }];
    const pa = replay(seed, hist), pb = replay(seed, hist);
    const a = finishRun(pa, runToEnd(startRun(pa, A)));
    const b = finishRun(pb, runToEnd(startRun(pb, B)));
    dist.push(jaccard(acts(a), acts(b)));
    rooms.push(jaccard(new Set(a.rooms), new Set(b.rooms)));
    if (a.napOn !== b.napOn) napDiff++;
    const causal = b.events.filter((e) => e.target && e.verb !== "sniff");
    explA.push(causal.length ? causal.filter((e) => e.cause !== "curiosity" && e.cause !== "exploring" && e.cause !== "tired").length / causal.length : 0);
  }
  const label = (x: ItemId[]) => x.length ? x.join(" + ") : "nothing";
  log(`| ${label(A)} vs ${label(B)}${A.join() === B.join() ? " (control)" : ""} | ${med(dist).toFixed(2)} | ${med(rooms).toFixed(2)} | ${pct(napDiff, N)} | ${pct(Math.round(med(explA) * 100), 100)} |`);
}
void base4;
log();

log(`## Invariants`);
log(failures.length ? `**FAIL** (${failures.length} shown)\n\n${failures.map((f) => `- ${f}`).join("\n")}` : `**PASS**: every run ends in a nap before ${MAX_TICKS} ticks, no duplicated or vanished things, no empty log lines, replays are deterministic.`);

const dir = join(import.meta.dir, "..", "reports");
mkdirSync(dir, { recursive: true });
const file = join(dir, `smoke-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`);
writeFileSync(file, out.join("\n"));
console.log(`\nwrote ${file}`);
