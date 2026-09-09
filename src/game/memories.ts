import type { CompanionId, RescueState } from './rescue';
import type { TalentId } from './traits';
import { LEVELS, getLevel, isLevelId, type LevelDefinition, type LevelId, type RouteId } from './levels';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Memory {
  levelId: LevelId;
  puzzleRevision: 1 | 2;
  date: string;
  seconds: number;
  keepsakes: number;
  crew: string[];
  route: RouteId | null;
  routesUsed: { bridge: boolean; ferry: boolean };
  talent: TalentId | null;
  contributions: Record<CompanionId, string[]>;
}

const STORAGE_KEY = 'rescue-club-postcards';
const MAX_MEMORIES = 20;
const COMPANION_IDS: readonly CompanionId[] = ['kibo', 'pomodoro', 'bing'];
const CREW_NAMES = ['Kibo', 'Pomodoro', 'Bing'];
const ROUTES: readonly RouteId[] = ['bridge', 'ferry', 'seedbeds', 'moonbeam'];

function isRouteId(value: unknown): value is RouteId {
  return ROUTES.some(route => route === value);
}

function matchesPuzzleRoute(level: LevelDefinition, route: RouteId | null): boolean {
  if (level.puzzle === 'seed-pods') return route === 'seedbeds';
  if (level.puzzle === 'moonbeam') return route === 'moonbeam';
  return route === 'bridge' || route === 'ferry';
}

function recordedRoutes(history: Memory[]): RouteId[] {
  return ROUTES.filter(route => history.some(memory => {
    if (route === 'bridge' || route === 'ferry') {
      return memory.puzzleRevision === 1 && (memory.route === route || memory.routesUsed[route]);
    }
    return memory.puzzleRevision === getLevel(memory.levelId).puzzleRevision
      && memory.route === route && matchesPuzzleRoute(getLevel(memory.levelId), route);
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const strings = value.slice(0, limit).filter((item): item is string =>
    typeof item === 'string' && item.length <= 200 && item.trim().length > 0);
  return [...new Set(strings.map(item => item.trim()))];
}

function normalizeMemory(value: unknown): Memory | null {
  if (!isRecord(value) || typeof value.date !== 'string' || value.date.length > 200
    || !Number.isFinite(Date.parse(value.date))
    || typeof value.seconds !== 'number' || !Number.isFinite(value.seconds)
    || value.seconds < 0 || value.seconds > Number.MAX_SAFE_INTEGER
    || typeof value.keepsakes !== 'number' || !Number.isInteger(value.keepsakes)
    || value.keepsakes < 0 || value.keepsakes > 3) return null;

  const levelId = Object.hasOwn(value, 'levelId') ? value.levelId : 'bramblebrook';
  if (!isLevelId(levelId)) return null;
  const puzzleRevision = Object.hasOwn(value, 'puzzleRevision') ? value.puzzleRevision : 1;
  if (puzzleRevision !== 1 && puzzleRevision !== 2) return null;
  const routes = isRecord(value.routesUsed) ? value.routesUsed : {};
  const contributions = isRecord(value.contributions) ? value.contributions : {};
  return {
    levelId,
    puzzleRevision,
    date: value.date,
    seconds: value.seconds,
    keepsakes: value.keepsakes,
    crew: value.crew === undefined ? [...CREW_NAMES] : boundedStrings(value.crew, 3),
    route: isRouteId(value.route) ? value.route : null,
    routesUsed: { bridge: routes.bridge === true, ferry: routes.ferry === true },
    talent: value.talent === 'root' || value.talent === 'float' ? value.talent : null,
    contributions: {
      kibo: boundedStrings(contributions.kibo, 20),
      pomodoro: boundedStrings(contributions.pomodoro, 20),
      bing: boundedStrings(contributions.bing, 20),
    },
  };
}

function parseMemories(serialized: string | null): Memory[] {
  try {
    const value: unknown = JSON.parse(serialized ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.map(normalizeMemory).filter((memory): memory is Memory => memory !== null).slice(-MAX_MEMORIES);
  } catch {
    return [];
  }
}

/** Read legacy and current postcards without exposing storage failures to play. */
export function readMemories(storage?: StorageLike): Memory[] {
  try {
    const target = storage ?? globalThis.localStorage;
    return parseMemories(target.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Persist only completed expeditions; failed writes never grant unsaved rewards. */
export function saveExpedition(state: RescueState, storage?: StorageLike): { saved: boolean; memories: Memory[] } {
  if (state.phase !== 'won') return { saved: false, memories: readMemories(storage) };
  let memories: Memory[] = [];
  try {
    const target = storage ?? globalThis.localStorage;
    memories = parseMemories(target.getItem(STORAGE_KEY));
    if (!isLevelId(state.levelId)) return { saved: false, memories };
    const level = getLevel(state.levelId);
    if (!matchesPuzzleRoute(level, state.returnRoute)) return { saved: false, memories };
    const memory = normalizeMemory({
      levelId: state.levelId,
      puzzleRevision: level.puzzleRevision,
      date: new Date().toISOString(),
      seconds: Math.round(state.elapsed),
      keepsakes: state.keepsakes.filter(kept => kept === true).length,
      crew: CREW_NAMES,
      route: state.returnRoute,
      routesUsed: level.puzzle === 'brook' ? state.routesUsed : { bridge: false, ferry: false },
      talent: state.talent,
      contributions: state.contributions,
    });
    if (!memory) return { saved: false, memories };
    const next = [...memories, memory].slice(-MAX_MEMORIES);
    target.setItem(STORAGE_KEY, JSON.stringify(next.map(entry => ({ version: 4, ...entry }))));
    return { saved: true, memories: next };
  } catch {
    return { saved: false, memories };
  }
}

export function getCampSummary(memories?: Memory[]): {
  keepsakes: number;
  visitor: boolean;
  routes: RouteId[];
  contributionCounts: Record<CompanionId, number>;
} {
  const history = (memories ?? readMemories()).map(normalizeMemory)
    .filter((memory): memory is Memory => memory !== null).slice(-MAX_MEMORIES);
  const contributionCounts: Record<CompanionId, number> = { kibo: 0, pomodoro: 0, bing: 0 };
  let keepsakes = 0;
  for (const memory of history) {
    keepsakes = Math.max(keepsakes, memory.keepsakes);
    for (const id of COMPANION_IDS) contributionCounts[id] += memory.contributions[id].length;
  }
  return { keepsakes, visitor: history.length > 0, routes: recordedRoutes(history), contributionCounts };
}

/** Current-puzzle completion reflects the latest twenty valid postcards, not lifetime totals. */
export function getExpeditionProgress(memories?: Memory[]): Record<LevelId, {
  completed: boolean;
  completions: number;
  bestKeepsakes: number;
  routes: RouteId[];
}> {
  const history = (memories ?? readMemories()).map(normalizeMemory)
    .filter((memory): memory is Memory => memory !== null).slice(-MAX_MEMORIES);
  return Object.fromEntries(LEVELS.map(level => {
    const expeditions = history.filter(memory => memory.levelId === level.id
      && memory.puzzleRevision === level.puzzleRevision
      && (matchesPuzzleRoute(level, memory.route) || (level.puzzle === 'brook' && memory.route === null)));
    return [level.id, {
      completed: expeditions.length > 0,
      completions: expeditions.length,
      bestKeepsakes: expeditions.reduce((best, memory) => Math.max(best, memory.keepsakes), 0),
      routes: recordedRoutes(expeditions),
    }];
  })) as Record<LevelId, { completed: boolean; completions: number; bestKeepsakes: number; routes: RouteId[] }>;
}
