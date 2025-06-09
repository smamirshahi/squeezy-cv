import { AccordionDetails, Paper } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { CVAccordion } from "@components/cv-accordion";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorPage({ contentRef }: Props): JSX.Element {
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
      <EditorPageButtons printReference={contentRef} />
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
