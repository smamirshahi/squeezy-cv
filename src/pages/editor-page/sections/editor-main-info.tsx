import { Box, InputAdornment, TextField } from "@mui/material";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { PersonalInfo } from "@custom-types/personal-info-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { ContactInfo } from "@custom-types/contact-info-types";
import {
  cvDataSelector,
  setContactInfo,
  setPersonalInfo,
} from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";

export function EditorMainInfo(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { personalInfo, contactInfo } = useAppSelector(cvDataSelector);

  const [newPersonalInfo, setNewPersonalInfo] =
    useState<PersonalInfo>(personalInfo);
  const [newContactInfo, setNewContactInfo] =
    useState<ContactInfo>(contactInfo);

  useEffect(() => {
    setNewPersonalInfo(personalInfo);
    setNewContactInfo(contactInfo);
  }, [contactInfo, personalInfo]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setPersonalInfo(newPersonalInfo));
      dispatch(setContactInfo(newContactInfo));
    },
    onDiscardChanges: () => {
      setNewPersonalInfo(personalInfo);
      setNewContactInfo(contactInfo);
    },
  });

  return (
    <>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          id="outlined-basic"
          label="Full Name"
          variant="outlined"
          value={newPersonalInfo.name}
          onChange={(event) =>
            setNewPersonalInfo({ ...newPersonalInfo, name: event.target.value })
          }
          fullWidth
        />
        <TextField
          id="outlined-basic"
          label="Job Title"
          variant="outlined"
          value={newPersonalInfo.jobTitle}
          onChange={(event) =>
            setNewPersonalInfo({
              ...newPersonalInfo,
              jobTitle: event.target.value,
            })
          }
          fullWidth
        />
      </Box>
      <Box display="flex" flexDirection="column" gap={2} mb={2}>
        <TextField
          label="Email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={newContactInfo.email}
          onChange={(event) =>
            setNewContactInfo({
              ...newContactInfo,
              email: event.target.value,
            })
          }
        />
        <TextField
          label="Phone"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SmartphoneIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={newContactInfo.phone}
          onChange={(event) =>
            setNewContactInfo({
              ...newContactInfo,
              phone: event.target.value,
            })
          }
        />
        <TextField
          label="LinkedInId"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LinkedInIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={newContactInfo.linkedInId}
          onChange={(event) =>
            setNewContactInfo({
              ...newContactInfo,
              linkedInId: event.target.value,
            })
          }
        />
        <TextField
          label="Github"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <GitHubIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={newContactInfo.gitHubId}
          onChange={(event) =>
            setNewContactInfo({
              ...newContactInfo,
              gitHubId: event.target.value,
            })
          }
        />
        <TextField
          label="Location"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOnIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={newContactInfo.location}
          onChange={(event) =>
            setNewContactInfo({
              ...newContactInfo,
              location: event.target.value,
            })
          }
        />
      </Box>
    </>
  );
}
