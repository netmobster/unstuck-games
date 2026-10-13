// Apply the evidence policy to the research agents' raw files, in place, and log every change.
// Idempotent. Run before build-catalogue.mjs:  node boop-remote/scripts/normalize-raw.mjs
//
// Policy (see RESEARCH_METHODOLOGY.md):
//  - "Confirmed" needs an official/government page that was actually opened (accessible !== false).
//    A search-engine summary of an official page is not enough: eligibility becomes "likely" and
//    an eligibility_confirmed status becomes official_info_found.
//  - A direct application link is only published if a source at that URL was opened. Otherwise it
//    is cleared (it stays listed in the record's sources) and the next step points at the official site.
//  - Category records can only be official_info_found / uncertain / stale_needs_recheck.
//  - Pay figures whose currency was not stated stay as published, with currency "unstated".
//    We never assume USD.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
const log = [];
const curation = JSON.parse(readFileSync(join(root, 'data', 'curation.json'), 'utf8'));

for (const f of readdirSync(rawDir).filter(f => f.endsWith('.json') && f !== 'safety_sources.json').sort()) {
  const path = join(rawDir, f);
  const records = JSON.parse(readFileSync(path, 'utf8'));
  for (const r of records) {
    const opened = r.sources.some(s => ['official', 'government'].includes(s.type) && s.accessible !== false);
    const note = (what) => log.push(`| ${r.id} | ${what} |`);
    if (r.geography.canadaEligibility === 'confirmed' && !opened) {
      r.geography.canadaEligibility = 'likely';
      note('canadaEligibility confirmed → likely (official page seen only via search summary)');
    }
    if (r.status === 'eligibility_confirmed' && !opened) {
      r.status = 'official_info_found';
      note('status eligibility_confirmed → official_info_found (no official page opened)');
    }
    if (r.applyUrl && !r.sources.some(s => s.url === r.applyUrl && s.accessible !== false)) {
      if (!r.sources.some(s => s.url === r.applyUrl)) {
        r.sources.push({ url: r.applyUrl, title: 'Careers / application page (listed in research, not opened)', type: 'official', publisher: r.organization, published: null, accessed: r.lastChecked, claims: [], notes: 'Seen in search results only; kept for re-checking.', accessible: false });
      }
      note(`applyUrl ${r.applyUrl} cleared (page not opened; kept in sources)`);
      r.applyUrl = null;
    }
    if (r.type === 'category' && !['official_info_found', 'uncertain', 'stale_needs_recheck'].includes(r.status)) {
      note(`category status ${r.status} → official_info_found`);
      r.status = 'official_info_found';
    }
    const c = r.compensation;
    if ((c.min != null || c.max != null) && !c.currency) {
      c.currency = 'unstated';
      note('compensation currency null → "unstated" (not assumed)');
    }
    const cur = curation[r.id];
    if (cur && cur.audience && JSON.stringify(r.audience) !== JSON.stringify(cur.audience)) {
      r.audience = cur.audience;
      note(`audience set: ${cur.audience.join('; ')}`);
    }
    if (r.requirements.experience == null) { r.requirements.experience = 'unknown'; note('requirements.experience null → unknown'); }
    if (r.interaction.realtime == null) { r.interaction.realtime = 'unknown'; note('interaction.realtime null → unknown'); }
  }
  writeFileSync(path, JSON.stringify(records, null, 2) + '\n');
}

const out = join(root, 'research', 'normalization_log.md');
// Append-only: each run that changes something adds a section, so history is never lost.
if (log.length) {
  const head = existsSync(out) ? readFileSync(out, 'utf8') : `# Normalisation log\n\nChanges applied by \`scripts/normalize-raw.mjs\` to the agents' raw research so it matches the evidence policy and the editorial curation in \`data/curation.json\`. Runs that change nothing add nothing.\n`;
  writeFileSync(out, `${head}\n## Run ${new Date().toISOString().slice(0, 10)}\n\n| Record | Change |\n|---|---|\n${log.join('\n')}\n`);
}
console.log(`${log.length} change(s)`);
