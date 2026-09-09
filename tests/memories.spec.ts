import { expect, test } from '@playwright/test';
import { getCampSummary, getExpeditionProgress, readMemories, saveExpedition, type Memory, type StorageLike } from '../src/game/memories';
import { RescueGame, type RescueState } from '../src/game/rescue';
import { LEVELS, type LevelId, type RouteId } from '../src/game/levels';

const KEY = 'rescue-club-postcards';

class TestStorage implements StorageLike {
  writes = 0;
  constructor(public value: string | null = null) {}
  getItem(key: string): string | null { expect(key).toBe(KEY); return this.value; }
  setItem(key: string, value: string): void { expect(key).toBe(KEY); this.writes++; this.value = value; }
}

function legacy(seconds = 12) {
  return { date: '2026-09-05T03:00:00.000Z', seconds, keepsakes: 2 };
}

function finishedState(levelId: LevelId = 'bramblebrook'): RescueState {
  const state = new RescueGame(levelId).state;
  return {
    ...state,
    phase: 'won',
    elapsed: 32.6,
    rescued: true,
    keepsakes: [true, false, true],
    returnRoute: levelId === 'sunseed-orchard' ? 'seedbeds' : levelId === 'moonbell-marsh' ? 'moonbeam' : 'ferry',
    routesUsed: { bridge: levelId === 'bramblebrook', ferry: levelId === 'bramblebrook' },
    talent: 'float',
    contributions: { kibo: ['Rolled the log'], pomodoro: ['Grew the leaf'], bing: ['Brought everyone across'] },
  };
}

test('legacy postcards retain their result without inventing route, talent, or contributions', () => {
  const storage = new TestStorage(JSON.stringify([legacy(), { ...legacy(18), crew: ['Kibo', 'Pomodoro', 'Bing'] }]));
  const memories = readMemories(storage);
  expect(memories).toHaveLength(2);
  expect(memories[0]).toEqual({
    ...legacy(), levelId: 'bramblebrook', puzzleRevision: 1, crew: ['Kibo', 'Pomodoro', 'Bing'], route: null, talent: null,
    routesUsed: { bridge: false, ferry: false }, contributions: { kibo: [], pomodoro: [], bing: [] },
  });
  expect(getCampSummary(memories)).toEqual({
    keepsakes: 2, visitor: true, routes: [], contributionCounts: { kibo: 0, pomodoro: 0, bing: 0 },
  });
  expect(storage.writes).toBe(0);
  expect(getExpeditionProgress(memories)).toEqual({
    bramblebrook: { completed: true, completions: 2, bestKeepsakes: 2, routes: [] },
    'sunseed-orchard': { completed: false, completions: 0, bestKeepsakes: 0, routes: [] },
    'moonbell-marsh': { completed: false, completions: 0, bestKeepsakes: 0, routes: [] },
  });
});

test('corrupt storage and invalid base records are ignored', () => {
  for (const value of [null, '{broken', 'null', '{}', '"postcard"']) expect(readMemories(new TestStorage(value))).toEqual([]);
  const entries = [null, [], 'bad', {}, { ...legacy(), date: 'not a date' }, { ...legacy(), date: 'x'.repeat(201) },
    { ...legacy(), seconds: -1 }, { ...legacy(), seconds: '12' }, { ...legacy(), seconds: 1e100 },
    { ...legacy(), keepsakes: 4 }, { ...legacy(), keepsakes: 1.5 }, legacy(99)];
  expect(readMemories(new TestStorage(JSON.stringify(entries))).map(memory => memory.seconds)).toEqual([99]);
});

test('untrusted optional fields have bounded strings, fixed companion IDs, and strict flags', () => {
  const storage = new TestStorage(JSON.stringify([{
    ...legacy(), route: 'teleport', talent: 'super', routesUsed: { bridge: 'true', ferry: true, secret: true },
    crew: [' Kibo ', 'x'.repeat(201), 17, 'extra'],
    contributions: {
      kibo: [' Push ', 'Push', '', 4, 'x'.repeat(201), '<b>text is not HTML</b>'],
      pomodoro: Array.from({ length: 24 }, (_, index) => `Bloom ${index}`),
      bing: 'Splash', stranger: ['Invented credit'],
    },
  }]));
  const memory = readMemories(storage)[0];
  expect(memory.route).toBeNull();
  expect(memory.talent).toBeNull();
  expect(memory.routesUsed).toEqual({ bridge: false, ferry: true });
  expect(memory.crew).toEqual(['Kibo']);
  expect(memory.contributions.kibo).toEqual(['Push', '<b>text is not HTML</b>']);
  expect(memory.contributions.pomodoro).toHaveLength(20);
  expect(memory.contributions.bing).toEqual([]);
  expect(Object.keys(memory.contributions)).toEqual(['kibo', 'pomodoro', 'bing']);
});

test('read and save retain only the latest twenty valid memories', () => {
  const storage = new TestStorage(JSON.stringify(Array.from({ length: 25 }, (_, index) => legacy(index))));
  expect(readMemories(storage).map(memory => memory.seconds)).toEqual(Array.from({ length: 20 }, (_, index) => index + 5));
  const result = saveExpedition(finishedState(), storage);
  expect(result.saved).toBe(true);
  expect(result.memories).toHaveLength(20);
  expect(result.memories[0].seconds).toBe(6);
  expect(result.memories.at(-1)?.seconds).toBe(33);
  const serialized = JSON.parse(storage.value!) as { version: number }[];
  expect(serialized).toHaveLength(20);
  expect(serialized.every(memory => memory.version === 4)).toBe(true);
});

test('only won expeditions save a snapshot, with no contribution aliases between trips', () => {
  const storage = new TestStorage();
  const state = finishedState();
  for (const phase of ['intro', 'playing', 'paused'] as const) {
    expect(saveExpedition({ ...state, phase }, storage)).toEqual({ saved: false, memories: [] });
  }
  expect(storage.writes).toBe(0);
  const first = saveExpedition(state, storage);
  expect(first.saved).toBe(true);
  expect(first.memories[0]).toMatchObject({
    levelId: 'bramblebrook', puzzleRevision: 1, seconds: 33, keepsakes: 2, crew: ['Kibo', 'Pomodoro', 'Bing'], route: 'ferry', talent: 'float',
    routesUsed: { bridge: true, ferry: true },
  });
  expect(Number.isFinite(Date.parse(first.memories[0].date))).toBe(true);
  state.contributions.kibo.push('Launched the leaf');
  state.routesUsed.bridge = false;
  expect(first.memories[0].contributions.kibo).toEqual(['Rolled the log']);
  expect(first.memories[0].routesUsed.bridge).toBe(true);
  const second = saveExpedition(state, storage);
  expect(second.memories[0].contributions.kibo).toEqual(['Rolled the log']);
  expect(second.memories[1].contributions.kibo).toEqual(['Rolled the log', 'Launched the leaf']);
  first.memories[0].contributions.pomodoro.push('Changed returned data');
  expect(readMemories(storage)[0].contributions.pomodoro).toEqual(['Grew the leaf']);
  expect(getCampSummary(second.memories)).toEqual({
    keepsakes: 2, visitor: true, routes: ['bridge', 'ferry'], contributionCounts: { kibo: 3, pomodoro: 2, bing: 2 },
  });
});

test('camp shows maximum keepsakes and actual contribution counts rather than trip totals', () => {
  const storage = new TestStorage();
  const first = finishedState();
  first.keepsakes = [true, true, true];
  first.contributions = { kibo: ['Push', 'Push'], pomodoro: [], bing: ['Splash'] };
  saveExpedition(first, storage);
  const second = finishedState();
  second.keepsakes = [false, false, false];
  second.contributions = { kibo: [], pomodoro: ['Grow'], bing: [] };
  const result = saveExpedition(second, storage);
  expect(getCampSummary(result.memories)).toEqual({
    keepsakes: 3, visitor: true, routes: ['bridge', 'ferry'], contributionCounts: { kibo: 1, pomodoro: 1, bing: 1 },
  });
  expect(getCampSummary([])).toEqual({
    keepsakes: 0, visitor: false, routes: [], contributionCounts: { kibo: 0, pomodoro: 0, bing: 0 },
  });
});

test('storage failures never throw or report unsaved expedition rewards', () => {
  let writesAfterReadFailure = 0;
  const readFailure: StorageLike = {
    getItem() { throw new Error('Storage unavailable'); },
    setItem() { writesAfterReadFailure++; },
  };
  expect(readMemories(readFailure)).toEqual([]);
  expect(saveExpedition(finishedState(), readFailure)).toEqual({ saved: false, memories: [] });
  expect(writesAfterReadFailure).toBe(0);
  const writeFailure: StorageLike = {
    getItem() { return JSON.stringify([legacy()]); },
    setItem() { throw new Error('Quota exceeded'); },
  };
  const result = saveExpedition(finishedState(), writeFailure);
  expect(result.saved).toBe(false);
  expect(result.memories).toHaveLength(1);
  expect(result.memories[0].route).toBeNull();
  expect(getCampSummary(result.memories).contributionCounts).toEqual({ kibo: 0, pomodoro: 0, bing: 0 });
  const failedOrchard = saveExpedition(finishedState('sunseed-orchard'), writeFailure);
  expect(getExpeditionProgress(failedOrchard.memories)['sunseed-orchard'].completed).toBe(false);
});

test('a throwing global localStorage getter is handled inside each public default path', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('Browser security policy'); },
  });
  try {
    expect(readMemories()).toEqual([]);
    expect(saveExpedition(finishedState())).toEqual({ saved: false, memories: [] });
    expect(getCampSummary()).toEqual({
      keepsakes: 0, visitor: false, routes: [], contributionCounts: { kibo: 0, pomodoro: 0, bing: 0 },
    });
    expect(Object.values(getExpeditionProgress()).every(progress => !progress.completed && progress.completions === 0)).toBe(true);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('explicit unknown level IDs are rejected instead of becoming legacy completions', () => {
  const invalidIds = ['', 'future-island', '__proto__', null, false, 1, {}];
  const storage = new TestStorage(JSON.stringify([
    ...invalidIds.map(levelId => ({ ...legacy(), levelId })),
    ...LEVELS.map(level => ({ ...legacy(), levelId: level.id })),
  ]));
  const memories = readMemories(storage);
  expect(memories.map(memory => memory.levelId)).toEqual(LEVELS.map(level => level.id));
  expect(Object.values(getExpeditionProgress(memories)).map(progress => progress.completions)).toEqual([1, 0, 0]);
  expect(storage.writes).toBe(0);
});

test('version-four saves stamp current puzzle revisions without upgrading older postcard achievements', () => {
  const storage = new TestStorage(JSON.stringify([{ version: 2, ...legacy() }]));
  for (const level of LEVELS) {
    const result = saveExpedition(finishedState(level.id), storage);
    expect(result.saved).toBe(true);
    expect(result.memories.at(-1)?.levelId).toBe(level.id);
    expect(result.memories.at(-1)?.puzzleRevision).toBe(level.puzzleRevision);
  }
  const serialized = JSON.parse(storage.value!) as { version: number; levelId: LevelId; puzzleRevision: number; route: RouteId | null }[];
  expect(serialized.map(memory => memory.levelId)).toEqual(['bramblebrook', ...LEVELS.map(level => level.id)]);
  expect(serialized.every(memory => memory.version === 4)).toBe(true);
  expect(serialized.map(memory => memory.puzzleRevision)).toEqual([1, 1, 2, 2]);
  expect(serialized.map(memory => memory.route)).toEqual([null, 'ferry', 'seedbeds', 'moonbeam']);
  expect(readMemories(storage).map(memory => memory.levelId)).toEqual(serialized.map(memory => memory.levelId));
});

test('a won state with an invalid level cannot write or create another island completion', () => {
  const storage = new TestStorage(JSON.stringify([legacy()]));
  for (const levelId of ['future-island', undefined]) {
    const invalidState = { ...finishedState(), levelId } as unknown as RescueState;
    const result = saveExpedition(invalidState, storage);
    expect(result.saved).toBe(false);
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].levelId).toBe('bramblebrook');
  }
  expect(storage.writes).toBe(0);
});

test('expedition progress isolates completions, best keepsakes, and route discoveries by level', () => {
  const storage = new TestStorage(JSON.stringify([
    legacy(),
    { ...legacy(), levelId: 'sunseed-orchard', puzzleRevision: 2, keepsakes: 1, route: 'seedbeds' },
    { ...legacy(), levelId: 'sunseed-orchard', puzzleRevision: 2, keepsakes: 3, route: 'seedbeds' },
    { ...legacy(), levelId: 'moonbell-marsh', puzzleRevision: 2, keepsakes: 0, route: 'moonbeam' },
  ]));
  const memories = readMemories(storage);
  const progress = getExpeditionProgress(memories);
  expect(progress).toEqual({
    bramblebrook: { completed: true, completions: 1, bestKeepsakes: 2, routes: [] },
    'sunseed-orchard': { completed: true, completions: 2, bestKeepsakes: 3, routes: ['seedbeds'] },
    'moonbell-marsh': { completed: true, completions: 1, bestKeepsakes: 0, routes: ['moonbeam'] },
  });
  progress['sunseed-orchard'].routes.length = 0;
  expect(getExpeditionProgress(memories)['sunseed-orchard'].routes).toEqual(['seedbeds']);
  expect(getCampSummary(memories)).toEqual({
    keepsakes: 3, visitor: true, routes: ['seedbeds', 'moonbeam'], contributionCounts: { kibo: 0, pomodoro: 0, bing: 0 },
  });
});

test('expedition progress validates supplied records and stays within the latest twenty valid memories', () => {
  const oldest = readMemories(new TestStorage(JSON.stringify([legacy()])))[0];
  const history = [oldest, ...Array.from({ length: 20 }, () => ({ ...oldest,
    levelId: 'sunseed-orchard' as const, puzzleRevision: 2 as const, route: 'seedbeds' as const }))];
  const invalid = { ...history[0], levelId: 'future-island' } as unknown as Memory;
  const progress = getExpeditionProgress([...history, invalid]);
  expect(progress.bramblebrook).toEqual({ completed: false, completions: 0, bestKeepsakes: 0, routes: [] });
  expect(progress['sunseed-orchard']).toEqual({ completed: true, completions: 20, bestKeepsakes: 2, routes: ['seedbeds'] });
  expect(progress['moonbell-marsh'].completed).toBe(false);
});

test('old island postcards remain readable and keep camp souvenirs without completing redesigned puzzles', () => {
  const storage = new TestStorage(JSON.stringify([
    { version: 3, ...legacy(), levelId: 'sunseed-orchard', route: 'ferry',
      contributions: { bing: ['Powered the old orchard wheel'] } },
    { version: 3, ...legacy(), levelId: 'moonbell-marsh', route: 'bridge', keepsakes: 3 },
  ]));
  const oldMemories = readMemories(storage);
  expect(oldMemories.map(memory => memory.puzzleRevision)).toEqual([1, 1]);
  expect(oldMemories.map(memory => memory.route)).toEqual(['ferry', 'bridge']);
  expect(Object.values(getExpeditionProgress(oldMemories)).every(progress => !progress.completed)).toBe(true);
  expect(getCampSummary(oldMemories)).toEqual({
    keepsakes: 3, visitor: true, routes: ['bridge', 'ferry'], contributionCounts: { kibo: 0, pomodoro: 0, bing: 1 },
  });
  const result = saveExpedition(finishedState('sunseed-orchard'), storage);
  expect(result.saved).toBe(true);
  expect(result.memories.slice(0, 2)).toEqual(oldMemories);
  expect(getExpeditionProgress(result.memories)['sunseed-orchard']).toEqual({
    completed: true, completions: 1, bestKeepsakes: 2, routes: ['seedbeds'],
  });
  expect(getExpeditionProgress(result.memories)['moonbell-marsh'].completed).toBe(false);
  expect(JSON.parse(storage.value!).map((entry: { puzzleRevision: number }) => entry.puzzleRevision)).toEqual([1, 1, 2]);
});

test('explicit invalid revisions are rejected and neither revision nor route alone grants new completion', () => {
  const invalidRevisions = [null, false, '2', 0, 3, 1.5, {}];
  const storage = new TestStorage(JSON.stringify([
    ...invalidRevisions.map(puzzleRevision => ({ ...legacy(), puzzleRevision })),
    { ...legacy(), levelId: 'sunseed-orchard', route: 'seedbeds' },
    { ...legacy(), levelId: 'moonbell-marsh', puzzleRevision: 1, route: 'moonbeam' },
    { ...legacy(), levelId: 'sunseed-orchard', puzzleRevision: 2, route: 'bridge', routesUsed: { bridge: true } },
    { ...legacy(), levelId: 'sunseed-orchard', puzzleRevision: 2, route: 'moonbeam' },
    { ...legacy(), levelId: 'moonbell-marsh', puzzleRevision: 2, route: 'seedbeds' },
    { ...legacy(), levelId: 'moonbell-marsh', puzzleRevision: 2, route: 'teleport' },
    { ...legacy(), levelId: 'moonbell-marsh', puzzleRevision: 2 },
  ]));
  const memories = readMemories(storage);
  expect(memories).toHaveLength(7);
  expect(Object.values(getExpeditionProgress(memories)).every(progress => !progress.completed)).toBe(true);
  expect(getCampSummary(memories).routes).toEqual([]);
  expect(storage.writes).toBe(0);
});

test('current wins need the matching rescue route and new puzzle saves cannot grant Brook crossings', () => {
  const storage = new TestStorage();
  for (const level of LEVELS) {
    const state = finishedState(level.id);
    for (const returnRoute of [null, 'bridge', 'ferry', 'seedbeds', 'moonbeam'] as const) {
      if (returnRoute === state.returnRoute || (level.id === 'bramblebrook' && returnRoute === 'bridge')) continue;
      const result = saveExpedition({ ...state, returnRoute }, storage);
      expect(result).toEqual({ saved: false, memories: [] });
    }
  }
  expect(storage.writes).toBe(0);
  const state = finishedState('sunseed-orchard');
  state.routesUsed = { bridge: true, ferry: true };
  const result = saveExpedition(state, storage);
  expect(result.saved).toBe(true);
  expect(result.memories[0].routesUsed).toEqual({ bridge: false, ferry: false });
  expect(state.routesUsed).toEqual({ bridge: true, ferry: true });
  expect(getCampSummary(result.memories).routes).toEqual(['seedbeds']);
});

test('retention counts historical postcards too and never resurrects an evicted current completion', () => {
  const storage = new TestStorage();
  saveExpedition(finishedState('sunseed-orchard'), storage);
  const current = readMemories(storage)[0];
  storage.value = JSON.stringify([current, ...Array.from({ length: 20 }, (_, index) => ({
    ...legacy(index), version: 3, levelId: 'sunseed-orchard', route: 'bridge',
  })), { ...legacy(), puzzleRevision: 99 }]);
  const memories = readMemories(storage);
  expect(memories).toHaveLength(20);
  expect(memories.every(memory => memory.puzzleRevision === 1)).toBe(true);
  expect(getExpeditionProgress(memories)['sunseed-orchard'].completed).toBe(false);
  const result = saveExpedition(finishedState('moonbell-marsh'), storage);
  expect(result.memories).toHaveLength(20);
  expect(result.memories[0].seconds).toBe(1);
  expect(getExpeditionProgress(result.memories)['moonbell-marsh'].completions).toBe(1);
  expect(getExpeditionProgress(result.memories)['sunseed-orchard'].completions).toBe(0);
});
