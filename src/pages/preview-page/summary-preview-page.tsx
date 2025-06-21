import { Grid } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { CvTypography } from "@components/cv-typography";
import { PreviewSection } from "@components/preview-section";

/** Shows the professional summary page in preview mode */
export function SummaryPreviewPage(): JSX.Element | null {
  const { professionalSummary } = useAppSelector(cvDataSelector);

  if (!professionalSummary) {
    return null;
  }
  return (
    <PreviewSection sectionId="summary">
      <Grid
        container
        direction="column"
        alignItems="flex-start"
        sx={{ m: "0px", p: "0px" }}
      >
        <CvTypography variant="headingMd" text="Professional Summary" />
        <CvTypography variant="bulletText" text={professionalSummary} />
      </Grid>
    </PreviewSection>
  );
}
