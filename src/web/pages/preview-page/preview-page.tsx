import { useMemo } from "react";
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
import { vaultSelector } from "@store/vault/vault-slice";
import { activeVariantSelector } from "@store/variants/variants-slice";
import { RenderedPart, render } from "@shared/variant/render";

/** Renders one part of the CV: the header parts, or a section by its type */
function renderPart(part: RenderedPart): JSX.Element | null {
  switch (part.kind) {
    case "personalInfo":
      return <PersonalInfoPreviewPage key={part.id} />;
    case "contactInfo":
      return <ContactInfoPreviewPage key={part.id} />;
    case "section":
      switch (part.type) {
        case "summary":
          return <SummaryPreviewPage key={part.id} section={part} />;
        case "experience":
          return <ExperiencesPreviewPage key={part.id} section={part} />;
        case "education":
          return <EducationsPreviewPage key={part.id} section={part} />;
        case "skills":
          return <SkillsPreviewPage key={part.id} section={part} />;
        default:
          return <GenericSectionPreviewPage key={part.id} section={part} />;
      }
  }
}

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element {
  const { structure, columnWidth } = useAppSelector(appSelector);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  // What the active variant shows, in its order and wording. The layout is the one the
  // editor currently has, so changes to it show at once.
  const document = useMemo(
    () => render(vault, { ...variant, layout: structure }),
    [vault, variant, structure]
  );

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
        // The page is always black on white, whatever the editor's theme does
        color: "#000",
        backgroundColor: "#fff",
        "& a": { color: "inherit", textDecoration: "none" },
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
          {document.columns.fullWidth.map(renderPart)}
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
            {document.columns.left.map(renderPart)}
          </Box>
          <Box
            sx={{
              flexBasis: `${columnWidth.right}%`,
              flexGrow: 0,
              flexShrink: 1,
            }}
          >
            {document.columns.right.map(renderPart)}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
