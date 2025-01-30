import { Grid2 } from "@mui/material";
import { EducationSubsection } from "./education-subsection";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-stylings";
import { EducationProps } from "../../common/custom-types";

interface Props {
  /** data for Education */
  educations: EducationProps[];
}

/** Renders the whole education part */
export function Education({ educations }: Props): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Education" />
      {educations.map((education) => (
        <EducationSubsection education={education} />
      ))}
    </Grid2>
  );
}
