import type { Cell, Point } from './levels';

export interface OrchardState {
  pods: [Cell, Cell];
  watered: [boolean, boolean];
  grown: [boolean, boolean];
  pushes: number;
}
/** 0 is slash (/), 1 is backslash (\\); mirrors turn by ninety degrees. */
export interface MoonbeamState {
  powered: boolean;
  mirrors: [0 | 1, 0 | 1, 0 | 1];
  rooted: boolean;
}
export interface BeamSegment { from: Point; to: Point }
export interface MoonbeamView { segments: BeamSegment[]; rootLit: boolean; exitLit: boolean }
