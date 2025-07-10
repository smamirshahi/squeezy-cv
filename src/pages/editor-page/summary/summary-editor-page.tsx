import { TextField } from "@mui/material";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  newSummary: string;
  setNewSummary: SetStateFunction<string>;
}

/** Shows the professional summary section in editor page */
export function SummaryEditorPage({
  newSummary,
  setNewSummary,
}: Props): JSX.Element | null {
  return (
    <TextField
      label="Professional Summary"
      variant="outlined"
      multiline
      value={newSummary}
      fullWidth
      sx={{
        mt: "20px",
      }}
      onChange={(event) => setNewSummary(event.target.value)}
    />
  );
}
