import { Box, TextField } from "@mui/material";
import {
  cvDataSelector,
  updatePersonalInfo,
} from "@src/store/applicant/applicant-slice";
import { useAppDispatch } from "@src/store/store-helper";
import { useSelector } from "react-redux";

export function SettingsPersonalInfo(): JSX.Element {
  const dispatch = useAppDispatch();
  const { personalInfo } = useSelector(cvDataSelector);
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
            updatePersonalInfo({
              field: "jobTitle",
              value: event.target.value,
            })
          )
        }
        fullWidth
      />
    </Box>
  );
}
