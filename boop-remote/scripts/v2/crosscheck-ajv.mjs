// Independent schema check with ajv (a full JSON Schema 2020-12 implementation), to make sure the
// built-in interpreter in validate.mjs isn't hiding a structural error.
// Usage: AJV_DIR=/path/with/node_modules node scripts/v2/crosscheck-ajv.mjs [file]
// (ajv is not a dependency of this repo; point AJV_DIR at any folder where `npm i ajv ajv-formats` was run.)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const dir = process.env.AJV_DIR;
if (!dir) { console.error('set AJV_DIR to a folder containing node_modules/ajv'); process.exit(2); }
const require = createRequire(join(dir, 'noop.js'));
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const root = new URL('../../', import.meta.url);
const file = process.argv[2] || new URL('data/v2/catalogue.v2.json', root).pathname;
const schema = JSON.parse(readFileSync(new URL('data/v2/catalogue.schema.json', root), 'utf8'));
const data = JSON.parse(readFileSync(file, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(data);
if (!ok) {
  for (const e of validate.errors.slice(0, 50)) console.log(`${e.instancePath || '$'} ${e.message}${e.params && e.params.allowedValues ? ' [' + e.params.allowedValues.join(', ') + ']' : ''}`);
  console.log(`ajv: ${validate.errors.length} error(s)`);
  process.exit(1);
}
console.log(`ajv: ${file.replace(/.*boop-remote\//, '')} is valid against catalogue.schema.json (${data.records.length} records)`);
