// store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----- Types ----- //
export type WeightUnit = 'lb' | 'kg';
export type LengthUnit = 'in' | 'mm';

export interface PalletConfig {
  id: string;
  name: string;
  // width/depth are stored canonically in inches.
  width: number;
  depth: number;
  height: number;
  // For display / input metadata: the unit the user entered length/width in.
  lengthUnit?: LengthUnit;
  widthUnit?: LengthUnit;
  depthUnit?: LengthUnit;
  heightUnit?: LengthUnit;

  // New weight support
  // `maxWeight` is the number as entered (in the provided unit).
  // `maxWeightUnit` is the unit used to enter/display that number.
  // `maxWeightKg` is canonical storage (kilograms) used for comparisons/aggregation.
  maxWeight?: number;
  maxWeightUnit?: WeightUnit;
  maxWeightKg?: number;
}

export type BoxSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'none';

export interface BoxConfig {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  weight: number;
  labelTemplate?: 'barcode-small' | 'barcode-medium' | 'barcode-large' | 'none';
  labelSides?: BoxSide[];
  widthUnit?: 'in' | 'mm';
  depthUnit?: 'in' | 'mm';
  heightUnit?: 'in' | 'mm';
  weightUnit?: 'lb' | 'kg';

}

export interface LayoutItem extends BoxConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  rotationDegrees?: number;
  layerId?: number;
}

export interface Layer {
  id: number;
  name: string;
  items: LayoutItem[];
}

export interface PalletSnapshot {
  id: string | number;
  name: string;
  width: number;
  depth: number;
  height: number;
  maxWeight?: number;
  maxWeightUnit?: WeightUnit;
  maxWeightKg?: number;
  lengthUnit?: LengthUnit;
  widthUnit?: LengthUnit;
  depthUnit?: LengthUnit;
  heightUnit?: LengthUnit;
}

export interface ItemSnapshot {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  weight?: number;
  count: number;
}

export interface SavedLayout {
  id: number;
  name: string;
  timestamp: string;
  layers: Layer[];
  totalItems: number;
  totalWeight: number;
  pallet: PalletSnapshot;
  itemsSummary: ItemSnapshot[];
}

export interface ActiveLayout {
  pallet: PalletConfig;
  boxTypes: BoxConfig[];
  createdAt: string;
}

export interface PlacedLayer {
  id: string;
  sourceLayoutId: number;
  sourceLayerId: number;
  name: string;
  items: LayoutItem[];
  thickness: number;
  weight: number;
  yOffset: number;
}

export interface SavedPalletBuild {
  id: number;
  name: string;
  timestamp: string;
  pallet: PalletConfig;
  placedLayers: PlacedLayer[];
  totalLayers: number;
  totalWeight: number;
}

// ----- Store API ----- //
interface AppStore {
  palletConfigs: PalletConfig[];
  boxConfigs: BoxConfig[];
  activeLayout: ActiveLayout | null;
  savedLayouts: SavedLayout[];
  workingLayers: Layer[];
  currentEditingLayoutId: number | null;
  savedPalletBuilds: SavedPalletBuild[];

  addPalletConfig: (pallet: Omit<PalletConfig, 'id'>) => void;
  addBoxConfig: (box: Omit<BoxConfig, 'id'>) => void;
  removePalletConfig: (id: string) => void;
  removeBoxConfig: (id: string) => void;

  // update actions
  updatePalletConfig: (id: string, partial: Partial<PalletConfig>) => void;
  updateBoxConfig: (id: string, partial: Partial<BoxConfig>) => void;

  setActiveLayout: (pallet: PalletConfig, boxTypes: BoxConfig[]) => void;

  addSavedLayout: (layout: SavedLayout) => void;
  updateSavedLayout: (layout: SavedLayout) => void;
  removeSavedLayout: (id: number) => void;
  setSavedLayersSnapshot: (payload: { id: number; layers: Layer[] }) => void;

  setWorkingLayers: (layers: Layer[]) => void;
  clearWorkingLayers: () => void;
  startEditingLayout: (id: number) => void;
  stopEditingLayout: () => void;

  getSavedLayoutById: (id: number) => SavedLayout | undefined;

  addPalletBuild: (build: SavedPalletBuild) => void;
  updatePalletBuild: (build: SavedPalletBuild) => void;
  removePalletBuild: (id: number) => void;
  getPalletBuildById: (id: number) => SavedPalletBuild | undefined;

  // Migration helper you can call once on app init to normalize older persisted pallets
  migratePalletConfigsToUnits?: () => void;
}

// ----- Helpers ----- //
const lbsToKg = (lbs: number) => lbs * 0.45359237;
const kgToLbs = (kg: number) => kg / 0.45359237;

const computeLayoutTotals = (layers: Layer[]) => {
  const totalItems = layers.reduce((s, l) => s + l.items.length, 0);
  const totalWeight = layers.reduce(
    (s, l) => s + l.items.reduce((acc, it) => acc + (it.weight ?? 0), 0),
    0
  );
  return { totalItems, totalWeight };
};

const deepCloneLayers = (layers: Layer[]): Layer[] =>
  layers.map((l) => ({ ...l, items: l.items.map((it) => ({ ...it })) }));

// ----- Store ----- //
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      palletConfigs: [],
      boxConfigs: [],
      activeLayout: null,
      savedLayouts: [],
      workingLayers: [{ id: 1, name: 'Layer 1', items: [] }],
      currentEditingLayoutId: null,
      savedPalletBuilds: [],

      addPalletConfig: (pallet) =>
        set((state) => {
          const id = Date.now().toString();
          const suppliedMax = pallet.maxWeight;
          const suppliedUnit = pallet.maxWeightUnit ?? 'lb';
          const suppliedKg = pallet.maxWeightKg;

          let computedKg: number | undefined = undefined;
          if (typeof suppliedKg === 'number') computedKg = Number(suppliedKg);
          else if (typeof suppliedMax === 'number') {
            computedKg = suppliedUnit === 'lb' ? lbsToKg(suppliedMax) : suppliedMax;
            computedKg = Number(computedKg);
          }

          const storedPallet: PalletConfig = {
            ...pallet,
            id,
            height: pallet.height ?? 0,
            maxWeight: typeof suppliedMax === 'number' ? suppliedMax : undefined,
            maxWeightUnit: suppliedMax !== undefined ? suppliedUnit : undefined,
            maxWeightKg: typeof computedKg === 'number' ? Number(computedKg) : undefined,
          };

          return {
            palletConfigs: [...state.palletConfigs, storedPallet],
          };
        }),

      addBoxConfig: (box) =>
        set((state) => ({
          boxConfigs: [
            ...state.boxConfigs,
            { ...box, id: Date.now().toString() },
          ],
        })),

      removePalletConfig: (id) =>
        set((state) => ({
          palletConfigs: state.palletConfigs.filter((p) => p.id !== id),
        })),

      removeBoxConfig: (id) =>
        set((state) => ({
          boxConfigs: state.boxConfigs.filter((b) => b.id !== id),
        })),

      updatePalletConfig: (id, partial) =>
        set((state) => {
          const newList = state.palletConfigs.map((p) => {
            if (p.id !== id) return p;

            const merged: PalletConfig = { ...p, ...partial };
            let kg = merged.maxWeightKg;
            if (typeof partial.maxWeightKg === 'number') {
              kg = Number(partial.maxWeightKg);
            } else if (typeof partial.maxWeight === 'number') {
              const unit = partial.maxWeightUnit ?? merged.maxWeightUnit ?? 'lb';
              kg = unit === 'lb' ? lbsToKg(partial.maxWeight) : partial.maxWeight;
            }
            merged.maxWeightKg = typeof kg === 'number' ? Number(kg) : merged.maxWeightKg;

            if (typeof partial.maxWeight === 'number' && !partial.maxWeightUnit && p.maxWeightUnit) {
              merged.maxWeightUnit = p.maxWeightUnit;
            }

            return merged;
          });

          return { palletConfigs: newList };
        }),

      updateBoxConfig: (id, partial) =>
        set((state) => ({
          boxConfigs: state.boxConfigs.map((b) =>
            b.id === id ? { ...b, ...partial } : b
          ),
        })),

      setActiveLayout: (pallet, boxTypes) =>
        set({
          activeLayout: {
            pallet,
            boxTypes,
            createdAt: new Date().toISOString(),
          },
        }),

      addSavedLayout: (layout) =>
        set((state) => {
          const { totalItems, totalWeight } = computeLayoutTotals(layout.layers);
          return {
            savedLayouts: [{ ...layout, totalItems, totalWeight }, ...state.savedLayouts],
          };
        }),

      updateSavedLayout: (layout) =>
        set((state) => {
          const { totalItems, totalWeight } = computeLayoutTotals(layout.layers);
          return {
            savedLayouts: state.savedLayouts.map((s) =>
              s.id === layout.id ? { ...layout, totalItems, totalWeight } : s
            ),
          };
        }),

      removeSavedLayout: (id) =>
        set((state) => ({
          savedLayouts: state.savedLayouts.filter((s) => s.id !== id),
          currentEditingLayoutId:
            state.currentEditingLayoutId === id ? null : state.currentEditingLayoutId,
        })),

      setSavedLayersSnapshot: ({ id, layers }) =>
        set((state) => {
          const { totalItems, totalWeight } = computeLayoutTotals(layers);
          return {
            savedLayouts: state.savedLayouts.map((s) =>
              s.id === id
                ? { ...s, layers: deepCloneLayers(layers), totalItems, totalWeight }
                : s
            ),
          };
        }),

      setWorkingLayers: (layers) => set({ workingLayers: deepCloneLayers(layers) }),
      clearWorkingLayers: () => set({ workingLayers: [{ id: 1, name: 'Layer 1', items: [] }] }),
      startEditingLayout: (id) => set({ currentEditingLayoutId: id }),
      stopEditingLayout: () => set({ currentEditingLayoutId: null }),

      getSavedLayoutById: (id) => get().savedLayouts.find((s) => s.id === id),

      addPalletBuild: (build) =>
        set((state) => ({
          savedPalletBuilds: [{ ...build }, ...state.savedPalletBuilds],
        })),

      updatePalletBuild: (build) =>
        set((state) => ({
          savedPalletBuilds: state.savedPalletBuilds.map((b) =>
            b.id === build.id ? { ...build } : b
          ),
        })),

      removePalletBuild: (id) =>
        set((state) => ({
          savedPalletBuilds: state.savedPalletBuilds.filter((b) => b.id !== id),
        })),

      getPalletBuildById: (id) => get().savedPalletBuilds.find((b) => b.id === id),

      // Migration helper (call once at app init if you have existing persisted pallets).
      // This will overwrite palletConfigs in the store to include maxWeightUnit and maxWeightKg
      // based on best-effort assumptions:
      // - If a pallet already has maxWeightKg, it's left alone.
      // - If it only has maxWeight, we assume it was entered in lbs (legacy) and convert to kg.
      // - If it has neither, fields remain undefined.
      // migratePalletConfigsToUnits: () => {
      //   set((state) => {
      //     const migrated = state.palletConfigs.map((p) => {
      //       // if already has kg and a unit — skip
      //       if (typeof p.maxWeightKg === 'number' && p.maxWeightUnit) return p;
      //
      //       // if has maxWeight and no unit — assume 'lb' (legacy)
      //       if (typeof p.maxWeight === 'number' && !p.maxWeightUnit) {
      //         const kg = lbsToKg(p.maxWeight);
      //         return { ...p, maxWeightUnit: 'lb', maxWeightKg: Number(kg.toFixed(4)) };
      //       }
      //
      //       // if has maxWeightKg but no unit — keep kg and leave unit undefined
      //       if (typeof p.maxWeightKg === 'number' && !p.maxWeightUnit) {
      //         return { ...p, maxWeightUnit: undefined, maxWeightKg: Number(p.maxWeightKg) };
      //       }
      //
      //       return p;
      //     });
      //
      //     return { palletConfigs: migrated };
      //   });
      // },
    }),
    {
      name: 'palletizer-store',
      storage: createJSONStorage((): Storage => localStorage),
    }
  )
);
