import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";
import { Application } from "../applicant";

export function NameJobTitle(): JSX.Element {
  const { nameJobTitle } = Application;

  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <ResumeTitle text={nameJobTitle.name} />
      <SubsectionText text={nameJobTitle.currentJobTitle} />
    </Grid2>
  );
}
