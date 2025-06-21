import { SectionId } from "@components/drag-and-drop/dnd-kit-types";
import { Side } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  /** Whether to show grids on preview page */
  shouldShowGrids: boolean;

  /** Whether to show borders around components in preview page */
  shouldShowBorders: boolean;

  /** Temporarily solution */
  sides: Record<SectionId, Side>;
}

export const initialState: AppState = {
  shouldShowGrids: true,
  shouldShowBorders: true,
  sides: {
    personalInfo: "fullWidth",
    contactInfo: "fullWidth",
    summary: "fullWidth",
    experiences: "left",
    educations: "right",
    skills: "right",
  },
};

/** Slice to access state of app */
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setIsPrinting(state, action: PayloadAction<boolean>) {
      state.shouldShowGrids = !action.payload;
      state.shouldShowBorders = !action.payload;
    },

    setShouldShowBorders(state, action: PayloadAction<boolean>) {
      state.shouldShowBorders = action.payload;
    },

    setShouldShowGrids(state, action: PayloadAction<boolean>) {
      state.shouldShowGrids = action.payload;
    },

    setSideForSectionById(
      state,
      action: PayloadAction<{ sectionId: SectionId; side: Side }>
    ) {
      const { sectionId, side } = action.payload;
      state.sides[sectionId] = side;
    },

    resetAppState: () => initialState,
  },
  selectors: {
    appSelector: (state: AppState) => state,
  },
});

export const { appSelector } = appSlice.selectors;

export const {
  setIsPrinting,
  setShouldShowGrids,
  setShouldShowBorders,
  resetAppState,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
