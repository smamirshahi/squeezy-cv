import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypographyNew } from "@components/cv-typography";

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
      <CvTypographyNew variant="headingLg" text={personalInfo.name} />
      <CvTypographyNew variant="headingMd" text={personalInfo.jobTitle} />
    </Grid>
  );
}
