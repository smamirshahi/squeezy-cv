import { FontOptionsPicker } from "@pages/editor-page/styles-editor-page/font-options-picker";
import { CVAccordion } from "@components/cv-accordion";
import { setDateFormat, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { isValidFont } from "@custom-types/type-guards";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";

/** Shows the styles section in editor page */
export function StylesEditorPage(): JSX.Element {
  const { typography, dateFormat } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <CVAccordion title="Styles">
      <FormControl fullWidth>
        <InputLabel id="date-format-label">Date Format</InputLabel>
        <Select
          labelId="date-format-label"
          id="date-format"
          value={dateFormat}
          label="Date Format"
          onChange={(event) =>
            dispatch(setDateFormat(event.target.value as Style["dateFormat"]))
          }
        >
          <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (01/12/2018)</MenuItem>
          <MenuItem value="MMM/YYYY">MMM/YYYY (Dec/2018)</MenuItem>
          <MenuItem value="MMMM/YYYY">MMMM/YYYY (December 2018)</MenuItem>
          <MenuItem value="YYYY.MM.DD">YYYY.MM.DD (2018.06.30)</MenuItem>
        </Select>
      </FormControl>
      {Object.entries(typography).map(([variant, style]) => {
        if (isValidFont(variant)) {
          return (
            <FontOptionsPicker key={variant} variant={variant} style={style} />
          );
        }
      })}
    </CVAccordion>
  );
}
