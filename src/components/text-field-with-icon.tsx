import { InputAdornment, TextField } from "@mui/material";

interface Props {
  /** The icon to be shown */
  icon: React.ReactNode;

  /** The value of the text field */
  value?: string;

  /** The label of the text field */
  label: string;

  /** The change event handler for the text field */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/** A text field with an icon at the beginning */
export function TextFieldWithIcon({
  icon,
  value,
  label,
  onChange,
}: Props): JSX.Element {
  return (
    <TextField
      label={label}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">{icon}</InputAdornment>
          ),
        },
      }}
      variant="outlined"
      value={value}
      onChange={onChange}
    />
  );
}
