import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  shouldShowGrids: boolean;
}

export const initialState: AppState = {
  shouldShowGrids: true,
};

/** Slice to access state of app */
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setShouldShowGrids(state, action: PayloadAction<boolean>) {
      state.shouldShowGrids = action.payload;
    },

    resetAppState: () => initialState,
  },
  selectors: {
    appSelector: (state: AppState) => state.shouldShowGrids,
  },
});

export const { appSelector } = appSlice.selectors;

export const { setShouldShowGrids, resetAppState } = appSlice.actions;

export const appReducer = appSlice.reducer;
