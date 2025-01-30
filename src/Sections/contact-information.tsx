import { JSX } from "react";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid2 } from "@mui/material";
import { IconWithText } from "../common/icon-with-text";
import { ContactInformationProps } from "../common/custom-types";

interface Props {
  /** data for contact information */
  contactInformation: ContactInformationProps;
}

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
        <IconWithText
          icon={LocationOnIcon}
          text={contactInformation.location}
        />
      )}
      {contactInformation.linkedInId && (
        <IconWithText
          icon={LinkedInIcon}
          text={`https://www.linkedin.com/in/${contactInformation.linkedInId}`}
        />
      )}
      {contactInformation.gitHubId && (
        <IconWithText
          icon={GitHubIcon}
          text={`https://github.com/${contactInformation.gitHubId}`}
        />
      )}
    </Grid2>
  );
}
