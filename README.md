# Axie Rescue Club

**Three little companions. Three different puzzles.** A browser rescue game made for Axie Vibeathon. Explore with Kibo, Pomodoro, and Bing: build a way across a brook, push seed pods through an orchard court, and borrow a moonbeam to open a path through the marsh. Bring each traveler home and keep the companions' shared memories.

## Play locally

Requires Node.js 22.12+ or a current supported Node release.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5189**. The game needs a browser with WebGL 2 and hardware acceleration. No wallet, account, or API key is required. All assets and fonts are served locally.

## Three expeditions

| Island | Its puzzle | Open locally |
| --- | --- | --- |
| **Bramblebrook** | Discover how a loose log and curled leaf become two ways across the brook. | [Bramblebrook](http://127.0.0.1:5189/?level=bramblebrook) |
| **Sunseed Orchard** | Push two different seed pods through a hedge court into matching beds, then water and grow them. Move one pod away from its nearby bed to make room for the other. | [Sunseed Orchard](http://127.0.0.1:5189/?level=sunseed-orchard) |
| **Moonbell Marsh** | Turn mirrors to light a root flower, grow a permanent path, then redirect the same beam to the far lantern. The light moves; the rooted path stays. | [Moonbell Marsh](http://127.0.0.1:5189/?level=moonbell-marsh) |

The **Choose expedition** map button opens the club atlas. All three islands are available immediately, with saved completion and keepsake marks. Choosing an island starts a fresh expedition and keeps the selected field lesson and saved postcards. Winning offers the next island and replay; the final island returns to the atlas. Island switching is disabled during ferry transport.

The `?level=` URL selects the island on load. Reloading starts a fresh run on that island; saved postcards remain in browser storage. Missing or unknown level IDs open Bramblebrook.

## Controls

- **Click or tap the ground** to walk. Tap an object marker or route button to walk over and inspect it.
- **WASD / arrow keys** move relative to the camera.
- **1 / 2 / 3** or the companion cards select Kibo, Pomodoro, and Bing.
- **E / Space** or **Try** uses the selected companion's ability near an object. Inspecting alone does not use an ability.
- **Orchard:** select a pod, choose **North / East / South / West** to stand on that side, then use Kibo's Push. The pod moves one square away from the crew.
- **Z / Undo** restores the last Orchard or Marsh puzzle action, including watering or growth. Elapsed time keeps running. Undo is available before greeting the traveler; restart remains available afterward.
- **View whole puzzle** toggles the Orchard/Marsh overview, useful for seeing the complete layout on a phone.
- **Escape** pauses/resumes. Sound, field guide, optional hints, and the club journal have visible buttons.

In **Bramblebrook**, the log needs positioning and steady roots; the leaf can grow, launch, and ferry the entire crew between fixed docks. Bing's Splash turns the waterwheel. An absent ferry can be recalled empty. Pause freezes a crossing, and movement cannot interrupt it.

In **Sunseed Orchard**, hedges and pods block movement. Stand directly behind a pod to push it; diagonal nudges and blocked destinations leave it unchanged. Bing can water a pod only on its matching bed, and Pomodoro grows it after watering. Grown plants stay in place. Both plants open the east trellis. A wrong push into a corner is recoverable with Undo.

In **Moonbell Marsh**, Bing wakes the moonwell and Kibo turns the mirrors. Pomodoro can grow the root flower only while the beam currently reaches it. This anchors a permanent connector between the garden patches. Redirect the beam through the far mirror to light the exit lantern; greeting the traveler keeps that exit open for the return trip.

The two part-inspired field lessons affect **Bramblebrook**: **Rose Bud** roots also bloom its garden; **Watering Can** growth also launches its leaf. Both routes remain solvable. The selected lesson carries between islands, but it does not bypass the Orchard or Marsh puzzle rules.

Each island has three optional keepsakes. Bramblebrook's set includes a midstream ferry pickup; Orchard and Marsh keepsakes are collected on foot. Completed rescues create personal contribution postcards and add souvenirs and a returning friend at camp. Restart is available from pause or the completion card.

The latest **20 valid postcards** are retained in this browser. New saves record the island, puzzle revision, actual rescue route, and companion contributions. Earlier Orchard and Marsh bridge/ferry postcards stay in the journal as **Earlier adventure** entries and keep their camp souvenirs; completing either redesigned puzzle requires a new rescue. Completion counts, best keepsakes, and routes reflect the current puzzle revision within the retained history, so an old completion can eventually fall out. Postcards without an island ID belong to Bramblebrook. Storage failures do not grant saved completion.

## Scope

This Round 1 prototype contains **three islands: a crossing puzzle, a spatial seed-pod puzzle, and a live mirror puzzle**. Orchard and Marsh replace the earlier versions under the same island IDs; there is no fourth level. The game retains reusable companion abilities, two Bramblebrook field lessons, nine optional keepsakes, animated official characters, touch controls, and individual persistent memories. There is no combat or failure timer. Walking companions follow legal paths, with a compact formation at the brook docks.

The current rework passes 46 pure checks and 10 distinct browser cases on one production build. [Puzzle rework verification](docs/PUZZLE_REWORK_VERIFICATION.md) records the command history, screenshots, visual review, and remaining limits. Earlier reports describe earlier builds.

The private source repository is [longmaba/axie-rescue-club](https://github.com/longmaba/axie-rescue-club). Current gameplay screenshots and reports under `artifacts/puzzle-rework/routes`, `production`, and `static` are included for review. Raw browser traces, older local captures, agent logs, and temporary files stay outside Git; links to those local-only records in historical reports are archival references.

The official fixed mascot GLBs are used unchanged. Field lessons use verified Rose Bud and Watering Can catalogue identities with this game's authored rescue effects. They do not assert those parts belong to these mascots or alter their genes. The build does **not yet** import arbitrary owned Axies or implement a live approved Mixer. Round 2 requires that integration. Broader ecosystem progression remains later work. Event registration, public hosting, and submission were not performed as part of this implementation.

## Build and verify

Use `npm ci` to install the versions in the committed lockfile. For the submission's full review commit, run `git rev-parse HEAD` on a clean checkout, then build and deploy that checkout's `dist/`.

```sh
npm run typecheck
npm run build
npm test
node scripts/art/inspect-assets.mjs
node scripts/verify-static.mjs --out artifacts/puzzle-rework/static
```

`npm test` starts the production preview at **http://127.0.0.1:4191** and runs pure rule tests plus browser playthroughs. It intentionally fails if that port is occupied, so it cannot silently test another game. Install Chromium for Playwright if needed with `npx playwright install chromium`.

When comparing builds, choose a fresh Playwright `--output` or static verifier `--out` folder and preserve passing screenshots/reports before the next run.

```sh
npm run preview
```

The deployable static site is `dist/`. Vite uses a relative base so assets can be hosted under a subdirectory. Keep the complete `dist/assets/characters/` notices and model files with the site. No server API is required.

Developer diagnostics are read-only and available in development or with `?debug` in a production preview: `window.__RESCUE__.snapshot()`, `.project(x,z)`, and `.diagnostics()`. There are no state-mutation or win shortcuts.

## Structure and assets

- `src/game/levels.ts`: island metadata, puzzle types, target positions, and navigation geometry.
- `src/game/rescue.ts`: pure progression, A* navigation, collision, companion rules, and level transitions.
- `src/game/orchard.ts`, `src/game/moonbeam.ts`, `src/game/puzzle-types.ts`: cardinal pod rules, current beam tracing, and puzzle state.
- `src/game/traits.ts`, `src/game/memories.ts`: verified part inspirations and validated local expedition history.
- `src/main.ts`: input, renderer, camera, animation, and event integration.
- `src/art/island.ts`: shared island interface and selection of separate brook, orchard, and marsh art factories.
- `src/art/bramblebrook.ts`, `src/art/sunseedOrchard.ts`, `src/art/moonbellMarsh.ts`, `src/art/puzzleArtKit.ts`: authored layouts, props, and puzzle feedback.
- `src/art/companions.ts`: official GLB loading, animation, disposal. Static portraits are rendered from those models by `scripts/art/capture-portraits.mjs`.
- `src/ui.ts`, `src/styles.css`: game HUD, expedition atlas, menus, journal, and responsive controls.
- `tests/`: rules and real-control browser verification.
- [Asset provenance](docs/ASSETS.md): source revision, checksums, rights, reproduction scripts.
- [Build plan](docs/BUILD_PLAN.md): accepted slice and ownership boundaries.
- [Two Ways Home contract](docs/TWO_WAYS_HOME.md): route interactions, transport, lessons, and ownership.
- [Puzzle rework contract](docs/PUZZLE_REWORK.md): current Orchard and Marsh mechanics, layouts, undo, and saved revisions.
- [Earlier three expeditions contract](docs/THREE_EXPEDITIONS.md): historical expansion design.
- [Trait provenance](docs/TRAITS.md): official catalogue and Mixer data cross-check.
- [Fresh-player session sheet](docs/PLAYTEST.md): three human sessions prepared, not yet conducted.
- [Puzzle rework verification](docs/PUZZLE_REWORK_VERIFICATION.md): current checks, measured evidence, and known limits.
- [Earlier three expeditions verification](docs/THREE_EXPEDITIONS_VERIFICATION.md): previous build evidence and navigation regression history.
- [Earlier verification](docs/VERIFICATION.md): Two Ways Home and walking-spacing baseline evidence.

Official Axie/Sapidae content belongs to Sky Mavis and its licensors, under the included Vibeathon permission. Original environment art and gameplay code were created for this project. The game uses Three.js, Vite, TypeScript, and Playwright; their respective licenses apply. Fredoka and Nunito are bundled with their SIL Open Font License notices in `public/fonts/`.

AI assistance: Codex was used for design, implementation, original procedural island geometry, and verification. No generated replacement Axie character art was used. Blender was available as an option; this slice uses an editable Three.js environment kit instead.
