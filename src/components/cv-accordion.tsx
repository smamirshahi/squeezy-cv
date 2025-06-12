import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PropsWithChildren } from "react";

interface Props {
  /** The title to show in accordion */
  title: string;
}

/** Shows an accordion with a title */
export function CVAccordion({
  title,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {title}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
