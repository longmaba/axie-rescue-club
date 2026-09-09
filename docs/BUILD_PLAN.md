# Axie Rescue Club — first playable

Build a guest-playable browser rescue puzzle on one authored 3D island. Switch between Kibo (push), Pomodoro (bloom), and Bing (splash); open a route, rescue a stranded Sapidae, collect three optional keepsakes, and return to camp. Complete playthrough, restart, keyboard/pointer/touch input, saved expedition postcard, and browser verification are required. This is a Round 1 slice; live approved Mixer integration and additional expeditions remain later work. No registration or external submission is part of this build.

## Ownership and contracts

- `src/game/rescue.ts`: pure game rules, navigation, progression (simulation agent).
- `src/art/island.ts`, `public/assets/`, `scripts/art/`, `docs/ASSETS.md`: world art and asset import preparation (art agent).
- Root: renderer, character animation, input, HUD, audio feedback, integration, browser QA, documentation.
- Agents are not alone in the workspace and must preserve each other's work. No package changes outside root.

## World coordinates (Three.js X/Z; floor Y=0)

- Island overall X -9 to 9, Z -6 to 6. Left land X <= -1.5; right land X >= 1.5. River is between them.
- Crossing: log bridge X -1.5 to 1.5, Z 1.7 to 3.3. Kibo activates from (-2.5, 2.5). Bridge blocked until push.
- Flower/bramble curtain spans right island X 1.5 to 9, Z -0.35 to 0.35. Pomodoro activates at (5, 1). Blocked until bloom.
- Waterwheel at (5,-2.5); Bing activates at (5,-1.5), opening rescue pen. Pen X 6 to 8.5, Z -5 to -3, blocked until splash.
- Traveler at (7,-4); camp at (-7,3.5). Initial squad position (-6,2.5).
- Keepsakes at (-6,-3.5), (7,1.2), (3,-4.4).
- Keep primary routes clear of decorative props. Boundaries and props can be richly dressed around the edge.

## Art direction

Sunlit storybook expedition. Cream paper, forest ink, apricot accents, jade/teal water, varied meadow greens, butter-yellow flowers. Orthographic view from (16,23,22), target (0,0,0), adaptable framing. Authored floating-island soil, rounded tree crowns, grass tufts, pebble paths, tents, bunting, wheel, woodwork. Use official animated GLBs for all characters. Crisp game HUD at screen edges, illustrated badge-like squad portraits, direct action prompts. No large website landing page.

## Verification

Pure rules tests for sequence, wrong companion/range, blocked water/barriers, path navigation, rescue/return, reset. Production build/typecheck. Browser tests exercise real pointer and keyboard controls, win, restart, pause, audio mute, mobile touch. Capture desktop/mobile gameplay and win screenshots, console errors, asset failures, canvas pixels and render performance. Persist visual verdict against authored direction; there is no supplied image reference.

## Workflow ledger

Loaded director, gameplay systems, graphics builder, UI designer, debug profiler, QA/release, Beads and visual-verdict skills from C:/Users/longm/.agents/skills and C:/Users/longm/.codex/skills. Gameplay workflow and new-game checklist; UI patterns; graphics implementation blueprint and render recipes loaded. Phase-specific references are loaded by each owner and final QA records the remaining checklist evidence. Original official assets take precedence over generic asset generation; this task targets a playable prototype, without an AAA claim.
