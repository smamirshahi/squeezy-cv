import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  ContactInfo,
  CVData,
  CVFile,
  Experience,
  PersonalInfo,
  Style,
} from "../../types/json-types";

/** State of the current Applicant */
export type ApplicantState = CVFile;

export const initialState: ApplicantState = {
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
  },
};

/** Slice to access state of applicant */
const applicantSlice = createSlice({
  name: "applicant",
  initialState,
  reducers: {
    setCvData(state, action: PayloadAction<CVData>) {
      state.data = action.payload;
    },
    updatePersonalInfo(
      state,
      action: PayloadAction<{
        field: keyof PersonalInfo;
        value: string;
      }>
    ) {
      state.data.personalInfo[action.payload.field] = action.payload.value;
    },

    updateContactInfo(
      state,
      action: PayloadAction<{
        field: keyof ContactInfo;
        value: string;
      }>
    ) {
      state.data.contactInfo[action.payload.field] = action.payload.value;
    },

    updateProfessionalSummary(
      state,
      action: PayloadAction<{
        value: string;
      }>
    ) {
      state.data.professionalSummary = action.payload.value;
    },

    addExperience: (state) => {
      state.data.experiences.push({
        id: nanoid(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bulletPoints: [],
      });
    },

    updateExperience: <K extends keyof Experience>(
      state: ApplicantState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: Experience[K];
      }>
    ) => {
      const { id, key, value } = action.payload;
      const experience = state.data.experiences.find(
        (experience) => experience.id === id
      );
      if (experience) {
        experience[key] = value;
      }
    },

    addBulletPoint: (state, action: PayloadAction<{ id: string }>) => {
      const experience = state.data.experiences.find(
        (exp) => exp.id === action.payload.id
      );
      if (experience) {
        experience.bulletPoints.push("");
      }
    },

    updateExperienceBulletPoint: (
      state,
      action: PayloadAction<{
        id: string;
        index: number;
        value: string;
      }>
    ) => {
      const { id, index, value } = action.payload;
      const experience = state.data.experiences.find((exp) => exp.id === id);
      if (experience && experience.bulletPoints[index] !== undefined) {
        experience.bulletPoints[index] = value;
      }
    },

    removeBulletPoint: (
      state,
      action: PayloadAction<{ id: string; index: number }>
    ) => {
      const { id, index } = action.payload;
      const experience = state.data.experiences.find((exp) => exp.id === id);
      if (experience && experience.bulletPoints[index] !== undefined) {
        experience.bulletPoints.splice(index, 1); // mutates via Immer
      }
    },

    removeExperience: (state, action: PayloadAction<string>) => {
      state.data.experiences = state.data.experiences.filter(
        (exp) => exp.id !== action.payload
      );
    },

    setTemplate(state, action: PayloadAction<Style["template"]>) {
      state.style.template = action.payload;
    },
    resetApplicantState: () => initialState,
  },
  selectors: {
    versionSelector: (state: ApplicantState) => state.version,
    cvDataSelector: (state: ApplicantState) => state.data,
    styleSelector: (state: ApplicantState) => state.style,
  },
});

export const { versionSelector, cvDataSelector, styleSelector } =
  applicantSlice.selectors;
export const {
  setCvData,
  setTemplate,
  updatePersonalInfo,
  updateContactInfo,
  updateProfessionalSummary,
  addExperience,
  updateExperience,
  addBulletPoint,
  updateExperienceBulletPoint,
  removeBulletPoint,
  removeExperience,
  resetApplicantState,
} = applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
