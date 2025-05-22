import { InputAdornment, TextField } from "@mui/material";

interface Props {
  /** The icon to be shown */
  icon: React.ReactNode;

  value?: string;

  label: string;

  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

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
