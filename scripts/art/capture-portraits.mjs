import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

const origin = process.env.ART_PREVIEW_URL ?? 'http://127.0.0.1:5189';
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const id of ['kibo', 'pomodoro', 'bing']) {
    const page = await browser.newPage({ viewport: { width: 384, height: 384 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${origin}/scripts/art/portrait-preview.html?id=${id}`);
    await page.waitForFunction(() => window.portraitReady, undefined, { timeout: 30000 });
    const path = `public/assets/characters/${id}-portrait.png`;
    await page.locator('canvas').screenshot({ path, omitBackground: true });
    const bytes = await readFile(path);
    const png = PNG.sync.read(bytes);
    let nontransparentPixels = 0, minX = png.width, minY = png.height, maxX = -1, maxY = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > 0) {
        nontransparentPixels++;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`);
    if (nontransparentPixels <= 512) throw new Error(`${id}: transparent portrait (${nontransparentPixels} visible pixels)`);
    if (minX === 0 || minY === 0 || maxX === png.width - 1 || maxY === png.height - 1) throw new Error(`${id}: model is cropped by canvas edge`);
    report.push({
      id, path, bytes: bytes.length, width: png.width, height: png.height, nontransparentPixels,
      alphaBounds: { minX, minY, maxX, maxY }, sha256: createHash('sha256').update(bytes).digest('hex'),
      renderer: await page.evaluate(() => window.portraitInfo), errors,
    });
    await page.close();
  }
  await writeFile('scripts/art/evidence/portrait-report.json', JSON.stringify({ method: 'Playwright canvas screenshot; omitBackground=true; stable rendered Idle pose', portraits: report }, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
