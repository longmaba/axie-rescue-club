# Three expeditions verification

Updated **2026-09-07** against [THREE_EXPEDITIONS.md](THREE_EXPEDITIONS.md). **The final build, TypeScript checks, 52 pure cases, two affected touch playthroughs, asset integrity, and static recovery pass. Integrated visual review: 93 / pass. All ten distinct browser cases have passing results across the documented candidate and final-build runs.** This report covers the three-island expansion; [VERIFICATION.md](VERIFICATION.md) retains the earlier Two Ways Home and walking-spacing evidence.

## Delivered scope

| Island | Distinct behavior |
| --- | --- |
| Bramblebrook | The existing log bridge and leaf ferry rescue, with both field lessons and optional keepsakes. |
| Sunseed Orchard | Push aligns a sluice; Splash supplies water through the repaired channel. Irrigation enables bridge, leaf, and garden growth. Log positioning can happen earlier. |
| Moonbell Marsh | Push raises a west-bank mast, Grow opens an east-bank moonflower, and Splash clears a mirror pool. All three preparations persist in any order; completing the last opens the rescue pen. |

All islands support bridge and ferry routes, the existing 1.6-unit walking gaps, full-size ferry passengers, and individual contribution memories. The atlas exposes all three islands without locks. Next, replay, and atlas actions start a fresh expedition while preserving the field lesson and saved history. The active island is reflected in the URL and browser title.

Version-3 postcards store a validated `levelId`. Missing legacy IDs mean Bramblebrook; explicit unknown IDs are rejected. Each island's completion count, best keepsakes, and discovered routes come from the latest 20 valid saved postcards. This is bounded local history, not lifetime progression. Camp summary fields retain their existing shape.

## Checks and command history

| Check | Current result |
| --- | --- |
| Focused `tests/rescue.spec.ts` and `tests/levels.spec.ts` | **39 passed** after the navigation fix: 14 existing rules cases plus 25 new cases covering irrigation, all six beacon orders, both routes and lessons, geometry, invalid actions, reset, level transitions, and a variable-frame movement regression. |
| Focused `tests/memories.spec.ts` | **13 passed**, executed by the persistence owner. Covers migration, level isolation, invalid IDs, version-3 saves, latest-20 progress, contribution isolation, won-only saving, and unavailable storage. |
| Targeted strict TypeScript checks | **Passed** for rules and persistence after the shared level API landed. |
| `npm run build` | **Passed**, confirmed by the build owner; the command runs TypeScript and Vite. |
| New browser coverage | **6 passed across two runs:** four new-island/profile playthroughs and two legacy-history cases. The initial run passed five; a corrected test waypoint allowed the remaining touch Marsh case to pass. Production code was unchanged. |
| Existing Bramblebrook browser regression | Three cases passed on the earlier candidate. The touch ferry failure was reproduced, fixed, and **passed on the final build**. Earlier temporary baseline artifacts were not retained; command history is preserved below. |
| Post-fix touch browser checks | **2 passed**, 2.4 minutes, against final `index-JlEu3syf.js`: Bramblebrook ferry and Marsh bridge. |
| Production UI captures | **Passed** on the DUB candidate: desktop/mobile JSON records show an empty error list and no horizontal overflow after phone atlas, marker overlap, and mirror thickness fixes. Final-build ferry and Marsh completion screenshots were also reviewed. |
| Integrated visual review | **93 / pass**, recorded in the [integrated verdict](../.omx/state/three-expeditions/ralph-progress.json), including the final Marsh phone completion card and atlas action. |
| Isolated art verification | **93 / pass**, recorded in the [art verdict](../scripts/art/evidence/three-levels-verdict.json). This does not establish the integrated game or phone UI result. |
| Official character integrity | **Passed again after the final build** for four pinned GLBs, totaling **9,385,284 bytes**; reported by the build owner. [Asset provenance](ASSETS.md). |
| Static subdirectory / loading recovery | **Passed again on `index-JlEu3syf.js`:** relative assets, hidden production diagnostics, nonblank canvas, and recovery after an aborted character download. Built HTML includes the level-neutral accessible label. [JSON](../artifacts/final/static-evidence.json). |
| Independent integration source review | No material defect found in the scoped level switch, identity, persistence, labels, and landing paths. See below. |

The current production assets reported by Vite are:

| File | Uncompressed | Gzip |
| --- | ---: | ---: |
| `dist/assets/index-JlEu3syf.js` | 731.95 kB | 197.19 kB |
| `dist/assets/index-CS3XcUaH.css` | 29.16 kB | 7.15 kB |

The final JavaScript SHA-256 is `B1B3D12A6588EEBBD888510C026DE7263CB5B65D028EB468630A4DAA79C0E948`, reported by the build owner. The stylesheet is byte-identical to the earlier candidate. No dependency was added. There is no separate lint script. The documentation owner did not rerun game builds or tests while integration and browser work were active.

Reproduction commands are listed below; their current outcomes are stated in the table, not implied by their inclusion:

```sh
npm run typecheck
npm run build
npx playwright test tests/rescue.spec.ts tests/levels.spec.ts --project=desktop-chrome
npx playwright test tests/memories.spec.ts --project=desktop-chrome --output=test-results-memories
npm test
node scripts/art/inspect-assets.mjs
node scripts/verify-static.mjs
```

The Playwright production preview uses `http://127.0.0.1:4191` and refuses an occupied port. The **52 distinct final pure cases** are counted once above; executing them under both configured projects repeats those cases rather than adding distinct behaviors.

Command history, with the earlier candidate and final build kept distinct:

| Command | Outcome |
| --- | --- |
| `npm exec playwright test tests/expeditions-browser.spec.ts -- --reporter=line` | **5 passed / 1 failed**, 6.5 minutes. The touch Marsh test completed the three light preparations, then aimed a waypoint into open water; the game correctly rejected that route. Only the test was changed to use the legal bridge approach. |
| `npm run typecheck` after the waypoint edit | **Passed.** |
| `npm exec playwright test tests/expeditions-browser.spec.ts -- --project=mobile-chrome --grep "moonbell-marsh real-control" --reporter=line` | **1 passed**, 1.4 minutes. Fresh passing evidence was retained. |
| `npm exec playwright test tests/browser.spec.ts -- --reporter=line` | **3 passed / 1 failed**, 3.5 minutes, on `index-DUB-Wplr.js`. Touch ferry play exposed a real intermittent navigation stop after landing. |
| `npm exec playwright test tests/levels.spec.ts -- --project=desktop-chrome --grep "variable frame" --reporter=line` before the fix | **1 failed**, deterministically reproducing the navigation error with a 12.5 ms initial update. |
| `npm exec playwright test tests/rescue.spec.ts tests/levels.spec.ts tests/memories.spec.ts -- --project=desktop-chrome --reporter=line` after the fix | **52 passed**, 4.3 seconds. |
| `npm exec playwright test tests/browser.spec.ts tests/expeditions-browser.spec.ts -- --project=mobile-chrome --grep "ferry rescue\|moonbell-marsh real-control" --reporter=line` | **2 passed**, 2.4 minutes, on final `index-JlEu3syf.js`. |

Neither initial browser command was entirely green. The earlier candidate has six passing new-island cases and three passing baseline cases. The final two-case run repeats Marsh touch and completes Bramblebrook touch ferry, yielding passing results for all ten distinct browser cases across these builds. This is not a claim that all ten were rerun on the final build. The Marsh waypoint correction was test-only; the later baseline navigation stop required an application fix.

The [navigation evidence ledger](../artifacts/three-expeditions/navigation-regression.md) preserves the command outcomes and deterministic red-to-green reproduction. The three earlier baseline screenshot/report sets and failed trace were cleared by the subsequent Playwright output cleanup before copying; they are **not retained**, and no replacement artifacts are claimed. New-island results were copied before that cleanup, and the final two passing sets were copied immediately after their run.

## Browser and visual evidence

Current production UI captures are retained under [artifacts/three-expeditions](../artifacts/three-expeditions/). They show island selection, intros, and initial play; they do not prove complete rescue playthroughs.

Both production UI capture records report zero errors and no horizontal overflow on `index-DUB-Wplr.js`. The final `index-JlEu3syf.js` [static-host record](../artifacts/final/static-evidence.json) shows **307 central color buckets**, **0.7743 colored coverage**, zero page errors, zero HTTP error responses, hidden production diagnostics, and passed failed-asset recovery under `/rescue-club/`. Its [screenshot](../artifacts/final/subdirectory-desktop.png) is local packaging evidence, not a public deployment.

| Capture | Desktop | Mobile emulation |
| --- | --- | --- |
| Atlas | [Screenshot](../artifacts/three-expeditions/desktop-atlas.png) | [Screenshot](../artifacts/three-expeditions/mobile-atlas.png) |
| Bramblebrook | [Initial play](../artifacts/three-expeditions/desktop-bramblebrook-playing.png) | [Initial play](../artifacts/three-expeditions/mobile-bramblebrook-playing.png) |
| Sunseed Orchard | [Initial play](../artifacts/three-expeditions/desktop-sunseed-orchard-playing.png) | [Initial play](../artifacts/three-expeditions/mobile-sunseed-orchard-playing.png) |
| Moonbell Marsh | [Initial play](../artifacts/three-expeditions/desktop-moonbell-marsh-playing.png) | [Initial play](../artifacts/three-expeditions/mobile-moonbell-marsh-playing.png) |
| Capture metadata | [JSON](../artifacts/three-expeditions/desktop-ui.json) | [JSON](../artifacts/three-expeditions/mobile-ui.json) |

The isolated art evidence includes [orchard before](../scripts/art/evidence/sunseed-orchard-before.png), [irrigated orchard](../scripts/art/evidence/sunseed-orchard-after.png), [marsh before](../scripts/art/evidence/moonbell-marsh-before.png), and [lit marsh](../scripts/art/evidence/moonbell-marsh-after.png). The final art-owner score is **93 / pass**, following the mirror-pool thickness correction. The separate integrated score is also **93 / pass**, against written direction rather than a supplied reference image. The owner reviewed phone atlas/intros/HUD, desktop irrigation and connected light, the Orchard phone ferry/win/next card, and Marsh's completed signal, phone completion card, final atlas action, and correctly marked campaign card. Final-build Marsh signal/win and Bramblebrook ferry seating/win were reviewed again. No remaining visual defect was identified in the reviewed captures.

The [routes directory](../artifacts/three-expeditions/routes/) now retains **56 PNGs and five JSON reports**. The desktop Orchard, desktop Marsh, touch Orchard, and two legacy-history captures retain successful `index-DUB-Wplr.js` evidence. The same-named touch Marsh files were replaced by its final `index-JlEu3syf.js` rerun; `mobile-chrome-ferry-*` adds final-build Bramblebrook evidence. All five gameplay reports record zero console, runtime, failed-request, and HTTP-response errors, using either a combined `errors` list or the baseline's four separate arrays.

| Profile / expedition | Route / lesson | Gameplay evidence | Completion evidence |
| --- | --- | --- | --- |
| Desktop Orchard | Bridge / Rose Bud | [Watered orchard](../artifacts/three-expeditions/routes/desktop-chrome-sunseed-orchard-watered-orchard.png) | [Postcard](../artifacts/three-expeditions/routes/desktop-chrome-sunseed-orchard-win.png), [JSON](../artifacts/three-expeditions/routes/desktop-chrome-sunseed-orchard-evidence.json) |
| Desktop Marsh | Ferry / Watering Can | [Connected signal](../artifacts/three-expeditions/routes/desktop-chrome-moonbell-marsh-connected-signal.png), [four passengers](../artifacts/three-expeditions/routes/desktop-chrome-moonbell-marsh-ferry-return-sailing.png) | [Postcard](../artifacts/three-expeditions/routes/desktop-chrome-moonbell-marsh-win.png), [JSON](../artifacts/three-expeditions/routes/desktop-chrome-moonbell-marsh-evidence.json) |
| Touch Orchard | Ferry / Watering Can | [Watered orchard](../artifacts/three-expeditions/routes/mobile-chrome-sunseed-orchard-watered-orchard.png), [four passengers](../artifacts/three-expeditions/routes/mobile-chrome-sunseed-orchard-ferry-return-sailing.png) | [Postcard](../artifacts/three-expeditions/routes/mobile-chrome-sunseed-orchard-win.png), [next island](../artifacts/three-expeditions/routes/mobile-chrome-sunseed-orchard-next-island.png), [JSON](../artifacts/three-expeditions/routes/mobile-chrome-sunseed-orchard-evidence.json) |
| Touch Marsh, final build | Bridge / Rose Bud | [Alternate preparation order](../artifacts/three-expeditions/routes/mobile-chrome-moonbell-marsh-moonflower-awaits-mast.png), [connected signal](../artifacts/three-expeditions/routes/mobile-chrome-moonbell-marsh-connected-signal.png) | [Postcard](../artifacts/three-expeditions/routes/mobile-chrome-moonbell-marsh-win.png), [JSON](../artifacts/three-expeditions/routes/mobile-chrome-moonbell-marsh-evidence.json) |
| Touch Bramblebrook, final build | Ferry / Rose Bud | [Gameplay](../artifacts/three-expeditions/routes/mobile-chrome-ferry-gameplay.png), [four passengers](../artifacts/three-expeditions/routes/mobile-chrome-ferry-return-sailing.png) | [Postcard](../artifacts/three-expeditions/routes/mobile-chrome-ferry-win.png), [JSON](../artifacts/three-expeditions/routes/mobile-chrome-ferry-root-evidence.json) |

The retained reports' sampled diagnostics and central canvas pixels are:

| Profile / expedition | Draw calls | Triangles | Session average FPS | Color buckets | Colored coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop Orchard | 100 | 130,015 | 14.65 | 244 | 0.8183 |
| Desktop Marsh | 108 | 131,940 | 16.44 | 320 | 0.6233 |
| Touch Orchard | 78 | 117,087 | 21.88 | 159 | 0.6207 |
| Touch Marsh, final build | 93 | 137,360 | 21.10 | 168 | 0.7268 |
| Touch Bramblebrook, final build | 70 | 95,931 | 24.13 | 184 | 0.6131 |

Return-sailing samples separately show **133 calls / 132,620 triangles** for desktop Marsh, **118 calls / 122,331 triangles** for touch Orchard, and **102 calls / 100,207 triangles** for final-build touch Bramblebrook. These are snapshots, not peak budgets. Renderer FPS counters accumulate across island switches and include startup, cold rendering, and concurrent headless activity; they do not qualify physical-phone performance or isolated per-island frame rates.

The desktop Orchard test recreates all three islands twice. Geometry/texture counts repeat exactly: Marsh **82 / 26**, Bramblebrook **75 / 25**, Orchard **85 / 25**. No character GLB is fetched again during those switches before the explicit page reload. This supports correct resource reuse for the tested cycle, not an unlimited-duration memory-leak claim.

## Implementation and independent source review

| Files | Change |
| --- | --- |
| `src/game/levels.ts` | One catalogue owns level IDs, copy, supported targets, map geometry, ferry anchors, and keepsakes. |
| `src/game/rescue.ts`, `tests/levels.spec.ts` | Shared simulation gains level transitions, irrigation and beacon states, per-level navigation, explicit unsupported-target rejection, and a tested floating-point movement-budget guard. Baseline rule tests remain. |
| `src/game/memories.ts`, `tests/memories.spec.ts` | Version-3 saves, strict level identity, legacy attribution, and per-level progress derived from bounded history. |
| `src/main.ts` | Island replacement and disposal, lighting changes, active-level labels/diagnostics, URL updates, and formation resets. Character GLBs are reused. |
| `src/art/island.ts` | Original orchard/marsh environments, separate puzzle stations, irrigation, and beacon animations. |
| `src/ui.ts`, `src/styles.css` | Atlas, next/replay actions, island headings, station feedback, responsive layouts, and island-labelled postcards. |
| `tests/expeditions-browser.spec.ts`, `tests/browser-helpers.ts`, `tests/browser.spec.ts` | Shared real-control helpers, new island/legacy-history verification, and baseline route coverage. |
| `index.html` | Canvas accessibility text describes the rescue islands without incorrectly naming Bramblebrook on other levels; verified in the final built HTML. |
| `README.md`, this report | Player/developer instructions and evidence boundaries for the expansion. |

The independent source review found no material defect in the assigned paths. Switching clears keys, queued navigation, selected targets, transient particles, and follower traces; removes and disposes the old island; resets the save guard; and preserves the selected lesson through the simulation transition. Postcards save once per won expedition. URL IDs are validated before construction, while labels and read-only diagnostics resolve the active level's targets.

The build owner subsequently corrected the phone atlas maximum width and prevented mobile world markers from overlapping the taller mission HUD. The art owner corrected mirror-pool thickness. Their candidate production captures and integrated visual verdict pass. Final `index-JlEu3syf.js` also includes the navigation correction, with unchanged CSS and the level-neutral canvas label.

The navigation regression started a legal route from the east dock and updated it by 12.5 ms. A floating-point remainder after grid alignment was too small to move the position, but the loop treated that as a collision and cleared the route. The final loop processes only movement budgets greater than `1e-9`; genuine collision rejection remains. The same deterministic case failed before this one-condition fix and passes afterward, together with all 52 pure cases. Both affected real-control touch reruns pass on the final build, including return crossing, saved postcards, replay, reload, and journal checks.

Dock landing spans remain safe with the wider walking formation: Orchard followers land at Z -3.85 and -4.9, with the rescued traveler at -1.85; Marsh followers land at -3.25 and -4.3, with the traveler at -1.25. These positions stay clear of the closed garden, pen, and shore limits. The following trail starts with only the occupied 2.1-unit shore span, then expands as legal walking extends it. New-island browser evidence also records the rendered four-passenger return crossings.

The implementation reuses Push/Grow/Splash and one simulation rather than adding a separate engine per island. A level catalogue replaces fixed active-map references. Fixed ferry paths, existing character loading and skeleton-aware cloning, and the same bounded memory store keep the expansion within the current architecture. No physics engine or new storage service was introduced.

## Assets and remaining limits

The official Kibo, Pomodoro, Bing, and Sapidae GLBs, their derived portraits, and notices remain the source of character identity. The environments use the project's original editable Three.js kit. [ASSETS.md](ASSETS.md) records asset provenance; [TRAITS.md](TRAITS.md) separates verified official part metadata from this game's authored field lessons. No external model/image/audio generation, replacement Axie art, Blender asset, premium/AAA qualification, or generated-audio claim is made. Existing feedback audio uses Web Audio synthesis.

- Fresh human playtests have not been conducted. [PLAYTEST.md](PLAYTEST.md) supplies the prepared protocol; automated success does not establish discovery, enjoyment, first-play duration, or replay interest.
- Physical phones/tablets, Safari, Firefox, and sustained device performance remain unqualified. Mobile captures use Chromium emulation.
- Postcards and completion marks are local to browser storage, retain 20 valid records, and do not sync across devices. Failed saves do not grant persisted completion.
- Live approved Mixer rendering, arbitrary owned-Axie mapping, wallets, and on-chain progression remain outside this implementation. Lessons do not assign genes to the fixed mascots.
- Event registration, public deployment, and submission were not performed as part of this implementation. Local production preview and subdirectory checks do not prove a public release.

## Skill-loading ledger

The [baseline ledger](VERIFICATION.md#skill-loading-ledger) records confirmed reads reused for this expansion. The [current contract](THREE_EXPEDITIONS.md#verification-and-workflow) adds feature-research. This ledger does not assert every reused reference was reread. Roots: `A` = `C:/Users/longm/.agents/skills`; `C` = `C:/Users/longm/.codex/skills`.

| Responsibility | Skill | Usage |
| --- | --- | --- |
| Director | `A/threejs-game-director/SKILL.md` | Scope, ownership, phases, and evidence gates. |
| Gameplay systems | `A/threejs-gameplay-systems/SKILL.md` | Shared game rules, navigation, and input. |
| AAA graphics workflow | `A/threejs-aaa-graphics-builder/SKILL.md` | Original environment detail and art review; no AAA result claimed. |
| UI | `A/threejs-game-ui-designer/SKILL.md` | Atlas, HUD, station feedback, and responsive overlays. |
| Debug/profile | `A/threejs-debug-profiler/SKILL.md` | Runtime, rendering, resource lifetime, and diagnostics. |
| QA/release | `A/threejs-qa-release/SKILL.md` | Production preview, controls, screenshots, canvas pixels, and packaging. |
| Feature research | `C/feature-research/SKILL.md` | Current architecture inspection through `rg` and targeted reads; `codebase_search` was unavailable. |
| Task tracking | `A/beads-task-flow/SKILL.md` | Scoped parallel ownership and progress. |
| Visual review | `C/visual-verdict/SKILL.md` | Comparison with written direction. |

## Reference ledger

Confirmed reused references below come from the baseline ledger. They are listed under their skill directories beneath `A`. The build owner confirmed the current skill reads and reuse of this reference set; no additional reference reads are claimed.

| Phase | Confirmed references |
| --- | --- |
| Gameplay systems | `threejs-gameplay-systems/references/gameplay-workflows.md`; `references/checklists/new-game-definition-of-done.md`. |
| Graphics | `threejs-aaa-graphics-builder/references/visual-scorecard.md`, `implementation-blueprint.md`, `model-recipes.md`, `render-recipes.md`; `references/checklists/procedural-model-quality.md`, `material-lighting-quality.md`, `performance-safe-visual-detail.md`. |
| UI | `threejs-game-ui-designer/references/ui-patterns.md`; `references/checklists/game-ui-quality.md`, `hud-readability.md`, `responsive-ui-fit.md`, `mobile-input.md`. |
| Debug/profile | `threejs-debug-profiler/references/debug-profile-checklists.md`; `references/checklists/scene-debugging.md`, `performance-profile.md`, `mobile-input.md`. |
| QA/release | `threejs-qa-release/references/qa-release-checklists.md`; `references/checklists/visual-verification.md`, `playtest-qa.md`, `release.md`. |
| Report audit | `threejs-game-director/scripts/audit_reference_report.py`, read by the documentation verifier in the earlier report workflow. |

## Phase ledger

| Phase | Status | Evidence or remaining work |
| --- | --- | --- |
| Discovery and scope | Done | Three-expedition contract and existing architecture review. |
| Gameplay systems | Verified within recorded build coverage | 39 rule cases and 13 persistence cases pass after the movement fix. All ten distinct browser cases have passing results across the recorded runs; the affected two pass on the final build. |
| External asset sourcing | Existing approved sources reused | Official GLBs and original environment kit; no new generation or dependency. |
| AAA graphics workflow | Isolated and integrated verdicts pass | Separate 93/pass verdicts, including final desktop and phone completion UI. |
| UI | Verified within tested profiles | Atlas, station feedback, next/replay, journal, and legacy-history checks pass in desktop/touch coverage. Neutral canvas label verified in final HTML; final affected-route completion UI reviewed. |
| Debug/profile | Verified within current evidence | Active-level lifecycle, safe dock spans, production loading, render samples, and repeated resource counts recorded. Physical hardware performance remains unqualified. |
| QA/release | Local implementation verified | Final build, 52 pure cases, affected touch reruns, asset integrity, and static recovery pass. Earlier candidate outcomes and missing temporary baseline artifacts are disclosed. No public release claim. |

Baseline director report audit:

```powershell
python C:/Users/longm/.agents/skills/threejs-game-director/scripts/audit_reference_report.py docs/THREE_EXPEDITIONS_VERIFICATION.md
```

**Report audit: passed.** The baseline audit checks required ledgers and markers, not gameplay correctness or premium qualification.
