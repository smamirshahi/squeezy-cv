import { Box, TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  updatePersonalInfo,
} from "@store/cv-data/cv-data-slice";
import { useState, useEffect, useRef } from "react";

const DEBOUNCE_IN_MM = 500;

export function PersonalInfoEditorPage(): JSX.Element {
  const { personalInfo } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  const [localName, setLocalName] = useState(personalInfo.name);
  const [localJobTitle, setLocalJobTitle] = useState(personalInfo.jobTitle);

  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const jobTitleDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalName(personalInfo.name);
  }, [personalInfo.name]);

  useEffect(() => {
    setLocalJobTitle(personalInfo.jobTitle);
  }, [personalInfo.jobTitle]);

  useEffect(() => {
    if (nameDebounceRef.current) {
      clearTimeout(nameDebounceRef.current);
    }
    nameDebounceRef.current = setTimeout(() => {
      if (localName !== personalInfo.name) {
        dispatch(updatePersonalInfo({ field: "name", value: localName }));
      }
    }, DEBOUNCE_IN_MM);
    return () => {
      if (nameDebounceRef.current) {
        clearTimeout(nameDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localName]);

  useEffect(() => {
    if (jobTitleDebounceRef.current) {
      clearTimeout(jobTitleDebounceRef.current);
    }
    jobTitleDebounceRef.current = setTimeout(() => {
      if (localJobTitle !== personalInfo.jobTitle) {
        dispatch(
          updatePersonalInfo({ field: "jobTitle", value: localJobTitle })
        );
      }
    }, DEBOUNCE_IN_MM);
    return () => {
      if (jobTitleDebounceRef.current) {
        clearTimeout(jobTitleDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localJobTitle]);

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
