import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid } from "@mui/material";
import { IconWithText } from "../../common/icon-with-text";
import { LocationWithIcon } from "../../components/location-with-icon";
import { useAppSelector } from "../../store/store-helper";
import {
  cvDataSelector,
  styleSelector,
} from "../../store/applicant/applicant-slice";

/** Contact Information (details) */
export function ContactInfoPreviewPage(): JSX.Element {
  const { contactInfo } = useAppSelector(cvDataSelector);
  const { shouldShowFullContactLinks } = useAppSelector(styleSelector);

  return (
    <Grid container direction="row" sx={{ mb: "20px" }}>
      {contactInfo.email && (
        <IconWithText icon={AlternateEmailIcon} text={contactInfo.email} />
      )}
      {contactInfo.phone && (
        <IconWithText icon={SmartphoneIcon} text={contactInfo.phone} />
      )}
      {contactInfo.location && (
        <LocationWithIcon place={contactInfo.location} />
      )}

      {contactInfo.linkedInId && (
        <IconWithText
          icon={LinkedInIcon}
          text={
            shouldShowFullContactLinks
              ? `https://www.linkedin.com/in/${contactInfo.linkedInId}`
              : contactInfo.linkedInId
          }
        />
      )}
      {contactInfo.gitHubId && (
        <IconWithText
          icon={GitHubIcon}
          text={
            shouldShowFullContactLinks
              ? `https://github.com/${contactInfo.gitHubId}`
              : contactInfo.gitHubId
          }
        />
      )}
    </Grid>
  );
}
