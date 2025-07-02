import { Box, Paper } from "@mui/material";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { PreviewSectionId } from "@store/app/app-slice-types";

const idToComponent: Record<PreviewSectionId, JSX.Element> = {
  personalInfo: <PersonalInfoPreviewPage />,
  contactInfo: <ContactInfoPreviewPage />,
  summary: <SummaryPreviewPage />,
  experiences: <ExperiencesPreviewPage />,
  educations: <EducationsPreviewPage />,
  skills: <SkillsPreviewPage />,
};

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element {
  const { structure, columnWidth } = useAppSelector(appSelector);

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
      <Box>
        {/* Full-width top row */}
        <Box
          sx={{
            width: "100%",
            mb: 2,
          }}
        >
          {structure.fullWidth.map((sectionId) => idToComponent[sectionId])}
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
            {structure.left.map((sectionId) => idToComponent[sectionId])}
          </Box>
          <Box
            sx={{
              flexBasis: `${columnWidth.right}%`,
              flexGrow: 0,
              flexShrink: 1,
            }}
          >
            {structure.right.map((sectionId) => idToComponent[sectionId])}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
