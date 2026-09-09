# Two Ways Home — implementation contract

Upgrade the existing island into two complete rescue solutions, with reusable Push/Grow/Splash verbs, optional part-inspired field lessons, and individual companion memories. Preserve the guest experience and existing postcard history. This is local Round 1 development, not event submission or public deployment.

## Ownership

- Rules agent: `src/game/rescue.ts`, `tests/rescue.spec.ts`.
- Art agent: `src/art/island.ts`, art preview adapters/evidence and asset notes.
- Research agent: `src/game/traits.ts`, `docs/TRAITS.md`.
- Root: `src/main.ts`, `src/ui.ts`, `src/styles.css`, memory persistence module, browser tests, integration and final documentation.

Everyone shares this workspace and preserves others' edits. No new dependencies.

## Route rules and anchors

Existing bridge (-2.5,2.5), flower curtain (5,1), wheel (5,-1.5), traveler (7,-4), camp (-7,3.5) stay. Add leaf cradle / west dock at (-2.3,-2.5), east dock (2.3,-2.5). Ferry centers are (-0.6,-2.5) and (0.6,-2.5), within the brook. Its deck supports four seated actors. Ferry motion follows fixed docks; no physics engine.

- Log: Kibo pushes it into place (`logRolled`); Pomodoro roots it (`bridge`) to make it walkable. An unrooted log is not safe to cross.
- Garden: Pomodoro grows the brambles into a flower path (`bloom`).
- Leaf: Pomodoro grows it (`leafGrown`); Kibo launches it (`leafLaunched`).
- Dock: Bing propels the ferry. A crossing includes boarding, sailing and landing; the entire squad and rescued traveler travel together. Controls cannot walk them into water or interrupt transit. If the ferry is across the brook, Bing can recall it empty first.
- Wheel: Bing opens the pen (`gate`). It can be reached via the garden or via the ferry's landing north of the brambles. No artificial bridge/bloom prerequisite for wheel/traveler when spatial navigation permits access.
- Traveler joins on interaction; return to camp by either route. Record the actual return crossing and each companion's concrete contributions.
- Keep all three Axies available. Both routes can be built during one trip.

### State/API additions

Preserve existing public fields/methods when practical. Add `logRolled`, `leafGrown`, `leafLaunched`, `talent: 'root'|'float'`, `ferryProgress` (0 west / 1 east), `ferrySide: 'west'|'east'`, `transport: null | { from: 'west'|'east'; to: 'west'|'east'; phase: 'boarding'|'sailing'|'landing'; progress: number; empty: boolean }`, `routesUsed: { bridge: boolean; ferry: boolean }`, `returnRoute: 'bridge'|'ferry'|null`, `contributions: Record<CompanionId,string[]>`.

Export `FERRY_DOCKS` and `FERRY_CENTERS`, add targets `leaf`, `dockWest`, `dockEast`. `setTalent(id)` works in intro or at camp, never in transit; restart retains selected lesson. `getAvailableTargets()` returns inspectable/currently relevant targets independent of selected character. `inspect(target)` supplies observational clues, not names of required companions. Marker clicks walk and inspect; an explicit E/action uses the selected ability. Optional hint button can explain the next experiment when needed. `resetConstructions()` works at camp and keeps collected keepsakes/history; it clears paths/construction/transit safely without forcing an expedition restart. Guard resetting or dismantling away from camp.

Movement while transport is active is owned by the rules. Boarding and landing interpolate squad logical position between the current shore point and ferry center; sailing interpolates ferryProgress. Root animates all characters aboard, without straight follower trails across water. Pause freezes transport. Empty recall leaves squad position unchanged.

### Keepsakes

Three optional keepsakes: flower by garden approach (7,1.2), shell awarded only by sailing through midstream (0,-2.5), bell near the rescue clearing (3,-4.4). Both routes win with fewer than three. Completionists can build both routes. Rendering and collision use the exported positions.

## Field lessons and identity

Two camp-training choices are inspired by verified official part-catalogue entries, not claims about the fixed mascot models' genes or on-chain upgrades. Source record lives in `docs/TRAITS.md`.

- Rose Bud / `root`: reinforcing the bridge also blooms the garden; visibly connect the root/flower transformation and record Pomodoro's contribution.
- Watering Can / `float`: growing the leaf also floats it into its launch position; standard launch otherwise requires Kibo's push.

Both lessons leave both rescue routes solvable. UI explains the effect and shows the source under the field guide. New records persist lesson, actual return route, route discoveries and contribution strings keyed to each companion. Old valid postcards remain readable. Saved camp souvenirs and returning visitor provide visible continuity on reload; these are local game memories.

## Art and UX

Keep the cream-paper/forest-green diorama direction. Add a curled leaf that unfurls into a veined boat, small boarding docks, visible roots wrapping the bridge, distinct growth/launch/sail feedback, and a souvenir at camp. Show visible physical clues on objects; remove the single prescribed marker naming the required Axie. Multiple object markers navigate/inspect. Touch must preserve readable targets without covering the play area. Field guide provides optional hints. No countdown or speed competition.

## Verification

Rules tests: both routes, two lessons, wrong actions give feedback, blocked unrooted bridge, route-specific keepsakes, both directions/empty recall, pause/transit input guards, safe camp reset, actual return-route attribution and unique contribution records. Browser tests: real controls for bridge/ferry on desktop and touch, actual crew/traveler ride rendered, lesson effect, persistence/migration/camp souvenirs, restart, paused transit, error-free packaged rendering and subdirectory assets. Inspect desktop/mobile screenshots and central canvas pixels. Provide a three-participant playtest sheet; automated checks are not represented as human playtests.

## Workflow ledger

Reuse the previously loaded director, gameplay, graphics, UI, debug/profile, QA/release, Beads and visual-verdict workflows/references recorded in `VERIFICATION.md`; each owner loads missing phase-specific references before its edits. Use existing official characters, original editable support art and synthesized audio. First-playable upgrade; no premium/AAA qualification or external asset-generation claim.
