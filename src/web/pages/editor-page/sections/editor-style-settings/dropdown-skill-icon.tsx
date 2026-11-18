import { setRatingIcon, styleSelector } from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@components/ui";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function DropdownSkillIcon(): JSX.Element {
  const { ratingIcon, skillsLayout } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  // Grouped rows show no level, so the icon has no effect there
  const isGrouped = skillsLayout === "grouped";

  return (
    <FormControl fullWidth disabled={isGrouped}>
      <InputLabel>
        {isGrouped ? "Skill Icon (not used in grouped rows)" : "Skill Icon"}
      </InputLabel>
      <Select
        value={ratingIcon}
        label={
          isGrouped ? "Skill Icon (not used in grouped rows)" : "Skill Icon"
        }
        onChange={(event) => dispatch(setRatingIcon(event.target.value))}
      >
        <MenuItem value="none">Don't show the level</MenuItem>
        <MenuItem value="text">Text (level name)</MenuItem>
        <MenuItem value="star">Star</MenuItem>
        <MenuItem value="circle">Circle</MenuItem>
      </Select>
    </FormControl>
  );
}
