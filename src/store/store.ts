import { configureStore } from "@reduxjs/toolkit";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";
import { appReducer } from "@store/app/app-slice";

export const rootReducer = {
  cvData: cvDataReducer,
  app: appReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
