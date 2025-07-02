import { EditorSectionId, PageStructure } from "@store/app/app-slice-types";
import { AvailableFonts } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  /** Whether to show borders around components in preview page */
  shouldShowBorders: boolean;

  selectedTypography: AvailableFonts | null;

  structure: PageStructure;

  columnWidth: {
    /** Width of the left column in preview page in percentage */
    left: number;
    /** Width of the right column in preview page in percentage */
    right: number;
  };

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
  columnWidth: {
    left: 50,
    right: 50,
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

    setColumnWidth(state, action: PayloadAction<AppState["columnWidth"]>) {
      state.columnWidth = action.payload;
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
  setColumnWidth,
  resetAppState,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
