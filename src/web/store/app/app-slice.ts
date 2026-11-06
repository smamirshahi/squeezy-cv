import { EditorSectionId, PageStructure } from "@store/app/app-slice-types";
import { AvailableFonts } from "@custom-types/styles-types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** The tools in the left rail of the workspace */
export type WorkspaceTool = "variants" | "vault" | "tailor" | "ai";

export interface FitInfo {
  pageCount: number;
  usedPercent: number;
  linesOver: number;
  lineHeightPx: number;
  /** What the first page beyond the limit starts with, when it overflows */
  overflowStartsWith: string;
}

export interface SelectedBlock {
  sectionId: string;
  itemId?: string;
}

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

  /** Which tool of the workspace is open */
  tool: WorkspaceTool;

  /** The block selected on the canvas: a section, or one item of it */
  selectedBlock: SelectedBlock | null;

  /** Canvas zoom, 1 = 100% (only how the page is shown, never what is printed) */
  canvasZoom: number;

  /** What the preview measured, for the top bar and the overflow banner */
  fit: FitInfo;

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
  tool: "variants",
  selectedBlock: null,
  canvasZoom: 1,
  fit: {
    pageCount: 1,
    usedPercent: 0,
    linesOver: 0,
    lineHeightPx: 16,
    overflowStartsWith: "",
  },
  shouldApplyChanges: false,
  shouldDiscardChanges: false,
  shouldAddNewItem: false,
};

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

/** Keeps a zoom within its limits, in steps of 1% */
export function clampZoom(zoom: number): number {
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) * 100) / 100;
}

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

    setTool(state, action: PayloadAction<WorkspaceTool>) {
      state.tool = action.payload;
    },

    setCanvasZoom(state, action: PayloadAction<number>) {
      state.canvasZoom = clampZoom(action.payload);
    },

    setSelectedBlock(state, action: PayloadAction<SelectedBlock | null>) {
      state.selectedBlock = action.payload;
    },

    setFit(state, action: PayloadAction<FitInfo>) {
      state.fit = action.payload;
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
  setTool,
  setSelectedBlock,
  setCanvasZoom,
  setFit,
  setColumnWidth,
  resetAppState,
  setShouldApplyChanges,
  setShouldDiscardChanges,
  setShouldAddNewItem,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
