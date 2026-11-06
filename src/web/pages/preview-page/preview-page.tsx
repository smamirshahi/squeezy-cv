import { Box, Paper } from "@mui/material";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { GenericSectionPreviewPage } from "@pages/preview-page/generic-section-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { sectionsSelector } from "@store/vault/vault-slice";
import { Section } from "@custom-types/vault-types";

/** Renders one part of the CV: the header parts, or a vault section by its type */
function renderPart(id: string, sections: Section[]): JSX.Element | null {
  if (id === "personalInfo") {
    return <PersonalInfoPreviewPage key={id} />;
  }
  if (id === "contactInfo") {
    return <ContactInfoPreviewPage key={id} />;
  }
  const section = sections.find((s) => s.id === id);
  if (!section) {
    return null;
  }
  switch (section.type) {
    case "summary":
      return <SummaryPreviewPage key={id} section={section} />;
    case "experience":
      return <ExperiencesPreviewPage key={id} section={section} />;
    case "education":
      return <EducationsPreviewPage key={id} section={section} />;
    case "skills":
      return <SkillsPreviewPage key={id} section={section} />;
    default:
      return <GenericSectionPreviewPage key={id} section={section} />;
  }
}

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element {
  const { structure, columnWidth } = useAppSelector(appSelector);
  const sections = useAppSelector(sectionsSelector);

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        flexShrink: 0,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "10mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <Box>
        {/* Full-width top row */}
        <Box
          sx={{
            width: "100%",
            mb: 2,
          }}
        >
          {structure.fullWidth.map((id) => renderPart(id, sections))}
        </Box>

        {/* Second row: left and right with percentages */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10mm",
          }}
        >
          <Box
            sx={{
              flexBasis: `${columnWidth.left}%`,
              flexGrow: 0,
              flexShrink: 1,
            }}
          >
            {structure.left.map((id) => renderPart(id, sections))}
          </Box>
          <Box
            sx={{
              flexBasis: `${columnWidth.right}%`,
              flexGrow: 0,
              flexShrink: 1,
            }}
          >
            {structure.right.map((id) => renderPart(id, sections))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
