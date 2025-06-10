import { Box, TextField } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  updatePersonalInfo,
} from "@store/cv-data/cv-data-slice";
import { useDebounceCallback } from "@hooks/use-debounce-callback";

export function PersonalInfoEditorPage(): JSX.Element {
  const { personalInfo } = useAppSelector(cvDataSelector);
  const { localState: localName, setLocalState: setLocalName } =
    useDebounceCallback({
      reduxState: personalInfo.name,
      createAction: (localName) =>
        updatePersonalInfo({ field: "name", value: localName }),
    });

  const { localState: localJobTitle, setLocalState: setLocalJobTitle } =
    useDebounceCallback({
      reduxState: personalInfo.jobTitle,
      createAction: (localJobTitle) =>
        updatePersonalInfo({ field: "jobTitle", value: localJobTitle }),
    });

  return (
    <Box display="flex" gap={2} mb={2}>
      <TextField
        id="outlined-basic"
        label="Full Name"
        variant="outlined"
        value={localName}
        onChange={(event) => setLocalName(event.target.value)}
        fullWidth
      />
      <TextField
        id="outlined-basic"
        label="Job Title"
        variant="outlined"
        value={localJobTitle}
        onChange={(event) => setLocalJobTitle(event.target.value)}
        fullWidth
      />
    </Box>
  );
}
