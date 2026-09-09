# Two Ways Home verification

Updated **2026-09-05** against [TWO_WAYS_HOME.md](TWO_WAYS_HOME.md), extending the original [first-playable plan](BUILD_PLAN.md). **Build, typecheck, asset verification, 44 rules/persistence checks, four browser playthroughs, and static subdirectory checks pass. Integrated visual review: 93 / pass.** This is a local Round 1 prototype, with no premium/AAA qualification claim. These results combine the initial full run and corrected browser reruns, as detailed below.

The upgrade implements two complete routes on the same island: roll and root a log bridge, or grow and launch a leaf ferry. Push, Grow, and Splash operate on multiple objects. Players inspect clues before trying an ability, can ask for a hint, and can safely reset constructions at camp. Ferry transport includes boarding, sailing, landing, empty recall, and the rescued traveler.

Two field lessons alter action combinations: **Rose Bud** reinforcement also blooms the garden; **Watering Can** growth also launches the leaf. Both routes remain available with either lesson. Their official part metadata and game-authored effects are separated in [TRAITS.md](TRAITS.md). Completed expeditions record the actual return route, discovered routes, selected lesson, and each companion's contributions. The journal preserves old postcards and drives visible camp keepsakes and a returning visitor.

## Walking formation follow-up

The moving companions now use **1.6-unit path gaps**, up from 1.05, with the rescued traveler following at 4.8 units. Spacing values are centralized in [main.ts](../src/main.ts). Camp resets use a simple northward line at the same bank position. The dock keeps its compact landing formation, then expands toward the walking gap as the leader builds a longer safe trail.

Fresh verification of this follow-up passed: **TypeScript/Vite build and all four existing desktop/touch browser playthroughs**, in one 3.6-minute browser run. The route checks cover both rescues, safe ferry landing, all passengers aboard, pause/input guards, rescued camp reset, restart, and saved history. No console, runtime, request, or HTTP asset errors were recorded. [Production route evidence](../artifacts/formation-spacing/routes/) contains 22 screenshots and four JSON reports. The earlier pure-rule and persistence results below remain baseline evidence; those modules were not modified.

Matching [desktop before](../artifacts/formation-spacing/before-desktop-moving.png) / [after](../artifacts/formation-spacing/after-desktop-moving.png) and [phone before](../artifacts/formation-spacing/before-mobile-moving.png) / [after](../artifacts/formation-spacing/after-mobile-moving.png) captures confirm clearer silhouettes at the existing character size. At the sampled route destination, adjacent center distances increased from about 0.98–1.02 to 1.50–1.55 units; bends make straight-line distances slightly shorter than the 1.6-unit path gaps. [Visual verdict: 94 / pass](../.omx/state/formation-spacing/ralph-progress.json).

No dependencies or new gameplay tests were added. The existing trail following and ferry seating are reused; spacing remains path-based, so tight turns or companion switches can briefly compress the formation. Phone verification uses Chromium emulation. This pass reused the gameplay workflow reference and visual-verdict workflow recorded below, with the task tracked as `axievibeathon-q5s`.

## Two Ways Home baseline checks and reproduction

| Check | Current result and evidence |
| --- | --- |
| `npm run typecheck` | Passed, confirmed by the build owner. |
| `npm run build` | Passed; TypeScript and Vite produced the current static `dist/` site. |
| Focused `tests/rescue.spec.ts` run | **14 passed**: both routes and lessons, route keepsakes, ferry transit and recall, pause/input guards, safe reset, clues, and return/contribution attribution. |
| Focused `tests/memories.spec.ts` run | **8 passed**: legacy migration, malformed data, bounded contributions, retention, per-trip isolation, won-only saves, and disabled/failed storage. |
| Rules/persistence checks in the full run | **44 passed** across the two configured browser projects. These repeat the 14 rules and 8 memory cases per project; they are not 44 distinct behaviors. |
| Four route browser playthroughs | **4 passed** across corrected reruns: three passed together, then the remaining desktop ferry case passed in a focused 47.9-second run. The production game build was unchanged. |
| `node scripts/art/inspect-assets.mjs` | Passed; GLB structure, pinned checksums, self-contained buffers/images, and required animation clips. [Asset provenance](ASSETS.md). |
| `node scripts/verify-static.mjs` | Passed; `/rescue-club/` asset loading, production diagnostics hidden, nonblank playfield, and recovery from an intentionally aborted character download. [Static evidence](../artifacts/final/static-evidence.json). |
| Independent integration source review | Passed after correcting east-bank follower landing and the rescued traveler's construction-reset placement. Details below. |
| Integrated visual review | **93 / pass**, recorded in the [visual verdict](../.omx/state/axie-two-ways-home/ralph-progress.json), against written art direction. Desktop gameplay/ferry sailing/postcard/journal/camp and mobile guide/gameplay/four-passenger sailing/postcard/journal were reviewed. |

Current production assets:

| File | Uncompressed size | Gzip size reported by Vite |
| --- | ---: | ---: |
| `dist/assets/index-CCKJsRIR.js` | 706.66 kB | 189.09 kB |
| `dist/assets/index-eJlgStgW.css` | 23.99 kB | 6.17 kB |

No dependencies were added for this upgrade. There is no separate lint script configured.

The production Playwright server is `http://127.0.0.1:4191`; it refuses an occupied port. The standalone static-host test chooses a temporary local port. Reproduction commands:

```sh
npm run typecheck
npm run build
npx playwright test tests/rescue.spec.ts --project=desktop-chrome
npx playwright test tests/memories.spec.ts --project=desktop-chrome
npm test
npx playwright test tests/browser.spec.ts
npx playwright test tests/browser.spec.ts --project=desktop-chrome --grep "ferry rescue"
node scripts/art/inspect-assets.mjs
node scripts/verify-static.mjs
```

## Browser and rendering evidence

All four route/profile playthroughs passed. They use actual keyboard, mouse, and emulated touch controls, with read-only diagnostics for state and coordinate projection. Coverage includes bridge and ferry expeditions, lesson effects, explicit inspection/interaction, paused transport, four actors aboard the return ferry, construction reset after rescue, postcards, legacy history, and camp continuity after reload.

The initial `npm test` run passed all 44 rules/persistence checks; four browser cases stopped on harness assumptions about resume state, a covered waypoint, and the leaf footprint. The corrected browser run passed three cases; a final focused desktop ferry rerun passed the fourth in 47.9 seconds. These reruns used the same `index-CbLCSbSG.js` game build, and the final typecheck also passed. This is combined verification evidence, not a claim that the initial full-suite command was entirely green.

| Profile | Route | Current evidence status |
| --- | --- | --- |
| Desktop Chromium, 1280 x 720 | Bridge / Rose Bud | Passed. [Gameplay](../artifacts/final/two-ways-home/desktop-chrome-bridge-gameplay.png), [postcard](../artifacts/final/two-ways-home/desktop-chrome-bridge-win.png), [camp after reload](../artifacts/final/two-ways-home/desktop-chrome-bridge-camp-after-reload.png), [JSON](../artifacts/final/two-ways-home/desktop-chrome-bridge-root-evidence.json). |
| Desktop Chromium, 1280 x 720 | Ferry / Watering Can | Passed. [Four-passenger sailing](../artifacts/final/two-ways-home/desktop-chrome-ferry-return-sailing.png), [postcard](../artifacts/final/two-ways-home/desktop-chrome-ferry-win.png), [camp after reload](../artifacts/final/two-ways-home/desktop-chrome-ferry-camp-after-reload.png), [JSON](../artifacts/final/two-ways-home/desktop-chrome-ferry-float-evidence.json). |
| Mobile Chromium emulation, 390 x 844 | Bridge / Watering Can | Passed. [Gameplay](../artifacts/final/two-ways-home/mobile-chrome-bridge-gameplay.png), [postcard](../artifacts/final/two-ways-home/mobile-chrome-bridge-win.png), [JSON](../artifacts/final/two-ways-home/mobile-chrome-bridge-float-evidence.json). |
| Mobile Chromium emulation, 390 x 844 | Ferry / Rose Bud | Passed. [Four-passenger sailing](../artifacts/final/two-ways-home/mobile-chrome-ferry-return-sailing.png), [postcard](../artifacts/final/two-ways-home/mobile-chrome-ferry-win.png), [journal](../artifacts/final/two-ways-home/mobile-chrome-ferry-history.png), [JSON](../artifacts/final/two-ways-home/mobile-chrome-ferry-root-evidence.json). |

The following values are copied from each linked JSON's `diagnostics` and `pixelEvidence`. Every profile records **zero console errors, page errors, failed requests, and HTTP error responses**. Final evidence comprises **22 PNGs and four JSON files** under `artifacts/final/two-ways-home/`; temporary `test-results/` artifacts are replaced by later test runs.

| Profile / route | Draw calls | Triangles | Reported average FPS | Central color buckets | Colored coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop / bridge | 85 | 107,903 | 20.02 | 303 | 0.7980 |
| Desktop / ferry | 84 | 100,863 | 20.41 | 301 | 0.6953 |
| Mobile emulation / bridge | 74 | 99,695 | 24.10 | 174 | 0.8258 |
| Mobile emulation / ferry | 72 | 96,267 | 23.63 | 190 | 0.6167 |

The ferry return-sailing snapshots separately recorded **109 calls / 101,543 triangles / 20.40 average FPS** on desktop and **102 calls / 100,207 triangles / 23.62 average FPS** in mobile emulation. These are sampled render counts, not peak budgets. Headless averages include startup and test activity and do not qualify physical hardware performance. The earlier linear-slice measurements are superseded.

The integrated visual verdict is **93 / pass** against `TWO_WAYS_HOME.md`, with no supplied reference image. All four full-size ferry passengers remain distinguishable despite natural isometric occlusion, and the reviewed overlays have no clipped primary actions. The isolated art-scene score is separate and does not replace this integrated review.

The updated [production subdirectory screenshot](../artifacts/final/subdirectory-desktop.png) and [static-host JSON](../artifacts/final/static-evidence.json) show **243 central color buckets**, **0.7933 colored coverage**, **zero page errors**, and **zero HTTP error responses** in the clean loading case. The owner reviewed this screenshot. The test starts the adventure, allows the scene to settle, and samples central playfield pixels. Its separate failure scenario aborts `kibo.glb`, checks the visible error and disabled start button, removes the failure, and uses **Try again** to reload into playable state. This proves local production packaging and recovery, rather than public deployment or a complete route playthrough.

## Integration fixes checked

- **East-bank landing stays clear of brambles.** The original ferry formation put a follower at `(2.3,-0.4)`, inside the closed garden on a ferry-only route. Landing now spreads companion followers north of the dock, and the following trail uses the same direction and distances. The independent source recheck passed; QA has added regression coverage.
- **Construction reset preserves the rescued traveler.** Reset previously left `rescued=true` while returning the visual traveler to the pen behind the reconstructed river obstacles. An already-rescued traveler now resets beside the party with a local following trace. Camp formation faces away from the western boundary so the reset positions remain on the island. The independent source recheck passed; QA has added regression coverage.
- **Route and lesson semantics remain distinct.** Rules record completed occupied crossings and the actual return route. Lessons change useful action combinations without preventing the other route. Inspecting gives an observation; an explicit action tries the selected companion's ability.
- **Saved camp rewards reflect persisted history.** The UI saves once on completion and refreshes camp state from the save result. A failed write retains only prior rewards. Legacy postcards normalize absent route/talent/contributions without inventing them. Contribution arrays are copied per trip, bounded, and escaped when displayed.
- **Character resources remain coherent.** The returning camp visitor uses a skeleton-aware clone with its own animation mixer and shared geometry/material ownership. The four official character GLBs and fixed derived portraits retain their supplied identities. The integrated visual review confirms visible four-passenger fit.

The earlier corrections also remain relevant: followers use route-distance sampling instead of direct river shortcuts, all pen fencing retracts with its collision unlock, and static GLB-derived portraits avoid the cold-start framebuffer-readback issue documented in [ASSETS.md](ASSETS.md).

## Implementation and simplification

The upgrade is concentrated in `src/game/rescue.ts` (route rules and contributions), `src/game/traits.ts` (verified lesson metadata), `src/game/memories.ts` (validated local history), `src/art/island.ts` (bridge, ferry, docks, and camp), and `src/main.ts`, `src/ui.ts`, `src/styles.css` (transport presentation, controls, field guide, and postcards). Matching evidence is in `tests/rescue.spec.ts`, `tests/memories.spec.ts`, `tests/browser.spec.ts`, and `scripts/verify-static.mjs`. Design, provenance, playtest protocol, and final verification are documented in `TWO_WAYS_HOME.md`, `TRAITS.md`, `PLAYTEST.md`, and this report.

Existing Push/Grow/Splash verbs serve both routes, and the ferry follows fixed docks instead of adding a physics engine. A shared character-cloning path preserves skeletons and reuses loaded geometry/materials for the camp visitor. One bounded memory module handles both old postcards and new contribution records. No new dependency or separate owned-Axie rendering system was introduced.

## Scope and remaining limits

- **Human playtests have not been conducted.** The [three-participant protocol](PLAYTEST.md) is ready. Automated completion establishes functionality; discoverability, enjoyment, first-play duration, and voluntary replay interest still need observation with fresh players.
- Live approved Mixer rendering and arbitrary owned-Axie gene/part mapping remain outside this build. Field lessons use verified official catalogue identities as inspiration for local game rules; they do not alter mascot genes or award on-chain AXP. Additional islands and broader progression remain later work.
- Physical phones/tablets, Safari, Firefox, and sustained hardware performance have not been qualified. Mobile evidence uses Chromium touch emulation. WebGL 2 and hardware acceleration are required.
- Postcards are local browser data when storage is available. The latest 20 are retained; there is no cross-device synchronization. Camp keepsakes represent the maximum count earned in saved expeditions.
- No event registration, public hosting, wallet integration, or submission was performed. The subdirectory check serves `dist/` locally.
- The environment is an original editable Three.js kit with a fixed-path ferry. Blender and external image/model/audio generation APIs were not used. Feedback audio is synthesized with Web Audio. No rigid-body physics engine or generated audio asset claim is made.

## Skill-loading ledger

The upgrade reuses the confirmed skill and reference reads from the original slice, as recorded in [BUILD_PLAN.md](BUILD_PLAN.md), [TWO_WAYS_HOME.md](TWO_WAYS_HOME.md), [ASSETS.md](ASSETS.md), and owner reports. The ledger below preserves those reads; it does not claim every reference was reread for this upgrade. The following roots are local workflow locations, not runtime dependencies:

- `A` = `C:/Users/longm/.agents/skills`
- `C` = `C:/Users/longm/.codex/skills`

| Responsibility | Loaded skill path | Application |
| --- | --- | --- |
| Director | `A/threejs-game-director/SKILL.md` | Scope, phase sequencing, and evidence gates. |
| Gameplay systems | `A/threejs-gameplay-systems/SKILL.md` | First-playable loop, rules, navigation, and controls. |
| AAA graphics workflow | `A/threejs-aaa-graphics-builder/SKILL.md` | Authored support geometry, supplied character assets, and visual review; no AAA result claimed. |
| UI | `A/threejs-game-ui-designer/SKILL.md` | Game HUD, menus, portraits, touch layout, and journal. |
| Debug/profile | `A/threejs-debug-profiler/SKILL.md` | Loading/rendering fixes, diagnostics, and frame-cost evidence. |
| QA/release | `A/threejs-qa-release/SKILL.md` | Production preview, controls, canvas pixels, screenshots, and static packaging. |
| Task tracking | `A/beads-task-flow/SKILL.md` | Scoped ownership and progress tracking. |
| Visual review | `C/visual-verdict/SKILL.md` | Iterative comparison against written art direction. |

## Reference ledger

Paths below are relative to `A`. This ledger records confirmed reads; it does not infer that a reference was loaded merely because it exists.

| Phase | Confirmed references |
| --- | --- |
| Gameplay systems | `threejs-gameplay-systems/references/gameplay-workflows.md`; `references/checklists/new-game-definition-of-done.md` under the same skill. |
| Graphics | `threejs-aaa-graphics-builder/references/visual-scorecard.md`, `implementation-blueprint.md`, `model-recipes.md`, `render-recipes.md`; `references/checklists/procedural-model-quality.md`, `material-lighting-quality.md`, `performance-safe-visual-detail.md` under the same skill. |
| UI | `threejs-game-ui-designer/references/ui-patterns.md`; `references/checklists/game-ui-quality.md`, `hud-readability.md`, `responsive-ui-fit.md`, `mobile-input.md` under the same skill. Confirmed and reread by the build owner during final checks. |
| Debug/profile | `threejs-debug-profiler/references/debug-profile-checklists.md`; `references/checklists/scene-debugging.md`, `performance-profile.md`, `mobile-input.md` under the same skill. Confirmed and reread by the build owner during final checks. |
| QA/release | `threejs-qa-release/references/qa-release-checklists.md`; `references/checklists/visual-verification.md`, `playtest-qa.md`, `release.md` under the same skill. The browser QA owner confirmed all four were read successfully; none were skipped. |
| Report audit | `threejs-game-director/scripts/audit_reference_report.py`, read by the documentation verifier. |

The separate premium/AAA, external-generation, physics-engine, and generated-audio audit modes are not claimed for this bounded first playable. Navigation uses custom walkability rules, A* routing, and short movement collision steps; there is no rigid-body physics engine.

## Phase ledger

| Phase | Status | Evidence or boundary |
| --- | --- | --- |
| Discovery and scope | Done | Two-route contract and ownership in `TWO_WAYS_HOME.md`. |
| Gameplay systems | Verified | 14 distinct focused rules cases and all four desktop/touch route playthroughs pass. |
| External asset sourcing | Done for supplied assets | Unchanged official GLBs, derived portraits, and notices; verified part catalogue metadata in `TRAITS.md`. |
| AAA graphics workflow | Integrated visual review passed | Score 93 against written direction: leaf ferry, four full-size passengers, bridge roots, camp memories, desktop HUD, and phone overlays. Premium/AAA qualification is outside this result. |
| UI | Verified for tested profiles | Observational markers, Try actions, field guide, lessons, hints, companion postcards, and persistent journal pass functional and visual checks. |
| Debug/profile | Verified within automated scope | Landing/reset defects corrected and independently rechecked; four route metrics, canvas pixels, and error-free production loading recorded. Physical hardware performance remains unqualified. |
| QA/release | Local prototype verified | Typecheck/build, 44 rules/persistence checks, four browser playthroughs, asset integrity, subdirectory loading, and failed-asset recovery pass. Human playtests and public release remain outside this result. |

Baseline director report audit:

```powershell
python C:/Users/longm/.agents/skills/threejs-game-director/scripts/audit_reference_report.py docs/VERIFICATION.md
```

**Baseline report audit: passed.** The audit checks the required report ledgers and phase markers. It does not replace gameplay, visual, or runtime verification.
