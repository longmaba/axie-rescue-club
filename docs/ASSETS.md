# Axie Rescue Club asset provenance

## Official characters

Source: [Axie 3D Assets](https://github.com/jaatster/axie-3d-assets), linked from the [Axie Vibeathon resource hub](https://vibeathon.axieinfinity.ai/resources).

Pinned revision: `4eec7d9ccb1d0c962afc110e7be35d44e3d6356b`.

The files are copied unchanged from the official resource pack. Model, texture, skeleton, and named animation data are embedded in each GLB. Individual download URLs, SHA256 values, original catalog metadata, and local paths are recorded in `public/assets/characters/manifest.json`.

| Runtime file | Bytes | Meshes | Triangles | Animation notes |
| --- | ---: | ---: | ---: | --- |
| `characters/kibo.glb` | 2,029,496 | 1 | 5,305 | Idle, Walk, Run, Greeting, Hammer.Skill and other hammer clips |
| `characters/pomodoro.glb` | 1,253,740 | 1 | 4,478 | Idle, Walk, Run, Staff.Skill and other staff clips; no Greeting |
| `characters/bing.glb` | 1,585,376 | 1 | 3,264 | Idle, Walk, Run, Greeting, Cannon.Skill and other cannon clips |
| `characters/sapidae-f-a.glb` | 4,516,672 | 8 | 5,052 | Idle, Walk, Run |

Total GLB transfer size before HTTP compression: **9,385,284 bytes**. Static character geometry: **18,099 triangles**, excluding any duplication for previews. Official materials contain 11 total textures across this set. Runtime loading, animation scaling, and disposal are owned by the game renderer. Crew-card portraits are pre-rendered PNG derivatives described below.

Sky Mavis retains ownership of the Axie and Sapidae content. This is a limited-use Axie Vibeathon project; the downloaded assets are not a general-purpose open-source pack. The unmodified [`RIGHTS.md`](../public/assets/characters/RIGHTS.md) and [`THIRD_PARTY_NOTICES.md`](../public/assets/characters/THIRD_PARTY_NOTICES.md) are included with the publicly served assets. Reuse outside an approved Axie project requires separate permission. This build has no live Mixer integration; these are the official fixed mascot models.

Reproduce the download and inspect local assets:

```powershell
node scripts/art/fetch-official-assets.mjs
node scripts/art/inspect-assets.mjs
```

The fetch script is pinned to the same revision and compares every character with its upstream catalog checksum before writing. The inspection script checks GLB headers/length, SHA256, required Idle/Walk/Run clips, and absence of external buffers/images. Both passed during the first playable build.

## Static character portraits

The transparent PNGs are rendered directly from the unchanged official GLBs under the same limited-use permission. They are derivative screenshots of Sky Mavis character artwork, not independently owned or AI-generated character designs.

| Runtime file | Dimensions | Bytes | Nontransparent pixels |
| --- | --- | ---: | ---: |
| `characters/kibo-portrait.png` | 384 × 384 | 74,744 | 55,361 |
| `characters/pomodoro-portrait.png` | 384 × 384 | 73,475 | 57,688 |
| `characters/bing-portrait.png` | 384 × 384 | 54,427 | 43,771 |

The derivative set totals **202,646 bytes**. `scripts/art/portrait-preview.html` and `portrait-preview.ts` render a fixed Idle pose at 0.18 seconds, normalize the deformed pose to height 1.65, use warm hemisphere/key lighting and an alpha canvas, and present at least 12 frames before capture. The camera is at `(0, 1.6, 3.6)` looking at `(0, 0.83, 0)` with a 34° field of view. Measuring the posed silhouette and using this framing avoids clipping Kibo's large hat and face.

`scripts/art/capture-portraits.mjs` captures the actual visible canvas using Playwright `omitBackground: true`; it does not use WebGL render-target pixel readback. It rejects missing/transparent portraits, edge clipping, and page/console errors. All three files passed alpha checks and were individually inspected for readable faces. Exact alpha bounds, file checksums and renderer details are recorded in `scripts/art/evidence/portrait-report.json`; the portrait visual verdict is `portrait-verdict.json` (95/pass).

Reproduce with the repo's Vite dev server on port 5189:

```powershell
node scripts/art/capture-portraits.mjs
```

Set `ART_PREVIEW_URL` to use a different dev-server origin. Original GLBs and their checksums are not modified by portrait capture. Static portraits avoid an intermittent all-transparent framebuffer readback observed during cold production startup.

## Original island art

`src/art/island.ts` dispatches to three authored garden dioramas; `bramblebrook.ts` preserves the original sunlit brook. It contains no downloaded or generated environment models. The support scenery is built directly in Three.js, which keeps the coordinates and animated puzzle transformations editable without requiring Blender at runtime.

The kit includes:

- Separate meadow banks over three tapered soil strata, inset cliff pebbles, flowing jade river and waterfall strips.
- Orchard trees with layered crowns, branches and roots; grass, ferns, five-petal flowers, riverbank stones, mushrooms, and stepping-stone routes.
- Apricot A-frame tent with fabric geometry, tent poles and guy ropes, woven picnic rug, crates, and suspended pennants.
- Timber bridge with endgrain rings, bindings and planks; sleeping vine curtain and blooming flowers; paddle waterwheel and a hinged garden gate. Unlocking retracts all pen fencing below turf to match the fully walkable rescued area.
- Three distinct animated keepsakes: a ribbed shell, flower pin, and small camp bell.
- A curled leaf cradle, a veined giant-leaf ferry with four staggered wooden seat pads, and paired boarding docks.
- Living roots wrapping the log after reinforcement, a Rose Bud lesson flower trail linking bridge and garden, and a camp memory board with saved souvenirs and a returning-friend badge.

Colors use shared material roles across the kit: warm soil/wood, varied meadow greens, jade water, cream rope/fabric, and apricot/butter-yellow accents. Static geometry is merged per material, including all vegetation and camp props. Animated interactions are merged independently around their own pivots. Resources are explicitly disposed by `IslandArt.dispose()`.

Construction diagnostics after the Two Ways Home upgrade: **100 meshes, 97,462 triangles**, including hidden construction variants, water glints, puzzle pieces, and camp souvenirs. This is geometry inspection, not a measured GPU frame-time result. The full-island preview with both routes built and all four official characters rendered **108 calls, 115,007 triangles, 86 geometries, 18 textures**, with no page/console errors. Renderer counts for the closed island and ferry close-ups are recorded in `scripts/art/evidence/two-ways-art-report.json`. Integrated renderer counts and frame-time measurements are documented by the main browser QA pass.

Collision and navigation belong to `src/game/rescue.ts`; art geometry does not drive game rules. Decorative props are clustered at the island edges to preserve visible play routes. `createIsland()` supplies the agreed `root`, `update(dt, time, state)`, `interactables`, and `dispose()` interface. The traveler anchor is supplied for renderer placement; the actual Sapidae GLB belongs to the renderer. Art owns collectible meshes and hides them from `state.keepsakes`.

### Two Ways Home state and rider contract

`IslandState` consumes `logRolled` independently of `bridge`: pushing places a gently rocking log; reinforcing grows roots that visibly stabilize it. `talent: 'root'` also reveals the connecting flower trail when the bridge is rooted; garden blooms still follow the rules' `bloom` flag. The art never grants lesson effects or unlocks traversal itself.

`leafGrown` unfurls the curled cradle into a ferry on the west dock at `(-2.3, -2.5)`. `leafLaunched` slides it onto the brook. A launched ferry follows `ferryProgress` between centers `(-0.6, -2.5)` and `(0.6, -2.5)`; its wake appears during the transport `sailing` phase, including empty recall. `ferrySide`, `transport` and `talent` have the same shape as the rules contract in `TWO_WAYS_HOME.md`.

The leaf was enlarged after the initial two-by-two reduced-rider fixture failed to represent full-size gameplay characters. Its inspected dimensions are approximately **1.762 X × 5.011 Z world units**, with raised leaf rims and central deck near Y 0.22. Four staggered seat anchors have local `(x, y, z)` coordinates:

```text
ferrySeat0: ( 0.00, 0.275, -1.80)
ferrySeat1: (-0.12, 0.275, -0.60)
ferrySeat2: ( 0.12, 0.275,  0.60)
ferrySeat3: ( 0.00, 0.275,  1.80)
```

`interactables.ferry` returns the actual hull group. Read each seat's world position to include its gentle bob and roll; do not shrink actors to fit the pads. The final isolated outbound and return screenshots use all four official models at **normal 1.65-unit height**, facing ±π/2 along travel, with no boarding scale change. Character motion, boarding/landing interpolation and seated animation remain renderer responsibilities. The same map includes `leaf`, `dockWest` and `dockEast` interaction anchors.

Keepsake order is now **flower `(7, 1.2)`, shell `(0, -2.5)`, bell `(3, -4.4)`**. The shell floats above the ferry path and disappears through `state.keepsakes[1]` when the rules award it. Optional `campKeepsakes` and `campVisitor` fields reveal physical souvenirs and the small returning-friend badge on the camp board. The visitor character itself remains renderer-owned.

Source-state verification covers independent push/root states, grown/launch/midstream/east positions, exact seat offsets, hull bounds, keepsake order/height, and preservation of camp souvenirs when constructions reset:

```powershell
node --experimental-strip-types scripts/art/evidence/inspect-two-ways.mjs
```

All assertions passed; results are stored in `scripts/art/evidence/two-ways-state.json`. The isolated TypeScript check passed. This art lane did not rebuild production output while rules/UI integration was in progress.

### Three distinct puzzle environments (revision 2)

`createIsland(level = LEVELS[0])` keeps the stable `IslandArt` interface and dispatches to `bramblebrook.ts`, `sunseedOrchard.ts` or `moonbellMarsh.ts`. The original Brook builder was extracted with its retired variant branches removed. Its regression remains exactly **100 meshes / 97,462 source triangles**, with unchanged ferry dimensions, full-size seats, keepsakes and construction animation formulas.

The former irrigation and beacon crossing variants have been replaced completely. Neither new factory creates a log bridge, curled leaf, ferry, boarding docks or waterwheel. Both reuse the unchanged official characters and static portraits. The new `puzzleArtKit.ts` shares resource ownership, geometry batching, botanical support props, camp and keepsakes without changing the Brook kit.

- **Sunseed Orchard:** one stepped 7-by-5 court of 1.8-unit cells, with three hedge blockers, west entry and east trellis matching `ORCHARD_BOARD` and `layout.solids`/`exitBarrier`. Two ribbed seed cases on wooden runners have different berry/sun symbols and matching beds. `state.orchard` drives current cell positions, water collars/droplets and growing plants. Trees occupy raised border planters beyond the court; hedge crowns remain inside the blocked cells. The entire exit trellis collapses out of view when `gate` opens.
- **Moonbell Marsh:** a pond with an irregular floor-patch union, raised shore strata, willow silhouettes, reeds and lilies. A moonwell emits through three physical rotating mirrors to two flower receivers. Art reads `state.moonbeamView.segments` from the rules rather than tracing its own rays. Two fixed `InstancedMesh` buffers render core/glow segments; receiver brightness reflects current light. `state.moonbeam.rooted` retains a woven root-and-leaf path after the beam reroutes. The exit barrier follows `gate`, including the rules' safe-return latch.

Terrain union geometry omits internal vertical faces to avoid self-shadow seams. Static geometry is merged by shared material; animated props keep named pivots. A single numeric 32-by-32 radial `DataTexture` supports Marsh fireflies. Geometry, material, texture and instance buffers are explicitly disposed. No new asset downloads, dependencies or external generation were introduced.

| Isolated staged scene, including four official characters | Calls | Rendered triangles | Geometries | Textures |
| --- | ---: | ---: | ---: | ---: |
| Orchard initial | 83 | 84,023 | 83 | 18 |
| Orchard solved | 82 | 84,215 | 85 | 18 |
| Marsh initial | 97 | 95,874 | 85 | 19 |
| Marsh rerouted, gate closed | 104 | 98,578 | 90 | 19 |
| Marsh solved | 100 | 98,110 | 90 | 19 |

These are development-preview renderer counters, not GPU frame-time or packaged-build claims. `scripts/art/evidence/puzzle-rework-render-report.json` records all staged counts and zero page/console errors. `rework-<level>-<state>.png` captures cover initial, staging, watered, solved, root-lit and rerouted states. The final isolated visual verdict is **93/pass** in `puzzle-rework-verdict.json`, with previous iterations retained separately.

`inspect-puzzle-rework.mjs` uses the actual pure rules modules to execute the ten-push solution, water/grow stages and current moonbeam trace. It checks dynamic positions, hedge footprints, corner-state restoration, live beam endpoints, mirror rotations, retained connector state, barriers, supported anchors and absence of retired props. Disposal checks confirm all 91 rendered Orchard resources, 104 rendered Marsh resources and both Marsh instance buffers emit exactly one disposal event. All source assertions pass in `puzzle-rework-state.json`.

```powershell
node scripts/art/evidence/inspect-two-ways.mjs
node scripts/art/evidence/inspect-puzzle-rework.mjs
node scripts/art/capture-puzzle-rework.mjs
```

Capture uses the development server at port 5189; `ART_PREVIEW_URL` overrides the origin. The former capture/inspection entry points delegate to the current revision. These previews stage art states directly; integrated real-input, mobile, level-switching and completion evidence belongs to the root QA pass. The art lane did not rebuild production while integration was in progress.

## Art workflow evidence

Loaded phase skill files: `threejs-game-director`, `threejs-aaa-graphics-builder`, `threejs-qa-release`, and `visual-verdict` under `C:/Users/longm/.agents/skills` / `C:/Users/longm/.codex/skills`.

Loaded graphics references: `visual-scorecard.md`, `implementation-blueprint.md`, `model-recipes.md`, `render-recipes.md`, and procedural-model, material-lighting, performance-safe-visual-detail checklists. Loaded QA references: `qa-release-checklists.md` and `checklists/visual-verification.md`.

Asset sourcing decision: use authoritative supplied animated Axie characters, and original procedural geometry for repeated supporting environment pieces. This first playable slice makes no premium/AAA asset-generation claim. No image-generation, audio-generation, or model-generation API was used by the art lane. No extra dependencies were introduced.

The isolated preview is `scripts/art/preview.html` (development only). Run the repo's Vite server on port 5189, then `node scripts/art/capture-preview.mjs`; another URL can be supplied through `ART_PREVIEW_URL`. Screenshots in `scripts/art/evidence/` cover the initial curled leaf, pushed/unrooted bridge, grown leaf on shore, both completed routes, and full-size outbound/return ferry riders. The Brook full-size rider correction passed at 94; the current distinct-puzzle art verdict is **93/pass** in `visual-verdict.json`. Rework iterations corrected barrier retraction, mirror occlusion, shoreline dressing, hedge footprints and terrain shadow seams. These checks compare the environment against the written art direction; there is no supplied reference image. Desktop/mobile active-play inspection and final game verdict belong to the integrated game verification pass.
