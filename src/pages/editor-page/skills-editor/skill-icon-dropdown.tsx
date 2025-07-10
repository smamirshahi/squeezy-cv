import { setRatingIcon, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function SkillIconDropdown(): JSX.Element {
  const { ratingIcon } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl component="fieldset">
      <InputLabel id="date-format-label">Margin</InputLabel>
      <Select
        value={ratingIcon}
        label="Margin"
        onChange={(event) =>
          dispatch(setRatingIcon(event.target.value as Style["ratingIcon"]))
        }
      >
        <MenuItem value="star">star</MenuItem>
        <MenuItem value="circle">circle</MenuItem>
      </Select>
    </FormControl>
  );
}
