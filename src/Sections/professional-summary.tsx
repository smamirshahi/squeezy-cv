import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { NormalText, SectionTitle } from "../common/custom-typography";

export function ProfessionalSummary(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Professional Summary" />
      <NormalText text="I am a software developer with a passion for learning and teaching." />
    </Grid2>
  );
}
