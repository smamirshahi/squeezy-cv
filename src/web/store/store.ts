import { configureStore } from "@reduxjs/toolkit";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";
import { appReducer } from "@store/app/app-slice";
import { variantsReducer } from "@store/variants/variants-slice";
import { vaultReducer } from "@store/vault/vault-slice";

export const rootReducer = {
  cvData: cvDataReducer,
  vault: vaultReducer,
  variants: variantsReducer,
  app: appReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});
