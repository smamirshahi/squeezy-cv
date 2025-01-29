import { JSX } from "react";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid2 } from "@mui/material";
import { IconWithText } from "../common/icon-with-text";
import { Application } from "../applicant";

export function ContactInformation(): JSX.Element {
  const { contactInformation } = Application;

  return (
    <Grid2 container direction="row">
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
      {contactInformation.linkedIn && (
        <IconWithText icon={LinkedInIcon} text={contactInformation.linkedIn} />
      )}
      {contactInformation.gitHub && (
        <IconWithText icon={GitHubIcon} text={contactInformation.gitHub} />
      )}
    </Grid2>
  );
}
