export type TalentId = 'root' | 'float';

export interface FieldTalent {
  readonly id: TalentId;
  readonly partKey: string;
  readonly partName: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly class: 'plant';
  readonly partType: 'horn' | 'back';
  readonly sample: string;
  readonly partValue: number;
}

export const TRAIT_PROVENANCE = {
  verifiedOn: '2026-09-05',
  catalogueCommit: 'c2288f76728bdb4881ef145a007307195800c07e',
  catalogueCommittedOn: '2023-03-22',
  catalogueUrl: 'https://github.com/axieinfinity/mixer-playground/blob/c2288f76728bdb4881ef145a007307195800c07e/components/axie-figure/key.json',
  mixerVersion: '1.4.9',
  geneDataUrl: 'https://unpkg.com/@axieinfinity/mixer@1.4.9/dist/data/axie-2d-v3-stuff-genes.json',
  context: 'Field lessons inspired by verified Axie parts. Rescue effects are this game\'s rules; the official mascot models and their identity stay as supplied.',
} as const;

// Catalogue identity is verified; lesson titles and rescue effects are authored here.
// Keep this data module independent of the rescue simulation and UI.
export const TALENTS = [
  {
    id: 'root',
    partKey: 'horn-rose-bud',
    partName: 'Rose Bud',
    title: 'Root & bloom',
    description: 'Reinforcing the log also blooms the garden path in the same Grow.',
    source: TRAIT_PROVENANCE.catalogueUrl,
    class: 'plant',
    partType: 'horn',
    sample: 'plant-06',
    partValue: 6,
  },
  {
    id: 'float',
    partKey: 'back-watering-can',
    partName: 'Watering Can',
    title: 'Grow & launch',
    description: 'Growing the leaf also launches it, saving Kibo a Push.',
    source: TRAIT_PROVENANCE.catalogueUrl,
    class: 'plant',
    partType: 'back',
    sample: 'plant-08',
    partValue: 8,
  },
] as const satisfies readonly FieldTalent[];
