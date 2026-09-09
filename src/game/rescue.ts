import type { TalentId } from './traits';
import { getLevel, isLevelId, MOONBEAM_LAYOUT, ORCHARD_BOARD, orchardPoint, type Cardinal, type FerrySide, type LevelDefinition, type LevelId, type Point, type RouteId, type TargetId } from './levels';
import { actOnPod, createOrchardState, podOnBed } from './orchard';
import { createMoonbeamState, traceMoonbeam } from './moonbeam';
import type { MoonbeamState, MoonbeamView, OrchardState } from './puzzle-types';
export type { TalentId } from './traits';
export type { Cardinal, FerrySide, LevelDefinition, LevelId, Point, RouteId, TargetId } from './levels';

export type CompanionId = 'kibo' | 'pomodoro' | 'bing';
export interface FerryTransport {
  from: FerrySide;
  to: FerrySide;
  phase: 'boarding' | 'sailing' | 'landing';
  progress: number;
  empty: boolean;
}

export interface RescueState {
  levelId: LevelId;
  phase: 'intro' | 'playing' | 'paused' | 'won';
  active: CompanionId;
  position: Point;
  logRolled: boolean;
  bridge: boolean;
  bloom: boolean;
  leafGrown: boolean;
  leafLaunched: boolean;
  gate: boolean;
  rescued: boolean;
  orchard: OrchardState;
  moonbeam: MoonbeamState;
  navigationRevision: number;
  talent: TalentId;
  ferryProgress: number;
  ferrySide: FerrySide;
  transport: FerryTransport | null;
  routesUsed: { bridge: boolean; ferry: boolean };
  returnRoute: RouteId | null;
  contributions: Record<CompanionId, string[]>;
  keepsakes: boolean[];
  elapsed: number;
  actions: number;
  message: string;
}

export interface InteractionResult {
  success: boolean;
  kind: string;
  message: string;
}

const DEFAULT_LEVEL = getLevel('bramblebrook');
export const TARGETS = DEFAULT_LEVEL.targets;
export const FERRY_DOCKS = DEFAULT_LEVEL.ferryDocks;
export const FERRY_CENTERS = DEFAULT_LEVEL.ferryCenters;
export const KEEPSAKES = DEFAULT_LEVEL.keepsakes;

const SPEED = 4;
const ACTION_RANGE = 1.4;
const CAMP_RANGE = 1.6;
const PICKUP_RANGE = 0.7;
const BODY_RADIUS = 0.18;
const GRID_STEP = 0.25;
const NEIGHBORS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
] as const;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function frameDelta(dt: number): number {
  return Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
}

function initialState(level: LevelDefinition, phase: RescueState['phase'], talent: TalentId = 'root'): RescueState {
  return {
    levelId: level.id,
    phase,
    active: 'kibo',
    position: { ...level.spawn },
    logRolled: false,
    bridge: false,
    bloom: false,
    leafGrown: false,
    leafLaunched: false,
    gate: false,
    rescued: false,
    orchard: createOrchardState(),
    moonbeam: createMoonbeamState(),
    navigationRevision: 0,
    talent,
    ferryProgress: 0,
    ferrySide: 'west',
    transport: null,
    routesUsed: { bridge: false, ferry: false },
    returnRoute: null,
    contributions: { kibo: [], pomodoro: [], bing: [] },
    keepsakes: level.keepsakes.map(() => false),
    elapsed: 0,
    actions: 0,
    message: level.introText,
  };
}

/** The island rules own one squad position; rendering supplies the followers. */
export class RescueGame {
  readonly state: RescueState;
  private activeLevel: LevelDefinition;
  private path: Point[] = [];
  private lastShore: FerrySide = 'west';
  private boardingStart: Point;
  private hintContext = '';
  private hintLevel = 0;
  private undoHistory: RescueState[] = [];

  constructor(levelId: LevelId = 'bramblebrook') {
    this.activeLevel = getLevel(levelId);
    this.state = initialState(this.level, 'intro');
    this.boardingStart = { ...this.state.position };
  }

  get level(): LevelDefinition { return this.activeLevel; }
  get targets(): LevelDefinition['targets'] {
    return this.level.puzzle === 'seed-pods' ? { ...this.level.targets,
      podBerry: orchardPoint(this.state.orchard.pods[0]), podSun: orchardPoint(this.state.orchard.pods[1]) } : this.level.targets;
  }
  get keepsakes(): LevelDefinition['keepsakes'] { return this.level.keepsakes; }
  get ferryDocks(): LevelDefinition['ferryDocks'] { return this.level.ferryDocks; }
  get ferryCenters(): LevelDefinition['ferryCenters'] { return this.level.ferryCenters; }
  private get gridMinX(): number { return Math.ceil(this.level.layout.bounds.minX / GRID_STEP) * GRID_STEP; }
  private get gridMinZ(): number { return Math.ceil(this.level.layout.bounds.minZ / GRID_STEP) * GRID_STEP; }
  private get gridWidth(): number { return Math.floor((this.level.layout.bounds.maxX - this.gridMinX) / GRID_STEP) + 1; }
  private get gridHeight(): number { return Math.floor((this.level.layout.bounds.maxZ - this.gridMinZ) / GRID_STEP) + 1; }

  get canUndoPuzzle(): boolean {
    return this.level.puzzle !== 'brook' && this.state.phase === 'playing'
      && !this.state.rescued && !this.state.transport && this.undoHistory.length > 0;
  }

  getMoonbeamView(): MoonbeamView { return traceMoonbeam(this.state.moonbeam); }

  getActionRange(target: TargetId): number {
    return target === 'podBerry' || target === 'podSun' ? 2.05 : ACTION_RANGE;
  }

  getTargetLabel(target: TargetId): string {
    if (this.level.puzzle === 'brook') {
      const brookLabels: Partial<Record<TargetId, string>> = {
        bridge: this.state.logRolled ? 'Unsteady log' : 'Loose log',
        leaf: this.state.leafGrown ? 'A giant leaf' : 'Curled leaf', bloom: 'Sleeping garden', gate: 'Waterwheel',
        dockWest: 'Ferry dock', dockEast: 'Ferry dock', traveler: 'A little help?', camp: 'Home, together',
      };
      if (brookLabels[target]) return brookLabels[target]!;
    }
    const labels: Record<TargetId, string> = { bridge: 'Loose log', bloom: 'Curled garden', gate: 'Waterwheel',
      traveler: 'Traveler', camp: 'Camp', leaf: 'Curled leaf', dockWest: 'West dock', dockEast: 'East dock',
      podBerry: 'Berry pod', podSun: 'Sun pod', source: 'Moonwell', mirrorA: 'Mirror A', mirrorB: 'Mirror B',
      mirrorC: 'Mirror C', rootReceiver: 'Root flower', exitReceiver: 'Far lantern' };
    return labels[target];
  }

  getApproachPoint(target: TargetId, side?: Cardinal): Point | null {
    if (!this.level.supportedTargets.includes(target)) return null;
    const point = this.targets[target];
    if (target !== 'podBerry' && target !== 'podSun') return this.isWalkable(point.x, point.z) ? { ...point } : null;
    const offsets: Record<Cardinal, Point> = { north: { x: 0, z: -1.8 }, east: { x: 1.8, z: 0 },
      south: { x: 0, z: 1.8 }, west: { x: -1.8, z: 0 } };
    const candidates = (side ? [side] : Object.keys(offsets) as Cardinal[])
      .map(direction => ({ x: point.x + offsets[direction].x, z: point.z + offsets[direction].z }))
      .filter(candidate => this.isWalkable(candidate.x, candidate.z))
      .sort((a, b) => distance(a, this.state.position) - distance(b, this.state.position));
    return candidates[0] ?? null;
  }

  undoPuzzle(): boolean {
    if (!this.canUndoPuzzle) return false;
    const elapsed = this.state.elapsed;
    const talent = this.state.talent;
    const active = this.state.active;
    const revision = this.state.navigationRevision + 1;
    Object.assign(this.state, this.undoHistory.pop()!, { elapsed, talent, active, navigationRevision: revision });
    this.path = [];
    this.hintContext = '';
    this.state.message = 'One experiment undone. Try a different approach.';
    return true;
  }

  /** A connected, collision-tested trail for reseeding followers after a teleport or undo. */
  getFormationTrail(length = 4.8): Point[] {
    const trail: Point[] = [{ ...this.state.position }];
    if (!Number.isFinite(length) || length <= 0 || !this.isWalkable(this.state.position.x, this.state.position.z)) return trail;
    const start = this.nearestGridNode(this.state.position);
    if (start === null) return trail;
    const queue = [start];
    const parents = new Map<number, number>([[start, -1]]);
    const lengths = new Map<number, number>([[start, distance(this.state.position, this.gridPoint(start))]]);
    let end = start;
    for (let index = 0; index < queue.length; index += 1) {
      const node = queue[index];
      if (lengths.get(node)! > lengths.get(end)!) end = node;
      if (lengths.get(node)! >= Math.min(length, 12)) { end = node; break; }
      const point = this.gridPoint(node);
      for (const [dx, dz] of NEIGHBORS.slice(0, 4)) {
        const column = node % this.gridWidth + dx;
        const row = Math.floor(node / this.gridWidth) + dz;
        if (column < 0 || column >= this.gridWidth || row < 0 || row >= this.gridHeight) continue;
        const next = row * this.gridWidth + column;
        if (parents.has(next) || !this.segmentWalkable(point, this.gridPoint(next))) continue;
        parents.set(next, node);
        lengths.set(next, lengths.get(node)! + GRID_STEP);
        queue.push(next);
      }
    }
    const points: Point[] = [];
    for (let node = end; node !== -1; node = parents.get(node)!) points.push(this.gridPoint(node));
    return [...trail, ...points.reverse().filter(point => distance(point, trail[0]) > 1e-8)];
  }

  loadLevel(levelId: LevelId): boolean {
    if (!isLevelId(levelId) || this.state.transport) return false;
    this.activeLevel = getLevel(levelId);
    this.resetExpedition('intro');
    return true;
  }

  start(): void {
    if (this.state.phase !== 'intro') return;
    this.state.phase = 'playing';
    this.state.message = this.getObjective();
  }

  select(id: CompanionId): void {
    if (this.state.phase !== 'playing' || this.state.transport || !['kibo', 'pomodoro', 'bing'].includes(id)) return;
    this.state.active = id;
  }

  setTalent(id: TalentId): boolean {
    if ((id !== 'root' && id !== 'float') || this.state.transport) return false;
    if (this.state.phase !== 'intro' && !this.atCamp()) {
      this.state.message = 'Field lessons are chosen back at camp.';
      return false;
    }
    this.state.talent = id;
    if (this.level.puzzle !== 'brook') {
      this.state.message = 'Field lesson saved for Bramblebrook. This island has its own puzzle to explore.';
      return true;
    }
    this.state.message = id === 'root'
      ? 'Rose Bud lesson: rooting the log also wakes the garden.'
      : 'Watering Can lesson: growing the leaf also floats it into place.';
    return true;
  }

  resetConstructions(): boolean {
    if (this.state.transport || this.state.phase === 'won' || !this.atCamp()) {
      this.state.message = 'Return to camp before rearranging the trail.';
      return false;
    }
    if (this.level.puzzle !== 'brook') {
      if (this.state.phase !== 'playing' || this.state.rescued) return false;
      this.resetExpedition('playing');
      this.state.message = 'The puzzle is ready for a fresh approach.';
      return true;
    }
    this.path = [];
    Object.assign(this.state, { logRolled: false, bridge: false, bloom: false, leafGrown: false,
      leafLaunched: false, gate: false,
      ferryProgress: 0, ferrySide: 'west', transport: null });
    this.lastShore = 'west';
    this.undoHistory = [];
    this.state.navigationRevision += 1;
    this.hintContext = '';
    this.hintLevel = 0;
    this.state.message = 'A fresh trail to experiment with. Your keepsakes and shared memories stay with you.';
    return true;
  }

  pause(): void {
    if (this.state.phase === 'playing') this.state.phase = 'paused';
  }

  resume(): void {
    if (this.state.phase === 'paused') this.state.phase = 'playing';
  }

  restart(): void {
    this.resetExpedition('playing');
    this.state.message = this.getObjective();
  }

  private resetExpedition(phase: RescueState['phase']): void {
    this.path = [];
    this.undoHistory = [];
    const revision = this.state.navigationRevision + 1;
    Object.assign(this.state, initialState(this.level, phase, this.state.talent));
    this.state.navigationRevision = revision;
    this.lastShore = 'west';
    this.boardingStart = { ...this.state.position };
    this.hintContext = '';
    this.hintLevel = 0;
  }

  isWalkable(x: number, z: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const { bounds, river, bridge, garden, pen } = this.level.layout;
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return false;

    if (this.level.puzzle !== 'brook') {
      const inside = (point: Point, box: { minX: number; maxX: number; minZ: number; maxZ: number }, margin = 0) =>
        point.x >= box.minX - margin && point.x <= box.maxX + margin
        && point.z >= box.minZ - margin && point.z <= box.maxZ + margin;
      const floors = [...this.level.layout.floors!];
      if (this.level.puzzle === 'moonbeam' && this.state.moonbeam.rooted) floors.push(MOONBEAM_LAYOUT.connector);
      // Test the union, so overlapping authored patches remain connected at their seams.
      for (const [dx, dz] of [[0, 0], [-BODY_RADIUS, -BODY_RADIUS], [BODY_RADIUS, -BODY_RADIUS],
        [-BODY_RADIUS, BODY_RADIUS], [BODY_RADIUS, BODY_RADIUS]]) {
        if (!floors.some(floor => inside({ x: x + dx, z: z + dz }, floor))) return false;
      }
      if (this.level.layout.solids?.some(solid => inside({ x, z }, solid, BODY_RADIUS))) return false;
      if (!this.state.gate && this.level.layout.exitBarrier && inside({ x, z }, this.level.layout.exitBarrier, BODY_RADIUS)) return false;
      if (this.level.puzzle === 'seed-pods') {
        for (const cell of ORCHARD_BOARD.walls) {
          const point = orchardPoint(cell);
          if (Math.abs(x - point.x) <= .9 + BODY_RADIUS && Math.abs(z - point.z) <= .9 + BODY_RADIUS) return false;
        }
        for (const cell of this.state.orchard.pods) {
          const point = orchardPoint(cell);
          if (Math.abs(x - point.x) < .72 + BODY_RADIUS && Math.abs(z - point.z) < .72 + BODY_RADIUS) return false;
        }
      }
      return true;
    }

    if (x > river.minX - BODY_RADIUS && x < river.maxX + BODY_RADIUS) {
      return this.state.bridge && z >= bridge.minZ + BODY_RADIUS && z <= bridge.maxZ - BODY_RADIUS;
    }
    if (!this.state.bloom && x >= garden.minX && x <= garden.maxX
      && z >= garden.minZ - BODY_RADIUS && z <= garden.maxZ + BODY_RADIUS) {
      return false;
    }
    if (!this.state.gate && x >= pen.minX - BODY_RADIUS && x <= pen.maxX + BODY_RADIUS
      && z >= pen.minZ - BODY_RADIUS && z <= pen.maxZ + BODY_RADIUS) {
      return false;
    }
    return true;
  }

  /** Keyboard/joystick movement cancels navigation only when input is nonzero. */
  move(dx: number, dz: number, dt: number): void {
    if (this.state.phase !== 'playing' || this.state.transport || !Number.isFinite(dx) || !Number.isFinite(dz)) return;
    const magnitude = Math.hypot(dx, dz);
    if (magnitude === 0) return;
    this.path = [];
    const scale = SPEED * frameDelta(dt) / Math.max(1, magnitude);
    this.moveBy(dx * scale, dz * scale);
    this.trackBridgeCrossing();
    this.collectKeepsakes();
  }

  /** Find a legal route through the current island, including the log crossing. */
  moveTo(destination: Point): boolean {
    if (this.state.phase !== 'playing' || this.state.transport) return false;
    this.path = [];
    if (!this.isWalkable(destination.x, destination.z)) {
      this.state.message = 'That spot is blocked. Your companions can open a way.';
      return false;
    }

    const start = this.nearestGridNode(this.state.position);
    const end = this.nearestGridNode(destination);
    if (start === null || end === null) return false;

    const width = this.gridWidth;
    const height = this.gridHeight;
    const count = width * height;
    const costs = new Float64Array(count).fill(Infinity);
    const estimates = new Float64Array(count).fill(Infinity);
    const parents = new Int32Array(count).fill(-1);
    const closed = new Uint8Array(count);
    const open = [start];
    const queued = new Uint8Array(count);
    costs[start] = 0;
    estimates[start] = distance(this.gridPoint(start), this.gridPoint(end));
    queued[start] = 1;

    while (open.length > 0) {
      let best = 0;
      for (let i = 1; i < open.length; i += 1) {
        if (estimates[open[i]] < estimates[open[best]]) best = i;
      }
      const current = open[best];
      open[best] = open[open.length - 1];
      open.pop();
      queued[current] = 0;
      if (current === end) {
        const route: Point[] = [{ ...destination }];
        for (let node = end; node !== -1; node = parents[node]) route.push(this.gridPoint(node));
        route.reverse();
        this.path = route;
        this.state.message = this.getObjective();
        return true;
      }
      closed[current] = 1;
      const column = current % width;
      const row = Math.floor(current / width);
      const point = this.gridPoint(current);
      for (const [dx, dz] of NEIGHBORS) {
        const nx = column + dx;
        const nz = row + dz;
        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
        const next = nz * width + nx;
        if (closed[next]) continue;
        const nextPoint = this.gridPoint(next);
        if (!this.isWalkable(nextPoint.x, nextPoint.z)) continue;
        // Do not cut diagonally through corners of a closed pen or barrier.
        if (dx !== 0 && dz !== 0
          && (!this.isWalkable(point.x, nextPoint.z) || !this.isWalkable(nextPoint.x, point.z))) continue;
        const cost = costs[current] + GRID_STEP * (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1);
        if (cost >= costs[next]) continue;
        costs[next] = cost;
        estimates[next] = cost + distance(nextPoint, this.gridPoint(end));
        parents[next] = current;
        if (!queued[next]) {
          queued[next] = 1;
          open.push(next);
        }
      }
    }
    this.state.message = 'There is no route yet. Try your companions’ abilities nearby.';
    return false;
  }

  update(dt: number): void {
    if (this.state.phase !== 'playing') return;
    const delta = frameDelta(dt);
    this.state.elapsed += delta;
    if (this.state.transport) {
      this.updateTransport(delta);
      return;
    }
    let remaining = SPEED * delta;
    // Roundoff after reaching a waypoint must not look like blocked movement.
    while (remaining > 1e-9 && this.path.length > 0) {
      const next = this.path[0];
      const gap = distance(this.state.position, next);
      if (gap < 0.001) {
        this.path.shift();
        continue;
      }
      const step = Math.min(remaining, gap);
      const before = { ...this.state.position };
      this.moveBy((next.x - before.x) / gap * step, (next.z - before.z) / gap * step);
      this.trackBridgeCrossing();
      remaining -= step;
      if (distance(this.state.position, before) < step * 0.5) {
        this.path = [];
        break;
      }
      if (gap <= step + 0.001) this.path.shift();
    }
    this.collectKeepsakes();
  }

  getObjective(): string {
    if (this.state.phase === 'won') return 'Everyone is home! Your rescue postcard is ready.';
    if (this.state.transport) return this.state.transport.empty
      ? 'The empty ferry is coming to your bank.' : 'Stay together as the leaf carries you across.';
    if (this.state.rescued) return 'Bring your new friend back to the camp lantern.';
    if (this.state.gate) return 'The way is open. Go say hello to the stranded traveler.';
    if (this.level.puzzle === 'seed-pods') {
      return `Push each pod into its matching bed, then water and grow it. ${this.state.orchard.grown.filter(Boolean).length} of 2 plants rooted.`;
    }
    if (this.level.puzzle === 'moonbeam') {
      if (!this.state.moonbeam.powered) return 'Wake the moonwell and follow its light.';
      if (!this.state.moonbeam.rooted) return 'Guide the beam to the root flower, then grow a permanent path.';
      return 'The rooted path will stay. Redirect the beam to the far lantern.';
    }
    return 'Find a way across the brook and help the stranded traveler.';
  }

  getAvailableTargets(): TargetId[] {
    if (this.state.phase !== 'playing' || this.state.transport) return [];
    return this.level.supportedTargets.filter(id => {
      if (id === 'camp' || id === 'exitReceiver' || id.startsWith('mirror')) return true;
      if (id === 'dockWest' || id === 'dockEast') return this.state.leafLaunched;
      return !this.isComplete(id);
    });
  }

  inspect(target: TargetId): string {
    if (!this.level.supportedTargets.includes(target)) {
      this.state.message = 'There is nothing to try here on this island.';
      return this.state.message;
    }
    const pod = target === 'podBerry' ? 0 : target === 'podSun' ? 1 : null;
    const view = this.getMoonbeamView();
    const clues: Record<TargetId, string> = {
      bridge: this.state.bridge ? 'Living roots hold the log steady from bank to bank.'
        : this.state.logRolled ? 'The log reaches the far bank, but it wobbles. Something living could hold it steady.'
          : 'A loose log rests beside the brook. Its round sides could roll toward the water.',
      bloom: this.state.bloom ? 'The flowers lean aside, leaving room for a small parade.'
        : 'Tightly curled buds knot this path together. There is life waiting inside them.',
      leaf: this.state.leafLaunched ? 'A broad leaf floats beside the dock, light enough for the current to carry.'
        : this.state.leafGrown ? 'The unfurled leaf is broad and sturdy, but still rests on dry land.'
          : 'A curled leaf nestles by the water. Its veins could support much more if it grew.',
      dockWest: !this.state.leafLaunched ? 'A little boarding dock faces the empty brook.'
        : this.state.ferrySide === 'west' ? 'The leaf is here. A directed splash could carry everyone to the opposite dock.'
          : 'The leaf is across the brook. A directed splash could draw it back empty.',
      dockEast: !this.state.leafLaunched ? 'A little boarding dock faces the empty brook.'
        : this.state.ferrySide === 'east' ? 'The leaf is here. A directed splash could carry everyone to the opposite dock.'
          : 'The leaf is across the brook. A directed splash could draw it back empty.',
      gate: this.state.gate ? 'The wheel is turning and the pen stands open.'
        : 'The dry waterwheel connects to the pen. Its paddles are waiting for moving water.',
      traveler: this.state.rescued ? 'Your new friend is ready to follow the club home.'
        : this.state.gate ? 'The traveler waits along the open path, hoping for a friendly greeting.'
          : 'The traveler is safe, but the way still needs to open.',
      camp: this.state.rescued ? 'The camp lantern is lit. Everyone can rest here together.'
        : 'Camp holds your field lessons and keepsakes. It is a safe place to rethink the trail.',
      podBerry: '', podSun: '',
      source: this.state.moonbeam.powered ? 'The moonwell sends a steady beam east toward the mirrors.'
        : 'The moonwell is quiet. Its basin needs a little splash to wake the light.',
      mirrorA: 'This mirror turns the live beam through a right angle. Watch the outgoing light after each turn.',
      mirrorB: 'This mirror can send light toward the root flower or toward the far mirror.',
      mirrorC: 'This mirror can turn the beam north toward the far lantern.',
      rootReceiver: this.state.moonbeam.rooted ? 'The roots hold a permanent path. It will stay even when the beam moves.'
        : view.rootLit ? 'Moonlight fills the root flower. Its living roots are ready to grow across the gap.'
          : 'The root flower needs the live beam before its roots can grow.',
      exitReceiver: this.state.rescued ? 'The lantern stays open for your new friend to return safely.'
        : view.exitLit ? this.state.moonbeam.rooted ? 'The far lantern is lit and the rooted path is ready. The gate is open.'
          : 'The lantern catches the beam, but the root path still needs to grow.'
          : 'The far lantern opens only when the beam reaches it and the root path is anchored. It has no manual switch.',
    };
    if (pod !== null) {
      const name = pod === 0 ? 'berry' : 'sun';
      clues[target] = this.state.orchard.grown[pod] ? `The ${name} plant is rooted in its matching bed.`
        : !podOnBed(this.state.orchard, pod) ? `The ${name} pod needs the bed with its matching symbol. Stand in a neighboring square to roll it one square away from you.`
          : this.state.orchard.watered[pod] ? `The ${name} pod is watered and ready to grow.`
            : `The ${name} pod matches this bed. Its dry roots need water before they can grow.`;
    }
    this.state.message = clues[target];
    return this.state.message;
  }

  getHint(): string {
    const nearby = this.getNearbyTarget();
    const context = this.state.transport ? 'transport' : this.state.rescued ? 'home'
      : `${this.level.id}:${nearby}:${this.state.logRolled}:${this.state.leafGrown}:${JSON.stringify(this.state.orchard)}:${JSON.stringify(this.state.moonbeam)}`;
    if (context !== this.hintContext) { this.hintContext = context; this.hintLevel = 0; }
    let hints: string[];
    if (context === 'transport') hints = ['Let the crossing finish. Everyone has a place aboard.'];
    else if (context === 'home') hints = ['Follow the open path back to the camp lantern.', 'Reach camp with your new friend, then choose the welcome action.'];
    else if (this.level.puzzle === 'seed-pods') hints = [
      nearby && nearby !== 'camp' ? this.inspect(nearby) : 'The pods share a narrow row. One may need to move away from its bed to make room.',
      'Kibo pushes from the square directly behind a pod. Bing waters it on its matching bed; Pomodoro grows the watered roots.',
      'Bring the berry pod south around the hedge. Move the sun pod north to make room, then send berry east and north. Undo can recover a corner.',
    ];
    else if (this.level.puzzle === 'moonbeam') hints = [
      nearby && nearby !== 'camp' ? this.inspect(nearby) : 'The root flower and far lantern borrow the same beam. The grown path can keep what the light leaves behind.',
      !this.state.moonbeam.rooted ? 'Bing wakes the moonwell. Kibo turns A downward and B toward the root flower; Pomodoro grows the lit roots.'
        : 'Kibo can turn B toward C now. Cross the permanent roots, then turn C north toward the far lantern.',
    ];
    else if (nearby && nearby !== 'camp') {
      const experiments: Partial<Record<TargetId, string>> = {
        bridge: this.state.logRolled ? 'Try Pomodoro?s Grow to anchor the log.' : 'Try Kibo?s Push on the loose log.',
        bloom: 'Try Pomodoro?s Grow on the curled buds.',
        leaf: this.state.leafGrown ? 'Try Kibo?s Push to launch the broad leaf.' : 'Try Pomodoro?s Grow on the curled leaf.',
        dockWest: 'Use Bing?s Splash at this dock. It recalls an absent ferry or carries everyone across.',
        dockEast: 'Use Bing?s Splash at this dock. It recalls an absent ferry or carries everyone across.',
        gate: 'Try Bing?s Splash on the dry waterwheel.',
        traveler: this.state.gate ? 'Get close and greet the traveler with the action button.' : 'The nearby waterwheel opens this pen.',
      };
      hints = [this.inspect(nearby), experiments[nearby] ?? this.getObjective()];
    } else hints = ['There are two possible crossings: a loose log and a curled leaf.',
      'Experiment with Push, Grow and Splash on things beside the brook.',
      'Push then Grow the log, or Grow and launch the leaf before splashing at its dock.'];
    this.state.message = hints[Math.min(this.hintLevel++, hints.length - 1)];
    return this.state.message;
  }

  getNearbyTarget(): TargetId | null {
    if (this.state.phase !== 'playing' || this.state.transport) return null;
    let nearest: TargetId | null = null;
    let nearestDistance = Infinity;
    for (const id of this.getAvailableTargets()) {
      const gap = distance(this.state.position, this.targets[id]);
      if (gap <= this.getActionRange(id) && gap < nearestDistance) {
        nearestDistance = gap;
        nearest = id;
      }
    }
    return nearest;
  }

  interact(target?: TargetId): InteractionResult {
    const result = (success: boolean, kind: string, message: string): InteractionResult => {
      this.state.message = message;
      return { success, kind, message };
    };
    if (this.state.phase !== 'playing') return result(false, 'inactive', 'Your expedition is resting.');
    if (this.state.transport) return result(false, 'in-transit', 'Stay aboard until everyone reaches the dock.');
    const id = target ?? this.getNearbyTarget();
    if (!id) return result(false, 'no-target', 'Move closer to something that needs a helping paw.');
    if (!this.level.supportedTargets.includes(id)) return result(false, 'no-target', 'There is nothing to try here on this island.');
    if (this.isComplete(id)) return result(false, 'already-complete', 'Your friends have already helped here.');
    if (distance(this.state.position, this.targets[id]) > this.getActionRange(id)) {
      return result(false, 'out-of-range', 'Come a little closer to lend a helping paw.');
    }
    if ((id === 'traveler' && !this.state.gate) || (id === 'camp' && !this.state.rescued)
      || ((id === 'dockWest' || id === 'dockEast') && !this.state.leafLaunched)) {
      return result(false, 'locked', this.inspect(id));
    }
    if (this.level.puzzle !== 'brook' && id !== 'traveler' && id !== 'camp') return this.interactPuzzle(id);
    const companion: Partial<Record<TargetId, CompanionId>> = {
      bridge: this.state.logRolled ? 'pomodoro' : 'kibo',
      bloom: 'pomodoro',
      leaf: this.state.leafGrown ? 'kibo' : 'pomodoro',
      gate: 'bing', dockWest: 'bing', dockEast: 'bing',
    };
    if (companion[id] && this.state.active !== companion[id]) {
      return result(false, 'wrong-companion', `That experiment leaves things as they were. ${this.inspect(id)}`);
    }

    this.state.actions += 1;
    if (id === 'bridge') {
      if (!this.state.logRolled) {
        this.state.logRolled = true;
        this.contribute('kibo', 'Rolled the log across the brook.');
        return result(true, id, 'The log rolls into place! It reaches across, but still needs firm roots.');
      }
      this.state.bridge = true;
      this.contribute('pomodoro', 'Rooted the log into a steady bridge.');
      if (this.state.talent === 'root' && !this.state.bloom) {
        this.state.bloom = true;
        this.contribute('pomodoro', 'Awakened the garden with Rose Bud roots.');
        return result(true, id, 'Roots hug the bridge and travel into the garden. Two paths bloom from one Grow!');
      }
      return result(true, id, 'Living roots hold the log steady. Everyone can cross now.');
    }
    if (id === 'bloom') {
      this.state.bloom = true;
      this.contribute('pomodoro', 'Opened the garden with a gentle Grow.');
      return result(true, id, 'The curled buds stretch into flowers and open a path.');
    }
    if (id === 'leaf') {
      if (!this.state.leafGrown) {
        this.state.leafGrown = true;
        this.contribute('pomodoro', 'Grew a broad leaf ferry.');
        if (this.state.talent === 'float') {
          this.state.leafLaunched = true;
          this.contribute('pomodoro', 'Floated the leaf with Watering Can training.');
          return result(true, id, 'The leaf unfurls and floats into place. One Grow, ready to go!');
        }
        return result(true, id, 'A broad leaf unfurls. It could carry the club if it reached the water.');
      }
      this.state.leafLaunched = true;
      this.contribute('kibo', 'Pushed the leaf ferry into the brook.');
      return result(true, id, 'One gentle push launches the leaf beside the west dock.');
    }
    if (id === 'dockWest' || id === 'dockEast') {
      const side: FerrySide = id === 'dockWest' ? 'west' : 'east';
      this.startTransport(side);
      return result(true, id, this.state.transport!.empty
        ? 'A guiding splash calls the empty leaf back to this bank.'
        : 'All aboard! A bright splash sends the leaf toward the far dock.');
    }
    if (id === 'gate') {
      this.state.gate = true;
      this.contribute('bing', 'Turned the waterwheel and opened the rescue pen.');
      return result(true, id, 'Splash! The wheel turns and the pen opens.');
    }
    if (id === 'traveler') {
      this.state.rescued = true;
      this.undoHistory = [];
      this.contribute(this.state.active, 'Welcomed the stranded traveler into the club.');
      return result(true, id, 'A new friend joins your little parade. Find a way home together.');
    }
    if (this.level.puzzle !== 'brook') this.state.returnRoute = this.level.puzzle === 'seed-pods' ? 'seedbeds' : 'moonbeam';
    this.state.phase = 'won';
    this.path = [];
    this.contribute(this.state.active, 'Welcomed everyone home at the camp lantern.');
    return result(true, 'camp', 'Home together. Your experiments made a little difference.');
  }

  private interactPuzzle(id: TargetId): InteractionResult {
    const fail = (kind: string, message: string): InteractionResult => {
      this.state.message = message;
      return { success: false, kind, message };
    };
    const checkpoint = structuredClone(this.state);
    let message: string;
    let contribution: string;
    let kind = id as string;
    if (id === 'podBerry' || id === 'podSun') {
      const outcome = actOnPod(this.state.orchard, id === 'podBerry' ? 0 : 1, this.state.active, this.state.position);
      if (!outcome.success) return fail(outcome.kind, outcome.message);
      this.state.orchard = outcome.state!;
      if (outcome.position) this.state.position = outcome.position;
      message = outcome.message;
      contribution = outcome.contribution!;
      kind = outcome.kind;
      this.state.gate = this.state.orchard.grown.every(Boolean);
    } else {
      const expected = id === 'source' ? 'bing' : id === 'rootReceiver' ? 'pomodoro' : 'kibo';
      if (id === 'exitReceiver') return fail('no-switch', this.inspect(id));
      if (this.state.active !== expected) return fail('wrong-companion', `That experiment leaves things as they were. ${this.inspect(id)}`);
      if (id === 'source') {
        this.state.moonbeam.powered = true;
        message = 'The moonwell wakes! Follow the beam as it reaches the first mirror.';
        contribution = 'Woke the moonwell and its live beam.';
      } else if (id === 'rootReceiver') {
        if (!this.getMoonbeamView().rootLit) return fail('unlit', 'The root flower needs the live beam before it can grow.');
        this.state.moonbeam.rooted = true;
        message = 'Living roots anchor a permanent path. You can borrow the light for the far lantern now.';
        contribution = 'Grew the lit root flower into a permanent path.';
      } else {
        const index = id === 'mirrorA' ? 0 : id === 'mirrorB' ? 1 : 2;
        this.state.moonbeam.mirrors[index] = this.state.moonbeam.mirrors[index] === 0 ? 1 : 0;
        message = `${this.getTargetLabel(id)} turns. The beam follows its new direction.`;
        contribution = `Turned ${this.getTargetLabel(id)} to ${this.state.moonbeam.mirrors[index] === 0 ? 'slash' : 'backslash'}${this.state.moonbeam.rooted ? ' after anchoring the path' : ''}.`;
      }
      const view = this.getMoonbeamView();
      this.state.gate = this.state.rescued || (this.state.moonbeam.rooted && view.exitLit);
      if (view.rootLit && !this.state.moonbeam.rooted) message += ' The root flower catches the light!';
      if (this.state.gate) message += ' The far lantern opens the way to the traveler!';
    }
    if (!this.state.rescued) this.undoHistory.push(checkpoint);
    this.state.actions += 1;
    this.contribute(this.state.active, contribution);
    this.path = [];
    this.state.navigationRevision += 1;
    this.state.message = message;
    return { success: true, kind, message };
  }

  private isComplete(id: TargetId): boolean {
    if (id === 'traveler') return this.state.rescued;
    if (id === 'camp') return this.state.phase === 'won';
    if (id === 'leaf') return this.state.leafLaunched;
    if (id === 'bridge') return this.state.bridge;
    if (id === 'bloom') return this.state.bloom;
    if (id === 'gate') return this.state.gate;
    if (id === 'podBerry' || id === 'podSun') return this.state.orchard.grown[id === 'podBerry' ? 0 : 1];
    if (id === 'source') return this.state.moonbeam.powered;
    if (id === 'rootReceiver') return this.state.moonbeam.rooted;
    return false;
  }

  private collectKeepsakes(): void {
    for (let i = 0; i < this.keepsakes.length; i += 1) {
      if (i === this.level.ferryKeepsakeIndex) continue;
      if (!this.state.keepsakes[i] && distance(this.state.position, this.keepsakes[i]) <= PICKUP_RANGE) {
        this.state.keepsakes[i] = true;
        this.state.message = 'A keepsake for camp! Little adventures deserve little memories.';
      }
    }
  }

  private atCamp(): boolean {
    return distance(this.state.position, this.targets.camp) <= CAMP_RANGE;
  }

  private contribute(companion: CompanionId, memory: string): void {
    if (!this.state.contributions[companion].includes(memory)) this.state.contributions[companion].push(memory);
  }

  private trackBridgeCrossing(): void {
    if (this.level.puzzle !== 'brook') return;
    const x = this.state.position.x;
    const river = this.level.layout.river;
    const shore: FerrySide | null = x <= river.minX - BODY_RADIUS ? 'west' : x >= river.maxX + BODY_RADIUS ? 'east' : null;
    if (!shore || shore === this.lastShore) return;
    this.state.routesUsed.bridge = true;
    if (this.state.rescued && shore === 'west') this.state.returnRoute = 'bridge';
    this.lastShore = shore;
  }

  private startTransport(shore: FerrySide): void {
    this.path = [];
    const empty = this.state.ferrySide !== shore;
    const from = this.state.ferrySide;
    const to: FerrySide = empty ? shore : shore === 'west' ? 'east' : 'west';
    this.boardingStart = { ...this.state.position };
    this.state.transport = { from, to, phase: empty ? 'sailing' : 'boarding', progress: 0, empty };
  }

  private updateTransport(dt: number): void {
    const transport = this.state.transport!;
    const duration = transport.phase === 'sailing' ? 2.2 : 0.8;
    const needed = (1 - transport.progress) * duration;
    const step = Math.min(dt, needed);
    transport.progress = Math.min(1, transport.progress + step / duration);
    const lerp = (from: Point, to: Point, t: number) => {
      this.state.position.x = from.x + (to.x - from.x) * t;
      this.state.position.z = from.z + (to.z - from.z) * t;
    };
    if (transport.phase === 'boarding') {
      lerp(this.boardingStart, this.ferryCenters[transport.from], transport.progress);
    } else if (transport.phase === 'sailing') {
      const before = this.state.ferryProgress;
      const from = transport.from === 'west' ? 0 : 1;
      this.state.ferryProgress = from + (transport.to === 'east' ? 1 : -1) * transport.progress;
      if (!transport.empty) {
        lerp(this.ferryCenters[transport.from], this.ferryCenters[transport.to], transport.progress);
        if ((before <= 0.5 && this.state.ferryProgress >= 0.5) || (before >= 0.5 && this.state.ferryProgress <= 0.5)) {
          const index = this.level.ferryKeepsakeIndex;
          if (index >= 0 && index < this.state.keepsakes.length) this.state.keepsakes[index] = true;
        }
      }
    } else {
      lerp(this.ferryCenters[transport.to], this.ferryDocks[transport.to], transport.progress);
    }
    if (transport.progress < 1 - 1e-9) return;
    transport.progress = 0;
    if (transport.phase === 'boarding') transport.phase = 'sailing';
    else if (transport.phase === 'sailing') {
      this.state.ferrySide = transport.to;
      this.state.ferryProgress = transport.to === 'east' ? 1 : 0;
      if (transport.empty) {
        this.state.transport = null;
        this.contribute('bing', 'Recalled the empty leaf ferry.');
        this.state.message = 'The leaf is waiting at your dock. A second Splash will carry everyone across.';
      } else transport.phase = 'landing';
    } else {
      this.state.transport = null;
      this.lastShore = transport.to;
      this.state.routesUsed.ferry = true;
      if (this.state.rescued && transport.to === 'west') {
        this.state.returnRoute = 'ferry';
        this.contribute('bing', 'Brought the traveler home by leaf ferry.');
      } else this.contribute('bing', 'Carried the club across the brook by leaf ferry.');
      this.state.message = 'Everyone is safely ashore. The leaf will wait here.';
      this.collectKeepsakes();
    }
    const remaining = dt - step;
    if (this.state.transport && remaining > 1e-9) this.updateTransport(remaining);
  }

  private moveBy(dx: number, dz: number): void {
    // Small collision steps stop long frames and diagonal input crossing thin barriers.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    const sx = dx / steps;
    const sz = dz / steps;
    const position = this.state.position;
    for (let i = 0; i < steps; i += 1) {
      if (this.isWalkable(position.x + sx, position.z + sz)) {
        position.x += sx;
        position.z += sz;
      } else {
        if (this.isWalkable(position.x + sx, position.z)) position.x += sx;
        if (this.isWalkable(position.x, position.z + sz)) position.z += sz;
      }
    }
  }

  private gridPoint(index: number): Point {
    return {
      x: this.gridMinX + (index % this.gridWidth) * GRID_STEP,
      z: this.gridMinZ + Math.floor(index / this.gridWidth) * GRID_STEP,
    };
  }

  private nearestGridNode(point: Point): number | null {
    const column = Math.round((point.x - this.gridMinX) / GRID_STEP);
    const row = Math.round((point.z - this.gridMinZ) / GRID_STEP);
    let nearest: number | null = null;
    let nearestDistance = Infinity;
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = column + dx;
        const z = row + dz;
        if (x < 0 || x >= this.gridWidth || z < 0 || z >= this.gridHeight) continue;
        const index = z * this.gridWidth + x;
        const candidate = this.gridPoint(index);
        const gap = distance(point, candidate);
        if (gap < nearestDistance && this.segmentWalkable(point, candidate)) {
          nearest = index;
          nearestDistance = gap;
        }
      }
    }
    return nearest;
  }

  private segmentWalkable(from: Point, to: Point): boolean {
    const steps = Math.max(1, Math.ceil(distance(from, to) / 0.1));
    for (let i = 0; i <= steps; i += 1) {
      if (!this.isWalkable(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps)) {
        return false;
      }
    }
    return true;
  }
}
