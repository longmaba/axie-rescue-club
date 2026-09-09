import { expect, test } from '@playwright/test';
import { FERRY_CENTERS, FERRY_DOCKS, KEEPSAKES, RescueGame, TARGETS,
  type FerrySide, type FerryTransport, type Point, type TalentId } from '../src/game/rescue';

function startGame(talent: TalentId = 'root'): RescueGame {
  const game = new RescueGame();
  expect(game.setTalent(talent)).toBe(true);
  game.start();
  return game;
}

function walkTo(game: RescueGame, point: Point): void {
  expect(game.moveTo(point), `Expected a route to ${JSON.stringify(point)}: ${game.state.message}`).toBe(true);
  for (let i = 0; i < 1_000; i += 1) {
    game.update(0.05);
    expect(game.isWalkable(game.state.position.x, game.state.position.z)).toBe(true);
    if (Math.hypot(game.state.position.x - point.x, game.state.position.z - point.z) < 0.01) return;
  }
  throw new Error(`Route did not arrive at ${JSON.stringify(point)}; at ${JSON.stringify(game.state.position)}`);
}

function buildBridge(game: RescueGame): void {
  walkTo(game, TARGETS.bridge);
  game.select('kibo');
  expect(game.interact('bridge').success).toBe(true);
  expect(game.state.bridge).toBe(false);
  game.select('pomodoro');
  expect(game.interact('bridge').success).toBe(true);
  expect(game.state.bridge).toBe(true);
}

function buildFerry(game: RescueGame): void {
  walkTo(game, TARGETS.leaf);
  game.select('pomodoro');
  expect(game.interact('leaf').success).toBe(true);
  expect(game.state.leafGrown).toBe(true);
  if (game.state.talent === 'root') {
    expect(game.state.leafLaunched).toBe(false);
    game.select('kibo');
    expect(game.interact('leaf').success).toBe(true);
  }
  expect(game.state.leafLaunched).toBe(true);
}

function finishTransport(game: RescueGame): Set<FerryTransport['phase']> {
  const phases = new Set<FerryTransport['phase']>();
  for (let i = 0; i < 200 && game.state.transport; i += 1) {
    phases.add(game.state.transport.phase);
    game.update(0.05);
  }
  expect(game.state.transport).toBeNull();
  expect(game.isWalkable(game.state.position.x, game.state.position.z)).toBe(true);
  return phases;
}

function sail(game: RescueGame, shore: FerrySide): void {
  walkTo(game, FERRY_DOCKS[shore]);
  game.select('bing');
  expect(game.interact(shore === 'west' ? 'dockWest' : 'dockEast').success).toBe(true);
  expect(game.state.transport?.empty).toBe(false);
  expect([...finishTransport(game)]).toEqual(['boarding', 'sailing', 'landing']);
  const destination = shore === 'west' ? 'east' : 'west';
  expect(game.state.position).toEqual(FERRY_DOCKS[destination]);
  expect(game.state.ferrySide).toBe(destination);
}

function rescueTraveler(game: RescueGame): void {
  walkTo(game, TARGETS.gate);
  game.select('bing');
  expect(game.interact('gate').success).toBe(true);
  walkTo(game, TARGETS.traveler);
  expect(game.interact('traveler').success).toBe(true);
  expect(game.state.rescued).toBe(true);
}

function returnToCamp(game: RescueGame): void {
  walkTo(game, TARGETS.camp);
  expect(game.interact('camp')).toMatchObject({ success: true, kind: 'camp' });
  expect(game.state.phase).toBe('won');
}

for (const talent of ['root', 'float'] as const) {
  test(`${talent} lesson supports a complete bridge rescue with an earned bridge return`, () => {
    const game = startGame(talent);
    buildBridge(game);
    expect(game.state.bloom).toBe(talent === 'root');
    expect(game.state.routesUsed).toEqual({ bridge: false, ferry: false });
    if (!game.state.bloom) {
      walkTo(game, TARGETS.bloom);
      expect(game.moveTo(TARGETS.gate)).toBe(false);
      game.select('pomodoro');
      expect(game.interact('bloom').success).toBe(true);
    }
    walkTo(game, KEEPSAKES[0]);
    expect(game.state.routesUsed.bridge).toBe(true);
    expect(game.state.returnRoute).toBeNull();
    walkTo(game, KEEPSAKES[2]);
    rescueTraveler(game);
    returnToCamp(game);
    expect(game.state.returnRoute).toBe('bridge');
    expect(game.state.routesUsed).toEqual({ bridge: true, ferry: false });
    expect(game.state.keepsakes).toEqual([true, false, true]);
    expect(game.state.leafGrown).toBe(false);
    expect(game.state.contributions.kibo.join(' ')).toContain('log');
    expect(game.state.contributions.pomodoro.join(' ')).toContain('bridge');
    expect(game.state.contributions.bing.join(' ')).toContain('waterwheel');
  });

  test(`${talent} lesson supports a ferry rescue without constructing the bridge or garden`, () => {
    const game = startGame(talent);
    buildFerry(game);
    expect(game.isWalkable(0, -2.5)).toBe(false);
    expect(game.moveTo(TARGETS.gate)).toBe(false);
    sail(game, 'west');
    expect(game.state.routesUsed).toEqual({ bridge: false, ferry: true });
    expect(game.state.keepsakes).toEqual([false, true, false]);
    expect(game.state.bridge).toBe(false);
    expect(game.state.bloom).toBe(false);
    rescueTraveler(game);
    sail(game, 'east');
    returnToCamp(game);
    expect(game.state.returnRoute).toBe('ferry');
    expect(game.state.routesUsed).toEqual({ bridge: false, ferry: true });
    expect(game.state.keepsakes).toEqual([false, true, false]);
    expect(game.state.logRolled).toBe(false);
    expect(game.state.contributions.bing.join(' ')).toContain('traveler home');
  });
}

test('an unrooted log blocks walking; wrong experiments and distant actions change no construction', () => {
  const game = startGame('float');
  expect(game.interact('bridge').kind).toBe('out-of-range');
  walkTo(game, TARGETS.bridge);
  game.select('pomodoro');
  expect(game.interact('bridge').kind).toBe('wrong-companion');
  expect(game.state.logRolled).toBe(false);
  game.select('kibo');
  expect(game.interact('bridge').success).toBe(true);
  expect(game.state.logRolled).toBe(true);
  expect(game.state.bridge).toBe(false);
  expect(game.isWalkable(0, 2.5)).toBe(false);
  expect(game.moveTo(TARGETS.bloom)).toBe(false);
  for (let i = 0; i < 50; i += 1) game.move(1, 0, 0.1);
  expect(game.state.position.x).toBeLessThan(-1.5);
  game.select('bing');
  expect(game.interact('bridge').kind).toBe('wrong-companion');
  expect(game.state.actions).toBe(1);
  walkTo(game, TARGETS.bridge);
  game.select('pomodoro');
  game.interact('bridge');
  expect(game.state.bridge).toBe(true);
  expect(game.state.bloom).toBe(false);
  expect(game.interact('bridge').kind).toBe('already-complete');
  walkTo(game, TARGETS.bloom);
  game.select('kibo');
  expect(game.interact('bloom').kind).toBe('wrong-companion');
  expect(game.state.bloom).toBe(false);
});

test('inspect and available targets expose object clues without prescribing a selected companion', () => {
  const game = startGame();
  const available = game.getAvailableTargets();
  expect(available).toEqual(expect.arrayContaining(['bridge', 'bloom', 'leaf', 'gate', 'traveler', 'camp']));
  for (const companion of ['kibo', 'pomodoro', 'bing'] as const) {
    game.select(companion);
    expect(game.getAvailableTargets()).toEqual(available);
  }
  const before = { ...game.state, message: '' };
  for (const target of available) expect(game.inspect(target)).not.toMatch(/Kibo|Pomodoro|Bing/);
  expect({ ...game.state, message: '' }).toEqual(before);
  walkTo(game, TARGETS.bridge);
  expect(game.getHint()).not.toContain('Kibo');
  expect(game.getHint()).toContain('Kibo');
  game.select('kibo');
  game.interact('bridge');
  expect(game.inspect('bridge')).toContain('wobbles');
  expect(game.getHint()).not.toContain('Pomodoro');
  expect(game.getHint()).toContain('Pomodoro');
  buildFerry(game);
  expect(game.getAvailableTargets()).not.toContain('leaf');
  expect(game.getAvailableTargets()).toEqual(expect.arrayContaining(['dockWest', 'dockEast']));
});

test('empty recall works from either bank without moving the squad, earning shell, or claiming a ridden route', () => {
  const game = startGame();
  buildBridge(game);
  buildFerry(game);
  for (const shore of ['east', 'west'] as const) {
    walkTo(game, FERRY_DOCKS[shore]);
    const position = { ...game.state.position };
    game.select('bing');
    expect(game.interact(shore === 'east' ? 'dockEast' : 'dockWest').success).toBe(true);
    expect(game.state.transport).toMatchObject({ empty: true, phase: 'sailing', to: shore });
    for (let i = 0; i < 100 && game.state.transport; i += 1) {
      game.update(0.05);
      expect(game.state.position).toEqual(position);
    }
    expect(game.state.transport).toBeNull();
    expect(game.state.ferrySide).toBe(shore);
    expect(game.state.ferryProgress).toBe(shore === 'east' ? 1 : 0);
    expect(game.state.keepsakes[1]).toBe(false);
    expect(game.state.routesUsed.ferry).toBe(false);
    expect(game.state.returnRoute).toBeNull();
  }
  expect(game.state.contributions.bing.filter(memory => memory.includes('Recalled'))).toHaveLength(1);
});

test('the shell is earned by occupied midstream sailing, never just boarding near it', () => {
  const game = startGame('float');
  buildFerry(game);
  game.select('bing');
  game.interact('dockWest');
  expect(game.state.keepsakes[1]).toBe(false);
  while (game.state.transport?.phase === 'boarding') game.update(0.05);
  expect(game.state.position.x).toBeCloseTo(FERRY_CENTERS.west.x);
  expect(game.state.keepsakes[1]).toBe(false);
  while (game.state.ferryProgress < 0.45) game.update(0.05);
  expect(game.state.keepsakes[1]).toBe(false);
  while (game.state.ferryProgress < 0.55) game.update(0.05);
  expect(game.state.keepsakes[1]).toBe(true);
  expect(game.state.routesUsed.ferry).toBe(false);
  finishTransport(game);
  expect(game.state.routesUsed.ferry).toBe(true);
});

test('boarding, sailing and landing own movement, freeze on pause, and reject competing inputs', () => {
  const game = startGame('float');
  buildFerry(game);
  game.select('bing');
  game.interact('dockWest');
  for (const phase of ['boarding', 'sailing', 'landing'] as const) {
    for (let i = 0; i < 100 && game.state.transport?.phase !== phase; i += 1) game.update(0.05);
    expect(game.state.transport?.phase).toBe(phase);
    const position = { ...game.state.position };
    const transport = structuredClone(game.state.transport);
    game.move(1, 1, 5);
    expect(game.moveTo(TARGETS.camp)).toBe(false);
    game.select('kibo');
    expect(game.state.active).toBe('bing');
    expect(game.setTalent('root')).toBe(false);
    expect(game.resetConstructions()).toBe(false);
    expect(game.interact('dockWest').kind).toBe('in-transit');
    expect(game.state.position).toEqual(position);
    expect(game.state.transport).toEqual(transport);
    expect(game.getAvailableTargets()).toEqual([]);
    expect(game.getNearbyTarget()).toBeNull();
    game.pause();
    const elapsed = game.state.elapsed;
    game.update(10);
    expect(game.state.elapsed).toBe(elapsed);
    expect(game.state.position).toEqual(position);
    expect(game.state.transport).toEqual(transport);
    game.resume();
    game.update(0.05);
    expect(game.state.transport).not.toEqual(transport);
  }
  finishTransport(game);
  expect(game.state.position).toEqual(FERRY_DOCKS.east);
  expect(game.moveTo(TARGETS.gate)).toBe(true);
});

for (const outward of ['bridge', 'ferry'] as const) {
  test(`outbound ${outward} can return by the other route; attribution follows the actual return`, () => {
    const game = startGame();
    buildBridge(game);
    buildFerry(game);
    if (outward === 'ferry') sail(game, 'west');
    else walkTo(game, TARGETS.gate);
    rescueTraveler(game);
    if (outward === 'bridge') {
      walkTo(game, FERRY_DOCKS.east);
      game.select('bing');
      game.interact('dockEast');
      expect(game.state.transport?.empty).toBe(true);
      finishTransport(game);
      expect(game.state.returnRoute).toBeNull();
      sail(game, 'east');
    }
    returnToCamp(game);
    expect(game.state.returnRoute).toBe(outward === 'bridge' ? 'ferry' : 'bridge');
    expect(game.state.routesUsed).toEqual({ bridge: true, ferry: true });
  });
}

test('camp reset keeps earned memories and keepsakes while safely restoring construction; repeated contributions stay unique', () => {
  const game = startGame();
  buildBridge(game);
  buildFerry(game);
  walkTo(game, KEEPSAKES[0]);
  const built = { bridge: game.state.bridge, leafLaunched: game.state.leafLaunched };
  expect(game.resetConstructions()).toBe(false);
  expect(game.setTalent('float')).toBe(false);
  expect({ bridge: game.state.bridge, leafLaunched: game.state.leafLaunched }).toEqual(built);
  walkTo(game, TARGETS.camp);
  const memories = structuredClone(game.state.contributions);
  const actions = game.state.actions;
  game.moveTo(TARGETS.bridge);
  game.pause();
  expect(game.setTalent('float')).toBe(true);
  expect(game.resetConstructions()).toBe(true);
  expect(game.state).toMatchObject({ phase: 'paused', logRolled: false, bridge: false, bloom: false,
    leafGrown: false, leafLaunched: false, gate: false, ferrySide: 'west', ferryProgress: 0, transport: null });
  expect(game.state.keepsakes[0]).toBe(true);
  expect(game.state.routesUsed.bridge).toBe(true);
  expect(game.state.contributions).toEqual(memories);
  expect(game.state.actions).toBe(actions);
  game.resume();
  game.update(0.1);
  expect(game.state.position).toEqual(TARGETS.camp);
  buildBridge(game);
  for (const contributions of Object.values(game.state.contributions)) {
    expect(new Set(contributions).size).toBe(contributions.length);
  }
});

test('restart retains the lesson but clears both routes, transport, progress and expedition contributions', () => {
  const game = new RescueGame();
  const state = game.state;
  game.move(1, 0, 1);
  game.update(1);
  expect(state.position).toEqual({ x: -6, z: 2.5 });
  expect(state.elapsed).toBe(0);
  expect(game.setTalent('float')).toBe(true);
  game.start();
  buildFerry(game);
  game.select('bing');
  game.interact('dockWest');
  game.update(0.1);
  expect(game.state.transport).not.toBeNull();
  game.restart();
  expect(game.state).toBe(state);
  expect(state).toMatchObject({ phase: 'playing', active: 'kibo', talent: 'float', position: { x: -6, z: 2.5 },
    logRolled: false, bridge: false, bloom: false, leafGrown: false, leafLaunched: false,
    gate: false, rescued: false, keepsakes: [false, false, false], actions: 0, elapsed: 0,
    transport: null, ferrySide: 'west', ferryProgress: 0, returnRoute: null,
    routesUsed: { bridge: false, ferry: false }, contributions: { kibo: [], pomodoro: [], bing: [] } });
  game.update(0.1);
  expect(state.position).toEqual({ x: -6, z: 2.5 });
});

test('manual movement stays finite, clamps frame spikes, blocks water, and cancels click navigation only on input', () => {
  const game = startGame();
  const before = { ...game.state.position };
  game.move(1, 1, 500);
  expect(Math.hypot(game.state.position.x - before.x, game.state.position.z - before.z)).toBeCloseTo(0.4);
  for (let i = 0; i < 100; i += 1) game.move(1, 0, 0.1);
  expect(game.state.position.x).toBeLessThan(-1.5);
  expect(game.isWalkable(0, -2.5)).toBe(false);
  expect(game.isWalkable(9, 0)).toBe(false);
  expect(game.isWalkable(NaN, 0)).toBe(false);
  expect(game.moveTo({ x: Infinity, z: 0 })).toBe(false);
  game.move(NaN, Infinity, 0.1);
  game.update(NaN);
  expect(Number.isFinite(game.state.position.x)).toBe(true);
  expect(Number.isFinite(game.state.elapsed)).toBe(true);
  game.restart();
  game.moveTo(TARGETS.bridge);
  game.move(0, 0, 0.1);
  game.update(0.1);
  expect(game.state.position.x).toBeGreaterThan(-6);
  game.move(0, -1, 0.1);
  const position = { ...game.state.position };
  for (let i = 0; i < 10; i += 1) game.update(0.1);
  expect(game.state.position).toEqual(position);
});
