import { Grid } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { CvTypography } from "@components/cv-typography";

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
      <CvTypography variant="headingLg" text="Professional Summary" />
      <CvTypography variant="bodyLg" text={professionalSummary} />
    </Grid>
  );
}
