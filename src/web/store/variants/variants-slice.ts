import { PayloadAction, createSlice, current, nanoid } from "@reduxjs/toolkit";
import { Style } from "@custom-types/styles-types";
import { ItemSelection, Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import {
  createVariant,
  duplicateVariant as copyVariant,
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
          state.variants[index],
          action.payload.itemId,
          action.payload.change
        );
      }
    },
  },
});

export const variantsReducer = variantsSlice.reducer;

export const {
  setVariants,
  createVariant: addVariant,
  duplicateVariant,
  renameVariant,
  deleteVariant,
  setActiveVariant,
  setItemSelection,
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
