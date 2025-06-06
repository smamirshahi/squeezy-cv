import { useState, useEffect, useRef } from "react";
import { TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { CVAccordion } from "@components/cv-accordion";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "@store/cv-data/cv-data-slice";

const DEBOUNCE_IN_MM = 500;

export function SummaryEditorPage(): JSX.Element | null {
  const { professionalSummary } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();
  const [localState, setLocalState] = useState(professionalSummary);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalState(professionalSummary);
  }, [professionalSummary]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (localState !== professionalSummary) {
        dispatch(updateProfessionalSummary(localState));
      }
    }, DEBOUNCE_IN_MM);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState]);

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
