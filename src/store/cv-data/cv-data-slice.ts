import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TypographyVariant } from "@custom-styles/custom-styles";
import { CVData, CVJson, MetaData } from "@custom-types/json-types";
import { AvailableFonts, FontStyle, Style } from "@custom-types/styles-types";
import { PersonalInfo } from "@custom-types/personal-info-types";
import { ContactInfo } from "@custom-types/contact-info-types";
import { Experience } from "@custom-types/experience-types";
import { Education } from "@custom-types/education-types";
import { SkillCategory } from "@custom-types/skill-types";

/** State of the current CV */
export type CvDataState = CVJson;

export const initialState: CvDataState = {
  metaData: {
    version: "1.0",
    title: "",
    jobUrl: "",
  },
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
    bulletPointIcon: "disc",
    dateFormat: "MMMM/YYYY",
    typography: TypographyVariant,
    paperMargin: "narrow",
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

    setMetaData(state: CvDataState, action: PayloadAction<MetaData>) {
      state.metaData = action.payload;
    },

    setStyle(state, action: PayloadAction<Style>) {
      state.style = action.payload;
    },

    setPersonalInfo(state: CvDataState, action: PayloadAction<PersonalInfo>) {
      state.data.personalInfo = action.payload;
    },

    setContactInfo(state: CvDataState, action: PayloadAction<ContactInfo>) {
      state.data.contactInfo = action.payload;
    },

    setProfessionalSummary(state, action: PayloadAction<string>) {
      state.data.professionalSummary = action.payload;
    },

    setExperiences(state, action: PayloadAction<Experience[]>) {
      state.data.experiences = action.payload;
    },

    setExperienceVisibilityById(
      state,
      action: PayloadAction<{ id: string; shouldShow: boolean }>
    ) {
      const { id, shouldShow } = action.payload;
      const experience = state.data.experiences.find((exp) => exp.id === id);
      if (experience) {
        experience.shouldShow = shouldShow;
      }
    },

    setEducations(state, action: PayloadAction<Education[]>) {
      state.data.educations = action.payload;
    },

    setSkills(state, action: PayloadAction<SkillCategory[]>) {
      state.data.skills = action.payload;
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
    cvDataSelector: (state: CvDataState) => state.data,
    styleSelector: (state: CvDataState) => state.style,
  },
});

export const { metaDataSelector, cvDataSelector, styleSelector } =
  cvDataSlice.selectors;

export const {
  setMetaData,
  setCvData,
  setStyle,
  setDateFormat,
  setPersonalInfo,
  setContactInfo,
  setProfessionalSummary,
  setExperiences,
  setExperienceVisibilityById,
  setEducations,
  setSkills,
  setPaperMargin,
  setTypography,
  setRatingIcon,
  setBulletPointIcon,
  resetCvDataState,
} = cvDataSlice.actions;

export const cvDataReducer = cvDataSlice.reducer;
