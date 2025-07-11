import { setPaperMargin, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function DropdownMargin(): JSX.Element {
  const { paperMargin } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl fullWidth>
      <InputLabel>Margin</InputLabel>
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
