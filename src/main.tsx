import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@src/index.css";
import { App } from "@src/App";
import { Provider } from "react-redux";
import { store } from "@store/store";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <App />
      </LocalizationProvider>
    </Provider>
  </StrictMode>
);
