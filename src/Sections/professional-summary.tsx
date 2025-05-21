import { Grid } from "@mui/material";
import { BodyText, SectionTitle } from "../common/custom-typography";
import { useAppSelector } from "../store/store-helper";
import { cvDataSelector } from "../store/applicant/applicant-slice";

export function ProfessionalSummary(): JSX.Element {
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
