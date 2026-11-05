import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TypographyVariant } from "@custom-styles/custom-styles";
import { MetaData } from "@custom-types/json-types";
import { AvailableFonts, FontStyle, Style } from "@custom-types/styles-types";

/** State of the current CV file apart from its content (that lives in the vault slice) */
export interface CvDataState {
  metaData: MetaData;
  style: Style;
}

export const initialState: CvDataState = {
  metaData: {
    version: "1.0",
    title: "",
    jobUrl: "",
  },
  style: {
    shouldShowFullContactLinks: true,
    ratingIcon: "star",
    bulletPointIcon: "disc",
    dateFormat: "MMMM/YYYY",
    typography: TypographyVariant,
    paperMargin: "narrow",
  },
};

/** Slice to access the meta data and the style of the current CV */
const cvDataSlice = createSlice({
  name: "cvData",
  initialState,
  reducers: {
    setMetaData(state: CvDataState, action: PayloadAction<MetaData>) {
      state.metaData = action.payload;
    },

    setStyle(state, action: PayloadAction<Style>) {
      state.style = action.payload;
    },

    setDateFormat(state, action: PayloadAction<Style["dateFormat"]>) {
      state.style.dateFormat = action.payload;
    },

    setPaperMargin(state, action: PayloadAction<Style["paperMargin"]>) {
      state.style.paperMargin = action.payload;
    },

    setTypography(
      state,
      action: PayloadAction<{
        variant: AvailableFonts;
        fontStyle: FontStyle;
      }>
    ) {
      state.style.typography[action.payload.variant] = action.payload.fontStyle;
    },

    setRatingIcon(state, action: PayloadAction<Style["ratingIcon"]>) {
      state.style.ratingIcon = action.payload;
    },

    setBulletPointIcon(state, action: PayloadAction<Style["bulletPointIcon"]>) {
      state.style.bulletPointIcon = action.payload;
    },

    resetCvDataState: () => initialState,
  },
  selectors: {
    metaDataSelector: (state: CvDataState) => state.metaData,
    styleSelector: (state: CvDataState) => state.style,
  },
});

export const { metaDataSelector, styleSelector } = cvDataSlice.selectors;

export const {
  setMetaData,
  setStyle,
  setDateFormat,
  setPaperMargin,
  setTypography,
  setRatingIcon,
  setBulletPointIcon,
  resetCvDataState,
} = cvDataSlice.actions;

export const cvDataReducer = cvDataSlice.reducer;
