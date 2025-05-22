import { Box, Paper, TextField } from "@mui/material";
import { TemplateButton } from "../../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../../common/custom-styles";
import {
  cvDataSelector,
  updateContactInfo,
  updatePersonalInfo,
  updateProfessionalSummary,
} from "../../store/applicant/applicant-slice";
import { useSelector } from "react-redux";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { TextFieldWithIcon } from "./text-field-with-icon";
import { WorkExperienceForm } from "./work-experience-form";
import { EducationForm } from "./education-form";
import { SkillsForm } from "./skills-form";
import { useAppDispatch } from "../../store/store-helper";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function SettingsPage({ contentRef }: Props): JSX.Element {
  const { personalInfo, contactInfo, professionalSummary } =
    useSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <TemplateButton printReference={contentRef} />
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

      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<AlternateEmailIcon />}
          label="Email"
          value={contactInfo.email}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "email",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<SmartphoneIcon />}
          label="Phone"
          value={contactInfo.phone}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "phone",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<LinkedInIcon />}
          label="LinkedInId"
          value={contactInfo.linkedInId}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "linkedInId",
                value: event.target.value,
              })
            )
          }
        />
      </Box>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<GitHubIcon />}
          label="Github"
          value={contactInfo.gitHubId}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "gitHubId",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<LocationOnIcon />}
          label="location"
          value={contactInfo.location}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "location",
                value: event.target.value,
              })
            )
          }
        />
      </Box>

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

      <WorkExperienceForm />
      <EducationForm />
      <SkillsForm />
    </Paper>
  );
}
