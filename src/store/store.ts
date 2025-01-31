import { configureStore } from "@reduxjs/toolkit";
import { applicantReducer } from "./applicant/applicant-slice";
import { uiReducer } from "./ui/ui-slice";

export const rootReducer = {
  applicant: applicantReducer,
  ui: uiReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
