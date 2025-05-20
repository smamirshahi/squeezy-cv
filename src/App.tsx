import "./App.css";
import { Paper } from "@mui/material";
import { TemplateButton } from "./components/template-button";
import { TemplateSelection } from "./templates/template-selection";
import { useRef } from "react";
import { templateSelector } from "./store/ui/ui-slice";
import { useAppSelector } from "./store/store-helper";
import Divider from "@mui/material/Divider";

export function App() {
  const template = useAppSelector(templateSelector);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <TemplateButton printReference={contentRef} />
      <Divider
        sx={{
          position: "absolute",
          top: "297mm",
          width: "210mm",
          border: "1px solid red",
        }}
      />

      <Paper
        ref={contentRef}
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
        {template !== null && <TemplateSelection template={template} />}
      </Paper>
    </>
  );
}
