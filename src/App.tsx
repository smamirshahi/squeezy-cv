import "./App.css";
import { Paper } from "@mui/material";
import { TemplateButton } from "./components/template-button";
import { TemplateSelection } from "./templates/template-selection";
import { useRef } from "react";
import { templateSelector } from "./store/ui/ui-slice";
import { useAppSelector } from "./store/store-helper";
import Divider from "@mui/material/Divider";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export function App() {
  const template = useAppSelector(templateSelector);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <TemplateButton printReference={contentRef} />
      <Divider
        sx={{
          position: "absolute",
          top: `${A4_HEIGHT_MM}mm`,
          width: `${A4_WIDTH_MM}mm`,
          border: "1px solid red",
        }}
      />

      <Paper
        ref={contentRef}
        elevation={3}
        sx={{
          width: `${A4_WIDTH_MM}mm`,
          minHeight: `${A4_HEIGHT_MM}mm`,
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
