import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid2 } from "@mui/material";
import { IconWithText } from "../common/icon-with-text";
import { ContactInformationProps } from "../common/custom-types";
import { LocationWithIcon } from "../components/location-with-icon";

interface Props {
  /** data for contact information */
  contactInformation: ContactInformationProps;
}

/** Contact Information (details) */
export function ContactInformation({ contactInformation }: Props): JSX.Element {
  return (
    <Grid2 container direction="row" sx={{ mb: "20px" }}>
      {contactInformation.email && (
        <IconWithText
          icon={AlternateEmailIcon}
          text={contactInformation.email}
        />
      )}
      {contactInformation.phoneNumber && (
        <IconWithText
          icon={SmartphoneIcon}
          text={contactInformation.phoneNumber}
        />
      )}
      {contactInformation.location && (
        <LocationWithIcon place={contactInformation.location} />
      )}

      {contactInformation.linkedInId && (
        <IconWithText
          icon={LinkedInIcon}
          text={
            contactInformation.shouldShowCompleteLink
              ? `https://www.linkedin.com/in/${contactInformation.linkedInId}`
              : contactInformation.linkedInId
          }
        />
      )}
      {contactInformation.gitHubId && (
        <IconWithText
          icon={GitHubIcon}
          text={
            contactInformation.shouldShowCompleteLink
              ? `https://github.com/${contactInformation.gitHubId}`
              : contactInformation.gitHubId
          }
        />
      )}
    </Grid2>
  );
}
