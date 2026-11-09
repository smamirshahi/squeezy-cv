import { setRatingIcon, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
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
        onChange={(event) => dispatch(setRatingIcon(event.target.value))}
      >
        <MenuItem value="text">Text (level name)</MenuItem>
        <MenuItem value="star">Star</MenuItem>
        <MenuItem value="circle">Circle</MenuItem>
      </Select>
    </FormControl>
  );
}
