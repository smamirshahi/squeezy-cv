import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CVFile } from "../../types/json-types";

/**
 * State of the current Applicant
 */
export type ApplicantState = {
  cvData: CVFile["data"];
};

// TODO: Add versioning in slice

export const initialState: ApplicantState = {
  cvData: {
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
    experience: [
      {
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bulletPoints: [],
      },
    ],
    education: [],
    skills: [],
  },
};

/** Slice to access state of applicant */
const applicantSlice = createSlice({
  name: "applicant",
  initialState,
  reducers: {
    setCvData(state, action: PayloadAction<CVFile["data"]>) {
      state.cvData = action.payload;
    },
    updatePersonalInfo(
      state,
      action: PayloadAction<{
        field: keyof CVFile["data"]["personalInfo"];
        value: string;
      }>
    ) {
      if (state.cvData) {
        state.cvData.personalInfo[action.payload.field] = action.payload.value;
      }
    },
    resetApplicantState: () => initialState,
  },
  selectors: {
    cvDataSelector: (state: ApplicantState) => state.cvData,
    personalInfoSelector: (state: ApplicantState) => state.cvData?.personalInfo,
    contactInfoSelector: (state: ApplicantState) => state.cvData?.contactInfo,
    professionalSummarySelector: (state: ApplicantState) =>
      state.cvData?.professionalSummary,
    experienceSelector: (state: ApplicantState) => state.cvData?.experience,
    educationSelector: (state: ApplicantState) => state.cvData?.education,
    skillsSelector: (state: ApplicantState) => state.cvData?.skills,
  },
});

export const { cvDataSelector } = applicantSlice.selectors;
export const { setCvData, resetApplicantState } = applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
