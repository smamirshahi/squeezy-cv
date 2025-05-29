import { Stack } from "@mui/material";
import { CvColorPicker } from "@pages/editor-page/styles-editor-page/cv-color-picker";
import { TemplateEditorPage } from "@pages/editor-page/styles-editor-page/template-editor-page";
import { DateFormatSelection } from "@pages/editor-page/styles-editor-page/date-format-selection";
import { CVAccordion } from "@components/cv-accordion";

export function StylesEditorPage(): JSX.Element {
  return (
    <CVAccordion title="Styles">
      <Stack direction="row" spacing={2}>
        <TemplateEditorPage />
        <DateFormatSelection />
      </Stack>
      <CvColorPicker fontTitle="subtitle" />
    </CVAccordion>
  );
}
