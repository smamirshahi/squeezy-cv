import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";
import { GeneralResumeProps } from "../common/custom-types";

interface Props {
  /** Name and job title */
  nameJobTitle: GeneralResumeProps["nameJobTitle"];
}

export function NameJobTitle({ nameJobTitle }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <ResumeTitle text={nameJobTitle.name} />
      <SubsectionText text={nameJobTitle.currentJobTitle} />
    </Grid2>
  );
}
