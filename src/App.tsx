import "./App.css";
import { Paper } from "@mui/material";
import { TemplateButton } from "./components/template-button";
import { useAppSelector } from "./store/store-helper";
import { templateSelector } from "./store/ui/ui-slice";
import { TemplateSelection } from "./templates/template-selection";

export function App() {
  const template = useAppSelector(templateSelector);

  return (
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
      {template === null ? (
        <TemplateButton />
      ) : (
        <TemplateSelection template={template} />
      )}
    </Paper>
  );
}
