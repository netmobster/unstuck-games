// Bundle the game into one self-contained page: the artifact body (no doctype/html/head/body),
// or with --full a standalone .html file. Modules are concatenated in dependency order with
// their import/export syntax stripped, and the CD brief is inlined into its tab.
//   node scripts/bundle.mjs <out.html> [--full]
import { readFileSync, writeFileSync } from 'node:fs';
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
const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  .replace('<!--BRIEF-->', read('cd-brief.html'))
  .replace(/<script type="module" src="ui.js"><\/script>/, () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
const head = `<title>The Last Warren</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500;62..125,800;62..125,900&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&family=Martian+Mono:wght@400;600&display=swap">
<style>${read('style.css')}</style>`;
const out = process.argv.includes('--full')
  ? `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>${body}</body>\n</html>\n`
  : head + '\n' + body;
writeFileSync(process.argv[2], out);
console.log('wrote', process.argv[2], (out.length / 1024).toFixed(0) + 'KB', seen.size, 'top-level names, no clashes');
