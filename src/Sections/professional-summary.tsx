import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { NormalText, SectionTitle } from "../common/custom-typography";
import { Application } from "../applicant";

export function ProfessionalSummary(): JSX.Element {
  const { professionalSummary } = Application;

  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Professional Summary" />
      <NormalText text={professionalSummary.summary} />
    </Grid2>
  );
}
