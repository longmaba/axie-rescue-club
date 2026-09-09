# Orchard and Marsh puzzle rework verification

Updated **2026-09-08** against [PUZZLE_REWORK.md](PUZZLE_REWORK.md). **The production build, 46 pure cases, all 10 distinct browser cases, packaged character integrity, and static recovery pass. All browser cases exercised the same frozen `index-NMLraHQD.js` candidate across the documented runs. Integrated visual review is 92 / pass; isolated art review is 93 / pass.** This report covers the replacement of the existing Orchard and Marsh puzzles. It does not carry forward an earlier build's release or visual result.

## Delivered scope and spatial decisions

Exactly three level IDs remain. Bramblebrook keeps its existing bridge/ferry rescue; Sunseed Orchard and Moonbell Marsh use new mechanics and navigation layouts under their existing IDs. There is no fourth island.

| Island | Layout and player decision | Rescue condition |
| --- | --- | --- |
| Bramblebrook | Existing two-bank brook. Combine abilities to build a rooted bridge or launch and sail a leaf. | Greet the traveler and return by an earned bridge or ferry crossing. |
| Sunseed Orchard | A 7-by-5 hedge court with two movable, distinct seed pods. The Sun pod must temporarily move away from its nearby bed to clear the Berry pod's delivery corridor. The accepted solution uses ten cardinal pushes. | Put each pod on its matching bed, water it with Bing, then grow it with Pomodoro. Both plants open the east trellis. Greet the traveler and return to camp for `seedbeds`. |
| Moonbell Marsh | Irregular garden patches, three rotating mirrors, and two receivers sharing one live beam. Light the root flower first, grow a permanent connector, then turn the beam away from those roots toward the far lantern. | The exit requires both the permanent path and current exit illumination. Greeting the traveler latches the exit open for a safe return; reaching camp earns `moonbeam`. |

Kibo pushes Orchard pods from the adjacent cardinal square; hedges, another pod, or a court boundary block the destination. Watering is valid only on the matching bed, and growth requires water. Grown pods remain blocking objects. UI controls select a pod and a standing side; selecting a target does not automatically use its ability.

Marsh uses an actual collinear ray trace with slash/backslash reflection, absorbing receivers, bounded segments, and loop protection. Root and exit illumination are derived from the current mirror state. The grown path persists after the light moves; the exit is latched only after rescue.

**Undo / Z** restores the previous puzzle action, position, contributions, action count, and causal keepsake state. Elapsed time remains monotonic. Invalid actions do not consume undo history. Undo is disabled after greeting the traveler; restart and level switching clear the current run safely. Bramblebrook's part-inspired field lessons remain selected between islands but do not bypass the new puzzle conditions.

## Saved history and compatibility

Version-4 postcards add `puzzleRevision: 1 | 2` and accept `bridge`, `ferry`, `seedbeds`, or `moonbeam` routes. New saves use the current level revision: 1 for Bramblebrook, 2 for the redesigned islands. Missing legacy revisions become 1; explicit invalid revisions and level IDs are rejected.

Older postcards stay readable, retain their camp souvenirs, and appear as earlier adventures when their island has been redesigned. Current Orchard/Marsh completion requires both revision 2 and the matching new route. Writing the new storage format does not upgrade a historical achievement. Legacy Bramblebrook postcards without a route retain their original completion. Current saves require a won state and the correct rescue route, and new-island saves cannot grant Brook crossing flags.

All summaries use the latest **20 valid records**, including historical postcards. Completion can fall out when its record is evicted; this is local bounded history, not lifetime or synchronized progression. Storage failures do not grant unsaved completion. Camp retains its existing keepsake/visitor/contribution fields; its routes array now accepts the four route IDs.

## Checks and command history

| Check | Current result and attribution |
| --- | --- |
| `tests/rescue.spec.ts` + `tests/levels.spec.ts` | **29 passed, 4.8 seconds**, reported by the rules owner: 14 existing Bramblebrook cases and 15 current level/puzzle cases, including the navigation roundoff regression. |
| `tests/memories.spec.ts` | **17 passed, 940 ms**, directly observed by the persistence/documentation owner. Covers revision migration, matching routes, history isolation, latest-20 retention, invalid input, won-only writes, contribution snapshots, and storage failure. |
| Targeted TypeScript | **Passed** for the rules API, reported by its owner; the persistence owner's strict/no-unused check on the memory module and tests also passed. |
| Independent rules/layout review | **Pass within scope.** Direct source probes completed both puzzles and safe returns, exercised wrong-push and growth undo, and sampled 6,039 legal formation-trail points. Details below. |
| Whole-project `npm run typecheck` | **Passed** after the browser harness was authored, reported by the rules/QA owner; production build also runs TypeScript. |
| `npm run build` | **Passed:** candidate `index-NMLraHQD.js`, built by the root owner after the art source freeze. |
| Desktop and touch rework playthroughs | **All six distinct cases pass across two runs:** initial 5 passed / 1 failed, then touch Orchard passed in 2.2 minutes. The correction changes only the test's greeting/pickup order; candidate NMLraHQD is unchanged. |
| Bramblebrook browser regression | **4 passed, 3.5 minutes:** bridge and ferry on desktop and touch, on the same NMLraHQD candidate. |
| Integrated UI and visual review | **92 / pass:** initial presentation and all four completed redesigned-puzzle/profile routes were independently reviewed. [Verdict](../artifacts/puzzle-rework/integrated-visual-verdict.json). Root also inspected touch Orchard's return parade and Marsh's persistent path/current beam and win card. |
| Isolated art review | **93 / pass**, confirmed by the art owner after inspecting current captures. [Final isolated verdict](../scripts/art/evidence/puzzle-rework-verdict.json). Hedge bounds, terrain seams, mirror occlusion, and barrier retraction are corrected. |
| Production UI capture | **Passed** on `index-NMLraHQD.js`: desktop/mobile JSON identifies the script and reports `errors: []` and `horizontalOverflow: false`. These captures cover atlas, intros, initial play, and puzzle controls, not complete rescues. |
| Console, page errors, request failures, canvas pixels | **All eight playthrough reports have zero recorded errors and nonblank pixel evidence.** Production UI error arrays are empty. Static verification reports **304 central color buckets**, **0.7739 colored coverage**, zero page errors and zero HTTP error responses. |
| Resource lifetime / repeated island switching | **Isolated disposal and desktop Orchard switch cycles pass:** repeated Marsh/Brook/Orchard resource counts are stable. This is the tested cycle scope, not an endurance or all-device claim. [State inspection JSON](../scripts/art/evidence/puzzle-rework-state.json), [browser JSON](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-evidence.json). |
| Official GLB integrity | **Passed in source and `dist`:** all four SHA-256 values and byte sizes match the approved files, totaling **9,385,284 bytes**. [Source JSON](../artifacts/puzzle-rework/asset-integrity.json), [packaged JSON](../artifacts/puzzle-rework/packaged-asset-integrity.json), produced by the root owner and read by the documentation owner. |
| Static subdirectory/recovery | **Passed** on the production candidate: Brook initial play, real atlas navigation to both redesigned levels under `/rescue-club/`, diagnostics absent, and recovery after an aborted GLB request. [Static JSON](../artifacts/puzzle-rework/static/static-evidence.json). |
| Director report audit / local links | **Passed:** baseline director audit and all **109 local links/anchors** across this report and README. |

Observed commands are recorded separately from intended final checks:

| Command | Outcome |
| --- | --- |
| `npx playwright test tests/rescue.spec.ts tests/levels.spec.ts --project=desktop-chrome --output=test-results/puzzle-rules-01` | **28 passed / 1 failed.** A test compared `2.4000000000000004` with `2.4` exactly. The assertion was changed to eight-digit proximity; no application defect was identified. The rules owner reports the initial failure context retained in the unique output folder. |
| `npx playwright test tests/rescue.spec.ts tests/levels.spec.ts --project=desktop-chrome --output=test-results/puzzle-rules-02` | **29 passed, 4.8 seconds.** |
| `npm exec playwright test memories.spec.ts -- --config tests --output artifacts/puzzle-rework/memory-tests-20260908 --reporter=line` | **17 passed, 940 ms.** The tests-only configuration skips the production browser server. [Run status](../artifacts/puzzle-rework/memory-tests-20260908/.last-run.json). |
| `npm exec tsc -- --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node --noUnusedLocals --noUnusedParameters src/game/memories.ts tests/memories.spec.ts` | **Passed, exit 0.** |
| `npm run typecheck` after current browser-case authoring | **Passed**, reported by the rules/QA owner; no browser run had started at that point. |
| `npm run build` after art freeze | **Passed**, reported by the root owner: Vite 8.2.2, 24 modules, 208 ms Vite build time. |
| `node scripts/art/evidence/inspect-puzzle-rework.mjs` | **Passed**, reported by the art owner; retained JSON checks physical state transforms, current ray endpoints, barriers, and exact disposal. |
| `node scripts/art/capture-puzzle-rework.mjs` | **Passed** for staged art captures, reported by the art owner; final screenshots were inspected for the isolated 93/pass verdict. |
| `node artifacts/puzzle-rework/capture-ui.mjs --production` | **Passed** on `index-NMLraHQD.js`, reported by the root owner; both retained profile reports identify the candidate and have no recorded errors/overflow. |
| `node scripts/verify-static.mjs --out artifacts/puzzle-rework/static` | **Passed** on the production candidate, reported by the root owner; relative hosting, all three island entry flows, hidden diagnostics, and failed-asset recovery. |
| `npx playwright test tests/expeditions-browser.spec.ts --output=test-results/puzzle-browser-01` | **5 passed / 1 failed, 7.1 minutes.** Touch Orchard failed only after all ten pushes and both growth stages succeeded. See the retained harness failure below. |
| `npx playwright test tests/expeditions-browser.spec.ts --project=mobile-chrome --grep 'sunseed-orchard spatial' --output=test-results/puzzle-browser-02` | **1 passed, 2.2 minutes.** The same pickup count remains asserted after greeting. A return-walking check also requires more than 4.8 units traveled and all four actors more than 0.7 units apart pairwise. Production NMLraHQD is unchanged. |
| `npm run typecheck` after the touch harness correction | **Passed**, reported by the rules/QA owner. |
| `npx playwright test tests/browser.spec.ts --output=test-results/puzzle-brook-01` | **4 passed, 3.5 minutes.** Desktop bridge 40.9 s, desktop ferry 52.3 s, touch bridge 51.0 s, touch ferry 58.9 s. Same NMLraHQD candidate. |

The **46 distinct pure cases** are counted once. Running a pure case under another configured browser project does not create additional behavioral coverage. No whole-game build or browser tests were run by the documentation owner during parallel integration.

The frozen production candidate is identified in [candidate.json](../artifacts/puzzle-rework/candidate.json). Its files and hashes were produced by the build owner and read by the documentation owner. Gzip sizes below are the reported Vite output.

| Production file | Bytes | Gzip |
| --- | ---: | ---: |
| `dist/assets/index-NMLraHQD.js` | 762,545 | 207.57 kB |
| `dist/assets/index-BWvi65rh.css` | 33,154 | 7.90 kB |

JavaScript SHA-256: `3EA9E1C3CC48A24EFE78F29308B9261BE4ACA337F71B85872743EDAEB39EA33A`. CSS SHA-256: `7D8B9C243E7E99938DAF5F0FBFFF746EB2CD82DEFBDFE3D07220FB6E1FE5BB02`. The root owner rechecked these hashes after browser work. No application source/build change followed the freeze; the touch correction changed only the test harness.

All **10 distinct browser cases** pass on this candidate: eight complete route/profile playthroughs and two legacy-history cases. They passed across three recorded commands, not one entirely green initial invocation. The first run's failed touch case and test-only correction remain disclosed above and below.

## Independent review evidence

The read-only review inspected [orchard.ts](../src/game/orchard.ts), [moonbeam.ts](../src/game/moonbeam.ts), [rescue.ts](../src/game/rescue.ts), [levels.ts](../src/game/levels.ts), and the authoritative contract. No material rules/layout defect was found.

A one-off in-memory Node probe loaded the current TypeScript sources and used `moveTo`, `update`, `select`, `interact`, and `undoPuzzle`. It did not edit source files, mutate a live browser, or rerun memory tests. Its output was observed in the session; no standalone probe script or browser trace is claimed.

- **Orchard:** the initial north push stranded Berry at the boundary; Undo restored its position, zero pushes/actions, and empty contributions without rewinding time. The ten-push solution completed while Berry was grown before Sun's final two pushes. Undoing the final growth closed the trellis and restored the watered pod; regrowth, greeting, and the camp return succeeded. The completed state used `seedbeds`, with both Brook route flags false.
- **Marsh:** approaching C before rooting failed, and growing an unlit root flower failed without action credit. Powering the source and redirecting A/B lit the roots. Growing them made a permanent path; turning B away extinguished root illumination while retaining access to C. Turning C lit the exit. After greeting, a further C turn extinguished exit illumination while the gate stayed open. The return completed as `moonbeam`, with both Brook flags false.
- **Formation:** after successful puzzle actions and undo, the probe sampled returned trail segments at intervals no greater than 0.025 world units. All **6,039 samples** passed `isWalkable`.

These independent checks establish reachable logical solutions and legal reseeding trails. Rendered clearance, return-walking separation, touch controls, and visible feedback are addressed separately by the completed browser/visual evidence below. Puzzle discovery, enjoyment, and human completion time remain untested without fresh-player sessions.

## Candidate attribution and artifact retention

The [previous expansion report](THREE_EXPEDITIONS_VERIFICATION.md#checks-and-command-history) documents a real navigation roundoff fix and an earlier loss of temporary browser artifacts during Playwright cleanup. The rework uses unique output locations for focused runs and must copy successful screenshots/reports before another run can clear them. An absent trace is not treated as retained evidence.

This rework's ten distinct browser cases qualify the identified NMLraHQD production candidate. For future changes, retain each run's candidate attribution and rerun affected cases after application edits; do not present mixed-candidate results as a same-candidate suite. Test-only corrections remain distinct from application fixes. The old `index-JlEu3syf.js` build and historical 93/pass verdicts do not qualify this rework.

Initial integrated captures were taken from the **development server**, not the frozen production candidate. The [desktop JSON](../artifacts/puzzle-rework/desktop-ui.json) and [mobile JSON](../artifacts/puzzle-rework/mobile-ui.json) each report `production: false`, `errors: []`, and `horizontalOverflow: false`. The root owner initially scored these **88 / revise**: hedge bounds and terrain seams needed correction despite the distinct layouts and readable controls. Those corrections were completed before the production freeze. The [current workflow record](../.omx/state/puzzle-rework/ralph-progress.json) tracks the subsequent review and closure.

| Initial development capture | Evidence |
| --- | --- |
| Desktop Orchard | [Playing](../artifacts/puzzle-rework/desktop-sunseed-orchard-playing.png) |
| Desktop Marsh | [Playing](../artifacts/puzzle-rework/desktop-moonbell-marsh-playing.png) |
| Phone pod controls | [Screenshot](../artifacts/puzzle-rework/mobile-sunseed-orchard-pod-controls.png) |
| Phone Marsh overview | [Screenshot](../artifacts/puzzle-rework/mobile-moonbell-marsh-overview.png) |

The subsequent **production** captures preserve the corrected art and explicitly identify `index-NMLraHQD.js`. Both [desktop](../artifacts/puzzle-rework/production/desktop-ui.json) and [mobile](../artifacts/puzzle-rework/production/mobile-ui.json) JSON records have empty errors and no horizontal overflow. The final **92 / pass** integrated verdict covers 18 initial-play/intro/control/atlas captures plus all four completed Orchard/Marsh routes on desktop and touch. It uses written direction, not a supplied reference image.

| Production capture | Desktop | Mobile emulation |
| --- | --- | --- |
| Atlas | [Screenshot](../artifacts/puzzle-rework/production/desktop-atlas.png) | [Screenshot](../artifacts/puzzle-rework/production/mobile-atlas.png) |
| Orchard play / pod controls | [Playing](../artifacts/puzzle-rework/production/desktop-sunseed-orchard-playing.png) | [Standing-side controls](../artifacts/puzzle-rework/production/mobile-sunseed-orchard-pod-controls.png) |
| Marsh play / overview | [Playing](../artifacts/puzzle-rework/production/desktop-moonbell-marsh-playing.png) | [Overview](../artifacts/puzzle-rework/production/mobile-moonbell-marsh-overview.png) |

The production UI diagnostic samples report 12.5 FPS desktop and 19.1 FPS mobile emulation under shared headless rendering. These are not physical-device performance qualification or a sustained benchmark. The [static-host screenshot](../artifacts/puzzle-rework/static/subdirectory-desktop.png) provides Brook pixel evidence; separate [Orchard](../artifacts/puzzle-rework/static/subdirectory-sunseed-orchard.png) and [Marsh](../artifacts/puzzle-rework/static/subdirectory-moonbell-marsh.png) captures retain the new-level entry flows under `/rescue-club/`. This is local packaging verification, not a public deployment.

Final isolated art is recorded in the [render report](../scripts/art/evidence/puzzle-rework-render-report.json). The art owner inspected its authored-state captures and recorded **93 / pass**, following earlier 88/revise and 89/revise iterations. This is separate from the completed real-control playthroughs and the final integrated **92 / pass** verdict.

| Isolated staged scene, including official characters | Draw calls | Rendered triangles | Capture |
| --- | ---: | ---: | --- |
| Orchard initial | 83 | 84,023 | [Screenshot](../scripts/art/evidence/rework-sunseed-orchard-initial.png) |
| Orchard solved | 82 | 84,215 | [Screenshot](../scripts/art/evidence/rework-sunseed-orchard-solved.png) |
| Marsh initial | 97 | 95,874 | [Screenshot](../scripts/art/evidence/rework-moonbell-marsh-initial.png) |
| Marsh rerouted | 104 | 98,578 | [Screenshot](../scripts/art/evidence/rework-moonbell-marsh-rerouted.png) |
| Marsh solved | 100 | 98,110 | [Screenshot](../scripts/art/evidence/rework-moonbell-marsh-solved.png) |

All staged scene error arrays are empty. These development-preview counters are not GPU timings or packaged-build performance claims. Source inspection also verifies ten-push prop transforms, wet/grown/reset presentation, actual rule-derived ray endpoint matrices, mirror rotation, permanent-path display, barriers, and exact resource disposal. Bramblebrook's source regression remains 100 meshes / 97,462 triangles, with unchanged full-size ferry seats. Integrated mobile/frame-rate qualification remains separate.

## Real-control browser evidence

Passing evidence was copied immediately to [artifacts/puzzle-rework/routes](../artifacts/puzzle-rework/routes/), which retains **85 PNGs and eight JSON reports**. Four redesigned puzzle/profile playthroughs, four Brook route/profile regressions, and both legacy-history cases passed on NMLraHQD across the recorded runs.

| Completed case | Active draw calls / triangles | Canvas color buckets / colored fraction | Evidence |
| --- | --- | --- | --- |
| Desktop Orchard, `seedbeds`, Rose Bud | 78 / 82,745 | 212 / 0.6388 | [JSON](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-evidence.json), [undo recovery](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-undo-recovery.png), [staging decision](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-sun-makes-room.png), [win](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-win.png), [history](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-history.png) |
| Touch Orchard, `seedbeds`, Watering Can | 64 / 79,613 | 221 / 0.6899 | [JSON](../artifacts/puzzle-rework/routes/mobile-chrome-sunseed-orchard-evidence.json), [undo recovery](../artifacts/puzzle-rework/routes/mobile-chrome-sunseed-orchard-undo-recovery.png), [return parade](../artifacts/puzzle-rework/routes/mobile-chrome-sunseed-orchard-return-parade.png), [win](../artifacts/puzzle-rework/routes/mobile-chrome-sunseed-orchard-win.png), [history](../artifacts/puzzle-rework/routes/mobile-chrome-sunseed-orchard-history.png) |
| Desktop Marsh, `moonbeam` | 96 / 96,640 | 285 / 0.6620 | [JSON](../artifacts/puzzle-rework/routes/desktop-chrome-moonbell-marsh-evidence.json), [roots lit](../artifacts/puzzle-rework/routes/desktop-chrome-moonbell-marsh-roots-lit.png), [light rerouted](../artifacts/puzzle-rework/routes/desktop-chrome-moonbell-marsh-light-borrowed.png), [win](../artifacts/puzzle-rework/routes/desktop-chrome-moonbell-marsh-win.png) |
| Touch Marsh, `moonbeam` | 61 / 90,266 | 219 / 0.6894 | [JSON](../artifacts/puzzle-rework/routes/mobile-chrome-moonbell-marsh-evidence.json), [light rerouted](../artifacts/puzzle-rework/routes/mobile-chrome-moonbell-marsh-light-borrowed.png), [win](../artifacts/puzzle-rework/routes/mobile-chrome-moonbell-marsh-win.png), [history](../artifacts/puzzle-rework/routes/mobile-chrome-moonbell-marsh-history.png) |
| Desktop Brook, bridge, Rose Bud | 85 / 107,903 | 301 / 0.8010 | [JSON](../artifacts/puzzle-rework/routes/desktop-chrome-bridge-root-evidence.json) |
| Desktop Brook, ferry, Watering Can | 84 / 100,863 | 294 / 0.6935 | [JSON](../artifacts/puzzle-rework/routes/desktop-chrome-ferry-float-evidence.json) |
| Touch Brook, bridge, Watering Can | 74 / 99,695 | 166 / 0.8192 | [JSON](../artifacts/puzzle-rework/routes/mobile-chrome-bridge-float-evidence.json) |
| Touch Brook, ferry, Rose Bud | 71 / 96,099 | 186 / 0.6141 | [JSON](../artifacts/puzzle-rework/routes/mobile-chrome-ferry-root-evidence.json) |

All four redesigned-puzzle reports have `errors: []` and matching version-4/revision-2 postcards. Both Orchard records contain ten concrete Kibo push contributions and persisted camp credit after reload. The desktop Orchard's two cycles through the three islands repeat exactly: Marsh **86 geometries / 26 textures**, Brook **74 / 25**, Orchard **84 / 25**. Its model-response list includes the initial load and explicit reload; no extra island-switch fetch is asserted. The separate desktop and touch legacy-history cases pass and retain [desktop journal](../artifacts/puzzle-rework/routes/desktop-chrome-legacy-history.png), [desktop progress](../artifacts/puzzle-rework/routes/desktop-chrome-legacy-campaign-progress.png), [touch journal](../artifacts/puzzle-rework/routes/mobile-chrome-legacy-history.png), and [touch progress](../artifacts/puzzle-rework/routes/mobile-chrome-legacy-campaign-progress.png) captures.

The four Brook reports use separate `consoleErrors`, `pageErrors`, `failedRequests`, and `badResponses` arrays; all are empty. Their retained ferry evidence includes four full-size actors during return sailing. Touch Orchard's return-walking assertion passes, and the retained actor positions have a measured minimum pairwise gap of **1.4166 world units**, corroborating the reviewed return-parade screenshot. Immediate greeting stills alone would not establish moving separation.

Active-play diagnostic FPS across the eight cases ranges from 19.76 to 26.72 under headless Chromium. These samples include browser/render contention and are not physical-phone or sustained frame-time measurements. Draw counts above describe the sampled active scene; return-sailing samples differ, including desktop Brook 109 calls / 101,543 triangles and touch Brook 102 / 100,207.

The touch Orchard failure is retained in [puzzle-browser-01](../test-results/puzzle-browser-01/) and copied durably as a [trace](../artifacts/puzzle-rework/diagnostics/mobile-orchard-near-marker-trace.zip), [context](../artifacts/puzzle-rework/diagnostics/mobile-orchard-near-marker-context.md), and [screenshot](../artifacts/puzzle-rework/diagnostics/mobile-orchard-near-marker-failure.png). After the solved puzzle, the pickup waypoint `(7.39793, -4.74183)` projected to `(333.0416, 407.2748)`, only 1.58 screen pixels below the traveler label. The pre-tap hit test returned the canvas; the subsequent trace showed the traveler marker inspected and navigation ending at its exact `(7.5, -3.8)` position. Chromium near-target touch adjustment is the evidence-based inference, rather than a directly observed browser-internal cause. The harness now greets the traveler first, then collects the same keepsake after the label disappears. No application code or assertion was relaxed. The focused rerun and subsequent four Brook regressions pass; the original failure and its attribution remain recorded.

## Changed files and simplifications

This table describes the rework's current implementation responsibilities; the documentation lane owns only this report and the README.

| Files | Resulting responsibility |
| --- | --- |
| [levels.ts](../src/game/levels.ts), [puzzle-types.ts](../src/game/puzzle-types.ts) | Retain three IDs; define the Orchard board, Marsh floor patches and optical layout, dynamic targets, new route IDs, and puzzle revisions. |
| [orchard.ts](../src/game/orchard.ts) | Isolate physical cardinal push, matched-bed watering, and growth rules. |
| [moonbeam.ts](../src/game/moonbeam.ts) | Isolate derived live beam tracing and reflection. |
| [rescue.ts](../src/game/rescue.ts) | Connect puzzle actions to collision/navigation, undo accounting, permanent-path and gate state, honest rescue routes, and legal formation reseeding. Retire the old irrigation/signal flags and branches. |
| [main.ts](../src/main.ts) | Connect dynamic targets, standing-side navigation, Undo/Z, navigation revisions, formation reseeding, and the current beam view to presentation. Real-control integration checks pass. |
| [ui.ts](../src/ui.ts), [styles.css](../src/styles.css) | Contextual pod/standing-side controls, mirror orientation and current-light feedback, puzzle guides, undo, revised history labels, and responsive presentation. |
| [memories.ts](../src/game/memories.ts), [memories.spec.ts](../tests/memories.spec.ts) | Validate version-4 revisions/routes while preserving historical postcards, storage safety, and the latest-20 policy. |
| [island.ts](../src/art/island.ts), [bramblebrook.ts](../src/art/bramblebrook.ts), [sunseedOrchard.ts](../src/art/sunseedOrchard.ts), [moonbellMarsh.ts](../src/art/moonbellMarsh.ts), [puzzleArtKit.ts](../src/art/puzzleArtKit.ts) | Separate authored island factories behind one rendering interface; share reusable camp/material/prop helpers. Isolated and integrated visual review pass within their recorded scopes. |
| [levels.spec.ts](../tests/levels.spec.ts) | Replace assertions for retired island mechanics with current puzzle, undo, geometry, and navigation checks. Existing Brook rules remain in [rescue.spec.ts](../tests/rescue.spec.ts). |
| [expeditions-browser.spec.ts](../tests/expeditions-browser.spec.ts) | Six passing real-control puzzle/history cases, automatic evidence retention, and touch return-walking separation coverage. |
| [browser.spec.ts](../tests/browser.spec.ts) | Preserve the four Brook route/profile regressions and copy passing evidence into the rework's retained artifact directory. |
| [capture-puzzle-rework.mjs](../scripts/art/capture-puzzle-rework.mjs) | Capture authored puzzle visual states for isolated review. |
| [capture-ui.mjs](../artifacts/puzzle-rework/capture-ui.mjs) | Capture development or production atlas/intro/control views into separate retained folders and identify the production script in metadata. |
| [verify-static.mjs](../scripts/verify-static.mjs) | Add a custom evidence output directory and real-UI visits to both redesigned levels under a static subdirectory; candidate execution passes. |
| [README.md](../README.md), this report | Describe the current puzzles and distinguish completed evidence from outstanding work. Historical reports remain unchanged. |

The shared squad, companion loading, Push/Grow/Splash verbs, and local memory store remain. The new puzzles use small isolated rule modules instead of extending the retired bridge/ferry prerequisites. Collision and ray tracing are deterministic authored logic: no new physics engine, rigid-body simulation, dependency, or storage service was added. Puzzle actions use discrete cell/ray state; movement retains bounded frame updates and small collision steps. No broad cleanup outside the changed behavior is claimed.

## Assets and remaining limits

Character identity comes from the existing official Kibo, Pomodoro, Bing, and Sapidae GLBs, their derived portraits, and included notices. The environment work extends the project's original editable Three.js art. [ASSETS.md](ASSETS.md) records provenance; [TRAITS.md](TRAITS.md) separates verified part metadata from authored field lessons. No external model/image/audio generation, replacement Axie art, Blender deliverable, generated audio, or premium/AAA result is claimed. Existing sound feedback uses Web Audio synthesis.

- Fresh human playtests have not been conducted. [PLAYTEST.md](PLAYTEST.md) is the earlier prepared protocol; it must be adapted to the new puzzles before use. Automated completion is not evidence of fun, intuitive discovery, first-play duration, or replay value.
- Physical mobile hardware, Safari/Firefox, and sustained real-device performance remain unqualified. Touch browser coverage used Chromium emulation.
- Browser-local postcards retain 20 valid records and do not synchronize across devices. Historical completion and current-revision completion are deliberately separate.
- Live approved Mixer rendering, arbitrary owned-Axie appearance, wallets, and on-chain progression remain outside this implementation. Local lessons do not assign genes to the fixed mascots.
- Public hosting, event registration, and submission were not performed as part of this rework. Local preview/static checks do not prove publication or an event submission.

## Skill-loading ledger

The [current contract ledger](PUZZLE_REWORK.md#workflow-ledger) confirms the director, gameplay, graphics, UI, debug, and QA workflows loaded/reused for this rework. The [previous confirmed ledger](THREE_EXPEDITIONS_VERIFICATION.md#skill-loading-ledger) supplies reusable reference provenance. A reused reference is not claimed as newly reread. Roots: `A` = `C:/Users/longm/.agents/skills`; `C` = `C:/Users/longm/.codex/skills`.

| Responsibility | Skill | Usage |
| --- | --- | --- |
| Director | `A/threejs-game-director/SKILL.md` | New scope contract, bounded ownership, phases, and evidence gates. |
| Gameplay systems | `A/threejs-gameplay-systems/SKILL.md` | Spatial puzzle state, collision, rays, undo, navigation, and input. |
| AAA graphics workflow | `A/threejs-aaa-graphics-builder/SKILL.md` | Original court/garden art and visual iteration; no AAA qualification claimed. |
| UI | `A/threejs-game-ui-designer/SKILL.md` | Contextual controls, guides, status feedback, journal, and phone fit. |
| Debug/profile | `A/threejs-debug-profiler/SKILL.md` | Changed topology, follower lifecycle, rendering, diagnostics, and performance evidence. |
| QA/release | `A/threejs-qa-release/SKILL.md` | Real controls, browser profiles, screenshots, canvas pixels, and production packaging. |
| Task tracking | `A/beads-task-flow/SKILL.md` | Parent `d6p`; rules `o6n`, art `tq0`, integration `95g`, QA `nr8`, as recorded in the contract. |
| Visual review | `C/visual-verdict/SKILL.md` | Written direction and persistent iteration verdicts; separate final isolated 93/pass and integrated 92/pass results. |

## Reference ledger

Paths below are relative to the named skill directory under `A`. **Read: yes** means confirmed from the current contract, the relevant owner, or the earlier ledger; the usage column states which. No skipped required reference or read failure has been reported.

| Phase | Reference paths | Read | Usage / failure reason |
| --- | --- | --- | --- |
| Gameplay systems | `threejs-gameplay-systems/references/gameplay-workflows.md`; `references/physics-engine-selection.md` | Yes | Current reads confirmed by the rework contract; authored collision selected without adding a physics engine. No failure. |
| Gameplay systems | `threejs-gameplay-systems/references/checklists/new-game-definition-of-done.md` | Yes | Confirmed earlier read reused. No failure. |
| Graphics | `threejs-aaa-graphics-builder/references/visual-scorecard.md`, `implementation-blueprint.md`, `model-recipes.md`, `render-recipes.md` | Yes | All four reread for this rework, confirmed by the art owner along with the skill entrypoint. No failure. |
| Graphics | `threejs-aaa-graphics-builder/references/checklists/procedural-model-quality.md`, `material-lighting-quality.md`, `performance-safe-visual-detail.md` | Yes | Confirmed earlier reads reused. No new reread claimed; no failure. |
| UI | `threejs-game-ui-designer/references/ui-patterns.md` | Yes | Current read confirmed by contract. No failure. |
| UI | `threejs-game-ui-designer/references/checklists/game-ui-quality.md`, `hud-readability.md`, `responsive-ui-fit.md`, `mobile-input.md` | Yes | All four freshly read for this rework, confirmed by the root owner. No failure. |
| Debug/profile | `threejs-debug-profiler/references/debug-profile-checklists.md`; `references/checklists/scene-debugging.md`, `performance-profile.md`, `mobile-input.md` | Yes | Confirmed earlier reads reused at phase entry. No failure. |
| QA/release | `threejs-qa-release/references/qa-release-checklists.md`; `references/checklists/visual-verification.md`, `playtest-qa.md`, `release.md` | Yes | All four freshly read for this rework, confirmed by the root owner. No failure. |
| Report audit | `threejs-game-director/scripts/audit_reference_report.py` | Yes | Reread by the documentation owner for this report; baseline ledger/marker audit only. No failure. |

## Phase ledger

| Phase | Status | Evidence or outstanding work |
| --- | --- | --- |
| Discovery and scope | Done | User requested two genuinely different replacement puzzles; authoritative contract and exact geometry define the accepted scope. |
| Gameplay systems | Verified within recorded scope | 29 rules + 17 memory cases and all ten distinct browser cases pass on the frozen candidate. Independent complete-solution/undo/formation probes pass. |
| External asset sourcing | Existing sources reused; character integrity passes | Four official files match SHA-256 and bytes in source and `dist`; original environment kit, no external generation or new dependency. |
| AAA graphics workflow | Isolated and integrated review pass | Isolated art is 93/pass; integrated initial presentation and all four completed new-puzzle routes are 92/pass. |
| UI | Verified within tested profiles | Both production profiles identify NMLraHQD with no errors/overflow. New puzzle/history cases and all four Brook regressions pass. |
| Debug/profile | Verified within recorded scope | Logical formation, isolated disposal, production UI/static checks, desktop Orchard resource cycles, return-walking separation, and all eight error-free route reports pass. Hardware/endurance limits remain explicit. |
| QA/release | Local candidate and report verified | Build, 46 pure cases, ten distinct browser cases, packaged assets, static recovery, integrated visual review, baseline report audit, and 109 local links pass. No public release claim. |

Baseline director report audit command:

```powershell
python C:/Users/longm/.agents/skills/threejs-game-director/scripts/audit_reference_report.py docs/PUZZLE_REWORK_VERIFICATION.md
```

**Final report audit: passed. Local link check: 109 checked, zero missing**, including referenced Markdown anchors across this report and README. The baseline audit checks ledger/marker presence, not gameplay correctness or premium qualification.
