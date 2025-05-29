import { TextField } from "@mui/material";
import { ProfessionalSummary } from "@custom-types/json-types";
import { SetStateFunction } from "@store/store-helper";
import { CVAccordion } from "@components/cv-accordion";

interface Props {
  /** The professional summary to edit */
  summary: ProfessionalSummary;

  /** Setter for the professional summary to edit */
  setSummary: SetStateFunction<ProfessionalSummary>;
}

export function SummaryEditorPage({
  summary,
  setSummary,
}: Props): JSX.Element | null {
  return (
    <CVAccordion title="Professional Summary">
      <TextField
        label="Professional Summary"
        variant="outlined"
        multiline
        value={summary}
        fullWidth
        sx={{
          mt: "20px",
          "& .MuiInputBase-input": {
            resize: "vertical",
          },
        }}
        onChange={(event) => setSummary(event.target.value)}
      />
    </CVAccordion>
  );
}
