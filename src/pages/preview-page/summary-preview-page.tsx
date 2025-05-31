import { Grid } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { CvTypographyNew } from "@components/cv-typography";

export function SummaryPreviewPage(): JSX.Element | null {
  const { professionalSummary } = useAppSelector(cvDataSelector);

  if (!professionalSummary) {
    return null;
  }
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <CvTypographyNew variant="headingLg" text="Professional Summary" />
      <CvTypographyNew variant="bodyLg" text={professionalSummary} />
    </Grid>
  );
}
