import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ResumeProps } from "../../common/custom-types";
import { Applicant } from "../../applicant";

/**
 * State of the current Applicant
 */
export type ApplicantState = {
  applicant: ResumeProps;
};

export const initialState: ApplicantState = {
  applicant: Applicant,
};

/** Slice to access state of applicant */
const applicantSlice = createSlice({
  name: "applicant",
  initialState,
  reducers: {
    setApplicant(state, action: PayloadAction<ResumeProps>) {
      state.applicant = action.payload;
    },
    resetApplicantState: () => initialState,
  },
  selectors: {
    applicantSelector: (state: ApplicantState) => state.applicant,
  },
});

export const { applicantSelector } = applicantSlice.selectors;
export const { setApplicant, resetApplicantState } = applicantSlice.actions;

export const applicantReducer = applicantSlice.reducer;
