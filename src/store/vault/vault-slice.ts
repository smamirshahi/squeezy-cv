import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  CURRENT_VAULT_VERSION,
  SectionType,
  Vault,
} from "@custom-types/vault-types";

/** State of the vault slice: the facts, independent of any one CV */
export type VaultState = Vault;

export const initialState: VaultState = {
  version: CURRENT_VAULT_VERSION,
  profile: { fullName: "" },
  links: [],
  sections: [],
};

interface AddSectionPayload {
  id: string;
  type: SectionType;
  title: string;
}

/** Slice to access the vault */
const vaultSlice = createSlice({
  name: "vault",
  initialState,
  reducers: {
    setVault(_state, action: PayloadAction<Vault>) {
      return action.payload;
    },

    addSection: {
      reducer(state, action: PayloadAction<AddSectionPayload>) {
        state.sections.push({ ...action.payload, items: [] });
      },
      prepare(input: { type: SectionType; title: string; id?: string }) {
        return {
          payload: { ...input, id: input.id ?? nanoid() },
        };
      },
    },

    removeSection(state, action: PayloadAction<{ id: string }>) {
      state.sections = state.sections.filter((s) => s.id !== action.payload.id);
    },

    renameSection(state, action: PayloadAction<{ id: string; title: string }>) {
      const section = state.sections.find((s) => s.id === action.payload.id);
      if (section) {
        section.title = action.payload.title;
      }
    },

    /** Moves a section to a new position. The index is clamped to the valid range. */
    moveSection(state, action: PayloadAction<{ id: string; toIndex: number }>) {
      const from = state.sections.findIndex((s) => s.id === action.payload.id);
      if (from === -1) {
        return;
      }
      const [section] = state.sections.splice(from, 1);
      const to = Math.max(
        0,
        Math.min(action.payload.toIndex, state.sections.length)
      );
      state.sections.splice(to, 0, section);
    },

    resetVaultState: () => initialState,
  },
  selectors: {
    vaultSelector: (state: VaultState) => state,
    sectionsSelector: (state: VaultState) => state.sections,
  },
});

export const { vaultSelector, sectionsSelector } = vaultSlice.selectors;

export const {
  setVault,
  addSection,
  removeSection,
  renameSection,
  moveSection,
  resetVaultState,
} = vaultSlice.actions;

export const vaultReducer = vaultSlice.reducer;
