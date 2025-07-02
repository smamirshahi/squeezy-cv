import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PropsWithChildren } from "react";
import { EditorSectionId } from "@store/app/app-slice-types";

interface Props {
  /** The title to show in accordion */
  title: string;

  sectionId: EditorSectionId;

  isExpanded: boolean;

  handleChange: (sectionId: EditorSectionId) => void;
}

export function EditorPageSection({
  title,
  sectionId,
  isExpanded,
  handleChange,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  return (
    <Accordion expanded={isExpanded} onChange={() => handleChange(sectionId)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {title}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
