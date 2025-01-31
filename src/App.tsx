import "./App.css";
import { Paper } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { OneColumnTemplate } from "./templates/one-column-template";
import { useMemo, useState } from "react";
import { ResumeTemplates } from "./common/custom-types";
import { TemplateButton } from "./components/template-button";
import { TwoColumnTemplate } from "./templates/two-column-template";

export function App() {
  const [template, setTemplate] = useState<ResumeTemplates>("one-column");

  const Template = useMemo(() => {
    switch (template) {
      case "one-column":
        return <OneColumnTemplate />;
      case "two-column":
        return <TwoColumnTemplate />;
      default:
        throw new Error("Invalid template");
    }
  }, [template]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TemplateButton setTemplate={setTemplate} />
      <Paper
        elevation={3}
        sx={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          boxSizing: "border-box",
          margin: "auto",
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {Template}
      </Paper>
    </LocalizationProvider>
  );
}
