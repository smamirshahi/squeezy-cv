import {
  setBulletPointIcon,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { Style } from "@custom-types/styles-types";
import { FormControl, InputLabel, MenuItem, Select } from "@components/ui";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** The bullet as the CV draws it, so the choice can be judged without applying it */
const OPTIONS: {
  value: Style["bulletPointIcon"];
  label: string;
  glyph: string;
}[] = [
  { value: "disc", label: "Disc", glyph: "●" },
  { value: "circle", label: "Circle", glyph: "○" },
  { value: "dash", label: "Dash", glyph: "–" },
  { value: "square", label: "Square", glyph: "■" },
];

/** Name on the left, its glyph on the right of the same row */
function OptionRow({
  label,
  glyph,
}: {
  label: string;
  glyph: string;
}): JSX.Element {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        gap: 16,
      }}
    >
      <span>{label}</span>
      <span aria-hidden="true">{glyph}</span>
    </span>
  );
}

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
        renderValue={(value) => {
          const option = OPTIONS.find((entry) => entry.value === value);
          return option ? (
            <OptionRow label={option.label} glyph={option.glyph} />
          ) : (
            ""
          );
        }}
      >
        {OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <OptionRow label={option.label} glyph={option.glyph} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
