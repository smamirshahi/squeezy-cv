import { setPaperMargin, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function MarginDropdown(): JSX.Element {
  const { paperMargin } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl component="fieldset">
      <InputLabel id="date-format-label">Margin</InputLabel>
      <Select
        value={paperMargin}
        label="Margin"
        onChange={(event) =>
          dispatch(setPaperMargin(event.target.value as Style["paperMargin"]))
        }
      >
        <MenuItem value="normal">Normal</MenuItem>
        <MenuItem value="narrow">Narrow</MenuItem>
      </Select>
    </FormControl>
  );
}
