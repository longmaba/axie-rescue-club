import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const folder = new URL(process.argv.includes('--production') ? './production/' : './', import.meta.url);
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
let preview;
let address = process.env.GAME_URL || 'http://127.0.0.1:5189/?debug';
try {
  if (process.argv.includes('--production')) {
    const probe = createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: fileURLToPath(new URL('../../', import.meta.url)), windowsHide: true, stdio: 'ignore' });
    address = `http://127.0.0.1:${port}/?debug`;
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { ready = (await fetch(address)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error('The isolated production preview did not start.');
  }
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(address);
    await page.getByRole('button', { name: "Let's go!" }).waitFor({ timeout: 60000 });
    const label = mobile ? 'mobile' : 'desktop';
    for (const id of ['bramblebrook', 'sunseed-orchard', 'moonbell-marsh']) {
      const open = page.getByRole('button', { name: 'Choose expedition', exact: true });
      if (mobile) await open.tap(); else await open.click();
      if (id === 'bramblebrook') await page.screenshot({ path: fileURLToPath(new URL(`${label}-atlas.png`, folder)) });
      const card = page.locator(`[data-level-id="${id}"]`);
      if (mobile) await card.tap(); else await card.click();
      await page.waitForFunction(id => window.__RESCUE__.snapshot().levelId === id && window.__RESCUE__.snapshot().phase === 'intro', id);
      await page.waitForTimeout(650);
      await page.screenshot({ path: fileURLToPath(new URL(`${label}-${id}-intro.png`, folder)) });
      const start = page.getByRole('button', { name: "Let's go!" });
      if (mobile) await start.tap(); else await start.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: fileURLToPath(new URL(`${label}-${id}-playing.png`, folder)) });
      if (id !== 'bramblebrook') {
        if (mobile) {
          await page.getByRole('button', { name: 'View whole puzzle', exact: true }).tap();
          await page.waitForTimeout(300);
          await page.screenshot({ path: fileURLToPath(new URL(`${label}-${id}-overview.png`, folder)) });
          await page.getByRole('button', { name: 'View whole puzzle', exact: true }).tap();
        }
        if (id === 'sunseed-orchard') {
          const pod = page.locator('[data-explore="podBerry"]');
          if (mobile) await pod.tap(); else await pod.click();
          await page.waitForTimeout(1200);
          await page.screenshot({ path: fileURLToPath(new URL(`${label}-${id}-pod-controls.png`, folder)) });
        }
      }
    }
    await writeFile(new URL(`${label}-ui.json`, folder), JSON.stringify({ address, production: !!preview, scripts: await page.locator('script[src]').evaluateAll(scripts => scripts.map(script => script.getAttribute('src'))), errors, diagnostics: await page.evaluate(() => window.__RESCUE__.diagnostics()), horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }, null, 2));
    console.log(label, JSON.stringify(errors)); await context.close();
  }
} finally { await browser.close(); preview?.kill(); }
