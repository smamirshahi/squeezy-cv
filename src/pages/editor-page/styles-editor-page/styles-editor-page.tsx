import { Stack } from "@mui/material";
import { FontOptionsPicker } from "@pages/editor-page/styles-editor-page/font-options-picker";
import { TemplateEditorPage } from "@pages/editor-page/styles-editor-page/template-editor-page";
import { DateFormatSelection } from "@pages/editor-page/styles-editor-page/date-format-selection";
import { CVAccordion } from "@components/cv-accordion";
import { typographyVariantSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { isAvailableFont } from "@custom-types/type-guards";

export function StylesEditorPage(): JSX.Element {
  const typographyVariant = useAppSelector(typographyVariantSelector);

  return (
    <CVAccordion title="Styles">
      <Stack direction="row" spacing={2}>
        <TemplateEditorPage />
        <DateFormatSelection />
      </Stack>
      {Object.entries(typographyVariant).map(([variant, style]) => {
        if (isAvailableFont(variant)) {
          return (
            <FontOptionsPicker
              key={variant}
              fontTitle={variant}
              style={style}
            />
          );
        }
      })}
    </CVAccordion>
  );
}
