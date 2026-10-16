import type {
  PalletConfig,
  BoxConfig,
  SavedLayout,
  SavedPalletBuild,
  LayoutItem,
} from './store';

const DEMO_PALLET: PalletConfig = {
  id: 'demo-pallet-48x40',
  name: 'Standard 48×40',
  width: 48,
  depth: 40,
  height: 5.5,
  lengthUnit: 'in',
  widthUnit: 'in',
  depthUnit: 'in',
  heightUnit: 'in',
  maxWeight: 2000,
  maxWeightUnit: 'lb',
  maxWeightKg: 907.1847,
};

const DEMO_BOX_A: BoxConfig = {
  id: 'demo-sku-a',
  name: 'SKU A — Small Shampoo 12pk',
  width: 12,
  depth: 10,
  height: 8,
  weight: 18,
  labelTemplate: 'barcode-small',
  labelSides: ['left', 'right'],
  widthUnit: 'in',
  depthUnit: 'in',
  heightUnit: 'in',
  weightUnit: 'lb',
};

const DEMO_BOX_B: BoxConfig = {
  id: 'demo-sku-b',
  name: 'SKU B — Large Shampoo 6pk',
  width: 14,
  depth: 10,
  height: 10,
  weight: 24,
  labelTemplate: 'barcode-small',
  labelSides: ['left'],
  widthUnit: 'in',
  depthUnit: 'in',
  heightUnit: 'in',
  weightUnit: 'lb',
};

const DEMO_BOX_C: BoxConfig = {
  id: 'demo-sku-c',
  name: 'SKU C — Travel Size',
  width: 8,
  depth: 6,
  height: 6,
  weight: 8,
  labelTemplate: 'barcode-small',
  labelSides: ['front'],
  widthUnit: 'in',
  depthUnit: 'in',
  heightUnit: 'in',
  weightUnit: 'lb',
};

const makeItem = (
  box: BoxConfig,
  id: string,
  position: [number, number, number],
  layerId: number
): LayoutItem => ({
  ...box,
  id,
  position,
  rotation: [0, 0, 0],
  rotationDegrees: 0,
  layerId,
});

/** Interlocking-style sample layer on 48×40 using SKU A */
const layer1Items: LayoutItem[] = [
  makeItem(DEMO_BOX_A, 'demo-item-a1', [-18, 4, -15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a2', [-6, 4, -15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a3', [6, 4, -15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a4', [18, 4, -15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a5', [-18, 4, -5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a6', [-6, 4, -5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a7', [6, 4, -5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a8', [18, 4, -5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a9', [-18, 4, 5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a10', [-6, 4, 5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a11', [6, 4, 5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a12', [18, 4, 5], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a13', [-18, 4, 15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a14', [-6, 4, 15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a15', [6, 4, 15], 1),
  makeItem(DEMO_BOX_A, 'demo-item-a16', [18, 4, 15], 1),
];

const DEMO_LAYOUT_ID = 900001;

const DEMO_LAYOUT: SavedLayout = {
  id: DEMO_LAYOUT_ID,
  name: 'Demo — SKU A Layer Pattern',
  timestamp: new Date().toISOString(),
  layers: [
    {
      id: 1,
      name: 'Layer 1 — Brick pattern',
      items: layer1Items,
    },
  ],
  totalItems: layer1Items.length,
  totalWeight: layer1Items.reduce((s, it) => s + (it.weight ?? 0), 0),
  pallet: {
    id: DEMO_PALLET.id,
    name: DEMO_PALLET.name,
    width: DEMO_PALLET.width,
    depth: DEMO_PALLET.depth,
    height: DEMO_PALLET.height,
    maxWeight: DEMO_PALLET.maxWeight,
    maxWeightUnit: DEMO_PALLET.maxWeightUnit,
    maxWeightKg: DEMO_PALLET.maxWeightKg,
    lengthUnit: 'in',
    widthUnit: 'in',
    depthUnit: 'in',
    heightUnit: 'in',
  },
  itemsSummary: [
    {
      id: DEMO_BOX_A.id,
      name: DEMO_BOX_A.name,
      width: DEMO_BOX_A.width,
      depth: DEMO_BOX_A.depth,
      height: DEMO_BOX_A.height,
      weight: DEMO_BOX_A.weight,
      count: layer1Items.length,
    },
  ],
};

const layerThickness = DEMO_BOX_A.height;
const layerWeight = DEMO_LAYOUT.totalWeight;

const DEMO_BUILD: SavedPalletBuild = {
  id: 900101,
  name: 'Demo — Full Pallet (3 layers)',
  timestamp: new Date().toISOString(),
  pallet: DEMO_PALLET,
  placedLayers: [
    {
      id: 'demo-placed-l1',
      sourceLayoutId: DEMO_LAYOUT_ID,
      sourceLayerId: 1,
      name: 'Layer 1',
      items: layer1Items,
      thickness: layerThickness,
      weight: layerWeight,
      yOffset: DEMO_PALLET.height / 2,
    },
    {
      id: 'demo-placed-l2',
      sourceLayoutId: DEMO_LAYOUT_ID,
      sourceLayerId: 1,
      name: 'Layer 2',
      items: layer1Items.map((it) => ({ ...it, id: `${it.id}-l2` })),
      thickness: layerThickness,
      weight: layerWeight,
      yOffset: DEMO_PALLET.height / 2 + layerThickness,
    },
    {
      id: 'demo-placed-l3',
      sourceLayoutId: DEMO_LAYOUT_ID,
      sourceLayerId: 1,
      name: 'Layer 3',
      items: layer1Items.map((it) => ({ ...it, id: `${it.id}-l3` })),
      thickness: layerThickness,
      weight: layerWeight,
      yOffset: DEMO_PALLET.height / 2 + layerThickness * 2,
    },
  ],
  totalLayers: 3,
  totalWeight: layerWeight * 3,
};

export const DEMO_SEED = {
  palletConfigs: [DEMO_PALLET],
  boxConfigs: [DEMO_BOX_A, DEMO_BOX_B, DEMO_BOX_C],
  savedLayouts: [DEMO_LAYOUT],
  savedPalletBuilds: [DEMO_BUILD],
};

/** True when store has no real library data yet */
export function shouldSeedDemoData(state: {
  palletConfigs: unknown[];
  boxConfigs: unknown[];
  savedLayouts: unknown[];
  savedPalletBuilds: unknown[];
}) {
  return (
    state.palletConfigs.length === 0 &&
    state.boxConfigs.length === 0 &&
    state.savedLayouts.length === 0 &&
    state.savedPalletBuilds.length === 0
  );
}
