import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { historyReducer, withUndo } from "@store/history/history";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";
import { appReducer } from "@store/app/app-slice";
import { persistenceReducer } from "@store/persistence/persistence-slice";
import { jobsReducer } from "@store/jobs/jobs-slice";
import { vaultReducer } from "@store/vault/vault-slice";

export const rootReducer = {
  cvData: cvDataReducer,
  vault: vaultReducer,
  jobs: jobsReducer,
  app: appReducer,
  persistence: persistenceReducer,
  history: historyReducer,
};

/** The reducers with undo and redo around them (see `history/history.ts`) */
export const undoableReducer = withUndo(combineReducers(rootReducer));

export const store = configureStore({
  reducer: undoableReducer,
});
