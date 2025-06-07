import { useState, useEffect } from "react";
import { TextField } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { CVAccordion } from "@components/cv-accordion";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "@store/cv-data/cv-data-slice";
import { useDebounceCallback } from "@hooks/use-debounce-callback";

export function SummaryEditorPage(): JSX.Element | null {
  const { professionalSummary } = useAppSelector(cvDataSelector);
  const [localState, setLocalState] = useState(professionalSummary);
  useDebounceCallback({
    localState,
    reduxState: professionalSummary,
    action: updateProfessionalSummary,
  });

  useEffect(() => {
    setLocalState(professionalSummary);
  }, [professionalSummary]);

  return (
    <CVAccordion title="Professional Summary">
      <TextField
        label="Professional Summary"
        variant="outlined"
        multiline
        value={localState}
        fullWidth
        sx={{
          mt: "20px",
          "& .MuiInputBase-input": {
            resize: "vertical",
          },
        }}
        onChange={(event) => setLocalState(event.target.value)}
      />
    </CVAccordion>
  );
}
