import { EditorSectionId, PageStructure } from "@store/app/app-slice-types";
import { AvailableFonts } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  /** Whether to show borders around components in preview page */
  shouldShowBorders: boolean;

  /** Temporarily solution */
  structure: PageStructure;

  selectedTypography: AvailableFonts | null;

  selectedSectionInEditorPage: EditorSectionId | null;
}

export const initialState: AppState = {
  shouldShowBorders: true,
  selectedTypography: null,
  structure: {
    fullWidth: ["personalInfo", "contactInfo", "summary"],
    left: ["experiences"],
    right: ["educations", "skills"],
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

    updatePageStructure(state, action: PayloadAction<PageStructure>) {
      state.structure = action.payload;
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
  updatePageStructure,
  setSelectedTypography,
  setSelectedSectionInEditorPage,
  resetAppState,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
