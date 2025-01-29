import { JSX } from "react";
import { NormalText, SectionTitle } from "../common/custom-typography";
import { Grid2 } from "@mui/material";

export function Skills(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Skills" />
      <NormalText text="Skills" />
    </Grid2>
  );
}
