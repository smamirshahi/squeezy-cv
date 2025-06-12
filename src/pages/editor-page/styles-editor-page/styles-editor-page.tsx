import { FontOptionsPicker } from "@pages/editor-page/styles-editor-page/font-options-picker";
import { DateFormatSelection } from "@pages/editor-page/styles-editor-page/date-format-selection";
import { CVAccordion } from "@components/cv-accordion";
import { typographyVariantSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { isValidFont } from "@custom-types/type-guards";

export function StylesEditorPage(): JSX.Element {
  const typographyVariant = useAppSelector(typographyVariantSelector);

  return (
    <CVAccordion title="Styles">
      <DateFormatSelection />
      {Object.entries(typographyVariant).map(([variant, style]) => {
        if (isValidFont(variant)) {
          return (
            <FontOptionsPicker key={variant} variant={variant} style={style} />
          );
        }
      })}
    </CVAccordion>
  );
}
