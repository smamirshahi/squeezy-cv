import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  shouldShowGrids: boolean;

  isPrinting: boolean;
}

export const initialState: AppState = {
  shouldShowGrids: true,

  isPrinting: false,
};

/** Slice to access state of app */
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setIsPrinting(state, action: PayloadAction<boolean>) {
      state.isPrinting = action.payload;
    },

    setShouldShowGrids(state, action: PayloadAction<boolean>) {
      state.shouldShowGrids = action.payload;
    },

    resetAppState: () => initialState,
  },
  selectors: {
    appSelector: (state: AppState) => state,
  },
});

export const { appSelector } = appSlice.selectors;

export const { setIsPrinting, setShouldShowGrids, resetAppState } =
  appSlice.actions;

export const appReducer = appSlice.reducer;
