// A worker pool. Each job: { cfg, policy, seeds: [from, to], twins } -> array of summaries.
import { Worker } from 'node:worker_threads';
import os from 'node:os';

const WORKER = new URL('./worker.mjs', import.meta.url);

export function makePool(n = Math.max(1, os.cpus().length - 2)) {
  const workers = Array.from({ length: n }, () => new Worker(WORKER));
  const idle = [...workers], queue = [];
  let nextId = 0; const pending = new Map();
  for (const w of workers) w.on('message', ({ id, result, error }) => {
    const p = pending.get(id); pending.delete(id);
    error ? p.reject(new Error(error)) : p.resolve(result);
    idle.push(w); pump();
  });
  function pump() {
    while (idle.length && queue.length) { const w = idle.pop(), job = queue.shift(); w.postMessage(job); }
  }
  return {
    run(job) { return new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); queue.push({ ...job, id }); pump(); }); },
    close() { return Promise.all(workers.map(w => w.terminate())); },
    size: n,
  };
}

/** run `seeds` games of each policy under cfg, chunked across the pool */
export async function evaluate(pool, cfg, policies, seeds, { seed0 = 1, chunk = 50, twins = false } = {}) {
  const jobs = [];
  for (const p of policies) for (let s = seed0; s < seed0 + seeds; s += chunk)
    jobs.push(pool.run({ cfg, policy: p, seeds: [s, Math.min(seed0 + seeds, s + chunk)], twins }).then(r => ({ p, r })));
  const out = {};
  for (const { p, r } of await Promise.all(jobs)) (out[p] ||= []).push(...r);
  return out;
}
