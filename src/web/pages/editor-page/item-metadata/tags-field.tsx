import { Autocomplete, TextField } from "@mui/material";

interface Props {
  label: string;
  tags: string[];

  /** Tags used elsewhere in the vault, offered while typing */
  suggestions: string[];

  onChange: (tags: string[]) => void;
}

/** Chips input for tags. Type a tag and press Enter; pick from tags used elsewhere. */
export function TagsField({
  label,
  tags,
  suggestions,
  onChange,
}: Props): JSX.Element {
  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      options={suggestions}
      value={tags}
      onChange={(_event, value) => onChange(value)}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder="Add a tag" />
      )}
    />
  );
}
