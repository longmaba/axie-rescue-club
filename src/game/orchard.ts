import { ORCHARD_BOARD, orchardPoint, type Cell, type Point } from './levels';
import type { OrchardState } from './puzzle-types';
import type { CompanionId } from './rescue';

export function createOrchardState(): OrchardState {
  return { pods: ORCHARD_BOARD.starts.map(cell => ({ ...cell })) as [Cell, Cell],
    watered: [false, false], grown: [false, false], pushes: 0 };
}

function sameCell(a: Cell, b: Cell): boolean { return a.column === b.column && a.row === b.row; }
export function podOnBed(state: OrchardState, index: 0 | 1): boolean {
  return sameCell(state.pods[index], ORCHARD_BOARD.beds[index]);
}

export interface OrchardAction {
  success: boolean;
  kind: string;
  message: string;
  state?: OrchardState;
  position?: Point;
  contribution?: string;
}

/** A push is determined by the actor's physical cardinal stance, never a target flag. */
export function actOnPod(state: OrchardState, index: 0 | 1, actor: CompanionId, position: Point): OrchardAction {
  const name = index === 0 ? 'berry' : 'sun';
  const fail = (kind: string, message: string): OrchardAction => ({ success: false, kind, message });
  if (state.grown[index]) return fail('already-complete', `The ${name} plant is rooted in its matching bed.`);
  const next = structuredClone(state);
  if (actor === 'kibo') {
    const pod = state.pods[index];
    const center = orchardPoint(pod);
    const dx = (center.x - position.x) / ORCHARD_BOARD.cellSize;
    const dz = (center.z - position.z) / ORCHARD_BOARD.cellSize;
    const column = Math.round(dx);
    const row = Math.round(dz);
    if (Math.abs(column) + Math.abs(row) !== 1 || Math.abs(dx - column) > .18 || Math.abs(dz - row) > .18) {
      return fail('bad-stance', 'Stand in the square directly behind the pod. A diagonal nudge cannot move it.');
    }
    const destination = { column: pod.column + column, row: pod.row + row };
    if (destination.column < 0 || destination.column >= ORCHARD_BOARD.columns
      || destination.row < 0 || destination.row >= ORCHARD_BOARD.rows) {
      return fail('blocked', 'The court wall stops that push. Try another side, or Undo your last move.');
    }
    if (ORCHARD_BOARD.walls.some(wall => sameCell(wall, destination))) {
      return fail('blocked', 'A hedge fills the next square. The pod needs a clear square ahead.');
    }
    if (sameCell(state.pods[index === 0 ? 1 : 0], destination)) {
      return fail('blocked', 'The other pod is in the way. Make room before pushing this one through.');
    }
    next.pods[index] = destination;
    next.watered[index] = false;
    next.pushes += 1;
    const direction = column > 0 ? 'east' : column < 0 ? 'west' : row > 0 ? 'south' : 'north';
    return { success: true, kind: 'push', state: next, position: center,
      message: `The ${name} pod rolls one square ${direction}.${podOnBed(next, index) ? ' Its symbol matches this bed!' : ''}`,
      contribution: `Pushed the ${name} pod ${direction} to square ${destination.column + 1},${destination.row + 1}.` };
  }
  if (!podOnBed(state, index)) return fail('wrong-bed', `The ${name} pod needs the bed with its matching symbol before watering or growing.`);
  if (actor === 'bing') {
    if (state.watered[index]) return fail('already-complete', `The ${name} pod is watered and ready to grow.`);
    next.watered[index] = true;
    return { success: true, kind: 'water', state: next, message: `Cool water soaks the ${name} pod. Its roots are ready to grow.`,
      contribution: `Watered the ${name} pod in its matching bed.` };
  }
  if (!state.watered[index]) return fail('dry', `The ${name} pod is dry. Water it in its matching bed before growing it.`);
  next.grown[index] = true;
  return { success: true, kind: 'grow', state: next,
    message: next.grown.every(Boolean) ? 'Both plants bloom! Their roots lift the east trellis.' : `The ${name} plant takes root. One more matching bed will open the trellis.`,
    contribution: `Grew the ${name} plant to lift the orchard trellis.` };
}
