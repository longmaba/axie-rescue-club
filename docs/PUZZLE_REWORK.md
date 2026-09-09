# Two different puzzles - authoritative contract

User scope: REPLACE the mechanics/layouts of Sunseed Orchard and Moonbell Marsh. Keep exactly three level IDs. Bramblebrook retains the bridge/ferry rescue. No new dependencies, external generation, deployment or submission. The official characters remain unchanged.

## Ownership and interfaces

- Root owns levels.ts, puzzle-types.ts, main.ts, ui.ts, styles.css, this contract and integration.
- Rules owns rescue.ts, new pure puzzle modules, rules tests and eventual browser cases.
- Art owns island.ts/new art factories, art helpers/evidence and ASSETS notes.
- Persistence owner follows with memories.ts/memory tests and documentation after design handoff.
- Shared workspace: preserve others' edits. Exact geometry/types are in levels.ts and puzzle-types.ts. New puzzle code uses authored deterministic grid collision/ray tracing, not rigid-body physics.

RescueState gains orchard: OrchardState and moonbeam: MoonbeamState (neutral initial states exist on all levels), navigationRevision:number; removes obsolete sluiceAligned/irrigated/beaconRaised/lanternGrown/reflectorReady fields. returnRoute uses RouteId = bridge | ferry | seedbeds | moonbeam. routesUsed stays {bridge,ferry} for legacy Brook only. No false bridge/ferry credit on new maps.

RescueGame APIs: getActionRange(target) (pods ~2.05; ordinary targets1.4); getApproachPoint(target, side?:Cardinal):Point|null (pod occupied centers are never navigation destinations); getTargetLabel(target):string; getMoonbeamView():MoonbeamView; canUndoPuzzle:boolean; undoPuzzle():boolean. Dynamic targets getter uses current pod cells. Root passes rendered state + moonbeamView to art. Main clears navigation/selected target and reseeds legal formation after navigationRevision changes. Reset/restart/level switches clear undo history safely. Undo snapshots restore puzzle, position, contribution/action accounting and causal keepsake/route state; elapsed time remains monotonic. Invalid actions don't consume history. Undo is disabled after rescue/win.

## Orchard: spatial seed-pod puzzle

Board7x5, cellsize1.8, origin(-5.4,-3.6), defined in ORCHARD_BOARD. Surrounding court walls have only west entry(row3) and east exit(row0). Walker can use the west camp apron and east traveler terrace; pods stay inside board. Hedges at(3,1),(3,2),(2,4). Berry pod(2,1) matches berry bed(5,1); Sun pod(4,3) matches sun bed(5,3). Symbols/colors must distinguish the pairs.

Kibo pushes one cardinal square while standing on the adjacent cell behind the pod; diagonal/misaligned pushes fail with a useful clue. Destination must be in bounds, free of hedges and the other pod. Pod collision blocks walking; grown pods stay in place. On matching bed only, Bing Splash waters that pod; Pomodoro Grow then plants it. Wrong bed/dry growth fails unchanged. Both grown pods open the east trellis to the traveler. Greet and return to camp for route seedbeds. Three new optional keepsakes use ordinary pickup collision (no ferry index).

BFS-proved shortest push solution10 (R berry, G sun): R south,south,east; G north into staging; R east,east,north,north; G south,east. Push stances in cell coordinates: (2,0),(2,1),(1,3),(4,4),(2,3),(3,3),(5,4),(5,3),(4,1),(3,3). Initial wrong R north strands it at boundary row0; Undo must restore it. Water/grow either delivered pod; doing berry first does not block remaining solution. The key decision is moving Sun away from its nearby bed to clear Berry's route.

## Marsh: live optical routing and a permanent path

Irregular pond-garden patches in level.layout.floors. Source(-6,-3.2) emits EAST when Bing splashes it. Mirrors A(-2.4,-3.2), B(-2.4,2.4), C(3.2,2.4) rotate ninety degrees with Kibo. Initial orientations [0,1,1]. Use actual ray tracing through collinear mirrors/receivers; loops terminate and segments stop at bounds. Slash0 maps direction(dx,dz) to(-dz,-dx); backslash1 maps to(dz,dx). Recompute CURRENT root/exit lighting after every relevant action; these are derived, not sticky visited flags.

Root receiver(-6,2.4) can be grown by Pomodoro only while currently lit. This permanently adds connector floor(-1.5..2.1,1.6..3.2). It stays walkable when the light moves. Exit receiver(3.2,-3.2) opens north gate only while lit and connector rooted; after greeting traveler, latch exit open for a safe return. No direct ability opens the exit. The receiver can be inspected but not activated manually.

Solution: Bing powers source; Kibo turns A from slash to backslash and B from backslash to slash, sending beam to root receiver. Pomodoro roots it. Kibo turns B back to backslash, redirecting beam east; cross the permanent connector, turn C to slash, sending beam north to exit receiver. Greet traveler and return through the lit gate and rooted path for route moonbeam. Trying to reach C before rooting or growing an unlit receiver must fail. Mirrors can be experimented with in any orientation, but the grow/reroute dependency cannot be skipped.

## UI, history and evidence

Replace old route/station rows on the two levels with contextual puzzle controls: two pod targets, cardinal standing-side buttons for selected pod, Undo(Z), pair watering/growth progress; or source/three mirror/root targets and current beam/anchored path status. All actions use the same real input APIs and have touch controls. No bridge/ferry vocabulary or misleading two-ways-found counters on new levels. Orchard 10+ push actions and Marsh required reroute must be visible in contribution/postcard copy. Field lessons remain selected for Brook but do not silently bypass new puzzle conditions.

History retains old postcards. New records include puzzleRevision2 for these IDs; new completion counts filter by current level revision so prior bridge/ferry variants do not auto-complete the redesign. Brook legacy revision defaults1. New route IDs are validated; save version4. Atlas still three islands.

Verify pure legal/illegal push, matching beds/water/grow, corner undo and accounting, real beam directions and rerouting, gated geometry/keepsakes, reset/load, legacy memory migration and Brook navigation regression. Browser desktop/touch each complete both new puzzles using real inputs, show invalid attempt + recovery + state-changing feedback, next/replay/history, and preserve artifacts before another test run. Verify original Brook core rules and at least one bridge/ferry browser regression. Final build, console/network, canvas pixels, disposal/resources, desktop/phone screenshots and static hosting checks. Avoid repeating passed expensive checks unless a relevant later change requires it.

## Workflow ledger

Director, gameplay, graphics, UI, debug and QA skills loaded/reused. Gameplay workflows and physics selection read now; graphics owner reread four graphics references. UI patterns read now; QA/mobile/debug checklists reused from THREE_EXPEDITIONS_VERIFICATION.md at phase entry and reread if needed. Custom authored collision for two pods and mirror rays is sufficient; no new physics library or simulated rigid bodies. No premium/AAA or generated asset claim. Beads parent d6p, rules o6n, art tq0, integration95g, QA nr8.
