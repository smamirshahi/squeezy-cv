import { configureStore } from "@reduxjs/toolkit";
import { applicantReducer } from "./applicant/applicant-slice";

export const rootReducer = {
  applicant: applicantReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
