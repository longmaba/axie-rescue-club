import * as THREE from 'three';
import { LEVELS, type LevelDefinition } from '../game/levels';
import type { OrchardState, MoonbeamState, MoonbeamView } from '../game/puzzle-types';
import { createBramblebrook } from './bramblebrook';
import { createSunseedOrchard } from './sunseedOrchard';
import { createMoonbellMarsh } from './moonbellMarsh';

export interface IslandState {
  logRolled: boolean;
  bridge: boolean;
  bloom: boolean;
  leafGrown: boolean;
  leafLaunched: boolean;
  ferryProgress: number;
  ferrySide: 'west' | 'east';
  transport: null | {
    from: 'west' | 'east'; to: 'west' | 'east';
    phase: 'boarding' | 'sailing' | 'landing'; progress: number; empty: boolean;
  };
  talent: 'root' | 'float';
  gate: boolean;
  rescued: boolean;
  keepsakes: boolean[];
  campKeepsakes?: number;
  campVisitor?: boolean;
  orchard: OrchardState;
  moonbeam: MoonbeamState;
  moonbeamView: MoonbeamView;
}

export interface IslandArt {
  root: THREE.Group;
  update(dt: number, time: number, state: IslandState): void;
  interactables: Record<string, THREE.Object3D>;
  dispose(): void;
}

/** Each expedition owns its topology; character loading stays in the renderer. */
export function createIsland(level: LevelDefinition = LEVELS[0]): IslandArt {
  if (level.puzzle === 'seed-pods') return createSunseedOrchard(level);
  if (level.puzzle === 'moonbeam') return createMoonbellMarsh(level);
  return createBramblebrook(level);
}
