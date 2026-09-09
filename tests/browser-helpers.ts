import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';
import type { CompanionId, Point, RescueState, TargetId } from '../src/game/rescue';
import type { MoonbeamView } from '../src/game/puzzle-types';
import type { RouteId } from '../src/game/levels';
export type Snapshot = RescueState & { loaded: boolean; nearby: TargetId | null; objective: string; moonbeamView: MoonbeamView; canUndoPuzzle: boolean };
export type Diagnostics = {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  fps: number;
  dpr: number;
  clips: Record<CompanionId, string[]>;
  audio: { muted: boolean };
  actors: { id: string; position: [number, number, number] }[];
  camp: { keepsakes: number; visitor: boolean; routes: RouteId[]; contributionCounts: Record<CompanionId, number> };
};

declare global {
  interface Window {
    __RESCUE__: {
      snapshot(): Snapshot;
      project(x: number, z: number): { x: number; y: number };
      targets: Record<TargetId, Point>;
      keepsakes: Point[];
      diagnostics(): Diagnostics;
    };
  }
}

export const snapshot = (page: Page) => page.evaluate(() => window.__RESCUE__.snapshot());

export async function activate(locator: Locator, touch: boolean): Promise<void> {
  if (touch) await locator.tap({ timeout: 10_000 });
  else await locator.click({ timeout: 10_000 });
}

export async function select(page: Page, id: CompanionId, touch: boolean): Promise<void> {
  await activate(page.locator(`[data-companion="${id}"]`), touch);
  await expect.poll(async () => (await snapshot(page)).active).toBe(id);
  await expect(page.locator(`[data-companion="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
}

export async function useAbility(page: Page, touch: boolean): Promise<void> {
  if (touch) await activate(page.locator('[data-action="interact"]'), true);
  else await page.keyboard.press('KeyE');
}

export async function expectFlag(page: Page, flag: 'logRolled' | 'bridge' | 'bloom' | 'leafGrown' | 'leafLaunched' | 'gate' | 'rescued'): Promise<void> {
  await expect.poll(async () => (await snapshot(page))[flag], { timeout: 30_000 }).toBe(true);
}

/** Use only projected world coordinates to drive genuine canvas pointer events. */
export async function walkOnCanvas(page: Page, target: Point, touch: boolean): Promise<void> {
  for (let segment = 0; segment < 12; segment += 1) {
    const current = (await snapshot(page)).position;
    const gap = Math.hypot(target.x - current.x, target.z - current.z);
    if (gap < 0.25) return;
    // Short taps keep the goal visible while the mobile camera follows the squad.
    const length = touch ? Math.min(gap, 2.3) : gap;
    const waypoint = {
      x: current.x + (target.x - current.x) / gap * length,
      z: current.z + (target.z - current.z) / gap * length,
    };
    let screen = await page.evaluate(p => window.__RESCUE__.project(p.x, p.z), waypoint);
    if (touch) {
      // The follow camera must settle before a projected coordinate becomes a tap.
      await expect.poll(async () => {
        const next = await page.evaluate(p => window.__RESCUE__.project(p.x, p.z), waypoint);
        const movement = Math.hypot(next.x - screen.x, next.y - screen.y);
        screen = next;
        return movement;
      }, { timeout: 10_000, intervals: [150] }).toBeLessThan(0.3);
    }
    const viewport = page.viewportSize()!;
    expect(screen.x, 'Projected trail point must remain on screen').toBeGreaterThan(5);
    expect(screen.x).toBeLessThan(viewport.width - 5);
    expect(screen.y).toBeGreaterThan(5);
    expect(screen.y).toBeLessThan(viewport.height - 5);
    const hit = await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.id, screen);
    expect(hit, `Ground tap at ${JSON.stringify(screen)} must reach the canvas`).toBe('game-canvas');
    if (touch) await page.touchscreen.tap(screen.x, screen.y);
    else await page.mouse.click(screen.x, screen.y);
    await expect.poll(async () => {
      const p = (await snapshot(page)).position;
      return Math.hypot(p.x - waypoint.x, p.z - waypoint.z);
    }, { timeout: 15_000 }).toBeLessThan(0.25);
  }
  throw new Error(`Canvas movement never reached ${JSON.stringify(target)}`);
}

export async function goToObject(page: Page, target: TargetId, touch: boolean): Promise<void> {
  const shortcut = page.locator(`[data-explore="${target}"]:visible`).first();
  const marker = page.locator(`[data-target="${target}"]`);
  if (await shortcut.isVisible()) await activate(shortcut, touch);
  else if (await marker.isVisible()) await activate(marker, touch);
  else {
    const approaches: Partial<Record<TargetId, Point>> = {
      bloom: { x: 4.5, z: 1.4 }, gate: { x: 4.7, z: -2.8 }, traveler: { x: 6.6, z: -3.7 },
    };
    const levelId = (await snapshot(page)).levelId;
    const point = (levelId === 'bramblebrook' ? approaches[target] : undefined)
      ?? await page.evaluate(id => window.__RESCUE__.targets[id], target);
    await walkOnCanvas(page, point, touch);
  }
  await expect.poll(async () => {
    const state = await snapshot(page);
    const point = await page.evaluate(id => window.__RESCUE__.targets[id], target);
    return Math.hypot(state.position.x - point.x, state.position.z - point.z);
  }, { timeout: 30_000 }).toBeLessThan(1.35);
}

export async function finishCrossing(page: Page, side: 'west' | 'east', phases: Set<string>): Promise<void> {
  await expect.poll(async () => {
    const state = await snapshot(page);
    if (state.transport) phases.add(state.transport.phase);
    return state.transport;
  }, { timeout: 20_000, intervals: [50] }).toBeNull();
  expect((await snapshot(page)).ferrySide).toBe(side);
  expect([...phases]).toEqual(expect.arrayContaining(['boarding', 'sailing', 'landing']));
}

export async function captureEvidence(page: Page, testInfo: TestInfo, scene: string): Promise<void> {
  const label = `${testInfo.project.name}-${scene}`;
  const screenshot = await page.screenshot({ path: testInfo.outputPath(`${label}.png`), fullPage: true });
  await testInfo.attach(label, { body: screenshot, contentType: 'image/png' });
}

export async function canvasEvidence(page: Page, palette: 'grass' | 'any' = 'grass'): Promise<Record<string, unknown>> {
  const canvas = page.locator('#game-canvas');
  const dimensions = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width, height: element.height,
    displayWidth: element.clientWidth, displayHeight: element.clientHeight,
  }));
  expect(dimensions.width).toBeGreaterThan(300);
  expect(dimensions.height).toBeGreaterThan(300);
  const png = PNG.sync.read(await canvas.screenshot());
  const buckets = new Set<string>();
  let min = 255;
  let max = 0;
  let colored = 0;
  let samples = 0;
  // Inspect the central play area, away from paper HUD cards and screen edges.
  for (let y = Math.floor(png.height * 0.33); y < png.height * 0.64; y += 4) {
    for (let x = Math.floor(png.width * 0.35); x < png.width * 0.65; x += 4) {
      const offset = (y * png.width + x) * 4;
      const [r, g, b] = png.data.subarray(offset, offset + 3);
      min = Math.min(min, r, g, b);
      max = Math.max(max, r, g, b);
      buckets.add(`${r >> 4},${g >> 4},${b >> 4}`);
      if (Math.max(r, g, b) - Math.min(r, g, b) > 35 && (palette === 'any' || g > b)) colored += 1;
      samples += 1;
    }
  }
  expect(buckets.size).toBeGreaterThan(15);
  expect(max - min).toBeGreaterThan(40);
  expect(colored / samples).toBeGreaterThan(0.05);
  return { dimensions, centralColorBuckets: buckets.size, channelRange: max - min, coloredFraction: colored / samples };
}
