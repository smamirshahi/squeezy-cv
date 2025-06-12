import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Grid } from "@mui/material";
import { IconWithText } from "@components/icon-with-text";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector, styleSelector } from "@store/cv-data/cv-data-slice";

/** Contact Information (details) */
export function ContactInfoPreviewPage(): JSX.Element | null {
  const { contactInfo } = useAppSelector(cvDataSelector);
  const { shouldShowFullContactLinks } = useAppSelector(styleSelector);

  if (!contactInfo.email) {
    return null;
  }

  return (
    <Grid container direction="row" sx={{ mb: "20px" }}>
      <IconWithText
        variant="bulletText"
        icon={AlternateEmailIcon}
        text={contactInfo.email}
      />
      <IconWithText
        variant="bulletText"
        icon={SmartphoneIcon}
        text={contactInfo.phone}
      />
      <IconWithText
        variant="bulletText"
        icon={LocationOnIcon}
        text={contactInfo.location}
      />

      {contactInfo.linkedInId && (
        <IconWithText
          variant="bulletText"
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
          variant="bulletText"
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
