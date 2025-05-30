import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypographyNew } from "@components/cv-typography";

export function PersonalInfoPreviewPage(): JSX.Element {
  const { personalInfo } = useAppSelector(cvDataSelector);
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
