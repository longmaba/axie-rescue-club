# Field lessons and Axie part provenance

The two field lessons use verified Axie part identities as inspiration for locally authored rescue abilities. Players select a lesson for the expedition. The supplied Kibo, Pomodoro, and Bing mascot models retain their existing identity; this feature does not assign those mascots invented genes or represent an owned Axie.

## Verified catalogue data

Retrieved **2026-09-05** from Axie Infinity's official [Mixer playground catalogue](https://github.com/axieinfinity/mixer-playground/blob/c2288f76728bdb4881ef145a007307195800c07e/components/axie-figure/key.json), pinned to commit `c2288f76728bdb4881ef145a007307195800c07e` dated 2023-03-22. The catalogue is historical, with schema version 1. The following fields are copied as metadata into [traits.ts](../src/game/traits.ts):

| Lesson ID | Catalogue key / part ID | Name | Type | Sample | Class | Gene part value |
| --- | --- | --- | --- | --- | --- | ---: |
| `root` | `horn-rose-bud` | Rose Bud | `horn` | `plant-06` | `plant` | 6 |
| `float` | `back-watering-can` | Watering Can | `back` | `plant-08` | `plant` | 8 |

The catalogue itself supplies `key`, `name`, `type`, and `sample`. Its [class dropdown implementation](https://github.com/axieinfinity/mixer-playground/blob/c2288f76728bdb4881ef145a007307195800c07e/components/axie-figure/parts-dropdown/DropdownOptionsByClass.tsx) groups parts by the first segment of `sample`, establishing the Plant class for these entries.

The live cross-check used the official published **`@axieinfinity/mixer` 1.4.9**, which was the npm `latest` version when checked. Its [versioned gene data](https://unpkg.com/@axieinfinity/mixer@1.4.9/dist/data/axie-2d-v3-stuff-genes.json), schema version 3, contains both matches:

- `class: plant`, `partType: horn`, `partValue: 6`, first `skins` entry `plant-06`.
- `class: plant`, `partType: back`, `partValue: 8`, first `skins` entry `plant-08`.

Thus the old catalogue names/keys match the class, body slot, numeric part value, and sample IDs in the published Mixer version checked today. The gene data does not contain the human-readable part names; those remain attributed to the pinned catalogue. No current battle-card statistics or canonical rescue abilities were inferred.

Additional reproducibility sources:

- [Official npm version metadata](https://registry.npmjs.org/@axieinfinity%2fmixer/1.4.9).
- [Official package archive](https://registry.npmjs.org/@axieinfinity/mixer/-/mixer-1.4.9.tgz).
- [Vibeathon resources](https://vibeathon.axieinfinity.ai/resources), which links the official Mixer package and Lunalog catalogue.

Package archive integrity reported by npm:

```text
sha512-gfi5s92RkMJScP2+LOxmvEeV5uvh9j8UMxJHVrQc6tW0ERUWWs6nNdH5qq51290aY//4jUYpSFTUxrIaYMVHjw==
```

The Lunalog webpage returned a browser challenge during this read-only lookup. It is a discovery reference, rather than evidence for the selected records. Verification used the publicly available official repository and published package data; it required no key or wallet.

## Authored rescue effects

These are Rescue Club's field lessons, selected by the player and inspired by the catalogue names:

| Lesson | Additional effect | Shared baseline |
| --- | --- | --- |
| **Root & bloom**, inspired by Rose Bud | Pomodoro's bridge reinforcement also blooms the garden path in that Grow action. | The crew can still grow a leaf; Kibo supplies its launch Push. |
| **Grow & launch**, inspired by Watering Can | Pomodoro's leaf growth also launches the leaf, saving a separate Push. | The crew can still reinforce the bridge and bloom the garden as separate actions. |

Both lessons preserve both rescue routes. Their purpose is to change the sequence of useful companion actions without making a preselected lesson a route lock. `TALENTS` contains descriptive metadata; `src/game/rescue.ts` implements the effects. The field guide selects the lesson at camp, and completed postcards retain it alongside each companion's actual contributions. Watering Can's automatic leaf launch is credited to Pomodoro; it does not invent a Push contribution for Kibo.

The UI presents Pomodoro's **field lesson**, shows the exact part name and authored effect, explains that it is inspired by real Plant parts, and links the pinned catalogue. These lessons and expedition memories are local gameplay state; the feature performs no gene changes, NFT transfers, or on-chain AXP updates. Live approved Mixer rendering and arbitrary owned-Axie integration remain a separate scope.

## Module contract and validation

`src/game/traits.ts` exports `TalentId = 'root' | 'float'`, `FieldTalent`, the literal `TALENTS` array, and `TRAIT_PROVENANCE`. It has no imports and performs no runtime network requests. Public identifiers are stable catalogue keys; the sample code is meaningful together with its body-part type.

Validation passed on 2026-09-05:

- An executable Node assertion loaded the exported data and fetched both versioned sources. Both records matched catalogue key, name, type, sample and class, plus the gene record's class, type, part value and first skin entry.
- The isolated strict TypeScript check passed:

```sh
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module ESNext src/game/traits.ts
```

Integration verification also passed: 14 focused rules cases cover route and lesson behavior; eight memory cases cover persistence and legacy normalization. Four real-control browser playthroughs exercise every route/lesson pairing: desktop bridge with Rose Bud, desktop ferry with Watering Can, mobile-emulated bridge with Watering Can, and mobile-emulated ferry with Rose Bud. They verify the completed route, selected lesson, actual contributions, saved postcards, and camp continuity after reload. Whole-project typecheck and production build pass. See [VERIFICATION.md](VERIFICATION.md) for exact run history and retained evidence. These automated results do not establish fresh-player understanding or enjoyment; [human playtests](PLAYTEST.md) are prepared but have not been conducted.
