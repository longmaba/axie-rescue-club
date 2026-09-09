import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = path.resolve('dist');
const outputFlag = process.argv.indexOf('--out');
const output = outputFlag < 0 ? 'artifacts/final' : process.argv[outputFlag + 1];
assert.ok(output, '--out needs an artifact directory');
const prefix = '/rescue-club/';
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const filename = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!filename.startsWith(root + path.sep) || !(await stat(filename)).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}${prefix}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; const badResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url()); });
  await page.goto(url);
  await page.getByRole('button', { name: "Let's go!" }).click({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#interface')?.getAttribute('data-phase') === 'playing');
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => typeof window.__RESCUE__), 'undefined');
  assert.equal(await page.title(), 'Axie Rescue Club · Bramblebrook');
  await mkdir(output, { recursive: true });
  const screenshot = await page.screenshot({ path: path.join(output, 'subdirectory-desktop.png') });
  const png = PNG.sync.read(screenshot);
  const colors = new Set(); let meadow = 0; let samples = 0;
  for (let y = Math.floor(png.height * .33); y < png.height * .64; y += 4) {
    for (let x = Math.floor(png.width * .35); x < png.width * .65; x += 4) {
      const i = (y * png.width + x) * 4;
      const [r, g, b] = png.data.subarray(i, i + 3);
      colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
      if (Math.max(r, g, b) - Math.min(r, g, b) > 35 && g > b) meadow++;
      samples++;
    }
  }
  assert.ok(colors.size > 15, 'Subdirectory playfield must contain rendered world detail');
  assert.ok(meadow / samples > .05, 'Subdirectory playfield must contain the colorful island');
  const levels = [];
  for (const id of ['sunseed-orchard', 'moonbell-marsh']) {
    await page.getByRole('button', { name: 'Choose expedition', exact: true }).click();
    await page.locator(`[data-level-id="${id}"]`).click();
    await page.getByRole('button', { name: "Let's go!" }).click();
    await page.waitForFunction(id => document.querySelector('#interface')?.getAttribute('data-level') === id
      && document.querySelector('#interface')?.getAttribute('data-phase') === 'playing', id);
    assert.equal(new URL(page.url()).pathname, prefix);
    assert.equal(await page.evaluate(() => typeof window.__RESCUE__), 'undefined');
    await page.screenshot({ path: path.join(output, `subdirectory-${id}.png`) });
    levels.push({ id, title: await page.title(), path: new URL(page.url()).pathname });
  }
  assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);

  // A failed character load must offer a working, visible recovery route.
  const recovery = await browser.newPage();
  await recovery.route('**/kibo.glb', route => route.abort());
  await recovery.goto(`${url}?debug`);
  await recovery.locator('#load-error').waitFor({ state: 'visible' });
  assert.equal(await recovery.locator('[data-action="start"]').isDisabled(), true);
  await recovery.unroute('**/kibo.glb');
  await recovery.getByRole('button', { name: 'Try again' }).click();
  await recovery.getByRole('button', { name: "Let's go!" }).click({ timeout: 60000 });
  await recovery.waitForFunction(() => window.__RESCUE__?.snapshot().phase === 'playing');
  await writeFile(path.join(output, 'static-evidence.json'), JSON.stringify({ subdirectory: prefix, productionDiagnosticsHidden: true, levels, centralColorBuckets: colors.size, coloredFraction: meadow / samples, pageErrors: errors, badResponses, failedAssetRecovery: 'passed' }, null, 2));
  console.log('PASS: production subdirectory assets, hidden diagnostics, failed-asset recovery');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
