import { Box, Paper, TextField } from "@mui/material";
import { TemplateButton } from "../../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../../common/custom-styles";
import { cvDataSelector } from "../../store/applicant/applicant-slice";
import { useSelector } from "react-redux";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { TextFieldWithIcon } from "./text-field-with-icon";
import { ExperienceForm } from "./text-field-work-experience";
import { TextFieldEducation } from "./text-field-education";
import { TextFieldSkills } from "./text-field-skills";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function SettingsPage({ contentRef }: Props): JSX.Element {
  const { personalInfo, contactInfo, professionalSummary } =
    useSelector(cvDataSelector);
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
          fullWidth
        />
        <TextField
          id="outlined-basic"
          label="Job Title"
          variant="outlined"
          value={personalInfo.jobTitle}
          fullWidth
        />
      </Box>

      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<AlternateEmailIcon />}
          label="Email"
          value={contactInfo.email}
        />
        <TextFieldWithIcon
          icon={<SmartphoneIcon />}
          label="Phone"
          value={contactInfo.phone}
        />
        <TextFieldWithIcon
          icon={<LinkedInIcon />}
          label="LinkedInId"
          value={contactInfo.linkedInId}
        />
      </Box>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<GitHubIcon />}
          label="Github"
          value={contactInfo.gitHubId}
        />
        <TextFieldWithIcon
          icon={<LocationOnIcon />}
          label="location"
          value={contactInfo.location}
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
      />

      <ExperienceForm />
      <TextFieldEducation />
      <TextFieldSkills />
    </Paper>
  );
}
