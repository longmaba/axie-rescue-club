import { expect, test } from '@playwright/test';
import { FERRY_CENTERS, FERRY_DOCKS, KEEPSAKES, RescueGame, TARGETS, type CompanionId, type LevelId, type Point, type TalentId, type TargetId } from '../src/game/rescue';
import { getLevel, LEVELS, MOONBEAM_LAYOUT, ORCHARD_BOARD, orchardPoint } from '../src/game/levels';
import { actOnPod, createOrchardState, podOnBed } from '../src/game/orchard';
import { createMoonbeamState, traceMoonbeam } from '../src/game/moonbeam';

function start(levelId: LevelId, talent: TalentId = 'root'): RescueGame {
  const game = new RescueGame(levelId);
  expect(game.setTalent(talent)).toBe(true);
  game.start();
  return game;
}
function walk(game: RescueGame, point: Point): void {
  expect(game.moveTo(point), `Route to ${JSON.stringify(point)}: ${game.state.message}`).toBe(true);
  for (let frame = 0; frame < 1500; frame += 1) {
    game.update([.05, .017, .031, .042][frame % 4]);
    expect(game.isWalkable(game.state.position.x, game.state.position.z)).toBe(true);
    if (Math.hypot(game.state.position.x - point.x, game.state.position.z - point.z) < .01) return;
  }
  throw new Error(`Did not reach ${JSON.stringify(point)}; at ${JSON.stringify(game.state.position)}`);
}
function act(game: RescueGame, id: TargetId, companion: CompanionId): void {
  const point = game.getApproachPoint(id);
  expect(point, `Approach to ${id}`).not.toBeNull();
  walk(game, point!);
  game.select(companion);
  expect(game.interact(id), `${id}: ${game.state.message}`).toMatchObject({ success: true });
}
const orchardSolution = [
  [0, 2, 0], [0, 2, 1], [0, 1, 3], [1, 4, 4], [0, 2, 3],
  [0, 3, 3], [0, 5, 4], [0, 5, 3], [1, 4, 1], [1, 3, 3],
] as const;
function pushStep(game: RescueGame, step: typeof orchardSolution[number]): void {
  const [pod, column, row] = step;
  walk(game, orchardPoint({ column, row }));
  game.select('kibo');
  expect(game.interact(pod === 0 ? 'podBerry' : 'podSun')).toMatchObject({ success: true, kind: 'push' });
}
function solveOrchard(game: RescueGame): void {
  orchardSolution.forEach((step, index) => {
    pushStep(game, step);
    if (index === 7) { act(game, 'podBerry', 'bing'); act(game, 'podBerry', 'pomodoro'); }
  });
  act(game, 'podSun', 'bing');
  act(game, 'podSun', 'pomodoro');
}
function anchorMoonbeam(game: RescueGame): void {
  act(game, 'source', 'bing');
  act(game, 'mirrorA', 'kibo');
  act(game, 'mirrorB', 'kibo');
  expect(game.getMoonbeamView()).toMatchObject({ rootLit: true, exitLit: false });
  act(game, 'rootReceiver', 'pomodoro');
}
function solveMoonbeam(game: RescueGame): void {
  anchorMoonbeam(game);
  act(game, 'mirrorB', 'kibo');
  expect(game.getMoonbeamView()).toMatchObject({ rootLit: false, exitLit: false });
  expect(game.state.moonbeam.rooted).toBe(true);
  act(game, 'mirrorC', 'kibo');
}
function assertTrail(game: RescueGame): void {
  const before = structuredClone(game.state);
  const trail = game.getFormationTrail();
  expect(game.state).toEqual(before);
  expect(trail[0]).toEqual(game.state.position);
  let length = 0;
  for (let index = 0; index < trail.length; index += 1) {
    const point = trail[index];
    expect(game.isWalkable(point.x, point.z)).toBe(true);
    if (!index) continue;
    const previous = trail[index - 1];
    length += Math.hypot(point.x - previous.x, point.z - previous.z);
    for (let part = 0; part <= 10; part += 1) {
      expect(game.isWalkable(previous.x + (point.x - previous.x) * part / 10,
        previous.z + (point.z - previous.z) * part / 10)).toBe(true);
    }
  }
  expect(length).toBeGreaterThanOrEqual(4.8);
}

for (const talent of ['root', 'float'] as const) {
  test(`Orchard ${talent}: ten spatial pushes, matching treatment, rescue and earned seedbeds return`, () => {
    const game = start('sunseed-orchard', talent);
    expect(game.getAvailableTargets()).toEqual(['podBerry', 'podSun', 'traveler', 'camp']);
    expect(game.interact('bridge').kind).toBe('no-target');
    expect(game.moveTo(game.targets.traveler)).toBe(false);
    walk(game, game.keepsakes[0]);
    solveOrchard(game);
    expect(game.state.orchard).toEqual({ pods: ORCHARD_BOARD.beds, watered: [true, true], grown: [true, true], pushes: 10 });
    expect(game.state.actions).toBe(14);
    expect(game.state.gate).toBe(true);
    expect(game.state.returnRoute).toBeNull();
    expect(game.state.contributions.kibo).toHaveLength(10);
    expect(game.state.contributions.bing).toHaveLength(2);
    expect(game.state.contributions.pomodoro).toHaveLength(2);
    expect(game.state.routesUsed).toEqual({ bridge: false, ferry: false });
    expect(game.state.bridge || game.state.bloom || game.state.leafLaunched).toBe(false);
    walk(game, game.keepsakes[1]);
    walk(game, game.keepsakes[2]);
    act(game, 'traveler', 'pomodoro');
    expect(game.canUndoPuzzle).toBe(false);
    expect(game.undoPuzzle()).toBe(false);
    act(game, 'camp', 'kibo');
    expect(game.state).toMatchObject({ phase: 'won', returnRoute: 'seedbeds', keepsakes: [true, true, true] });
  });

  test(`Marsh ${talent}: live root light, permanent path, required reroute and moonbeam return`, () => {
    const game = start('moonbell-marsh', talent);
    expect(game.moveTo(game.targets.mirrorC)).toBe(false);
    expect(game.moveTo(game.targets.traveler)).toBe(false);
    act(game, 'source', 'bing');
    expect(game.getMoonbeamView().segments[1].to.z).toBe(getLevel('moonbell-marsh').layout.bounds.minZ);
    act(game, 'mirrorA', 'kibo');
    act(game, 'mirrorB', 'kibo');
    expect(game.getMoonbeamView()).toMatchObject({ rootLit: true, exitLit: false });
    expect(game.moveTo(game.targets.mirrorC)).toBe(false);
    act(game, 'rootReceiver', 'pomodoro');
    expect(game.isWalkable(0, 2.4)).toBe(true);
    expect(game.state.gate).toBe(false);
    act(game, 'mirrorB', 'kibo');
    expect(game.getMoonbeamView()).toMatchObject({ rootLit: false, exitLit: false });
    expect(game.isWalkable(0, 2.4)).toBe(true);
    act(game, 'mirrorC', 'kibo');
    expect(game.getMoonbeamView()).toMatchObject({ rootLit: false, exitLit: true });
    expect(game.state.gate).toBe(true);
    expect(game.state.actions).toBe(6);
    expect(game.state.contributions.kibo.some(text => text.includes('Mirror B') && text.includes('after anchoring'))).toBe(true);
    expect(game.state.returnRoute).toBeNull();
    assertTrail(game);
    walk(game, game.keepsakes[2]);
    act(game, 'traveler', 'bing');
    act(game, 'mirrorC', 'kibo');
    expect(game.getMoonbeamView().exitLit).toBe(false);
    expect(game.state.gate).toBe(true);
    walk(game, game.keepsakes[1]);
    walk(game, game.keepsakes[0]);
    act(game, 'camp', 'pomodoro');
    expect(game.state).toMatchObject({ phase: 'won', returnRoute: 'moonbeam', keepsakes: [true, true, true], routesUsed: { bridge: false, ferry: false } });
  });
}

test('pod collision, cardinal stance, hedges and occupied destinations reject invalid pushes unchanged', () => {
  const game = start('sunseed-orchard');
  expect(game.isWalkable(game.targets.podBerry.x, game.targets.podBerry.z)).toBe(false);
  expect(game.moveTo(game.targets.podBerry)).toBe(false);
  expect(game.getActionRange('podBerry')).toBeGreaterThan(1.8);
  expect(game.getApproachPoint('podBerry', 'east')).toBeNull();
  walk(game, game.getApproachPoint('podBerry', 'west')!);
  const before = structuredClone(game.state);
  expect(game.interact('podBerry').kind).toBe('blocked');
  expect({ ...game.state, message: before.message }).toEqual(before);
  expect(game.canUndoPuzzle).toBe(false);
  const state = createOrchardState();
  expect(actOnPod(state, 0, 'kibo', { x: -3.6, z: -3.6 }).kind).toBe('bad-stance');
  state.pods = [{ column: 2, row: 3 }, { column: 3, row: 3 }];
  expect(actOnPod(state, 0, 'kibo', orchardPoint({ column: 1, row: 3 })).kind).toBe('blocked');
  expect(state.pushes).toBe(0);
});

test('wrong or dry beds never accept treatment, and moved watered pods must be watered again', () => {
  const game = start('sunseed-orchard', 'float');
  walk(game, game.getApproachPoint('podBerry', 'north')!);
  for (const actor of ['bing', 'pomodoro'] as const) {
    game.select(actor);
    expect(game.interact('podBerry').kind).toBe('wrong-bed');
    expect(game.state.actions).toBe(0);
  }
  const state = createOrchardState();
  state.pods[0] = { ...ORCHARD_BOARD.beds[1] };
  expect(actOnPod(state, 0, 'bing', orchardPoint({ column: 6, row: 3 })).kind).toBe('wrong-bed');
  state.pods[0] = { ...ORCHARD_BOARD.beds[0] };
  expect(actOnPod(state, 0, 'pomodoro', orchardPoint({ column: 6, row: 1 })).kind).toBe('dry');
  const watered = actOnPod(state, 0, 'bing', orchardPoint({ column: 6, row: 1 })).state!;
  const moved = actOnPod(watered, 0, 'kibo', orchardPoint({ column: 6, row: 1 })).state!;
  expect(moved.watered[0]).toBe(false);
  expect(podOnBed(moved, 0)).toBe(false);
});

test('corner undo restores position, puzzle, contribution accounting and keepsakes while time and revision advance', () => {
  const game = start('sunseed-orchard');
  walk(game, game.getApproachPoint('podBerry', 'south')!);
  const before = structuredClone(game.state);
  expect(game.interact('podBerry')).toMatchObject({ success: true, kind: 'push' });
  expect(game.state.orchard.pods[0]).toEqual({ column: 2, row: 0 });
  expect(game.getApproachPoint('podBerry', 'north')).toBeNull();
  walk(game, game.keepsakes[0]);
  expect(game.state.keepsakes[0]).toBe(true);
  const elapsed = game.state.elapsed;
  const revision = game.state.navigationRevision;
  game.moveTo(game.getApproachPoint('podSun')!);
  expect(game.undoPuzzle()).toBe(true);
  expect(game.state.position).toEqual(before.position);
  expect(game.state.orchard).toEqual(before.orchard);
  expect(game.state.keepsakes).toEqual(before.keepsakes);
  expect(game.state.contributions).toEqual(before.contributions);
  expect(game.state.actions).toBe(before.actions);
  expect(game.state.elapsed).toBe(elapsed);
  expect(game.state.navigationRevision).toBeGreaterThan(revision);
  game.update(.1);
  expect(game.state.position).toEqual(before.position);
  expect(game.undoPuzzle()).toBe(false);
  assertTrail(game);
});

test('watering and growth are independently undoable and no reset can leave a rescued traveler behind', () => {
  const game = start('sunseed-orchard');
  orchardSolution.slice(0, 8).forEach(step => pushStep(game, step));
  act(game, 'podBerry', 'bing');
  const watered = structuredClone(game.state);
  act(game, 'podBerry', 'pomodoro');
  expect(game.state.orchard.grown[0]).toBe(true);
  expect(game.undoPuzzle()).toBe(true);
  expect(game.state.orchard).toEqual(watered.orchard);
  expect(game.state.actions).toBe(watered.actions);
  expect(game.state.contributions).toEqual(watered.contributions);
  expect(game.undoPuzzle()).toBe(true);
  expect(game.state.orchard.watered[0]).toBe(false);
  expect(game.state.orchard.pushes).toBe(8);
  act(game, 'podBerry', 'bing');
  act(game, 'podBerry', 'pomodoro');
  orchardSolution.slice(8).forEach(step => pushStep(game, step));
  act(game, 'podSun', 'bing'); act(game, 'podSun', 'pomodoro');
  act(game, 'traveler', 'bing');
  walk(game, game.targets.camp);
  expect(game.resetConstructions()).toBe(false);
  expect(game.state.rescued).toBe(true);
  expect(game.state.gate).toBe(true);
});

test('all eight mirror settings produce current geometric light, including root and exit exclusivity', () => {
  expect(traceMoonbeam(createMoonbeamState())).toEqual({ segments: [], rootLit: false, exitLit: false });
  for (const a of [0, 1] as const) for (const b of [0, 1] as const) for (const c of [0, 1] as const) {
    const view = traceMoonbeam({ powered: true, rooted: false, mirrors: [a, b, c] });
    expect(view.rootLit).toBe(a === 1 && b === 0);
    expect(view.exitLit).toBe(a === 1 && b === 1 && c === 0);
    expect(view.segments.length).toBeLessThanOrEqual(4);
    expect(view.segments[0]).toEqual({ from: MOONBEAM_LAYOUT.source, to: MOONBEAM_LAYOUT.mirrors[0] });
    for (const segment of view.segments) expect(segment.from.x === segment.to.x || segment.from.z === segment.to.z).toBe(true);
  }
});

test('unlit growth, manual receiver attempts and wrong companions do not mutate the Marsh puzzle', () => {
  const game = start('moonbell-marsh');
  walk(game, game.targets.rootReceiver);
  game.select('pomodoro');
  const before = structuredClone(game.state);
  expect(game.interact('rootReceiver').kind).toBe('unlit');
  expect({ ...game.state, message: before.message }).toEqual(before);
  expect(game.canUndoPuzzle).toBe(false);
  walk(game, game.targets.source);
  game.select('kibo');
  expect(game.interact('source').kind).toBe('wrong-companion');
  expect(game.state.moonbeam.powered).toBe(false);
  expect(game.interact('gate').kind).toBe('no-target');
  solveMoonbeam(game);
  walk(game, game.targets.exitReceiver);
  for (const actor of ['kibo', 'bing', 'pomodoro'] as const) {
    game.select(actor);
    const state = structuredClone(game.state);
    expect(game.interact('exitReceiver').kind).toBe('no-switch');
    expect({ ...game.state, message: state.message }).toEqual(state);
  }
});

test('Marsh gate follows current light before rescue and undo safely removes a path from the far bank', () => {
  const game = start('moonbell-marsh');
  solveMoonbeam(game);
  act(game, 'mirrorC', 'kibo');
  expect(game.state.gate).toBe(false);
  expect(game.moveTo(game.targets.traveler)).toBe(false);
  expect(game.undoPuzzle()).toBe(true);
  expect(game.state.gate).toBe(true);
  expect(game.undoPuzzle()).toBe(true); // C turn
  expect(game.undoPuzzle()).toBe(true); // B reroute, restores west stance
  expect(game.getMoonbeamView().rootLit).toBe(true);
  walk(game, game.targets.mirrorC);
  expect(game.undoPuzzle()).toBe(true); // Root growth: return to safe root flower stance
  expect(game.state.moonbeam.rooted).toBe(false);
  expect(game.state.position.x).toBeCloseTo(game.targets.rootReceiver.x, 8);
  expect(game.state.position.z).toBeCloseTo(game.targets.rootReceiver.z, 8);
  expect(game.isWalkable(0, 2.4)).toBe(false);
  assertTrail(game);
});

for (const levelId of ['sunseed-orchard', 'moonbell-marsh'] as const) {
  test(`${levelId}: pause, reset, restart and level changes clear puzzle navigation safely`, () => {
    const game = start(levelId, 'float');
    const state = game.state;
    if (levelId === 'sunseed-orchard') pushStep(game, orchardSolution[0]);
    else act(game, 'source', 'bing');
    game.pause();
    const before = structuredClone(state);
    game.move(1, 0, .1); game.update(10);
    expect(game.moveTo(game.targets.camp)).toBe(false);
    expect(game.undoPuzzle()).toBe(false);
    expect(game.interact().kind).toBe('inactive');
    expect({ ...state, message: before.message }).toEqual(before);
    game.resume();
    walk(game, game.targets.camp);
    const revision = state.navigationRevision;
    expect(game.resetConstructions()).toBe(true);
    expect(state.navigationRevision).toBeGreaterThan(revision);
    expect(game.canUndoPuzzle).toBe(false);
    expect(state.position).toEqual(game.level.spawn);
    expect(state.orchard).toEqual(createOrchardState());
    expect(state.moonbeam).toEqual(createMoonbeamState());
    expect(state.talent).toBe('float');
    game.moveTo(game.targets.camp);
    game.restart();
    expect(game.state).toBe(state);
    game.update(.1);
    expect(state.position).toEqual(game.level.spawn);
    expect(state.phase).toBe('playing');
    assertTrail(game);
    expect(game.loadLevel(levelId === 'sunseed-orchard' ? 'moonbell-marsh' : 'sunseed-orchard')).toBe(true);
    expect(game.state).toBe(state);
    expect(state.phase).toBe('intro');
    expect(state.talent).toBe('float');
    expect(state.actions).toBe(0);
    expect(state.returnRoute).toBeNull();
    expect(state.routesUsed).toEqual({ bridge: false, ferry: false });
    expect(game.canUndoPuzzle).toBe(false);
  });
}

test('three distinct definitions preserve Brook exports and reject unsupported targets and invalid levels', () => {
  expect(LEVELS.map(level => level.id)).toEqual(['bramblebrook', 'sunseed-orchard', 'moonbell-marsh']);
  const game = start('sunseed-orchard');
  expect(game.getApproachPoint('bridge')).toBeNull();
  expect(game.loadLevel('bad' as LevelId)).toBe(false);
  expect(game.loadLevel('bramblebrook')).toBe(true);
  expect(game.targets).toBe(TARGETS); expect(game.keepsakes).toBe(KEEPSAKES);
  expect(game.ferryDocks).toBe(FERRY_DOCKS); expect(game.ferryCenters).toBe(FERRY_CENTERS);
  game.start();
  expect(game.interact('podBerry').kind).toBe('no-target');
  expect(game.canUndoPuzzle).toBe(false);
});

test('click paths keep progressing across variable frame remainders', () => {
  const game = start('bramblebrook');
  game.state.position = { ...game.ferryDocks.east };
  expect(game.moveTo(game.targets.gate)).toBe(true);
  // This consumes the initial .05-unit grid alignment with a tiny remainder.
  game.update(.0125);
  const deltas = [.05, .017, .031, .042];
  for (let frame = 0; frame < 300; frame += 1) game.update(deltas[frame % deltas.length]);
  expect(Math.hypot(game.state.position.x - game.targets.gate.x, game.state.position.z - game.targets.gate.z)).toBeLessThan(.01);
});
