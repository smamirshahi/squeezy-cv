import { setRatingIcon, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function DropdownSkillIcon(): JSX.Element {
  const { ratingIcon } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl fullWidth>
      <InputLabel>Skill Icon</InputLabel>
      <Select
        value={ratingIcon}
        label="Skill Icon"
        onChange={(event) =>
          dispatch(setRatingIcon(event.target.value as Style["ratingIcon"]))
        }
      >
        <MenuItem value="star">Star</MenuItem>
        <MenuItem value="circle">Circle</MenuItem>
      </Select>
    </FormControl>
  );
}
