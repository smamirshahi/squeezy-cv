import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PropsWithChildren } from "react";
import { EditorSectionId } from "@store/app/app-slice-types";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The title to show in accordion */
  title: string;

  /** The ID of the section representing editor page */
  sectionId: EditorSectionId;

  /** The section that is expanded */
  expandedSection: EditorSectionId | null;

  /** Setter for changing section that is expanded */
  setExpandedSection: SetStateFunction<EditorSectionId | null>;
}

/** Shows a section with expansion in editor page */
export function EditorPageSection({
  title,
  sectionId,
  expandedSection,
  setExpandedSection,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  return (
    <Accordion
      expanded={expandedSection === sectionId}
      onChange={() =>
        setExpandedSection(expandedSection === sectionId ? null : sectionId)
      }
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {title}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
