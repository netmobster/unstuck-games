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

/** Up to three heirlooms the fallen generation can pass on. */
export function heirlooms(g) {
  const out = [];
  const k = g.stats.kindTicks, top = ['C', 'S', 'D'].sort((a, b) => k[b] - k[a])[0];
  if (k[top] > 0) out.push({ attune: top, label: `${KIND_WORD[top]}-born`, text: `Start attuned to ${KIND_WORD[top]}: the +30% without having to live in one first.` });
  const held = g.stats.boons.filter(b => !b.endsWith('(inherited)'));
  for (const id of [...new Set(held)].reverse().slice(0, 2)) {
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
  next.chronicle.push({ gen: line.gen, name: `${line.name} ${roman(line.gen)}`, seed: g.seed, nights, sentence, inherited: line.heir ? describe(line.heir) : null, passed: pick && !pick.none ? describe(pick) : null });
  if (nights === 0) { next.ended = true; next.endedAt = line.gen; return next; }
  next.gen = line.gen + 1;
  next.heir = pick && !pick.none ? (pick.attune ? { attune: pick.attune } : { boon: pick.boon }) : null;
  return next;
}
export function describe(h) {
  if (h.attune) return `${KIND_WORD[h.attune]}-born`;
  if (h.boon) { const b = BOONS.find(x => x.id === h.boon); return b ? b.text.split('. ')[0] : h.boon; }
  return '';
}
