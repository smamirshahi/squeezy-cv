import { EditorSectionId, PreviewSectionId } from "@store/app/app-slice-types";
import { AvailableFonts, Side } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  /** Whether to show borders around components in preview page */
  shouldShowBorders: boolean;

  /** Temporarily solution */
  sides: Record<PreviewSectionId, Side>;

  selectedTypography: AvailableFonts | null;

  selectedSectionInEditorPage: EditorSectionId | null;
}

export const initialState: AppState = {
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
  selectedSectionInEditorPage: null,
};

/** Slice to access state of app */
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setIsPrinting(state, action: PayloadAction<boolean>) {
      state.shouldShowBorders = !action.payload;
    },

    setShouldShowBorders(state, action: PayloadAction<boolean>) {
      state.shouldShowBorders = action.payload;
    },

    setSideForSectionById(
      state,
      action: PayloadAction<{ sectionId: PreviewSectionId; side: Side }>
    ) {
      const { sectionId, side } = action.payload;
      state.sides[sectionId] = side;
    },

    setSelectedTypography(state, action: PayloadAction<AvailableFonts | null>) {
      state.selectedTypography = action.payload;
    },

    setSelectedSectionInEditorPage(
      state,
      action: PayloadAction<EditorSectionId | null>
    ) {
      state.selectedSectionInEditorPage = action.payload;
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
  setShouldShowBorders,
  setSideForSectionById,
  setSelectedTypography,
  setSelectedSectionInEditorPage,
  resetAppState,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
