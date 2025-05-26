import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  TextField,
} from "@mui/material";
import { ProfessionalSummary } from "@src/custom-types/json-types";
import { SetStateFunction } from "@src/store/store-helper";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Professional Summary
      </AccordionSummary>
      <AccordionDetails>
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
      </AccordionDetails>
    </Accordion>
  );
}
