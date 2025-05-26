import { Grid } from "@mui/material";
import { BodyText, SectionTitle } from "@src/components/cv-typography";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";

export function SummaryPreviewPage(): JSX.Element {
  const { professionalSummary } = useAppSelector(cvDataSelector);
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Professional Summary" />
      <BodyText text={professionalSummary} />
    </Grid>
  );
}
