# Axie Vibeathon 2026 - form copy

Corrected 2026-09-09 against the supplied Project setup screenshot. Field labels below match the form. This is a local draft; nothing has been entered or finalized on the portal. The screenshot's Project title currently contains pasted form text; replace it with only the title below.

## Project title

Axie Rescue Club

## Short description - maximum 5,000 characters

Three little Axies. Three different puzzles. One mission: bring everyone home.

Axie Rescue Club is a cozy, single-player 3D puzzle adventure. Switch between Kibo's Push, Pomodoro's Grow, and Bing's Splash to build a bridge or leaf ferry in Bramblebrook, rearrange seed pods in Sunseed Orchard, and redirect moonlight in Moonbell Marsh.

Collect keepsakes, welcome rescued friends, and save personal postcards recording each Axie's contribution. Play in your browser with mouse, keyboard, or touch. Includes puzzle guides and Undo in Orchard and Marsh, with no combat, countdown, account, or wallet required.

## Product vision - maximum 2,000 characters

I want Axie Rescue Club to become a welcoming adventure where players build a lasting bond with their Axies through helping others. Its central loop is simple: prepare a small rescue team at camp, explore an island, combine abilities to solve a puzzle, bring someone home, and remember the adventure together.

The full game would expand the three prototype islands into a campaign of compact, handcrafted expeditions. Each new location would introduce a meaningful mechanic and later combine it with earlier lessons. Different team talents would create alternate solutions and reasons to revisit familiar places.

Camp would grow into a personal club, filled with rescued friends, earned decorations, and a journal of each Axie's contributions. I want players to remember which companion helped them through a difficult moment and look forward to taking that companion on another expedition.

My next priorities are fresh-player testing, clearer first-time guidance, stronger mobile play, and an approved path for players to bring their own Axies into the club. I would keep a free guest crew and focus on readable puzzles and thoughtful team choices rather than rarity-based power requirements.

## How is Axie Core integrated in the game? - maximum 3,000 characters

Axie Rescue Club makes the Axies themselves central to solving puzzles and remembering each adventure.

The playable prototype uses the official animated Kibo, Pomodoro, and Bing characters. Each has a distinct role: Kibo pushes objects and turns mirrors, Pomodoro grows plants and paths, and Bing waters plants and activates mechanisms. Players must switch companions and combine their contributions to complete each rescue.

Bramblebrook includes two selectable field lessons inspired by the real Rose Bud and Watering Can parts. Rose Bud lets Pomodoro bloom the garden while reinforcing the bridge; Watering Can lets a grown leaf launch in the same action. These change the rescue sequence and give part-inspired talents a practical gameplay purpose. Their effects are authored for this game and do not assign genes to the fixed mascot models.

Completed expeditions save individual contribution postcards, while keepsakes and a returning friend make camp reflect past adventures. These records connect progress to what each Axie helped accomplish, encouraging attachment to the companions.

The current integration uses fixed official characters, part-inspired lessons, and browser-local memories. Owned-Axie import, live Mixer rendering, and on-chain progression are not implemented in this prototype. Bringing players' own Axies into the club through approved tools is part of the product vision.

## Project thumbnail

- Format: JPEG, PNG, or WebP.
- Recommended aspect ratio: 16:9.
- Maximum size: 8 MiB.
- The screenshot says to create the project before adding a thumbnail.
- Ready-to-use image: [Sunseed Orchard](../artifacts/puzzle-rework/routes/desktop-chrome-sunseed-orchard-trellis-open.png), verified PNG, 1280 x 720, 200,867 bytes.

## Playable builds

- Platform: Browser.
- Build link: [PUBLIC HTTPS GAME URL - still required]. The existing http://127.0.0.1:5189 address is a local development preview and cannot be used by external reviewers.
- Native Windows, macOS, Android and iOS packages are not part of this build.

### Browser play instructions

Open the link and wait for the characters to load, then choose "Let's go!" Start with Bramblebrook, or use the map button to choose any of the three expeditions. Click/tap the ground or a target to move. Press 1, 2, or 3, or tap an Axie card, to switch companions. Press E or the action button to use the active ability. Bring the traveler back to camp to finish. Use the question-mark guide for help; Z or Undo lets you rethink actions in Orchard and Marsh before greeting the traveler.

## Private source review

- GitHub repository URL: https://github.com/longmaba/axie-rescue-club (private).
- Full review commit SHA: use the full 40-character output of `git rev-parse HEAD` from the clean source checkout that produces the linked build. The repository handoff supplies the initial full commit separately.
- A private source repository was created on 2026-09-09. A public playable build still needs to be hosted. Reviewer access must be confirmed separately.
- Check the jaatster access box only after that GitHub user has access to the project repository.
- Check the exact-commit box only after the linked production build has been built from that exact source commit.
- The 64-character JavaScript asset SHA-256 and upstream asset/catalogue commit IDs are not the project Git commit requested by this form.

## Demo video URL (optional)

Optional in the supplied portal form. Leave blank until a hosted video exists. A useful short demo would show companion switching, the Orchard staging decision, the Marsh beam reroute with the crossing staying in place, and the completed rescue postcard. No video was produced as part of this draft.

## Run requirements

- Devices: Desktop and Mobile. Touch support was verified through Chromium emulation; physical-phone and tablet qualification remain outside the recorded checks.
- Inputs: Keyboard + mouse and Touch.
- Access: No extra access needed.

### Run notes - maximum 500 characters

Use a modern browser with WebGL 2 and hardware acceleration. Desktop recommended. Click/tap to move; 1/2/3 or Axie cards to switch; E or the action button to act. WASD/arrows also move. Z/Undo works in Orchard and Marsh before greeting the traveler. No account, wallet, download, or access code is required. Progress is saved locally in this browser.

## Evidence and outstanding values

- [Current implementation and test evidence](PUZZLE_REWORK_VERIFICATION.md): production build, 46 pure cases and 10 distinct browser cases passed on the recorded production candidate. This is existing qualification evidence, not a new test run performed for this drafting task.
- [Part provenance and authored field lessons](TRAITS.md).
- [Official event announcement](https://blog.axieinfinity.com/p/the-axie-vibeathon-is-live): Round 1 asks for a playable prototype, product vision and credible Axie Core fit.
- [Current resources](https://vibeathon.axieinfinity.ai/resources): official assets, tools and prototype guidance.
- Outstanding before finalization: public playable URL, copying the matching full commit into the form, confirmed source-review access, and thumbnail upload. Optional video can remain blank according to the supplied form.
