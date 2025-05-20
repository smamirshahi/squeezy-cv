import "./App.css";
import { Box, Paper } from "@mui/material";
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
    <Box
      sx={{
        width: "500mm",
        display: "flex",
        gap: 2,
        padding: 2,
        justifyContent: "center",
        alignItems: "flex-start",
        overflowX: "auto",
        backgroundColor: "#f0f0f0",
      }}
    >
      <Paper
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
        <TemplateButton printReference={contentRef} />
      </Paper>

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
        <Divider
          sx={{
            position: "absolute",
            top: `${A4_HEIGHT_MM}mm`,
            width: `${A4_WIDTH_MM}mm`,
            border: "1px solid red",
          }}
        />
        {template !== null && <TemplateSelection template={template} />}
      </Paper>
    </Box>
  );
}
