import { Box } from "@mui/material";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { ContactInfoSection } from "@pages/editor-page/contact-info/contact-info-section";

/** Shows the contact info in editor page */
export function ContactInfoEditorPage(): JSX.Element {
  return (
    <>
      <Box display="flex" gap={2} mb={2}>
        <ContactInfoSection
          icon={<AlternateEmailIcon />}
          label="Email"
          field="email"
        />

        <ContactInfoSection
          icon={<SmartphoneIcon />}
          label="Phone"
          field="phone"
        />

        <ContactInfoSection
          icon={<LinkedInIcon />}
          label="LinkedInId"
          field="linkedInId"
        />
      </Box>

      <Box display="flex" gap={2} mb={2}>
        <ContactInfoSection
          icon={<GitHubIcon />}
          label="Github"
          field="gitHubId"
        />

        <ContactInfoSection
          icon={<LocationOnIcon />}
          label="Location"
          field="location"
        />
      </Box>
    </>
  );
}
