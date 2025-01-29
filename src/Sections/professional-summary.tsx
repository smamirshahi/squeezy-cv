import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { NormalText, SectionTitle } from "../common/custom-typography";
import { GeneralResumeProps } from "../common/custom-types";

interface Props {
  /** data for professional summary */
  summary: GeneralResumeProps["professionalSummary"];
}

export function ProfessionalSummary({ summary }: Props): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Professional Summary" />
      <NormalText text={summary.summary} />
    </Grid2>
  );
}
