import { TextField } from "@mui/material";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "@src/store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";

export function SummaryEditorPage(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { professionalSummary } = useAppSelector(cvDataSelector);

  return (
    <TextField
      label="Professional Summary"
      variant="outlined"
      multiline
      value={professionalSummary}
      fullWidth
      sx={{
        mt: "20px",
        "& .MuiInputBase-input": {
          resize: "vertical",
        },
      }}
      onChange={(event) =>
        dispatch(updateProfessionalSummary({ value: event.target.value }))
      }
    />
  );
}
