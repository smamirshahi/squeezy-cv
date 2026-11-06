import { PayloadAction, createSlice, current, nanoid } from "@reduxjs/toolkit";
import { Style } from "@custom-types/styles-types";
import {
  BulletSelection,
  FitLimitsValue,
  FitMode,
  FitTuning,
  ItemSelection,
  Variant,
  VariantLayout,
} from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import {
  createVariant,
  duplicateVariant as copyVariant,
  updateBulletSelection,
  updateItemSelection as changeItemSelection,
} from "@shared/variant/variant-utils";
import { createDefaultVault } from "@shared/vault/default-vault";
import { initialState as initialStyleState } from "@store/cv-data/cv-data-slice";

/** State of the variants slice: the saved ways of showing the vault */
export interface VariantsState {
  variants: Variant[];
  activeId: string;
}

const DEFAULT_VARIANT_ID = "default";

function createInitialState(): VariantsState {
  const variant = createVariant(
    createDefaultVault(),
    initialStyleState.style,
    DEFAULT_VARIANT_ID,
    "Default"
  );
  return { variants: [variant], activeId: variant.id };
}

export const initialState: VariantsState = createInitialState();

/** Slice to access the variants. Removing or hiding things here never touches the vault. */
const variantsSlice = createSlice({
  name: "variants",
  initialState,
  reducers: {
    /** Replaces everything, e.g. after loading from disk. An empty list becomes one default variant. */
    setVariants(state, action: PayloadAction<Variant[]>) {
      if (action.payload.length === 0) {
        return createInitialState();
      }
      state.variants = action.payload;
      if (!action.payload.some((v) => v.id === state.activeId)) {
        state.activeId = action.payload[0].id;
      }
    },

    createVariant: {
      reducer(state, action: PayloadAction<Variant>) {
        state.variants.push(action.payload);
        state.activeId = action.payload.id;
      },
      prepare(input: {
        vault: Vault;
        style: Style;
        name: string;
        id?: string;
      }) {
        return {
          payload: createVariant(
            input.vault,
            input.style,
            input.id ?? nanoid(),
            input.name
          ),
        };
      },
    },

    /** Adds a finished variant (e.g. one made from an AI proposal) and makes it the active one */
    insertVariant(state, action: PayloadAction<Variant>) {
      state.variants.push(action.payload);
      state.activeId = action.payload.id;
    },

    duplicateVariant: {
      reducer(
        state,
        action: PayloadAction<{ sourceId: string; id: string; name?: string }>
      ) {
        const source = state.variants.find(
          (v) => v.id === action.payload.sourceId
        );
        if (!source) {
          return;
        }
        const copy = copyVariant(
          current(source),
          action.payload.id,
          action.payload.name ?? `${source.name} (copy)`
        );
        state.variants.push(copy);
        state.activeId = copy.id;
      },
      prepare(input: { sourceId: string; name?: string; id?: string }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
    },

    renameVariant(state, action: PayloadAction<{ id: string; name: string }>) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (variant) {
        variant.name = action.payload.name;
      }
    },

    /** The last variant cannot be deleted, so there is always one to show */
    deleteVariant(state, action: PayloadAction<{ id: string }>) {
      if (
        state.variants.length <= 1 ||
        !state.variants.some((v) => v.id === action.payload.id)
      ) {
        return;
      }
      state.variants = state.variants.filter((v) => v.id !== action.payload.id);
      if (state.activeId === action.payload.id) {
        state.activeId = state.variants[0].id;
      }
    },

    setActiveVariant(state, action: PayloadAction<{ id: string }>) {
      if (state.variants.some((v) => v.id === action.payload.id)) {
        state.activeId = action.payload.id;
      }
    },

    setItemSelection(
      state,
      action: PayloadAction<{
        variantId: string;
        itemId: string;
        change: Partial<ItemSelection>;
      }>
    ) {
      const index = state.variants.findIndex(
        (v) => v.id === action.payload.variantId
      );
      if (index >= 0) {
        state.variants[index] = changeItemSelection(
          current(state.variants[index]),
          action.payload.itemId,
          action.payload.change
        );
      }
    },

    setBulletSelection(
      state,
      action: PayloadAction<{
        variantId: string;
        itemId: string;
        bulletId: string;
        change: Partial<BulletSelection>;
      }>
    ) {
      const { variantId, itemId, bulletId, change } = action.payload;
      const index = state.variants.findIndex((v) => v.id === variantId);
      if (index >= 0) {
        state.variants[index] = updateBulletSelection(
          current(state.variants[index]),
          itemId,
          bulletId,
          change
        );
      }
    },

    /** Sets the position of several items at once, see `computeItemOrders` */
    setItemOrders(
      state,
      action: PayloadAction<{
        variantId: string;
        orders: Record<string, number>;
      }>
    ) {
      const index = state.variants.findIndex(
        (v) => v.id === action.payload.variantId
      );
      if (index < 0) {
        return;
      }
      let variant = current(state.variants[index]);
      for (const [itemId, order] of Object.entries(action.payload.orders)) {
        variant = changeItemSelection(variant, itemId, { order });
      }
      state.variants[index] = variant;
    },

    /** Sets the position of several bullets of one item at once, see `computeBulletOrders` */
    setBulletOrders(
      state,
      action: PayloadAction<{
        variantId: string;
        itemId: string;
        orders: Record<string, number>;
      }>
    ) {
      const { variantId, itemId, orders } = action.payload;
      const index = state.variants.findIndex((v) => v.id === variantId);
      if (index < 0) {
        return;
      }
      let variant = current(state.variants[index]);
      for (const [bulletId, order] of Object.entries(orders)) {
        variant = updateBulletSelection(variant, itemId, bulletId, { order });
      }
      state.variants[index] = variant;
    },

    setPageLimit(
      state,
      action: PayloadAction<{ id: string; pageLimit: number }>
    ) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (variant) {
        variant.pageLimit = action.payload.pageLimit;
      }
    },

    setAutoFit(
      state,
      action: PayloadAction<{
        id: string;
        isAutoFit: boolean;
        fitMode?: FitMode;
      }>
    ) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (!variant) {
        return;
      }
      variant.isAutoFit = action.payload.isAutoFit;
      if (action.payload.fitMode) {
        variant.fitMode = action.payload.fitMode;
      }
      if (!action.payload.isAutoFit) {
        delete variant.tuning;
      }
    },

    setFitLimits(
      state,
      action: PayloadAction<{ id: string; limits: FitLimitsValue }>
    ) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (variant) {
        variant.fitLimits = action.payload.limits;
        // The old result no longer follows the limits
        delete variant.tuning;
      }
    },

    /** Stores the result of an auto-fit run (null clears it) */
    setTuning(
      state,
      action: PayloadAction<{ id: string; tuning: FitTuning | null }>
    ) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (!variant) {
        return;
      }
      if (action.payload.tuning) {
        variant.tuning = action.payload.tuning;
      } else {
        delete variant.tuning;
      }
    },

    /** Stores the page layout and style the editor currently shows into the variant */
    setVariantAppearance(
      state,
      action: PayloadAction<{ id: string; layout: VariantLayout; style: Style }>
    ) {
      const variant = state.variants.find((v) => v.id === action.payload.id);
      if (variant) {
        variant.layout = action.payload.layout;
        variant.style = action.payload.style;
      }
    },
  },
});

export const variantsReducer = variantsSlice.reducer;

export const {
  setVariants,
  createVariant: addVariant,
  insertVariant,
  duplicateVariant,
  renameVariant,
  deleteVariant,
  setActiveVariant,
  setItemSelection,
  setBulletSelection,
  setBulletOrders,
  setItemOrders,
  setVariantAppearance,
  setPageLimit,
  setAutoFit,
  setFitLimits,
  setTuning,
} = variantsSlice.actions;

export function variantsSelector(state: {
  variants: VariantsState;
}): Variant[] {
  return state.variants.variants;
}

export function activeVariantSelector(state: {
  variants: VariantsState;
}): Variant {
  return (
    state.variants.variants.find((v) => v.id === state.variants.activeId) ??
    state.variants.variants[0]
  );
}
