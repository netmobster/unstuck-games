// Bundle the game into one self-contained page: the artifact body (no doctype/html/head/body),
// or with --full a standalone .html file. Modules are concatenated in dependency order with
// their import/export syntax stripped, and the CD brief is inlined into its tab.
//   node scripts/bundle.mjs <out.html> [--full]
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const here = p => new URL('../' + p, import.meta.url);
const read = p => readFileSync(here(p), 'utf8');
const ORDER = ['src/rng.js', 'src/map.js', 'src/sim.js', 'src/policies.js', 'src/tuned.js', 'src/lineage.js', 'ui.js'];

let js = '';
const seen = new Map();
for (const f of ORDER) {
  const src = read(f).split('\n').filter(l => !/^\s*import\s.*from\s+['"]/.test(l) && !/^\s*export\s*\{[^}]*\};?\s*$/.test(l))
    .map(l => l.replace(/^export\s+(?=(async\s+)?function|const|let|class)/, '')).join('\n');
  for (const m of src.matchAll(/^(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|class)\s+([A-Za-z_$][\w$]*))/gm)) {
    const name = m[1] || m[2];
    if (seen.has(name)) throw new Error(`name clash: ${name} in ${f} and ${seen.get(name)}`);
    seen.set(name, f);
  }
  js += `\n// ---- ${f}\n` + src;
}
// refuse to write a bundle that doesn't parse (a lost escape once shipped a dead page)
const tmp = join(mkdtempSync(join(tmpdir(), 'lw-')), 'bundle.mjs');
writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
catch (e) { console.error(String(e.stderr || e)); process.exit(1); }
const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  .replace('<!--BRIEF-->', read('cd-brief.html'))
  .replace(/<script src="board.js"><\/script>/, () => `<script>${read('board.js').replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(/<script type="module" src="ui.js"><\/script>/, () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
const head = `<title>The Last Warren</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..800&family=Big+Shoulders+Stencil+Display:wght@400..900&display=swap">
<style>${read('style.css')}</style>`;
const out = process.argv.includes('--full')
  ? `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>${body}</body>\n</html>\n`
  : head + '\n' + body;
writeFileSync(process.argv[2], out);
console.log('wrote', process.argv[2], (out.length / 1024).toFixed(0) + 'KB', seen.size, 'top-level names, no clashes');
