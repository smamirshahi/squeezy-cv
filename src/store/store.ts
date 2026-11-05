import { configureStore } from "@reduxjs/toolkit";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";
import { appReducer } from "@store/app/app-slice";
import { vaultReducer } from "@store/vault/vault-slice";

export const rootReducer = {
  cvData: cvDataReducer,
  vault: vaultReducer,
  app: appReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
