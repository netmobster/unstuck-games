// Merge data/raw/*.json into data/catalogue.json, validate it, and write the CSV research ledger.
// Usage: node boop-remote/scripts/build-catalogue.mjs   (exits 1 on validation errors)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalogue } from '../src/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
const files = readdirSync(rawDir).filter(f => f.endsWith('.json') && f !== 'safety_sources.json').sort();

let records = [];
for (const f of files) {
  const arr = JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`${f}: expected an array`);
  records.push(...arr.map(r => ({ ...r, _file: f })));
}

const problems = validateCatalogue(records);
records = records.map(({ _file, ...r }) => r).sort((a, b) => a.id.localeCompare(b.id));

const safetyPath = join(rawDir, 'safety_sources.json');
const safety = existsSync(safetyPath) ? JSON.parse(readFileSync(safetyPath, 'utf8')) : [];

writeFileSync(join(root, 'data', 'catalogue.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), records, safety }, null, 1) + '\n');

const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [['id', 'name', 'organization', 'type', 'category', 'status', 'canadaEligibility', 'evidenceStrength', 'legitimacy', 'lastChecked', 'payMin', 'payMax', 'currency', 'unit', 'payBasis', 'workerStatus', 'sourceCount', 'officialSourceCount', 'officialUrl', 'applyUrl']];
for (const r of records) {
  const off = r.sources.filter(s => s.type === 'official' || s.type === 'government').length;
  rows.push([r.id, r.name, r.organization, r.type, r.category, r.status, r.geography.canadaEligibility, r.evidenceStrength, r.legitimacy, r.lastChecked, r.compensation.min, r.compensation.max, r.compensation.currency, r.compensation.unit, r.compensation.basis, r.workerStatus, r.sources.length, off, r.officialUrl, r.applyUrl]);
}
writeFileSync(join(root, 'research', 'ledger.csv'), rows.map(r => r.map(esc).join(',')).join('\n') + '\n');

console.log(`${records.length} records from ${files.length} files; ${safety.length} safety sources.`);
if (problems.length) {
  console.error(`${problems.length} validation problem(s):\n` + problems.map(p => '  - ' + p).join('\n'));
  process.exit(1);
}
