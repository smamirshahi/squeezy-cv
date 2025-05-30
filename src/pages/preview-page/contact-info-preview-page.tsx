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
export function ContactInfoPreviewPage(): JSX.Element {
  const { contactInfo } = useAppSelector(cvDataSelector);
  const { shouldShowFullContactLinks } = useAppSelector(styleSelector);

  return (
    <Grid container direction="row" sx={{ mb: "20px" }}>
      <IconWithText
        variant="captionText"
        icon={AlternateEmailIcon}
        text={contactInfo.email}
      />
      <IconWithText
        variant="captionText"
        icon={SmartphoneIcon}
        text={contactInfo.phone}
      />
      <IconWithText
        variant="captionText"
        icon={LocationOnIcon}
        text={contactInfo.location}
      />

      {contactInfo.linkedInId && (
        <IconWithText
          variant="captionText"
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
          variant="captionText"
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
