import { AccordionDetails, Paper, TextField } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { CVAccordion } from "@components/cv-accordion";
import { useState } from "react";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const [title, setTitle] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <EditorPageButtons printReference={contentRef} />
      <TextField
        fullWidth
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job title"
      />
      <TextField
        fullWidth
        value={jobUrl}
        onChange={(event) => setJobUrl(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job url"
        inputProps={{ style: { height: "40px" } }}
      />
      <StylesEditorPage />
      <CVAccordion title="Profile">
        <AccordionDetails>
          <PersonalInfoEditorPage />
          <ContactInfoEditorPage />
        </AccordionDetails>
      </CVAccordion>
      <SummaryEditorPage />
      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
    </Paper>
  );
}
