import { Grid2, Typography } from "@mui/material";
import { JSX } from "react";

export function NameJobTitle(): JSX.Element {
  return (
    <>
      <Grid2>
        <Typography
          sx={{ fontSize: "16pt", fontFamily: "Calibri, sans-serif" }}
        >
          Dr. Mohammad Amirshahi
        </Typography>
      </Grid2>
      <Grid2>
        <Typography
          sx={{ fontSize: "12pt", fontFamily: "Calibri, sans-serif" }}
          gutterBottom
        >
          Software Developer
        </Typography>
      </Grid2>
    </>
  );
}
