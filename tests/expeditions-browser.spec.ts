import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getLevel, LEVELS, ORCHARD_BOARD, type Cardinal, type LevelId, type TargetId } from '../src/game/levels';
import type { CompanionId, Point, TalentId } from '../src/game/rescue';
import type { Memory } from '../src/game/memories';
import { activate, canvasEvidence, captureEvidence, expectFlag, goToObject, select, snapshot,
  useAbility, walkOnCanvas } from './browser-helpers';

const durableArtifacts = 'artifacts/puzzle-rework/routes';
async function retainPassingEvidence(testInfo: TestInfo): Promise<void> {
  await mkdir(durableArtifacts, { recursive: true });
  for (const name of await readdir(testInfo.outputDir)) {
    if (/\.(png|json)$/.test(name)) await copyFile(join(testInfo.outputDir, name), join(durableArtifacts, name));
  }
}
async function loaded(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => window.__RESCUE__?.snapshot().loaded ?? false), { timeout: 30_000 }).toBe(true);
}
async function expectFreshLevel(page: Page, id: LevelId, talent: TalentId): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).levelId).toBe(id);
  await expect(page.locator('#interface')).toHaveAttribute('data-level', id);
  await expect(page.locator('#chapter-title')).toHaveText(getLevel(id).title);
  await expect(page.locator('[data-action="start"]')).toBeEnabled();
  expect(new URL(page.url()).searchParams.get('level')).toBe(id);
  expect(new URL(page.url()).searchParams.has('debug')).toBe(true);
  expect(await snapshot(page)).toMatchObject({ phase: 'intro', talent, active: 'kibo', position: getLevel(id).spawn,
    logRolled: false, bridge: false, bloom: false, leafGrown: false, leafLaunched: false, gate: false,
    rescued: false, transport: null, elapsed: 0, actions: 0, returnRoute: null, canUndoPuzzle: false,
    routesUsed: { bridge: false, ferry: false }, keepsakes: [false, false, false],
    orchard: { pods: ORCHARD_BOARD.starts, watered: [false, false], grown: [false, false], pushes: 0 },
    moonbeam: { powered: false, rooted: false, mirrors: [0, 1, 1] },
    contributions: { kibo: [], pomodoro: [], bing: [] } });
}
async function openAtlas(page: Page, touch: boolean): Promise<void> {
  if (!await page.locator('.expedition-book').isVisible()) {
    await activate(page.getByRole('button', { name: 'Choose expedition', exact: true }), touch);
  }
  await expect(page.locator('.expedition-card')).toHaveCount(3);
}
async function chooseLevel(page: Page, id: LevelId, talent: TalentId, touch: boolean): Promise<void> {
  await openAtlas(page, touch);
  await activate(page.getByRole('button', { name: `Explore ${getLevel(id).name}`, exact: true }), touch);
  await expectFreshLevel(page, id, talent);
}
async function begin(page: Page, touch: boolean): Promise<void> {
  await activate(page.locator('[data-action="start"]'), touch);
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
}
async function tryAt(page: Page, id: TargetId, companion: CompanionId, touch: boolean): Promise<void> {
  await goToObject(page, id, touch);
  await select(page, companion, touch);
  await useAbility(page, touch);
}
async function standAtPod(page: Page, id: 'podBerry' | 'podSun', side: Cardinal, touch: boolean): Promise<void> {
  await activate(page.locator(`[data-explore="${id}"]`), touch);
  const position = await page.evaluate(target => window.__RESCUE__.targets[target], id);
  const offset: Record<Cardinal, Point> = { north: { x: 0, z: -1.8 }, south: { x: 0, z: 1.8 },
    east: { x: 1.8, z: 0 }, west: { x: -1.8, z: 0 } };
  const point = { x: position.x + offset[side].x, z: position.z + offset[side].z };
  await activate(page.locator(`[data-pod="${id}"][data-stance="${side}"]`), touch);
  await expect.poll(async () => {
    const current = (await snapshot(page)).position;
    return Math.hypot(current.x - point.x, current.z - point.z);
  }, { timeout: 30_000 }).toBeLessThan(.12);
}
async function push(page: Page, id: 'podBerry' | 'podSun', side: Cardinal, touch: boolean): Promise<void> {
  await standAtPod(page, id, side, touch);
  await select(page, 'kibo', touch);
  const before = await snapshot(page);
  await useAbility(page, touch);
  await expect.poll(async () => (await snapshot(page)).orchard.pushes).toBe(before.orchard.pushes + 1);
  expect((await snapshot(page)).actions).toBe(before.actions + 1);
}
async function undo(page: Page, touch: boolean): Promise<void> {
  const revision = (await snapshot(page)).navigationRevision;
  if (touch) await activate(page.locator('[data-action="undo"]'), true);
  else await page.keyboard.press('KeyZ');
  await expect.poll(async () => (await snapshot(page)).navigationRevision).toBeGreaterThan(revision);
}
async function waterAndGrow(page: Page, id: 'podBerry' | 'podSun', touch: boolean, dryAttempt = false): Promise<void> {
  const index = id === 'podBerry' ? 0 : 1;
  await standAtPod(page, id, 'west', touch);
  if (dryAttempt) {
    await select(page, 'pomodoro', touch);
    const actions = (await snapshot(page)).actions;
    await useAbility(page, touch);
    await expect(page.locator('#message')).toContainText('dry');
    expect((await snapshot(page)).actions).toBe(actions);
  }
  await select(page, 'bing', touch);
  await useAbility(page, touch);
  await expect.poll(async () => (await snapshot(page)).orchard.watered[index]).toBe(true);
  await standAtPod(page, id, 'west', touch);
  await select(page, 'pomodoro', touch);
  await useAbility(page, touch);
  await expect.poll(async () => (await snapshot(page)).orchard.grown[index]).toBe(true);
}
async function walkPoints(page: Page, points: Point[], touch: boolean): Promise<void> {
  for (const point of points) await walkOnCanvas(page, point, touch);
}

for (const levelId of ['sunseed-orchard', 'moonbell-marsh'] as const) {
  test(`${levelId} spatial puzzle through real controls, recovery and remembered progress`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(300_000);
    const touch = Boolean(isMobile);
    const level = getLevel(levelId);
    const route = levelId === 'sunseed-orchard' ? 'seedbeds' : 'moonbeam';
    const talent: TalentId = touch ? 'float' : 'root';
    const errors: string[] = [];
    const modelResponses: string[] = [];
    const resources: { levelId: LevelId; geometries: number; textures: number }[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('pageerror', error => errors.push(`runtime: ${error.message}`));
    page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
      if (response.ok() && response.url().endsWith('.glb')) modelResponses.push(response.url());
    });
    await page.goto('/?debug');
    await loaded(page);
    expect(new Set(modelResponses).size).toBe(4);
    await activate(page.getByRole('button', { name: 'Open field guide', exact: true }), touch);
    await activate(page.locator(`[data-talent="${talent}"]`), touch);
    await activate(page.locator('[data-action="resume"]'), touch);
    if (levelId === 'sunseed-orchard' && !touch) {
      await begin(page, touch);
      await tryAt(page, 'bridge', 'kibo', touch);
      await expectFlag(page, 'logRolled');
      await activate(page.locator('[data-explore="leaf"]'), touch);
    }
    await openAtlas(page, touch);
    await expect(page.locator('.atlas-summary')).toContainText('0 / 3 islands helped');
    await captureEvidence(page, testInfo, `${levelId}-selector`);
    await chooseLevel(page, levelId, talent, touch);
    if (levelId === 'sunseed-orchard' && !touch) {
      for (let cycle = 0; cycle < 2; cycle += 1) {
        for (const id of ['moonbell-marsh', 'bramblebrook', 'sunseed-orchard'] as const) {
          await chooseLevel(page, id, talent, touch);
          await page.waitForTimeout(200);
          const diagnostics = await page.evaluate(() => window.__RESCUE__.diagnostics());
          resources.push({ levelId: id, geometries: diagnostics.geometries, textures: diagnostics.textures });
        }
      }
      expect(resources[5].geometries).toBeLessThanOrEqual(resources[2].geometries + 4);
      expect(resources[5].textures).toBeLessThanOrEqual(resources[2].textures + 2);
    }
    expect(modelResponses).toHaveLength(4);
    await captureEvidence(page, testInfo, `${levelId}-initial`);
    await activate(page.getByRole('button', { name: 'Open field guide', exact: true }), touch);
    await expect(page.locator('.puzzle-guide')).toBeVisible();
    await expect(page.locator('.puzzle-guide')).not.toContainText('field lesson');
    await captureEvidence(page, testInfo, `${levelId}-guide`);
    await activate(page.locator('[data-action="resume"]'), touch);
    await begin(page, touch);
    await expect(page.locator('.route-notes')).toBeHidden();
    await expect(page.locator('#feature-notes')).not.toContainText(/ways home|log|ferry/i);
    await captureEvidence(page, testInfo, `${levelId}-active`);
    const initialPixels = await canvasEvidence(page, 'any');

    if (levelId === 'sunseed-orchard') {
      await standAtPod(page, 'podBerry', 'south', touch);
      await select(page, 'bing', touch);
      await useAbility(page, touch);
      await expect(page.locator('#message')).toContainText('matching symbol');
      expect((await snapshot(page)).actions).toBe(0);
      await push(page, 'podBerry', 'south', touch);
      expect((await snapshot(page)).orchard.pods[0]).toEqual({ column: 2, row: 0 });
      await activate(page.locator('[data-explore="podBerry"]'), touch);
      await expect(page.locator('[data-pod="podBerry"][data-stance="north"]')).toBeDisabled();
      await captureEvidence(page, testInfo, `${levelId}-corner-rethink`);
      const elapsed = (await snapshot(page)).elapsed;
      await undo(page, touch);
      expect(await snapshot(page)).toMatchObject({ orchard: { pods: ORCHARD_BOARD.starts, pushes: 0 },
        actions: 0, contributions: { kibo: [], pomodoro: [], bing: [] }, canUndoPuzzle: false });
      expect((await snapshot(page)).elapsed).toBeGreaterThanOrEqual(elapsed);
      await captureEvidence(page, testInfo, `${levelId}-undo-recovery`);
      // Standing-side buttons are opposite the direction the pod will move.
      for (const side of ['north', 'north', 'west'] as const) await push(page, 'podBerry', side, touch);
      await push(page, 'podSun', 'south', touch);
      await captureEvidence(page, testInfo, `${levelId}-sun-makes-room`);
      for (const side of ['west', 'west', 'south', 'south'] as const) await push(page, 'podBerry', side, touch);
      await waterAndGrow(page, 'podBerry', touch, true);
      await captureEvidence(page, testInfo, `${levelId}-berry-planted`);
      await push(page, 'podSun', 'north', touch);
      await push(page, 'podSun', 'west', touch);
      await waterAndGrow(page, 'podSun', touch);
      await expectFlag(page, 'gate');
      expect((await snapshot(page)).orchard).toEqual({ pods: ORCHARD_BOARD.beds, watered: [true, true], grown: [true, true], pushes: 10 });
      expect((await snapshot(page)).actions).toBe(14);
      await captureEvidence(page, testInfo, `${levelId}-trellis-open`);
      await walkPoints(page, [{ x: 1.8, z: 3.6 }, { x: 5.4, z: 3.6 }, { x: 5.4, z: -3.6 }], touch);
      if (!touch) await walkOnCanvas(page, { x: 7.5, z: -4.8 }, false);
      await tryAt(page, 'traveler', 'bing', touch);
      if (touch) {
        await expectFlag(page, 'rescued');
        // The old pickup tap sat 1.58px below the Traveler label and Chromium selected that nearby button.
        // Greeting removes that target naturally, leaving the same keepsake accessible through clear ground.
        await walkOnCanvas(page, { x: 7.5, z: -4.8 }, true);
        await expect.poll(async () => (await snapshot(page)).keepsakes[2]).toBe(true);
        await walkPoints(page, [{ x: 5.4, z: -3.6 }, { x: 5.4, z: 1.2 }], true);
        await expect.poll(async () => {
          const actors = await page.evaluate(() => window.__RESCUE__.diagnostics().actors);
          return Math.min(...actors.flatMap((actor, index) => actors.slice(index + 1).map(other =>
            Math.hypot(actor.position[0] - other.position[0], actor.position[2] - other.position[2]))));
        }).toBeGreaterThan(.7);
        await captureEvidence(page, testInfo, `${levelId}-return-parade`);
      }
    } else {
      await tryAt(page, 'rootReceiver', 'pomodoro', touch);
      await expect(page.locator('#message')).toContainText('live beam');
      expect((await snapshot(page)).actions).toBe(0);
      await activate(page.locator('[data-explore="mirrorC"]'), touch);
      await expect(page.locator('#message')).toContainText('no route');
      expect((await snapshot(page)).moonbeam.rooted).toBe(false);
      await captureEvidence(page, testInfo, `${levelId}-dark-roots`);
      await tryAt(page, 'source', 'bing', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeam.powered).toBe(true);
      await tryAt(page, 'mirrorA', 'kibo', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeam.mirrors[0]).toBe(1);
      await tryAt(page, 'mirrorB', 'kibo', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeamView.rootLit).toBe(true);
      await captureEvidence(page, testInfo, `${levelId}-roots-lit`);
      await tryAt(page, 'rootReceiver', 'pomodoro', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeam.rooted).toBe(true);
      await captureEvidence(page, testInfo, `${levelId}-path-anchored`);
      await activate(page.getByRole('button', { name: 'Pause game', exact: true }), touch);
      const paused = await snapshot(page);
      await page.waitForTimeout(350);
      expect((await snapshot(page)).elapsed).toBe(paused.elapsed);
      expect((await snapshot(page)).moonbeam).toEqual(paused.moonbeam);
      await activate(page.locator('[data-action="resume"]'), touch);
      await tryAt(page, 'mirrorB', 'kibo', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeamView.rootLit).toBe(false);
      expect((await snapshot(page)).moonbeam.rooted).toBe(true);
      await captureEvidence(page, testInfo, `${levelId}-light-borrowed`);
      await tryAt(page, 'mirrorC', 'kibo', touch);
      await expect.poll(async () => (await snapshot(page)).moonbeamView.exitLit).toBe(true);
      await expectFlag(page, 'gate');
      expect((await snapshot(page)).actions).toBe(6);
      await captureEvidence(page, testInfo, `${levelId}-exit-lit`);
      await walkPoints(page, [{ x: 3.2, z: 2.4 }, { x: 3.2, z: -1.5 }, { x: 3.2, z: -3 }, { x: 5, z: -3 }], touch);
      await tryAt(page, 'traveler', 'bing', touch);
    }
    await expectFlag(page, 'rescued');
    expect((await snapshot(page)).canUndoPuzzle).toBe(false);
    expect((await snapshot(page)).routesUsed).toEqual({ bridge: false, ferry: false });
    expect((await snapshot(page)).returnRoute).toBeNull();
    await captureEvidence(page, testInfo, `${levelId}-rescued-parade`);
    const pixels = await canvasEvidence(page, 'any');
    const diagnostics = await page.evaluate(() => window.__RESCUE__.diagnostics());
    expect(diagnostics.calls).toBeGreaterThan(10);
    expect(diagnostics.triangles).toBeGreaterThan(1_000);
    await goToObject(page, 'camp', touch);
    await useAbility(page, touch);
    await expect.poll(async () => (await snapshot(page)).phase).toBe('won');
    await expect(page.locator('[data-return-route]')).toHaveAttribute('data-return-route', route);
    await expect(page.locator('.memory-stats')).not.toContainText('ways discovered');
    await captureEvidence(page, testInfo, `${levelId}-win`);
    const memories = await page.evaluate(() => JSON.parse(localStorage.getItem('rescue-club-postcards') ?? '[]') as (Memory & { version: number })[]);
    expect(memories).toHaveLength(1);
    const memory = memories[0];
    expect(memory).toMatchObject({ version: 4, puzzleRevision: 2, levelId, route, talent,
      routesUsed: { bridge: false, ferry: false } });
    expect(memory.keepsakes).toBeGreaterThanOrEqual(levelId === 'sunseed-orchard' ? 2 : 1);
    for (const contributions of Object.values(memory.contributions)) {
      expect(contributions.length).toBeGreaterThan(0);
      expect(new Set(contributions).size).toBe(contributions.length);
    }
    if (levelId === 'sunseed-orchard') expect(memory.contributions.kibo).toHaveLength(10);
    else expect(memory.contributions.kibo.join(' ')).toContain('Mirror B to backslash after anchoring');
    if (level.nextId) {
      await activate(page.locator(`[data-next-level="${level.nextId}"]`), touch);
      await expectFreshLevel(page, level.nextId, talent);
      await captureEvidence(page, testInfo, `${levelId}-next-island`);
      await chooseLevel(page, levelId, talent, touch);
      await begin(page, touch);
      await activate(page.getByRole('button', { name: 'Pause game', exact: true }), touch);
    }
    await activate(page.locator('[data-action="restart"]'), touch);
    await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
    expect(await snapshot(page)).toMatchObject({ levelId, talent, actions: 0, position: level.spawn,
      returnRoute: null, rescued: false, canUndoPuzzle: false, orchard: { pushes: 0, grown: [false, false] },
      moonbeam: { powered: false, rooted: false, mirrors: [0, 1, 1] } });
    expect(modelResponses).toHaveLength(4);
    await page.reload();
    await loaded(page);
    await expect.poll(async () => (await snapshot(page)).levelId).toBe(levelId);
    await begin(page, touch);
    const camp = await page.evaluate(() => window.__RESCUE__.diagnostics().camp);
    expect(camp).toMatchObject({ visitor: true, keepsakes: memory.keepsakes, routes: [route] });
    await captureEvidence(page, testInfo, `${levelId}-camp-after-reload`);
    await activate(page.getByRole('button', { name: 'Open club journal', exact: true }), touch);
    await expect(page.locator('.journal-entries article')).toHaveCount(1);
    await expect(page.locator('.memory-island')).toHaveText(level.name);
    for (const contributions of Object.values(memory.contributions)) {
      for (const contribution of contributions) await expect(page.locator('.journal-entries')).toContainText(contribution);
    }
    await captureEvidence(page, testInfo, `${levelId}-history`);
    await activate(page.locator('[data-action="resume"]'), touch);
    await openAtlas(page, touch);
    await expect(page.locator('.atlas-summary')).toContainText('1 / 3 islands helped');
    await expect(page.locator(`.expedition-card[data-level-id="${levelId}"] .expedition-status`)).toContainText('Puzzle complete');
    for (const other of LEVELS.filter(item => item.id !== levelId)) {
      await expect(page.locator(`.expedition-card[data-level-id="${other.id}"] .expedition-status`)).toHaveText('A new story awaits');
    }
    await captureEvidence(page, testInfo, `${levelId}-campaign-progress`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    const evidence = JSON.stringify({ levelId, route, talent, viewport: page.viewportSize(), touch, initialPixels,
      pixels, diagnostics, resources, memory, camp, modelResponses, errors }, null, 2);
    const label = `${testInfo.project.name}-${levelId}-evidence`;
    await writeFile(testInfo.outputPath(`${label}.json`), evidence);
    await testInfo.attach(label, { body: evidence, contentType: 'application/json' });
    await retainPassingEvidence(testInfo);
  });
}

test('legacy postcards remain historical and cannot complete redesigned puzzles', async ({ browser, baseURL, isMobile }, testInfo) => {
  const legacy = { date: '2026-09-05T00:00:00.000Z', seconds: 42, keepsakes: 2,
    crew: ['Kibo', 'Pomodoro', 'Bing'], route: 'bridge', routesUsed: { bridge: true, ferry: false },
    talent: 'root', contributions: { kibo: ['Rolled the log across the brook.'], pomodoro: [], bing: [] } };
  const earlierOrchard = { ...legacy, levelId: 'sunseed-orchard', contributions: { ...legacy.contributions, kibo: ['Straightened the orchard irrigation sluice.'] } };
  const earlierMarsh = { ...legacy, levelId: 'moonbell-marsh', contributions: { ...legacy.contributions, kibo: ['Raised the marsh lantern mast.'] } };
  // Existing-profile fixture only: no active game state or navigation is changed.
  const context = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport,
    isMobile: Boolean(isMobile), hasTouch: Boolean(isMobile),
    storageState: { cookies: [], origins: [{ origin: new URL(baseURL!).origin,
      localStorage: [{ name: 'rescue-club-postcards', value: JSON.stringify([legacy, earlierOrchard, earlierMarsh, { ...legacy, levelId: 'unknown-island' }]) }] }] } });
  try {
    const page = await context.newPage();
    await page.goto('/?debug&level=sunseed-orchard');
    await loaded(page);
    await openAtlas(page, Boolean(isMobile));
    await expect(page.locator('.atlas-summary')).toContainText('1 / 3 islands helped');
    await expect(page.locator('[data-level-id="bramblebrook"] .expedition-status')).toContainText('2 / 3 keepsakes');
    await expect(page.locator('[data-level-id="sunseed-orchard"] .expedition-status')).toHaveText('Current expedition');
    await expect(page.locator('[data-level-id="moonbell-marsh"] .expedition-status')).toHaveText('A new story awaits');
    await captureEvidence(page, testInfo, 'legacy-campaign-progress');
    await activate(page.locator('[data-action="resume"]'), Boolean(isMobile));
    await activate(page.getByRole('button', { name: 'Open club journal', exact: true }), Boolean(isMobile));
    await expect(page.locator('.journal-entries article')).toHaveCount(3);
    await expect(page.locator('.memory-island').filter({ hasText: 'Earlier adventure' })).toHaveCount(2);
    for (const memory of [legacy, earlierOrchard, earlierMarsh]) {
      await expect(page.locator('.journal-entries')).toContainText(memory.contributions.kibo[0]);
    }
    await captureEvidence(page, testInfo, 'legacy-history');
    await retainPassingEvidence(testInfo);
  } finally { await context.close(); }
});
