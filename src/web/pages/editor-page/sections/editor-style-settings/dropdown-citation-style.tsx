import { FormControl, InputLabel, MenuItem, Select } from "@components/ui";
import {
  CITATION_STYLES,
  DEFAULT_CITATION_STYLE,
} from "@shared/vault/citation";
import { setCitationStyle, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** How publications are written on the CV (belongs to the template) */
export function DropdownCitationStyle(): JSX.Element {
  const { citationStyle } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <FormControl fullWidth>
      <InputLabel>Publication style</InputLabel>
      <Select
        value={citationStyle ?? DEFAULT_CITATION_STYLE}
        label="Publication style"
        onChange={(event) => dispatch(setCitationStyle(event.target.value))}
      >
        {CITATION_STYLES.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
