import { Grid2, Typography } from "@mui/material";
import { JSX } from "react";

export function ProfessionalSummary(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <Typography
        sx={{
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
          borderBottom: "1px solid black",
        }}
        gutterBottom
      >
        Professional Summary
      </Typography>
      <Typography
        sx={{ fontSize: "10pt", fontFamily: "Calibri, sans-serif" }}
        gutterBottom
      >
        I am a software developer with a passion for learning and teaching.
      </Typography>
    </Grid2>
  );
}
