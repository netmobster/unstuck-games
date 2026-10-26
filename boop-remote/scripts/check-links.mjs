// Check that every URL in the catalogue answers. Network failures are reported as "unreachable from
// here", never as evidence that a site is fake. Usage: node boop-remote/scripts/check-links.mjs
import { readFileSync } from 'node:fs';

const { records } = JSON.parse(readFileSync(new URL('../data/catalogue.json', import.meta.url), 'utf8'));
const urls = new Map();
for (const r of records) {
  for (const u of [r.officialUrl, r.applyUrl, ...r.sources.map(s => s.url)].filter(Boolean)) {
    if (!urls.has(u)) urls.set(u, []);
    urls.get(u).push(r.id);
  }
}

const results = { ok: [], http_error: [], unreachable: [] };
const check = async u => {
  try {
    const res = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'OpportunityEngine-linkcheck/1.0' } });
    (res.ok ? results.ok : results.http_error).push([u, res.status]);
  } catch (e) {
    results.unreachable.push([u, e.cause?.code || e.name]);
  }
};
const list = [...urls.keys()];
for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(check));

console.log(`${list.length} unique URLs: ${results.ok.length} ok, ${results.http_error.length} HTTP errors, ${results.unreachable.length} unreachable from this machine.`);
for (const [u, s] of results.http_error) console.log(`  HTTP ${s}  ${u}  (${urls.get(u).join(', ')})`);
if (results.unreachable.length) {
  const codes = {};
  for (const [, c] of results.unreachable) codes[c] = (codes[c] || 0) + 1;
  console.log(`  unreachable by cause: ${JSON.stringify(codes)}. If every URL is unreachable, the network is blocked; nothing is known about the sites.`);
}
