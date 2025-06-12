import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  ContactInfo,
  CVData,
  CVFile,
  PersonalInfo,
  Style,
} from "@custom-types/json-types";
import {
  AvailableFonts,
  TypographyVariant,
  FontStyle,
} from "@custom-styles/custom-styles";
import { experiencesReducers } from "@store/cv-data/experiences-reducers";
import { educationsReducers } from "@store/cv-data/educations-reducers";
import { skillsReducers } from "@store/cv-data/skills-reducers";

/** State of the current CV */
export type CvDataState = CVFile & {
  typographyVariant: Record<AvailableFonts, FontStyle>;
};

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
    template: "one-column",
    shouldShowFullContactLinks: true,
    ratingIcon: "star",
    dateFormat: "MMMM/YYYY",
  },
  typographyVariant: TypographyVariant,
};

/** Slice to access state of cv data */
const cvDataSlice = createSlice({
  name: "cvData",
  initialState,
  reducers: {
    setCvData(state, action: PayloadAction<CVData>) {
      state.data = action.payload;
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

    setTemplate(state, action: PayloadAction<Style["template"]>) {
      state.style.template = action.payload;
    },

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
      state.typographyVariant[action.payload.variant] =
        action.payload.fontStyle;
    },

    resetCvDataState: () => initialState,
  },
  selectors: {
    versionSelector: (state: CvDataState) => state.version,
    cvDataSelector: (state: CvDataState) => state.data,
    styleSelector: (state: CvDataState) => state.style,
    typographyVariantSelector: (state: CvDataState) => state.typographyVariant,
  },
});

export const {
  versionSelector,
  cvDataSelector,
  styleSelector,
  typographyVariantSelector,
} = cvDataSlice.selectors;
export const {
  setCvData,
  setTemplate,
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
