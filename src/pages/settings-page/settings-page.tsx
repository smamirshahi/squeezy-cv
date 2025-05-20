import { Paper, TextField } from "@mui/material";
import { TemplateButton } from "../../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../../common/custom-styles";
import { applicantSelector } from "../../store/applicant/applicant-slice";
import { useSelector } from "react-redux";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { TextFieldWithIcon } from "./text-field-with-icon";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function SettingsPage({ contentRef }: Props): JSX.Element {
  const applicant = useSelector(applicantSelector);
  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        margin: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <TemplateButton printReference={contentRef} />
      <TextField
        id="outlined-basic"
        label="Full Name"
        variant="outlined"
        value={applicant.nameJobTitle.name}
      />
      <TextField
        id="outlined-basic"
        label="Job Title"
        variant="outlined"
        value={applicant.nameJobTitle.currentJobTitle}
      />
      <TextField
        id="outlined-basic"
        label="Professional Summary"
        variant="outlined"
        multiline
        value={applicant.professionalSummary.summary}
      />
      <TextFieldWithIcon
        icon={<AlternateEmailIcon />}
        label="Email"
        value={applicant.contactInformation.email}
      />
      <TextFieldWithIcon
        icon={<SmartphoneIcon />}
        label="Phone"
        value={applicant.contactInformation.phoneNumber}
      />
      <TextFieldWithIcon
        icon={<LinkedInIcon />}
        label="LinkedInId"
        value={applicant.contactInformation.linkedInId}
      />
      <TextFieldWithIcon
        icon={<GitHubIcon />}
        label="Github"
        value={applicant.contactInformation.gitHubId}
      />
      <TextFieldWithIcon
        icon={<LocationOnIcon />}
        label="location"
        value={applicant.contactInformation.location}
      />
    </Paper>
  );
}
