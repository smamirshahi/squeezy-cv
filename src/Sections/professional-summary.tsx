import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { NormalText, SectionTitle } from "../common/custom-typography";
import { ProfessionalSummaryProps } from "../common/custom-types";

interface Props {
  /** data for professional summary */
  summary: ProfessionalSummaryProps;
}

export function ProfessionalSummary({ summary }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Professional Summary" />
      <NormalText text={summary.summary} />
    </Grid2>
  );
}
