import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SavedState } from "@store/persistence/persistence-logic";

/**
 * - loading: asking the server what is saved
 * - ready: loaded (or nothing saved yet); saving is allowed
 * - offline: the server cannot be reached; working locally, saving is blocked
 * - error: the saved data could not be read; saving is blocked so nothing is overwritten
 */
export type StorageStatus = "loading" | "ready" | "offline" | "error";

export interface PersistenceState {
  status: StorageStatus;

  /** Explains `offline` and `error` */
  message: string;

  /** What is known to be on disk; null if nothing is saved yet */
  saved: SavedState | null;

  isSaving: boolean;

  /** Why the last save failed; empty if it did not */
  saveError: string;
}

export const initialState: PersistenceState = {
  status: "loading",
  message: "",
  saved: null,
  isSaving: false,
  saveError: "",
};

/** Slice to access the state of saving to the local server */
const persistenceSlice = createSlice({
  name: "persistence",
  initialState,
  reducers: {
    setStorageStatus(
      state,
      action: PayloadAction<{ status: StorageStatus; message?: string }>
    ) {
      state.status = action.payload.status;
      state.message = action.payload.message ?? "";
    },

    setSavedState(state, action: PayloadAction<SavedState | null>) {
      state.saved = action.payload;
    },

    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
      if (action.payload) {
        state.saveError = "";
      }
    },

    setSaveError(state, action: PayloadAction<string>) {
      state.saveError = action.payload;
    },
  },
});

export const persistenceReducer = persistenceSlice.reducer;

export const { setStorageStatus, setSavedState, setSaving, setSaveError } =
  persistenceSlice.actions;
