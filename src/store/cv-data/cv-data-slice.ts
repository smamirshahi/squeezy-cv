import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  AvailableFonts,
  TypographyVariant,
  FontStyle,
} from "@custom-styles/custom-styles";
import { experiencesReducers } from "@store/cv-data/experiences-reducers";
import { educationsReducers } from "@store/cv-data/educations-reducers";
import { skillsReducers } from "@store/cv-data/skills-reducers";
import { CVData, CVJson } from "@custom-types/json-types";
import { Style } from "@custom-types/styles-types";
import { PersonalInfo } from "@custom-types/personal-info-types";
import { ContactInfo } from "@custom-types/contact-info-types";

/** State of the current CV */
export type CvDataState = CVJson;

export const initialState: CvDataState = {
  version: "1.0",
  data: {
    personalInfo: {
      name: "",
      jobTitle: "",
    },
    contactInfo: {
      email: "",
      phone: "",
      location: "",
      linkedInId: "",
      gitHubId: "",
    },
    professionalSummary: "",
    experiences: [],
    educations: [],
    skills: [],
  },
  style: {
    shouldShowFullContactLinks: true,
    ratingIcon: "star",
    dateFormat: "MMMM/YYYY",
    typography: TypographyVariant,
  },
};

/** Slice to access state of cv data */
const cvDataSlice = createSlice({
  name: "cvData",
  initialState,
  reducers: {
    setCvData(state, action: PayloadAction<CVData>) {
      state.data = action.payload;
    },

    setStyle(state, action: PayloadAction<Style>) {
      state.style = action.payload;
    },

    updatePersonalInfo<K extends keyof PersonalInfo>(
      state: CvDataState,
      action: PayloadAction<{
        field: K;
        value: PersonalInfo[K];
      }>
    ) {
      state.data.personalInfo[action.payload.field] = action.payload.value;
    },

    updateContactInfo<K extends keyof ContactInfo>(
      state: CvDataState,
      action: PayloadAction<{
        field: K;
        value: ContactInfo[K];
      }>
    ) {
      state.data.contactInfo[action.payload.field] = action.payload.value;
    },

    updateProfessionalSummary(state, action: PayloadAction<string>) {
      state.data.professionalSummary = action.payload;
    },
    ...experiencesReducers,
    ...educationsReducers,
    ...skillsReducers,

    setDateFormat(state, action: PayloadAction<Style["dateFormat"]>) {
      state.style.dateFormat = action.payload;
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

    resetCvDataState: () => initialState,
  },
  selectors: {
    versionSelector: (state: CvDataState) => state.version,
    cvDataSelector: (state: CvDataState) => state.data,
    styleSelector: (state: CvDataState) => state.style,
  },
});

export const { versionSelector, cvDataSelector, styleSelector } =
  cvDataSlice.selectors;

export const {
  setCvData,
  setStyle,
  setDateFormat,
  updatePersonalInfo,
  updateContactInfo,
  updateProfessionalSummary,
  addExperience,
  removeExperience,
  updateExperience,
  addBulletPoint,
  updateExperienceBulletPoint,
  removeBulletPoint,
  addEducation,
  removeEducation,
  updateEducation,
  addSkillCategory,
  removeSkillCategory,
  updateSkillCategory,
  addSkillItem,
  removeSkillItem,
  updateSkillItem,
  setTypography,
  resetCvDataState,
} = cvDataSlice.actions;

export const cvDataReducer = cvDataSlice.reducer;
