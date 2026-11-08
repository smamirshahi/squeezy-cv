import {
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import { LinkTypeIcon } from "@pages/editor-page/link-type/link-type-icon";
import {
  LINK_TYPES,
  linkTypeById,
  OTHER_LINK_TYPE_ID,
} from "@shared/vault/link-types";

interface LinkTypeSelectProps {
  /** Id of the chosen type */
  value: string;
  onChange: (typeId: string) => void;
  /** Ids of the types other links already use; they cannot be picked again (Other always can) */
  takenTypeIds?: string[];
}

/** Dropdown of link types, each with its icon beside the name */
/** Alphabetical, with "Other" always last */
const SORTED_LINK_TYPES = [...LINK_TYPES].sort((a, b) => {
  if (a.id === OTHER_LINK_TYPE_ID) return 1;
  if (b.id === OTHER_LINK_TYPE_ID) return -1;
  return a.label.localeCompare(b.label);
});

export function LinkTypeSelect({
  value,
  onChange,
  takenTypeIds = [],
}: LinkTypeSelectProps): JSX.Element {
  return (
    <FormControl sx={{ width: 150, flexShrink: 0 }}>
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
        MenuProps={{
          slotProps: {
            paper: { sx: { maxHeight: 360 } },
            // Open at the top instead of scrolled to the chosen type
            transition: {
              onEntered: (node: HTMLElement) => {
                node.scrollTop = 0;
              },
            },
          },
        }}
      >
        {SORTED_LINK_TYPES.map((type) => (
          <MenuItem
            key={type.id}
            value={type.id}
            disabled={
              type.id !== OTHER_LINK_TYPE_ID &&
              type.id !== value &&
              takenTypeIds.includes(type.id)
            }
          >
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
