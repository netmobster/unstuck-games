// Lineage: Tokyo Jungle's generations, without the power creep.
// Each run is a generation of a named line. When it falls, one heirloom passes to the
// next: never more than one, and it replaces the last. The hunters remember the family
// (the kinds the line has favoured weigh their opening guess). The line ends when a
// generation fails to see its first dawn: that was the last warren.
// Pure data in, data out. The page keeps the line in localStorage.

import { hash } from './rng.js';
import { BOONS } from './sim.js';

const NAMES = ['Bramble', 'Sedge', 'Hazel', 'Rowan', 'Thistle', 'Fen', 'Tansy', 'Burdock', 'Sorrel', 'Yarrow', 'Holm', 'Wort'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
export const roman = n => ROMAN[n - 1] || String(n);
const KIND_WORD = { C: 'Combat', S: 'Scout', D: 'Defense' };

export function newLine(seed) {
  return { v: 1, name: NAMES[hash(seed, 'line') % NAMES.length], founded: seed, gen: 1, heir: null, kinds: { C: 0, S: 0, D: 0, N: 0 }, chronicle: [], ended: false };
}

/** The rules this generation plays under. */
export function lineCfg(line) {
  if (!line || line.ended) return {};
  const fam = line.kinds.C + line.kinds.S + line.kinds.D + (line.kinds.N || 0) > 0 ? { ...line.kinds } : null;
  return { heir: line.heir, lineage: fam };
}

/** How many heirlooms this generation may pass on: one per night survived, up to three. */
export const heirSlots = g => Math.min(3, g.result?.nights ?? 0);

/** What the fallen generation could pass on. The player keeps heirSlots(g) of them. */
export function heirlooms(g) {
  const out = [];
  const k = g.stats.kindTicks;
  for (const kk of ['C', 'S', 'D'].filter(x => k[x] > 0).sort((a, b) => k[b] - k[a]))
    out.push({ attune: kk, label: `${KIND_WORD[kk]}-born`, text: `Start attuned to ${KIND_WORD[kk]}: the +30% without having to live in one first.` });
  const held = g.stats.boons.map(b => b.replace(' (inherited)', ''));
  for (const id of [...new Set(held)].reverse()) {
    const b = BOONS.find(x => x.id === id); if (!b) continue;
    const [name, ...rest] = b.text.split('. ');
    out.push({ boon: id, label: `${name}, inherited`, text: `Start the first night with it. ${rest.join('. ')}` });
  }
  if (!out.length) out.push({ none: true, label: 'Nothing but the name', text: 'They got away with their lives.' });
  return out;
}

/** Write the generation into the chronicle and pass the heirloom. Returns the new line. */
export function recordGeneration(line, g, sentence, pick) {
  const nights = g.result?.nights ?? 0;
  const next = structuredClone(line);
  for (const kk of ['C', 'S', 'D', 'N']) next.kinds[kk] = (next.kinds[kk] || 0) + (g.stats.kindTicks[kk] || 0);
  const picks = [].concat(pick || []).filter(p => p && !p.none).slice(0, heirSlots(g));
  next.chronicle.push({ gen: line.gen, name: `${line.name} ${roman(line.gen)}`, seed: g.seed, nights, sentence, inherited: line.heir ? describe(line.heir) : null, passed: picks.length ? describe(picks) : null });
  if (nights === 0) { next.ended = true; next.endedAt = line.gen; return next; }
  next.gen = line.gen + 1;
  next.heir = picks.length ? picks.map(p => p.attune ? { attune: p.attune } : { boon: p.boon }) : null;
  return next;
}
export function describe(h) {
  if (Array.isArray(h)) return h.map(describe).join(', ');
  if (h.attune) return `${KIND_WORD[h.attune]}-born`;
  if (h.boon) { const b = BOONS.find(x => x.id === h.boon); return b ? b.text.split('. ')[0] : h.boon; }
  return '';
}
