/* What Lucy thinks about each thing under the couch.

   The voice is Jay's, from three lines (2026-09-16):

       Shoe is nice. My shoe.
       Am fish. Good fish.
       Soft and warm. Soft and warm.

   Two tiny sentences. Capitals and full stops, but no grammar to speak of. The second
   sentence either claims the thing or says the first one again, because she is a ferret
   and she means it. If a line could come out of a person, it is wrong.

   Every thought is derived from facts the sim wrote down at the moment of the theft
   (sim.ts, `Took`): the tag that caught her eye, why she went for it, the mood she was
   in, and what she did with it after. Nothing is invented — the ledger decides, these
   words only report. The variant is picked by a hash of the seed and the thing, so the
   same object in two different Lucys does not always say the same thing, but a given
   Lucy never changes her mind. */

import type { Placed } from "./sim";

type Line = (n: string, N: string) => string;

/** By the tag that caught her eye. */
const BY_TAG: Record<string, Line[]> = {
  fabric: [(n, N) => `${N} is nice. My ${n}.`, () => "For nest. For nest.", (n) => `Good ${n}. Mine now.`],
  soft:   [() => "Soft and warm. Soft and warm.", (n, N) => `${N} is soft. My ${n}.`, () => "So soft. Keep."],
  warm:   [() => "Warm thing. Stay warm.", (n, N) => `${N} is warm. My ${n}.`],
  food:   [() => "Crunchy. For later.", (n) => `Am hungry. Good ${n}.`, () => "Snack. My snack."],
  hide:   [() => "Good for hiding. Mine.", () => "Dark in there. Good."],
  noise:  [() => "It squeak once. Keep.", () => "Loud thing. Quiet now.", (n) => `${n[0].toUpperCase() + n.slice(1)} made noise. Mine.`],
  shiny:  [() => "Shiny. Very shiny.", () => "Sparkle thing. Mine."],
  water:  [() => "Am fish. Good fish.", () => "Wet thing. Keep."],
  small:  [() => "Small. Fits. Mine.", (n) => `Tiny ${n}. Good ${n}.`],
};

/** What she did with it afterwards outranks why she picked it up. */
const BY_HOW: Record<string, Line[]> = {
  "shoe-nest":      [() => "For nest. For nest.", () => "Shoe is nice. Nest is nicer."],
  "decorates-spot": [() => "Looks better. Looks mine.", () => "My spot. My stuff.", (n) => `${n[0].toUpperCase() + n.slice(1)} goes here. Here.`],
  "the snack sock": [() => "Sock of snacks. For later.", () => "Snacks inside. Do not tell.", (n) => `Packed ${n}. Good ${n}.`],
};

/** Her mood gets the last word when it was strong enough to be the reason. */
const BY_MOOD: Record<string, Line[]> = {
  swim:    [() => "Am fish. Good fish.", (n) => `River ${n}. Mine.`, () => "Caught it. Good fish."],
  zoomies: [() => "Fast. Got it. Mine.", (n) => `${n[0].toUpperCase() + n.slice(1)}! Mine!`, () => "Zoom. Grab. Zoom."],
  sulk:    [() => "Was yours. Not now.", () => "You were mean. Mine."],
  grudgy:  [(n) => `Your ${n}. My ${n}.`, () => "Not sorry. Mine."],
  bath:    [() => "Am damp. Dry on this.", (n) => `Damp. Good ${n}.`, () => "Wet. Now it wet too."],
  sleepy:  [() => "Nap on it. Later.", (n) => `Sleepy. Soft ${n}.`],
  hyper:   [() => "Got it. Got it.", () => "Fast thing. Mine."],
};

function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/** The last word of a name is the noun she would use: "the phone charger" → "charger". */
function noun(name: string) {
  const w = name.replace(/^(a|an|the|your|her|one) /i, "").toLowerCase().split(" ");
  return w[w.length - 1];
}

/** `recent` is what the rows just above said: the same true reason three times running
    reads as a bug, so she picks another way of saying it when she has one. */
export function thoughtFor(t: Placed, seed: number, first = false, recent: string[] = []): string | null {
  const k = t.took;
  if (!k) return null; // it arrived on its own, or it was never hers: blank is honest
  const n = noun(t.name), N = n[0].toUpperCase() + n.slice(1);
  const pick = (xs: Line[]) => {
    const h = hash(`${seed}:${t.id}:${k.run}`);
    for (let j = 0; j < xs.length; j++) {
      const line = xs[(h + j) % xs.length](n, N);
      if (!recent.includes(line)) return line;
    }
    return xs[h % xs.length](n, N);
  };

  if (t.id === "slipper" && k.mood === "sulk") return "Your slipper. My slipper.";
  if (first) return "First one. Best one.";
  if (k.how && BY_HOW[k.how]) return pick(BY_HOW[k.how]);
  // A strong mood explains a theft better than the thing does.
  if (k.mood && BY_MOOD[k.mood] && (k.mood !== "hyper" && k.mood !== "sleepy" || hash(`${seed}:${t.id}`) % 2 === 0)) return pick(BY_MOOD[k.mood]);
  if (k.tag && BY_TAG[k.tag]) return pick(BY_TAG[k.tag]);
  return pick([(nn, NN) => `${NN} is nice. My ${nn}.`, () => "No reason. Good though."]);
}
