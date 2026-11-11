import { Box } from "@mui/material";
import {
  HeaderWithPhoto,
  PersonalInfoPreviewPage,
} from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import {
  AwardsPreviewPage,
  InterestsPreviewPage,
} from "@pages/preview-page/awards-interests-preview-page";
import { PublicationsPreviewPage } from "@pages/preview-page/publications-preview-page";
import { GenericSectionPreviewPage } from "@pages/preview-page/generic-section-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { RenderedDocument, RenderedPart } from "@shared/variant/render";

/** Renders one part of the CV: the header parts, or a section by its type */
function renderPart(part: RenderedPart): JSX.Element | null {
  switch (part.kind) {
    case "personalInfo":
      return <PersonalInfoPreviewPage key={part.id} profile={part.profile} />;
    case "contactInfo":
      return (
        <ContactInfoPreviewPage
          key={part.id}
          profile={part.profile}
          links={part.links}
        />
      );
    case "section":
      switch (part.type) {
        case "summary":
          return <SummaryPreviewPage key={part.id} section={part} />;
        case "experience":
          return <ExperiencesPreviewPage key={part.id} section={part} />;
        case "education":
          return <EducationsPreviewPage key={part.id} section={part} />;
        case "publications":
          return <PublicationsPreviewPage key={part.id} section={part} />;
        case "awards":
          return <AwardsPreviewPage key={part.id} section={part} />;
        case "interests":
          return <InterestsPreviewPage key={part.id} section={part} />;
        case "skills":
          return <SkillsPreviewPage key={part.id} section={part} />;
        default:
          return <GenericSectionPreviewPage key={part.id} section={part} />;
      }
  }
}

/** The parts of one column; the header parts share a row with the photo when there is one */
function renderParts(parts: RenderedPart[]): (JSX.Element | null)[] {
  const personal = parts.find((part) => part.kind === "personalInfo");
  if (personal?.kind !== "personalInfo" || !personal.profile.photo) {
    return parts.map(renderPart);
  }
  const isHeader = (part: RenderedPart): boolean =>
    part.kind === "personalInfo" || part.kind === "contactInfo";
  return [
    <HeaderWithPhoto key="header" profile={personal.profile}>
      {parts.filter(isHeader).map(renderPart)}
    </HeaderWithPhoto>,
    ...parts.filter((part) => !isHeader(part)).map(renderPart),
  ];
}

interface ColumnsProps {
  rendered: RenderedDocument;
  columnWidth: { left: number; right: number };
}

/** The parts of a rendered CV in their columns: the full-width row, then left and right */
export function RenderedColumns({
  rendered,
  columnWidth,
}: ColumnsProps): JSX.Element {
  return (
    <Box>
      {/* Full-width top row */}
      <Box
        sx={{
          width: "100%",
          mb: 2,
        }}
      >
        {renderParts(rendered.columns.fullWidth)}
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
          {renderParts(rendered.columns.left)}
        </Box>
        <Box
          sx={{
            flexBasis: `${columnWidth.right}%`,
            flexGrow: 0,
            flexShrink: 1,
          }}
        >
          {renderParts(rendered.columns.right)}
        </Box>
      </Box>
    </Box>
  );
}
