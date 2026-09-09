# Three expeditions — implementation contract

Add two complete, selectable islands to the existing rescue game. Preserve Bramblebrook, Push/Grow/Splash, field lessons, actual route credits, ferry safety, local memories, touch input and the wider 1.6-unit walking formation. No new dependencies, public deployment, registration or submission.

## Ownership

- Root: `src/game/levels.ts`, `src/main.ts`, `src/ui.ts`, `src/styles.css`, integration and final documentation.
- Rules: `src/game/rescue.ts`, `tests/rescue.spec.ts`, additional pure level rules tests.
- Art: `src/art/island.ts`, art-only helpers, preview adapters/evidence, asset notes.
- Persistence/review: `src/game/memories.ts`, `tests/memories.spec.ts`, bounded independent review.
- Browser QA handed to the rules owner after integration. Shared workspace: preserve others' edits.

## Authoritative data

`src/game/levels.ts` defines all IDs, metadata, supported targets, map geometry, ferry anchors and keepsakes. It is the contract. Geometry retains the two-bank footprint but varies the bridge and ferry locations. Extra target IDs remain in the common target record for stable typing; only `supportedTargets` are interactive/rendered on each island.

Rules re-export existing Point/TargetId/FerrySide types and default `TARGETS`, `KEEPSAKES`, `FERRY_DOCKS`, `FERRY_CENTERS` for old tests. Instance `game.level`, `game.targets`, `game.keepsakes`, `game.ferryDocks`, `game.ferryCenters` serve the active island. `new RescueGame(levelId = 'bramblebrook')`; `loadLevel(levelId)` resets the expedition into intro while preserving talent and the state object's identity. `restart()` restarts the current island into playing. Store `state.levelId`.

Add state flags: `sluiceAligned`, `irrigated`, `beaconRaised`, `lanternGrown`, `reflectorReady`. Clear them on restart, level change and safe construction reset. Existing gate/bloom/etc fields continue to drive collision and route state.

## Sunseed Orchard

Warm golden orchard with fruit trees, dry planting beds and visible irrigation troughs. Bridge moves to Z1.6, ferry to Z-2.8. The extra spatial puzzle is entirely on the west bank:

1. Push the crooked sluice at (-4.8,-0.8): `sluiceAligned=true`.
2. Splash the pump at (-5.6,-3.4), after alignment: `irrigated=true`.
3. Grow either crossing and rescue the traveler using the bridge or ferry.

All growth (bridge rooting, leaf growth, garden bloom) requires irrigation; either field lesson applies afterward. Rolling the log can happen before irrigation. Water is permanent and unlimited. Dry attempts and premature Splash give observable feedback without adding actions or contributions. The wheel/pen works as before. Art must show dry-to-watered channels and orchard recovery; the two physical stations are separate.

## Moonbell Marsh

Twilight teal/lavender marsh with drooping willow silhouettes, reeds, lilies and fireflies. Bridge Z2.8, ferry Z-2.2. Both crossing methods work immediately. Three preparations across the banks can be done in **any order**:

- `beacon` at (-4.4,0.8): Kibo Push raises the fallen west-bank mast (`beaconRaised`).
- `lantern` at (4.7,-3.4): Pomodoro Grow opens an east-bank moonflower (`lanternGrown`).
- Existing `gate` at (5,-1.5) becomes the reflector pool: Bing Splash clears its surface (`reflectorReady`). The waterwheel model is replaced for this island.

When all three are ready, set `gate=true` and open the rescue pen; whichever preparation finishes last triggers the signal. Before that, a prepared pool is complete even while the pen is still closed. Visible light segments and local enclosure mist explain missing preparations. Atmospheric mist must not hide navigation or targets. Record the actual companion contributions separately. Field lessons keep their existing route effects.

## Art interface

`createIsland(level = LEVELS[0])` consumes LevelDefinition. Keep IslandModel and its resource-disposal contract. IslandState adds the five flags above. `gate` represents the completed marsh signal. Provide interactable anchors for extra supported targets; preserve named `ferrySeat0..3` with full-size passenger support. Camps/bridge/docks/path/keepsakes/collision must align with level data. Theme geometry and signature animations must differ visibly, beyond palette swaps. Root handles renderer lighting/theme changes and disposes the prior island when switching; character GLBs are reused.

## Selection and persistence

All three islands are accessible from an expedition selector in intro/pause, with current/completed markers. Winning offers the next island plus replay; final island offers the selector. Switching starts a fresh run, clears stale navigation/transport/labels and preserves postcards and lesson selection. Disable changing islands in transit.

Memory records add `levelId`; missing legacy IDs mean Bramblebrook, unrecognized explicit IDs are not allowed to create another island's completion. Preserve old valid records and local-storage failure handling. Export `getExpeditionProgress(memories?)` for per-level completion count, best keepsakes and route discoveries; keep getCampSummary's old return shape intact. Campaign stars/completion derive from valid saved postcards, not route UI guesses. Do not fabricate ownership, on-chain progress or played levels.

## Verification and workflow

Pure checks cover every new prerequisite, dry/invalid attempts, all six beacon preparation orders, both crossing solutions/lessons on both new islands, data-driven walkability, per-level restart/reset/transition and unsupported-target rejection. Memory tests cover legacy attribution and level separation. Browser checks use real mouse/keyboard/touch for complete new expeditions, next/select/replay transitions, persistence and all three island renderings, plus existing Bramblebrook regression. Capture desktop/phone screenshots, active pixels, console/asset errors and render stats. Build/typecheck, asset integrity and static package checks remain required where affected.

Reuse director and its five sibling skills/references from VERIFICATION.md, plus feature-research (current code inspected using rg/targeted reads; codebase_search unavailable). Art uses the approved unchanged character GLBs and editable environment kit; no premium or external asset-generation claim. Record missing/new reference reads and final evidence in the verification report.
