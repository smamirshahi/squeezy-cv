// eslint-disable-next-line no-restricted-imports
import "./index.css";
// eslint-disable-next-line no-restricted-imports
import { App } from "./App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@store/store";
import {
  isBrowserMode,
  requestPersistentStorage,
} from "@store/persistence/browser/storage-mode";
import { AdapterDayjs, LocalizationProvider } from "@components/ui";

if (isBrowserMode()) {
  void requestPersistentStorage();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <App />
      </LocalizationProvider>
    </Provider>
  </StrictMode>
);
