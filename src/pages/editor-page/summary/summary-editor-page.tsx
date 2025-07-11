import { ProfessionalSummary } from "@custom-types/summary-types";
import { TextField } from "@mui/material";
import {
  appSelector,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import {
  cvDataSelector,
  setProfessionalSummary,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEffect, useState } from "react";

/** Shows the professional summary section in editor page */
export function SummaryEditorPage(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { professionalSummary } = useAppSelector(cvDataSelector);

  const [newSummary, setNewSummary] =
    useState<ProfessionalSummary>(professionalSummary);

  const { shouldApplyChanges, shouldDiscardChanges } =
    useAppSelector(appSelector);

  useEffect(() => {
    setNewSummary(professionalSummary);
  }, [professionalSummary]);

  useEffect(() => {
    if (shouldApplyChanges) {
      dispatch(setProfessionalSummary(newSummary));
      dispatch(setShouldApplyChanges(false));
    }
    if (shouldDiscardChanges) {
      setNewSummary(professionalSummary);
      dispatch(setShouldDiscardChanges(false));
    }
  }, [
    dispatch,
    newSummary,
    professionalSummary,
    shouldApplyChanges,
    shouldDiscardChanges,
  ]);

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
