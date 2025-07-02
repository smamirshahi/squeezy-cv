import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PropsWithChildren } from "react";
import { EditorSectionId } from "@store/app/app-slice-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  appSelector,
  setSelectedSectionInEditorPage,
} from "@store/app/app-slice";

interface Props {
  /** The title to show in accordion */
  title: string;

  /** The ID of the section representing editor page */
  sectionId: EditorSectionId;
}

/** Shows a section with expansion in editor page */
export function EditorPageSection({
  title,
  sectionId,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const dispatch = useAppDispatch();
  return (
    <Accordion
      expanded={selectedSectionInEditorPage === sectionId}
      onChange={() =>
        dispatch(
          setSelectedSectionInEditorPage(
            selectedSectionInEditorPage === sectionId ? null : sectionId
          )
        )
      }
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {title}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
