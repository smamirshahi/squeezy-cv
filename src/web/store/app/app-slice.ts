import { EditorSectionId, PageStructure } from "@store/app/app-slice-types";
import { AvailableFonts } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** State of the App slice */
interface AppState {
  selectedTypography: AvailableFonts | null;

  structure: PageStructure;

  columnWidth: {
    /** Width of the left column in preview page in percentage */
    left: number;
    /** Width of the right column in preview page in percentage */
    right: number;
  };

  selectedSectionInEditorPage: EditorSectionId;

  shouldApplyChanges: boolean;
  shouldDiscardChanges: boolean;
  shouldAddNewItem: boolean;
}

export const initialState: AppState = {
  selectedTypography: null,
  structure: {
    fullWidth: [
      "personalInfo",
      "contactInfo",
      "summary",
      "experience",
      "education",
      "skills",
    ],
    left: [],
    right: [],
  },
  columnWidth: {
    left: 50,
    right: 50,
  },
  selectedSectionInEditorPage: "metaData",
  shouldApplyChanges: false,
  shouldDiscardChanges: false,
  shouldAddNewItem: false,
};

/** Slice to access state of app */
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    updatePageStructure(state, action: PayloadAction<PageStructure>) {
      state.structure = action.payload;
    },

    setSelectedTypography(state, action: PayloadAction<AvailableFonts | null>) {
      state.selectedTypography = action.payload;
    },

    setSelectedSectionInEditorPage(
      state,
      action: PayloadAction<EditorSectionId>
    ) {
      state.selectedSectionInEditorPage = action.payload;
    },

    setColumnWidth(state, action: PayloadAction<AppState["columnWidth"]>) {
      state.columnWidth = action.payload;
    },

    setShouldApplyChanges(state, action: PayloadAction<boolean>) {
      state.shouldApplyChanges = action.payload;
    },

    setShouldDiscardChanges(state, action: PayloadAction<boolean>) {
      state.shouldDiscardChanges = action.payload;
    },

    setShouldAddNewItem(state, action: PayloadAction<boolean>) {
      state.shouldAddNewItem = action.payload;
    },

    resetAppState: () => initialState,
  },
  selectors: {
    appSelector: (state: AppState) => state,
  },
});

export const { appSelector } = appSlice.selectors;

export const {
  updatePageStructure,
  setSelectedTypography,
  setSelectedSectionInEditorPage,
  setColumnWidth,
  resetAppState,
  setShouldApplyChanges,
  setShouldDiscardChanges,
  setShouldAddNewItem,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
