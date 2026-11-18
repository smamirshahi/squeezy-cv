// eslint-disable-next-line no-restricted-imports
import "./index.css";
// eslint-disable-next-line no-restricted-imports
import { App } from "./App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@store/store";
import {
  initBrowserStorage,
  isBrowserMode,
  requestPersistentStorage,
} from "@store/persistence/browser/storage-mode";
import { FolderReconnect } from "@pages/workspace/folder-reconnect";
import { AdapterDayjs, LocalizationProvider } from "@components/ui";

async function start(): Promise<void> {
  const root = createRoot(document.getElementById("root")!);
  if (isBrowserMode()) {
    void requestPersistentStorage();
    const location = await initBrowserStorage();
    if (location.kind === "folder-locked") {
      root.render(<FolderReconnect location={location} />);
      return;
    }
  }
  root.render(
    <StrictMode>
      <Provider store={store}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <App />
        </LocalizationProvider>
      </Provider>
    </StrictMode>
  );
}

void start();
