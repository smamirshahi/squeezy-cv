import {
  setBulletPointIcon,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function DropdownBulletPointIcon(): JSX.Element {
  const { bulletPointIcon } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl fullWidth>
      <InputLabel>Bullet Point Icon</InputLabel>
      <Select
        value={bulletPointIcon}
        label="Bullet Point Icon"
        onChange={(event) => dispatch(setBulletPointIcon(event.target.value))}
      >
        <MenuItem value="disc">Disc</MenuItem>
        <MenuItem value="circle">Circle</MenuItem>
        <MenuItem value="dash">Dash</MenuItem>
        <MenuItem value="square">Square</MenuItem>
      </Select>
    </FormControl>
  );
}
