import {
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import { LinkTypeIcon } from "@pages/editor-page/link-type/link-type-icon";
import { LINK_TYPES, linkTypeById } from "@shared/vault/link-types";

interface LinkTypeSelectProps {
  /** Id of the chosen type */
  value: string;
  onChange: (typeId: string) => void;
}

/** Dropdown of link types, each with its icon beside the name */
export function LinkTypeSelect({
  value,
  onChange,
}: LinkTypeSelectProps): JSX.Element {
  return (
    <FormControl sx={{ width: 200, flexShrink: 0 }}>
      <InputLabel id="link-type-label">Type</InputLabel>
      <Select
        labelId="link-type-label"
        label="Type"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        renderValue={(id) => (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LinkTypeIcon typeId={id} />
            {linkTypeById(id).label}
          </span>
        )}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
      >
        {LINK_TYPES.map((type) => (
          <MenuItem key={type.id} value={type.id}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LinkTypeIcon typeId={type.id} />
            </ListItemIcon>
            <ListItemText>{type.label}</ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
