import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CvColorPicker } from "@src/pages/editor-page/styles-editor-page/cv-color-picker";
import { TemplateEditorPage } from "@pages/editor-page/styles-editor-page/template-editor-page";
import { DateFormatSelection } from "@pages/editor-page/styles-editor-page/date-format-selection";

export function StylesEditorPage(): JSX.Element {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Styles
      </AccordionSummary>
      <AccordionDetails>
        <TemplateEditorPage />
        <DateFormatSelection />
        <CvColorPicker />
      </AccordionDetails>
    </Accordion>
  );
}
