import { Grid2, Typography } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../common/section-title";

export function ProfessionalSummary(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle title="Professional Summary" />
      <Typography
        sx={{ fontSize: "10pt", fontFamily: "Calibri, sans-serif" }}
        gutterBottom
      >
        I am a software developer with a passion for learning and teaching.
      </Typography>
    </Grid2>
  );
}
