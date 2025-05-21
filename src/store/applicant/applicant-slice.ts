import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CVFile } from "../../types/json-types";

/**
 * State of the current Applicant
 */
export type ApplicantState = {
  data: CVFile["data"];
  style: CVFile["style"];
};

// TODO: Add versioning in slice

export const initialState: ApplicantState = {
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
    experience: [],
    education: [],
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
    setCvData(state, action: PayloadAction<CVFile["data"]>) {
      state.data = action.payload;
    },
    updatePersonalInfo(
      state,
      action: PayloadAction<{
        field: keyof CVFile["data"]["personalInfo"];
        value: string;
      }>
    ) {
      if (state.data) {
        state.data.personalInfo[action.payload.field] = action.payload.value;
      }
    },
    resetApplicantState: () => initialState,
  },
  selectors: {
    cvDataSelector: (state: ApplicantState) => state.data,
    styleSelector: (state: ApplicantState) => state.style,
  },
});

export const { cvDataSelector, styleSelector } = applicantSlice.selectors;
export const { setCvData, resetApplicantState } = applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
