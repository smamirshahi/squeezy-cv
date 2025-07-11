import { ProfessionalSummary } from "@custom-types/summary-types";
import { TextField } from "@mui/material";
import {
  cvDataSelector,
  setProfessionalSummary,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";

/** Shows the professional summary section in editor page */
export function SummaryEditorPage(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { professionalSummary } = useAppSelector(cvDataSelector);

  const [newSummary, setNewSummary] =
    useState<ProfessionalSummary>(professionalSummary);

  useEffect(() => {
    setNewSummary(professionalSummary);
  }, [professionalSummary]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setProfessionalSummary(newSummary));
    },
    onDiscardChanges: () => {
      setNewSummary(professionalSummary);
    },
  });

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
