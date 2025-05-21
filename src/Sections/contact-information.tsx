import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid } from "@mui/material";
import { IconWithText } from "../common/icon-with-text";
import { LocationWithIcon } from "../components/location-with-icon";
import { useAppSelector } from "../store/store-helper";
import { applicantSelector } from "../store/applicant/applicant-slice";

/** Contact Information (details) */
export function ContactInformation(): JSX.Element {
  const { contactInformation, style } = useAppSelector(applicantSelector);
  return (
    <Grid container direction="row" sx={{ mb: "20px" }}>
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
            style.shouldShowCompleteLink
              ? `https://www.linkedin.com/in/${contactInformation.linkedInId}`
              : contactInformation.linkedInId
          }
        />
      )}
      {contactInformation.gitHubId && (
        <IconWithText
          icon={GitHubIcon}
          text={
            style.shouldShowCompleteLink
              ? `https://github.com/${contactInformation.gitHubId}`
              : contactInformation.gitHubId
          }
        />
      )}
    </Grid>
  );
}
