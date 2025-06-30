import { Paper } from "@mui/material";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element {
  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "10mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <PersonalInfoPreviewPage />
      <ContactInfoPreviewPage />
      <SummaryPreviewPage />
      <ExperiencesPreviewPage />
      <EducationsPreviewPage />
      <SkillsPreviewPage />
    </Paper>
  );
}
