import { Box, TextField } from "@mui/material";
import { PersonalInfo } from "@custom-types/json-types";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The personal information to edit */
  personalInfo: PersonalInfo;

  /** Setter for the personal information to edit */
  setPersonalInfo: SetStateFunction<PersonalInfo>;
}

export function PersonalInfoEditorPage({
  personalInfo,
  setPersonalInfo,
}: Props): JSX.Element {
  return (
    <Box display="flex" gap={2} mb={2}>
      <TextField
        id="outlined-basic"
        label="Full Name"
        variant="outlined"
        value={personalInfo.name}
        onChange={(event) =>
          setPersonalInfo((prev) => ({ ...prev, name: event.target.value }))
        }
        fullWidth
      />
      <TextField
        id="outlined-basic"
        label="Job Title"
        variant="outlined"
        value={personalInfo.jobTitle}
        onChange={(event) =>
          setPersonalInfo((prev) => ({ ...prev, jobTitle: event.target.value }))
        }
        fullWidth
      />
    </Box>
  );
}
