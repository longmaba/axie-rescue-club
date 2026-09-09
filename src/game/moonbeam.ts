import { getLevel, MOONBEAM_LAYOUT, type Point } from './levels';
import type { MoonbeamState, MoonbeamView } from './puzzle-types';

export function createMoonbeamState(): MoonbeamState {
  return { powered: false, mirrors: [0, 1, 1], rooted: false };
}

/** Trace the current beam; receivers absorb light and repeated directed mirror hits stop loops. */
export function traceMoonbeam(state: MoonbeamState): MoonbeamView {
  const view: MoonbeamView = { segments: [], rootLit: false, exitLit: false };
  if (!state.powered) return view;
  const bounds = getLevel('moonbell-marsh').layout.bounds;
  const objects = [...MOONBEAM_LAYOUT.mirrors, MOONBEAM_LAYOUT.rootReceiver, MOONBEAM_LAYOUT.exitReceiver];
  const visited = new Set<string>();
  let from: Point = { ...MOONBEAM_LAYOUT.source };
  let direction: Point = { x: 1, z: 0 };
  for (;;) {
    let nearest = direction.x > 0 ? bounds.maxX - from.x : direction.x < 0 ? from.x - bounds.minX
      : direction.z > 0 ? bounds.maxZ - from.z : from.z - bounds.minZ;
    let hit = -1;
    objects.forEach((object, index) => {
      const dx = object.x - from.x;
      const dz = object.z - from.z;
      const ahead = dx * direction.x + dz * direction.z;
      const across = dx * direction.z - dz * direction.x;
      if (ahead > 1e-8 && Math.abs(across) < 1e-8 && ahead < nearest) {
        nearest = ahead;
        hit = index;
      }
    });
    const to = { x: from.x + direction.x * nearest, z: from.z + direction.z * nearest };
    view.segments.push({ from: { ...from }, to });
    if (hit === 3) { view.rootLit = true; break; }
    if (hit === 4) { view.exitLit = true; break; }
    if (hit < 0) break;
    const key = `${hit}:${direction.x}:${direction.z}`;
    if (visited.has(key)) break;
    visited.add(key);
    direction = state.mirrors[hit] === 0 ? { x: -direction.z, z: -direction.x }
      : { x: direction.z, z: direction.x };
    from = to;
  }
  return view;
}
