import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  ContactInfo,
  CVData,
  CVFile,
  Education,
  Experience,
  PersonalInfo,
  Style,
} from "../../types/json-types";
import { findEducation, findExperience } from "./application-slice-helper";

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

    updatePersonalInfo<K extends keyof PersonalInfo>(
      state: ApplicantState,
      action: PayloadAction<{
        field: K;
        value: PersonalInfo[K];
      }>
    ) {
      state.data.personalInfo[action.payload.field] = action.payload.value;
    },

    updateContactInfo<K extends keyof ContactInfo>(
      state: ApplicantState,
      action: PayloadAction<{
        field: K;
        value: ContactInfo[K];
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

    removeExperience: (state, action: PayloadAction<string>) => {
      state.data.experiences = state.data.experiences.filter(
        (exp) => exp.id !== action.payload
      );
    },

    updateExperience: <K extends keyof Experience>(
      state: ApplicantState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: Experience[K];
      }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp) {
        exp[action.payload.key] = action.payload.value;
      }
    },

    addBulletPoint: (state, action: PayloadAction<{ id: string }>) => {
      const exp = findExperience(state, action.payload.id);
      exp?.bulletPoints.push("");
    },

    updateExperienceBulletPoint: (
      state,
      action: PayloadAction<{
        id: string;
        index: number;
        value: string;
      }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp?.bulletPoints[action.payload.index] !== undefined) {
        exp.bulletPoints[action.payload.index] = action.payload.value;
      }
    },

    removeBulletPoint: (
      state,
      action: PayloadAction<{ id: string; index: number }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp?.bulletPoints[action.payload.index] !== undefined) {
        exp.bulletPoints.splice(action.payload.index, 1); // mutates via Immer
      }
    },

    addEducation: (state) => {
      state.data.educations.push({
        id: nanoid(),
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
        dissertationTitle: "",
      });
    },

    removeEducation: (state, action: PayloadAction<string>) => {
      state.data.educations = state.data.educations.filter(
        (edu) => edu.id !== action.payload
      );
    },

    updateEducation: <K extends keyof Education>(
      state: ApplicantState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: Education[K];
      }>
    ) => {
      const edu = findEducation(state, action.payload.id);
      if (edu) {
        edu[action.payload.key] = action.payload.value;
      }
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
  removeExperience,
  updateExperience,
  addBulletPoint,
  updateExperienceBulletPoint,
  removeBulletPoint,
  addEducation,
  removeEducation,
  updateEducation,
  resetApplicantState,
} = applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
