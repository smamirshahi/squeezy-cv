import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypography } from "@components/cv-typography";

/** Shows the personal info in preview page */
export function PersonalInfoPreviewPage(): JSX.Element | null {
  const { personalInfo } = useAppSelector(cvDataSelector);

  if (!personalInfo.name) {
    return null;
  }

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <CvTypography variant="headingLg" text={personalInfo.name} />
      <CvTypography variant="bodyLg" text={personalInfo.jobTitle} />
    </Grid>
  );
}
