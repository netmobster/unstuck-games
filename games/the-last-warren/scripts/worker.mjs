import { parentPort } from 'node:worker_threads';
import { runGame, summarise, twin } from '../src/run.js';
import { roster } from '../src/policies.js';
import { expert } from '../src/expert.js';

let R = null;
parentPort.on('message', ({ id, cfg, policy, seeds, twins }) => {
  try {
    R ||= { ...roster(true), expert: expert() };
    const factory = R[policy];
    if (!factory) throw new Error('no policy ' + policy);
    const out = [];
    for (let s = seeds[0]; s < seeds[1]; s++) {
      const g = runGame(s, cfg, factory);
      const rec = summarise(g);
      rec.seed = s;
      if (twins && rec.cause === 'found') {
        rec.twin1 = twin(s, cfg, factory, rec, 1);
        rec.twin2 = twin(s, cfg, factory, rec, 2);
        rec.twin3 = twin(s, cfg, factory, rec, 3);
      }
      out.push(rec);
    }
    parentPort.postMessage({ id, result: out });
  } catch (e) { parentPort.postMessage({ id, error: String(e && e.stack || e) }); }
});
