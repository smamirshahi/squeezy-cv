import { useState, useEffect, useRef } from "react";
import { TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { CVAccordion } from "@components/cv-accordion";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "@store/cv-data/cv-data-slice";

export function SummaryEditorPage(): JSX.Element | null {
  const { professionalSummary } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();
  const [localSummary, setLocalSummary] = useState(professionalSummary);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSummary(professionalSummary);
  }, [professionalSummary]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (localSummary !== professionalSummary) {
        dispatch(updateProfessionalSummary(localSummary));
      }
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    }, 500);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSummary]);

  return (
    <CVAccordion title="Professional Summary">
      <TextField
        label="Professional Summary"
        variant="outlined"
        multiline
        value={localSummary}
        fullWidth
        sx={{
          mt: "20px",
          "& .MuiInputBase-input": {
            resize: "vertical",
          },
        }}
        onChange={(event) => setLocalSummary(event.target.value)}
      />
    </CVAccordion>
  );
}
