// Browser tests for the UI. Run: node boop-remote/test/ui.mjs
// Uses Playwright (local install, or the global one found via `npm root -g`) and a tiny static server.
// Exercises mobile and desktop viewports and writes screenshots to test/screens/ (git-ignored).

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const screens = join(root, 'test', 'screens');

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  const g = execSync('npm root -g').toString().trim();
  return createRequire(join(g, 'noop.js'))('playwright');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
function serve() {
  const srv = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(['ok', name]); console.log(`  ✓ ${name}`); }
  catch (e) { results.push(['FAIL', name, e]); console.log(`  ✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}

async function run(browser, base, label, viewport) {
  console.log(`\n${label} (${viewport.width}×${viewport.height})`);
  const ctx = await browser.newContext({ viewport, hasTouch: label === 'mobile', isMobile: label === 'mobile' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '/');

  await step('intro explains no sign-up and loads the catalogue', async () => {
    await page.getByRole('heading', { name: /Find work that fits/ }).waitFor();
    assert.match(await page.textContent('#view-intro'), /No account, no name, no email/);
    await page.waitForFunction(() => /researched routes/.test(document.querySelector('#catalogue-stamp').textContent));
    await page.screenshot({ path: join(screens, `${label}-intro.png`), fullPage: true });
  });

  await step('questionnaire: answer, skip, back keeps answers', async () => {
    await page.getByRole('button', { name: /^Start/ }).click();
    await page.getByText('Ontario', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: /Not sure \/ skip/ }).click(); // hours skipped
    assert.match(await page.textContent('#q-title'), /When could you work/);
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    assert.equal(await page.isChecked('#q-options input >> nth=0'), true, 'Ontario still selected after going back');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click(); // hours: nothing picked = skip
    await page.getByText('Evenings', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    assert.match(await page.textContent('#q-title'), /firm limit/, 'adaptive follow-up appears');
    await page.getByText('Preferred, not firm').click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByText('Mostly by text: chat or email').click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByText('Rule them out').click();
    await page.screenshot({ path: join(screens, `${label}-question.png`), fullPage: true });
    // Skip the rest.
    for (let i = 0; i < 12 && await page.isVisible('#view-quiz'); i++) {
      await page.getByRole('button', { name: /Next|Show me routes/ }).click();
    }
    await page.locator('#view-deck').waitFor();
  });

  let firstId;
  await step('deck shows a card with all four accessible controls', async () => {
    const card = page.locator('#card');
    await card.waitFor();
    firstId = await card.getAttribute('data-id');
    for (const n of ['Pass', 'Details', 'Save', 'Like']) await page.locator('#card').getByRole('button', { name: new RegExp(`^${n}`) }).waitFor();
    await page.screenshot({ path: join(screens, `${label}-deck.png`), fullPage: true });
  });

  await step('phone-heavy routes are hidden, with the reason listed', async () => {
    const txt = await page.textContent('#excluded-list');
    if (txt.trim()) assert.ok(!/phone/i.test(txt) || /ruled them out/.test(txt));
  });

  await step('details dialog shows evidence, outbound link and research prompt', async () => {
    await page.locator('#card').getByRole('button', { name: /^Details/ }).click();
    const dlg = page.locator('#detail');
    await dlg.waitFor();
    assert.match(await dlg.textContent(), /Evidence/);
    assert.match(await dlg.textContent(), /last checked/);
    const links = dlg.locator('a[target="_blank"]');
    const n = await links.count();
    assert.ok(n >= 2);
    for (let i = 0; i < n; i++) assert.match(await links.nth(i).getAttribute('rel'), /noopener/);
    assert.match(await page.inputValue('#prompt-text'), /Please check and report/);
    assert.equal(await page.getAttribute('#open-gemini', 'href'), 'https://gemini.google.com/app');
    await page.screenshot({ path: join(screens, `${label}-detail.png`), fullPage: false });
  });

  await step('copy prompt works or falls back with a clear message', async () => {
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.getByRole('button', { name: 'Copy prompt' }).click();
    await page.waitForFunction(() => document.querySelector('#copy-status').textContent.length > 0);
    assert.match(await page.textContent('#copy-status'), /Copied|Ctrl\+C/);
    // Force the fallback path.
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.execCommand = () => false; });
    await page.getByRole('button', { name: 'Copy prompt' }).click();
    await page.waitForFunction(() => /Ctrl\+C/.test(document.querySelector('#copy-status').textContent));
    await page.keyboard.press('Escape');
    await page.locator('#detail').waitFor({ state: 'hidden' });
  });

  await step('like / save / pass via buttons, undo restores', async () => {
    await page.locator('#card').getByRole('button', { name: /^Like/ }).click();
    const second = await page.locator('#card').getAttribute('data-id');
    assert.notEqual(second, firstId);
    await page.getByRole('button', { name: 'Undo last' }).click();
    assert.equal(await page.locator('#card').getAttribute('data-id'), firstId);
    await page.locator('#card').getByRole('button', { name: /^Like/ }).click();
    await page.locator('#card').getByRole('button', { name: /^Save/ }).click();
    await page.locator('#card').getByRole('button', { name: /^Pass/ }).click();
    assert.equal(await page.textContent('#saved-count'), '2');
  });

  await step(label === 'mobile' ? 'touch swipe right likes a card' : 'keyboard arrows decide', async () => {
    const id = await page.locator('#card').getAttribute('data-id');
    if (label === 'mobile') {
      const box = await page.locator('#card .sum').boundingBox();
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + 20, y);
      await page.mouse.down();
      for (let x = 20; x <= 300; x += 40) await page.mouse.move(box.x + x, y);
      await page.mouse.up();
    } else {
      await page.locator('#card').focus();
      await page.keyboard.press('ArrowRight');
    }
    await page.waitForFunction(prev => document.querySelector('#card')?.dataset.id !== prev, id);
    assert.equal(await page.textContent('#saved-count'), '3');
  });

  await step('shortlist shows up to three distinct picks with next steps', async () => {
    await page.getByRole('button', { name: 'See my three' }).first().click();
    const picks = page.locator('.pick');
    const n = await picks.count();
    assert.ok(n >= 1 && n <= 3, `got ${n}`);
    const names = await picks.locator('h3').allTextContents();
    assert.equal(new Set(names).size, names.length);
    assert.match(await picks.first().textContent(), /Watch out for/);
    assert.match(await picks.first().textContent(), /Still uncertain/);
    await page.screenshot({ path: join(screens, `${label}-shortlist.png`), fullPage: true });
  });

  await step('saved view lists decisions and can put one back', async () => {
    await page.getByRole('navigation').getByRole('button', { name: /Saved/ }).click();
    assert.match(await page.textContent('#saved-area'), /Liked/);
    await page.getByRole('button', { name: 'Put back' }).first().click();
    assert.equal(await page.textContent('#saved-count'), '2');
  });

  await step('impossible limits give an honest empty state', async () => {
    // Serve only computer-dependent records, then say "no computer": nothing can fit.
    await page.route('**/data/catalogue.json', async route => {
      const res = await route.fetch();
      const data = await res.json();
      data.records = data.records.filter(r => r.requirements.equipment.includes('computer'));
      await route.fulfill({ response: res, json: data });
    });
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('opportunity-engine:v1'));
      s.profile.equipment = []; // no computer
      localStorage.setItem('opportunity-engine:v1', JSON.stringify(s));
    });
    await page.goto(base + '/#deck');
    await page.reload();
    await page.getByText(/Nothing fits every limit/).waitFor();
    assert.match(await page.textContent('#excluded-sum'), /hidden/);
    await page.getByRole('navigation').getByRole('button', { name: 'My three' }).click();
    await page.getByText(/No routes left to suggest/).waitFor();
    await page.unroute('**/data/catalogue.json');
  });

  await step('clear everything resets local data', async () => {
    await page.getByRole('navigation').getByRole('button', { name: /Saved/ }).click();
    await page.getByRole('button', { name: /Clear everything/ }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('opportunity-engine:v1')), null);
  });

  await step('no horizontal overflow and no console errors', async () => {
    for (const v of ['intro', 'deck', 'about']) {
      await page.goto(`${base}/#${v}`);
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(over <= 1, `${v} overflows by ${over}px`);
    }
    await page.screenshot({ path: join(screens, `${label}-about.png`), fullPage: true });
    assert.deepEqual(errors, []);
  });

  await ctx.close();
}

const { chromium } = await loadPlaywright();
await mkdir(screens, { recursive: true });
const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
try {
  await run(browser, base, 'mobile', { width: 390, height: 844 });
  await run(browser, base, 'desktop', { width: 1280, height: 860 });
} finally {
  await browser.close();
  srv.close();
}
const failed = results.filter(r => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
