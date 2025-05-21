import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CVFile } from "../../types/json-types";

/**
 * State of the current Applicant
 */
export type ApplicantState = CVFile;

export const initialState: CVFile = {
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
      state.data.personalInfo[action.payload.field] = action.payload.value;
    },
    setTemplate(state, action: PayloadAction<CVFile["style"]["template"]>) {
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
export const { setCvData, setTemplate, resetApplicantState } =
  applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
