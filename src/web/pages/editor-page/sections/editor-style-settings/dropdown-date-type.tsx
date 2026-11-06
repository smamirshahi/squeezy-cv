import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { setDateFormat, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** Let user to select the date type format */
export function DropdownDateType(): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);

  const dispatch = useAppDispatch();
  return (
    <FormControl fullWidth>
      <InputLabel>Date Format</InputLabel>
      <Select
        value={dateFormat}
        label="Date Format"
        onChange={(event) => dispatch(setDateFormat(event.target.value))}
      >
        <MenuItem value="MMM YYYY">MMM YYYY (Dec 2018)</MenuItem>
        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (01/12/2018)</MenuItem>
        <MenuItem value="MMM/YYYY">MMM/YYYY (Dec/2018)</MenuItem>
        <MenuItem value="MMMM/YYYY">MMMM/YYYY (December 2018)</MenuItem>
        <MenuItem value="YYYY.MM.DD">YYYY.MM.DD (2018.06.30)</MenuItem>
      </Select>
    </FormControl>
  );
}
