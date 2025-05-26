import { configureStore } from "@reduxjs/toolkit";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";

export const rootReducer = {
  cvData: cvDataReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
