import { Button, Grid, Paper } from "@mui/material";
import { TemplateButton } from "../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../custom-types/custom-styles";
import { ExperienceEditorPage } from "./editor-page/experience-editor-page";
import { EducationEditorPage } from "./editor-page/education-editor-page";
import { SkillsEditorPage } from "./editor-page/skills-editor-page";
import { PersonalInfoEditorPage } from "./editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "./editor-page/contact-info-editor-page";
import { SummaryEditorPage } from "./editor-page/summary-editor-page";
import { useImportExportJson } from "@src/hooks/use-import-export-json";
import DownloadIcon from "@mui/icons-material/Download";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorPage({ contentRef }: Props): JSX.Element {
  const { handleExport } = useImportExportJson();

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <TemplateButton printReference={contentRef} />
      <PersonalInfoEditorPage />
      <ContactInfoEditorPage />
      <SummaryEditorPage />
      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
      <Grid
        container
        direction="row"
        justifyContent="flex-end"
        sx={{ mt: "20px" }}
        gap={2}
      >
        <Button variant="contained" onClick={() => console.log("hello")}>
          Apply
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          startIcon={<DownloadIcon />}
        >
          Save
        </Button>
      </Grid>
    </Paper>
  );
}
