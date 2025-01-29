import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";

export function NameJobTitle(): JSX.Element {
  return (
    <>
      <Grid2>
        <ResumeTitle text="Dr. Mohammad Amirshahi" />
      </Grid2>
      <Grid2>
        <SubsectionText text="Software Developer" />
      </Grid2>
    </>
  );
}
