import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/json-types";
import { setDateFormat, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function DateFormatSelection(): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();
  return (
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
      </Select>
    </FormControl>
  );
}
