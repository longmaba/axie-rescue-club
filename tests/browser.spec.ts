import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import type { TalentId } from '../src/game/rescue';
import { TALENTS } from '../src/game/traits';
import type { Memory } from '../src/game/memories';
import { activate, canvasEvidence, captureEvidence, expectFlag, finishCrossing, goToObject,
  select, snapshot, useAbility, walkOnCanvas, type Diagnostics, type Snapshot } from './browser-helpers';
for (const route of ['bridge', 'ferry'] as const) {
  test(`${route} rescue through real controls preserves the lesson, individual memories and camp continuity`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(180_000);
    const touch = Boolean(isMobile);
    const talent: TalentId = route === 'bridge' ? (touch ? 'float' : 'root') : (touch ? 'root' : 'float');
    const label = `${testInfo.project.name}-${route}-${talent}`;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const badResponses: string[] = [];
    const modelResponses: string[] = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
      if (response.url().endsWith('.glb') && response.ok()) modelResponses.push(response.url());
    });

    await page.goto('/?debug');
    await expect(page).toHaveTitle(/Axie Rescue Club/);
    await expect.poll(async () => page.evaluate(() => window.__RESCUE__?.snapshot().loaded ?? false), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('[data-action="start"]')).toBeEnabled();
    expect(new Set(modelResponses).size).toBe(4);
    const portraits = await page.locator('[data-companion] img').evaluateAll(images => images.map(image => ({
      name: (image as HTMLImageElement).alt, source: (image as HTMLImageElement).src,
    })));
    for (const portrait of portraits) {
      const response = await page.request.get(portrait.source);
      expect(response.ok()).toBe(true);
      const png = PNG.sync.read(await response.body());
      let visiblePixels = 0;
      for (let offset = 3; offset < png.data.length; offset += 4) if (png.data[offset] > 32) visiblePixels += 1;
      expect(visiblePixels, `${portrait.name}'s portrait contains a character`).toBeGreaterThan(512);
    }

    await activate(page.getByRole('button', { name: 'Open field guide', exact: true }), touch);
    await expect(page.locator('.field-guide')).toBeVisible();
    const lesson = TALENTS.find(item => item.id === talent)!;
    await activate(page.locator(`[data-talent="${talent}"]`), touch);
    await expect(page.locator(`[data-talent="${talent}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect((await snapshot(page)).talent).toBe(talent);
    await expect(page.locator(`[data-talent="${talent}"]`)).toContainText(lesson.partName);
    await expect(page.locator('.part-note a')).toHaveAttribute('href', lesson.source);
    await captureEvidence(page, testInfo, `${route}-field-guide`);
    await activate(page.locator('[data-action="resume"]'), touch);
    await expect(page.locator('#modal-layer')).toBeHidden();
    await activate(page.locator('[data-action="start"]'), touch);
    await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');

    if (!touch && route === 'bridge') {
      const before = (await snapshot(page)).position;
      await page.keyboard.down('KeyW');
      await expect.poll(async () => {
        const position = (await snapshot(page)).position;
        return Math.hypot(position.x - before.x, position.z - before.z);
      }).toBeGreaterThan(0.4);
      await page.keyboard.up('KeyW');
    }
    await activate(page.locator('[data-action="mute"]'), touch);
    expect(await page.evaluate(() => window.__RESCUE__.diagnostics().audio.muted)).toBe(true);
    await activate(page.locator('[data-action="mute"]'), touch);
    expect(await page.evaluate(() => window.__RESCUE__.diagnostics().audio.muted)).toBe(false);

    const keepsakes = await page.evaluate(() => window.__RESCUE__.keepsakes);
    if (route === 'bridge') {
      await select(page, 'bing', touch);
      await goToObject(page, 'bridge', touch);
      expect((await snapshot(page)).actions).toBe(0);
      expect((await snapshot(page)).logRolled).toBe(false);
      await expect(page.locator('#message')).not.toContainText(/Kibo|Pomodoro|Bing/);
      await useAbility(page, touch);
      await expect(page.locator('#message')).toContainText('experiment');
      expect((await snapshot(page)).logRolled).toBe(false);
      await select(page, 'kibo', touch);
      await useAbility(page, touch);
      await expectFlag(page, 'logRolled');
      expect((await snapshot(page)).bridge).toBe(false);
      await select(page, 'pomodoro', touch);
      await useAbility(page, touch);
      await expectFlag(page, 'bridge');
      expect((await snapshot(page)).bloom).toBe(talent === 'root');
      await walkOnCanvas(page, { x: 2.1, z: 2.5 }, touch);
      if (talent === 'float') {
        await goToObject(page, 'bloom', touch);
        await useAbility(page, touch);
        await expectFlag(page, 'bloom');
      }
      await walkOnCanvas(page, keepsakes[0], touch);
      await expect.poll(async () => (await snapshot(page)).keepsakes[0]).toBe(true);
      expect((await snapshot(page)).keepsakes[1]).toBe(false);
    } else {
      await goToObject(page, 'leaf', touch);
      expect((await snapshot(page)).leafGrown).toBe(false);
      expect((await snapshot(page)).actions).toBe(0);
      await useAbility(page, touch);
      await expect(page.locator('#message')).toContainText('experiment');
      await select(page, 'pomodoro', touch);
      await useAbility(page, touch);
      await expectFlag(page, 'leafGrown');
      expect((await snapshot(page)).leafLaunched).toBe(talent === 'float');
      if (talent === 'root') {
        await select(page, 'kibo', touch);
        await useAbility(page, touch);
        await expectFlag(page, 'leafLaunched');
      }
      await select(page, 'bing', touch);
      await goToObject(page, 'dockWest', touch);
      await useAbility(page, touch);
      const phases = new Set<string>(['boarding']);
      await expect(page.locator('[data-companion="kibo"]')).toBeDisabled();
      await expect(page.locator('[data-companion="pomodoro"]')).toBeDisabled();
      await page.waitForFunction(() => window.__RESCUE__.snapshot().transport?.phase === 'sailing');
      phases.add('sailing');
      if (!touch) {
        await page.keyboard.down('KeyW');
        await page.keyboard.press('Digit1');
        expect((await snapshot(page)).active).toBe('bing');
        await page.keyboard.up('KeyW');
      } else {
        await page.touchscreen.tap(35, 460);
        expect((await snapshot(page)).transport).not.toBeNull();
      }
      await activate(page.getByRole('button', { name: 'Pause game', exact: true }), touch);
      await expect.poll(async () => (await snapshot(page)).phase).toBe('paused');
      const paused = await snapshot(page);
      expect(paused.transport).not.toBeNull();
      const pausedActors = await page.evaluate(() => window.__RESCUE__.diagnostics().actors);
      await page.waitForTimeout(300);
      const frozen = await snapshot(page);
      expect(frozen.transport).toEqual(paused.transport);
      expect(frozen.ferryProgress).toBe(paused.ferryProgress);
      expect(frozen.position).toEqual(paused.position);
      expect(frozen.elapsed).toBe(paused.elapsed);
      expect(await page.evaluate(() => window.__RESCUE__.diagnostics().actors)).toEqual(pausedActors);
      await activate(page.locator('[data-action="resume"]'), touch);
      await finishCrossing(page, 'east', phases);
      await expect.poll(async () => (await page.evaluate(() => window.__RESCUE__.diagnostics().actors))
        .filter(actor => actor.id !== 'traveler').every(actor => actor.position[0] >= 1.68 && actor.position[2] < -0.53)).toBe(true);
      expect((await snapshot(page)).keepsakes).toEqual([false, true, false]);
      expect((await snapshot(page)).bridge).toBe(false);
      expect((await snapshot(page)).bloom).toBe(false);
    }

    await goToObject(page, 'gate', touch);
    await select(page, 'bing', touch);
    expect((await snapshot(page)).gate).toBe(false);
    await useAbility(page, touch);
    await expectFlag(page, 'gate');
    await goToObject(page, 'traveler', touch);
    expect((await snapshot(page)).rescued).toBe(false);
    await useAbility(page, touch);
    await expectFlag(page, 'rescued');
    // Approach the bell away from the floating dock marker's touch area.
    await walkOnCanvas(page, { x: 3.35, z: -4.55 }, touch);
    await expect.poll(async () => (await snapshot(page)).keepsakes[2]).toBe(true);
    const expectedKeepsakes = route === 'bridge' ? [true, false, true] : [false, true, true];
    expect((await snapshot(page)).keepsakes).toEqual(expectedKeepsakes);
    await captureEvidence(page, testInfo, `${route}-gameplay`);
    const pixelEvidence = await canvasEvidence(page);
    const diagnostics = await page.evaluate(() => window.__RESCUE__.diagnostics());
    expect(diagnostics.calls).toBeGreaterThan(10);
    expect(diagnostics.triangles).toBeGreaterThan(1_000);
    let boatEvidence: { state: Snapshot; diagnostics: Diagnostics } | null = null;
    if (route === 'ferry') {
      await goToObject(page, 'dockEast', touch);
      await useAbility(page, touch);
      const phases = new Set<string>(['boarding']);
      await page.waitForFunction(() => window.__RESCUE__.snapshot().transport?.phase === 'sailing');
      phases.add('sailing');
      boatEvidence = await page.evaluate(() => ({ state: window.__RESCUE__.snapshot(), diagnostics: window.__RESCUE__.diagnostics() }));
      expect(boatEvidence.state.rescued).toBe(true);
      expect(boatEvidence.diagnostics.actors).toHaveLength(4);
      const centerX = -0.6 + 1.2 * boatEvidence.state.ferryProgress;
      for (const actor of boatEvidence.diagnostics.actors) {
        expect(actor.position[1], `${actor.id} is seated above the ferry deck`).toBeGreaterThan(0.1);
        // The authored leaf hull is .83u wide and 2.45u long from its center.
        const hullDistance = ((actor.position[0] - centerX) / 0.83) ** 2 + ((actor.position[2] + 2.5) / 2.45) ** 2;
        expect(hullDistance, `${actor.id}'s feet remain inside the leaf hull`).toBeLessThan(0.95);
      }
      await captureEvidence(page, testInfo, 'ferry-return-sailing');
      await finishCrossing(page, 'west', phases);
    }
    await goToObject(page, 'camp', touch);
    await expect.poll(async () => (await snapshot(page)).returnRoute).toBe(route);
    if (route === 'bridge') {
      await activate(page.getByRole('button', { name: 'Pause game', exact: true }), touch);
      await activate(page.locator('[data-action="resetPaths"]'), touch);
      expect((await snapshot(page)).rescued).toBe(true);
      expect((await snapshot(page)).bridge).toBe(false);
      expect((await snapshot(page)).returnRoute).toBe('bridge');
      expect((await page.evaluate(() => window.__RESCUE__.diagnostics().actors)).find(actor => actor.id === 'traveler')!.position[0]).toBeLessThan(-1.68);
      await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
      await expect(page.locator('#modal-layer')).toBeHidden();
    }
    await useAbility(page, touch);
    await expect.poll(async () => (await snapshot(page)).phase).toBe('won');
    await expect(page.getByRole('heading', { name: 'Home. Together.' })).toBeVisible();
    await expect(page.locator('[data-return-route]')).toHaveAttribute('data-return-route', route);
    await captureEvidence(page, testInfo, `${route}-win`);
    const postcards = await page.evaluate(() => JSON.parse(localStorage.getItem('rescue-club-postcards') ?? '[]') as Memory[]);
    expect(postcards).toHaveLength(1);
    const memory = postcards[0];
    expect(memory).toMatchObject({ route, talent, keepsakes: 2, crew: ['Kibo', 'Pomodoro', 'Bing'],
      routesUsed: { bridge: route === 'bridge', ferry: route === 'ferry' } });
    expect(memory.seconds).toBeGreaterThan(0);
    expect(Number.isFinite(Date.parse(memory.date))).toBe(true);
    expect(memory.contributions.pomodoro.length).toBeGreaterThan(0);
    expect(memory.contributions.bing.length).toBeGreaterThan(0);
    if (route === 'ferry' && talent === 'float') expect(memory.contributions.kibo).toEqual([]);
    else expect(memory.contributions.kibo.length).toBeGreaterThan(0);
    for (const contributions of Object.values(memory.contributions)) expect(new Set(contributions).size).toBe(contributions.length);

    await activate(page.locator('[data-action="restart"]'), touch);
    await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
    expect(await snapshot(page)).toMatchObject({ talent, active: 'kibo', logRolled: false, bridge: false, bloom: false,
      leafGrown: false, leafLaunched: false, gate: false, rescued: false, keepsakes: [false, false, false],
      returnRoute: null, routesUsed: { bridge: false, ferry: false }, transport: null, position: { x: -6, z: 2.5 } });
    await page.reload();
    await expect.poll(async () => page.evaluate(() => window.__RESCUE__?.snapshot().loaded ?? false), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('[data-action="start"]')).toBeEnabled();
    await activate(page.locator('[data-action="start"]'), touch);
    const camp = await page.evaluate(() => window.__RESCUE__.diagnostics().camp);
    expect(camp).toMatchObject({ keepsakes: 2, visitor: true, routes: [route] });
    for (const id of ['kibo', 'pomodoro', 'bing'] as const) expect(camp.contributionCounts[id]).toBe(memory.contributions[id].length);
    await captureEvidence(page, testInfo, `${route}-camp-after-reload`);
    await activate(page.getByRole('button', { name: 'Open club journal', exact: true }), touch);
    await expect(page.locator('.journal-entries article')).toHaveCount(1);
    await expect(page.locator('.journal-entries')).toContainText(route === 'bridge' ? 'The rooted bridge' : 'The leaf ferry');
    for (const id of ['kibo', 'pomodoro', 'bing'] as const) {
      for (const contribution of memory.contributions[id]) await expect(page.locator('.journal-entries')).toContainText(contribution);
    }
    await expect(page.locator('.crew-history')).toContainText('Kibo');
    await expect(page.locator('.crew-history')).toContainText('Pomodoro');
    await expect(page.locator('.crew-history')).toContainText('Bing');
    await captureEvidence(page, testInfo, `${route}-history`);
    await activate(page.locator('[data-action="resume"]'), touch);
    await expect(page.locator('#modal-layer')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(badResponses).toEqual([]);

    const evidence = JSON.stringify({ route, talent, viewport: page.viewportSize(), touch, diagnostics, boatEvidence,
      pixelEvidence, modelResponses, consoleErrors, pageErrors, failedRequests, badResponses, memory, camp }, null, 2);
    await writeFile(testInfo.outputPath(`${label}-evidence.json`), evidence);
    await testInfo.attach(`${label}-evidence`, { body: evidence, contentType: 'application/json' });
  });
}
