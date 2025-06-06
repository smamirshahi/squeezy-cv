import { Box, TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  updatePersonalInfo,
} from "@store/cv-data/cv-data-slice";

export function PersonalInfoEditorPage(): JSX.Element {
  const { personalInfo } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <Box display="flex" gap={2} mb={2}>
      <TextField
        id="outlined-basic"
        label="Full Name"
        variant="outlined"
        value={personalInfo.name}
        onChange={(event) =>
          dispatch(
            updatePersonalInfo({ field: "name", value: event.target.value })
          )
        }
        fullWidth
      />
      <TextField
        id="outlined-basic"
        label="Job Title"
        variant="outlined"
        value={personalInfo.jobTitle}
        onChange={(event) =>
          dispatch(
            updatePersonalInfo({ field: "jobTitle", value: event.target.value })
          )
        }
        fullWidth
      />
    </Box>
  );
}
