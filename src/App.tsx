import "./App.css";
import { Paper } from "@mui/material";
import { TemplateButton } from "./components/template-button";
import { useAppSelector } from "./store/store-helper";
import { templateSelector } from "./store/ui/ui-slice";
import { TemplateSelection } from "./templates/template-selection";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

export function App() {
  const template = useAppSelector(templateSelector);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  return (
    <>
      <button onClick={() => reactToPrintFn()}>Print</button>

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
        {template === null ? (
          <TemplateButton />
        ) : (
          <TemplateSelection template={template} />
        )}
      </Paper>
    </>
  );
}
