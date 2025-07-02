import { SectionId } from "./app-slice-types";
import { AvailableFonts, Side } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  /** Whether to show grids on preview page */
  shouldShowGrids: boolean;

  /** Whether to show borders around components in preview page */
  shouldShowBorders: boolean;

  /** Temporarily solution */
  sides: Record<SectionId, Side>;

  selectedTypography: AvailableFonts | null;
}

export const initialState: AppState = {
  shouldShowGrids: true,
  shouldShowBorders: true,
  selectedTypography: null,
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

    setSelectedTypography(state, action: PayloadAction<AvailableFonts | null>) {
      state.selectedTypography = action.payload;
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
  setSideForSectionById,
  setSelectedTypography,
  resetAppState,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
