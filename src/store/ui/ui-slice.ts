import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ResumeTemplates } from "../../common/custom-types";

/**
 * State of the current UI
 */
export type UiState = {
  template: ResumeTemplates | null;
};

export const initialState: UiState = {
  template: null,
};

/**
 * Slice to access state of ui
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTemplate(state, action: PayloadAction<ResumeTemplates>) {
      state.template = action.payload;
    },
    resetUiState: () => initialState,
  },
  selectors: {
    templateSelector: (state: UiState) => state.template,
  },
});

export const { templateSelector } = uiSlice.selectors;
export const { setTemplate, resetUiState } = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
