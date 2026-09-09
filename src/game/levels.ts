export type LevelId = 'bramblebrook' | 'sunseed-orchard' | 'moonbell-marsh';
export type TargetId = 'bridge' | 'bloom' | 'gate' | 'traveler' | 'camp' | 'leaf' | 'dockWest' | 'dockEast' | 'podBerry' | 'podSun' | 'source' | 'mirrorA' | 'mirrorB' | 'mirrorC' | 'rootReceiver' | 'exitReceiver';
export type FerrySide = 'west' | 'east';
export type RouteId = 'bridge' | 'ferry' | 'seedbeds' | 'moonbeam';
export type Cardinal = 'north' | 'east' | 'south' | 'west';
export interface Point { x: number; z: number }
export interface Cell { column: number; row: number }
export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface LevelDefinition {
  id: LevelId;
  number: number;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  introTitle: string;
  introText: string;
  puzzle: 'brook' | 'seed-pods' | 'moonbeam';
  puzzleRevision: 1 | 2;
  theme: 'brook' | 'orchard' | 'marsh';
  spawn: Point;
  targets: Record<TargetId, Point>;
  supportedTargets: readonly TargetId[];
  keepsakes: readonly Point[];
  ferryKeepsakeIndex: number;
  ferryDocks: Record<FerrySide, Point>;
  ferryCenters: Record<FerrySide, Point>;
  layout: { bounds: Bounds; river: { minX: number; maxX: number }; bridge: { minZ: number; maxZ: number }; garden: Bounds; pen: Bounds; floors?: readonly Bounds[]; solids?: readonly Bounds[]; exitBarrier?: Bounds };
  nextId: LevelId | null;
}

const commonTargets: Record<TargetId, Point> = {
  bridge: { x: -2.5, z: 2.5 }, bloom: { x: 5, z: 1 }, gate: { x: 5, z: -1.5 },
  traveler: { x: 7, z: -4 }, camp: { x: -7, z: 3.5 }, leaf: { x: -2.3, z: -2.5 },
  dockWest: { x: -2.3, z: -2.5 }, dockEast: { x: 2.3, z: -2.5 },
  podBerry: { x: -1.8, z: -1.8 }, podSun: { x: 1.8, z: 1.8 },
  source: { x: -6, z: -3.2 }, mirrorA: { x: -2.4, z: -3.2 }, mirrorB: { x: -2.4, z: 2.4 }, mirrorC: { x: 3.2, z: 2.4 },
  rootReceiver: { x: -6, z: 2.4 }, exitReceiver: { x: 3.2, z: -3.2 },
};
const commonSupported: TargetId[] = ['bridge', 'bloom', 'gate', 'traveler', 'camp', 'leaf', 'dockWest', 'dockEast'];
const bounds = { minX: -8.6, maxX: 8.6, minZ: -5.6, maxZ: 5.6 };
const river = { minX: -1.5, maxX: 1.5 };
const garden = { minX: 1.5, maxX: 8.6, minZ: -.35, maxZ: .35 };
const pen = { minX: 6, maxX: 8.5, minZ: -5, maxZ: -3 };
type LevelCopy = Pick<LevelDefinition, 'id' | 'number' | 'name' | 'title' | 'subtitle' | 'description' | 'introTitle' | 'introText' | 'puzzle' | 'theme' | 'nextId'>;

function defineLevel(copy: LevelCopy, bridgeZ: number, ferryZ: number): LevelDefinition {
  const targets = { ...commonTargets, bridge: { x: -2.5, z: bridgeZ },
    leaf: { x: -2.3, z: ferryZ }, dockWest: { x: -2.3, z: ferryZ }, dockEast: { x: 2.3, z: ferryZ } };
  return {
    ...copy, puzzleRevision: 1, spawn: { x: -6, z: 2.5 }, targets, supportedTargets: commonSupported,
    keepsakes: [{ x: 7, z: 1.2 }, { x: 0, z: ferryZ }, { x: 3, z: -4.4 }], ferryKeepsakeIndex: 1,
    ferryDocks: { west: targets.dockWest, east: targets.dockEast },
    ferryCenters: { west: { x: -.6, z: ferryZ }, east: { x: .6, z: ferryZ } },
    layout: { bounds, river, garden, pen, bridge: { minZ: bridgeZ - .8, maxZ: bridgeZ + .8 } },
  };
}

export const ORCHARD_BOARD = {
  columns: 7, rows: 5, cellSize: 1.8, origin: { x: -5.4, z: -3.6 },
  walls: [{ column: 3, row: 1 }, { column: 3, row: 2 }, { column: 2, row: 4 }],
  starts: [{ column: 2, row: 1 }, { column: 4, row: 3 }],
  beds: [{ column: 5, row: 1 }, { column: 5, row: 3 }],
  entry: { column: 0, row: 3 }, exit: { column: 6, row: 0 },
} as const;
export function orchardPoint(cell: Cell): Point {
  return { x: ORCHARD_BOARD.origin.x + cell.column * ORCHARD_BOARD.cellSize, z: ORCHARD_BOARD.origin.z + cell.row * ORCHARD_BOARD.cellSize };
}
export const MOONBEAM_LAYOUT = {
  source: commonTargets.source,
  mirrors: [commonTargets.mirrorA, commonTargets.mirrorB, commonTargets.mirrorC],
  rootReceiver: commonTargets.rootReceiver, exitReceiver: commonTargets.exitReceiver,
  connector: { minX: -1.5, maxX: 2.1, minZ: 1.6, maxZ: 3.2 },
} as const;

export const LEVELS: readonly LevelDefinition[] = [
  defineLevel({ id: 'bramblebrook', number: 1, name: 'Bramblebrook', title: 'Two ways home',
    subtitle: 'Little talents. Unexpected possibilities.', description: 'Find two ways across a sunlit brook.',
    introTitle: 'One little friend. More than one way.',
    introText: 'A traveler is stranded across the brook. A loose log, a curled leaf, and three little talents might be all you need.',
    puzzle: 'brook', theme: 'brook', nextId: 'sunseed-orchard' }, 2.5, -2.5),
  { ...defineLevel({ id: 'sunseed-orchard', number: 2, name: 'Sunseed Orchard', title: 'Make room to grow',
    subtitle: 'A small detour can open the way.', description: 'Push two seed pods through a hedge puzzle into their matching beds.',
    introTitle: 'Two seed pods. One tight corner.',
    introText: 'Help Kibo push the berry and sun pods onto their matching beds. Stand behind a pod to push it one square. Bing waters each planted pod; Pomodoro grows it. Sometimes a pod must move away from home first. Undo is always there for a rethink.',
    puzzle: 'seed-pods', theme: 'orchard', nextId: 'moonbell-marsh' }, 0, 0),
    puzzleRevision: 2, spawn: { x: -7.3, z: 2.8 },
    targets: { ...commonTargets, camp: { x: -7.3, z: 3.4 }, traveler: { x: 7.5, z: -3.8 } },
    supportedTargets: ['podBerry', 'podSun', 'traveler', 'camp'],
    keepsakes: [{ x: -5.4, z: 3.6 }, { x: 5.4, z: 3.6 }, { x: 7.5, z: -4.8 }], ferryKeepsakeIndex: -1,
    layout: { bounds, river, garden, pen, bridge: { minZ: 0, maxZ: 0 },
      floors: [{ minX: -6.3, maxX: 6.3, minZ: -4.5, maxZ: 4.5 }, { minX: -8.5, maxX: -6.2, minZ: -5.2, maxZ: 5.2 }, { minX: 6.2, maxX: 8.5, minZ: -5.2, maxZ: -2.7 }],
      solids: [{ minX: -6.45, maxX: -6.2, minZ: -4.5, maxZ: .85 }, { minX: -6.45, maxX: -6.2, minZ: 2.75, maxZ: 4.5 }, { minX: 6.2, maxX: 6.45, minZ: -2.7, maxZ: 4.5 }],
      exitBarrier: { minX: 6.15, maxX: 6.55, minZ: -5.2, maxZ: -2.7 } } },
  { ...defineLevel({ id: 'moonbell-marsh', number: 3, name: 'Moonbell Marsh', title: 'Borrow the moonlight',
    subtitle: 'One beam. Two places that need it.', description: 'Redirect a live moonbeam, anchor a path, then send the light onward.',
    introTitle: 'Light the roots. Keep the path.',
    introText: 'Bing can wake the moonwell. Kibo turns each mirror to redirect its beam. First light the root flower so Pomodoro can grow a permanent path. Then borrow that light for the far lantern. Watch where the beam goes after every turn.',
    puzzle: 'moonbeam', theme: 'marsh', nextId: null }, 0, 0),
    puzzleRevision: 2, spawn: { x: -7, z: 3.6 },
    targets: { ...commonTargets, camp: { x: -7, z: 3.6 }, traveler: { x: 5, z: -4.1 } },
    supportedTargets: ['source', 'mirrorA', 'mirrorB', 'mirrorC', 'rootReceiver', 'exitReceiver', 'traveler', 'camp'],
    keepsakes: [{ x: -7.1, z: -4.4 }, { x: -2.4, z: 3.1 }, { x: 5, z: -3 }], ferryKeepsakeIndex: -1,
    layout: { bounds, river, garden, pen, bridge: { minZ: 0, maxZ: 0 },
      floors: [{ minX: -8.3, maxX: -4.5, minZ: .8, maxZ: 5.2 }, { minX: -7.6, maxX: -.8, minZ: -5.2, maxZ: -1.9 }, { minX: -7.6, maxX: -5.3, minZ: -2.5, maxZ: 1.4 }, { minX: -3.5, maxX: -1.3, minZ: -2.4, maxZ: 3.6 }, { minX: 1.9, maxX: 4.5, minZ: 1.2, maxZ: 3.7 }, { minX: 2.5, maxX: 3.9, minZ: -2.4, maxZ: 1.4 }, { minX: 1.5, maxX: 6, minZ: -5.2, maxZ: -2.2 }],
      solids: [], exitBarrier: { minX: 2.4, maxX: 4, minZ: -.1, maxZ: .4 } } },
];

export function isLevelId(value: unknown): value is LevelId { return LEVELS.some(level => level.id === value); }
export function getLevel(id: LevelId): LevelDefinition { return LEVELS.find(level => level.id === id) ?? LEVELS[0]; }
