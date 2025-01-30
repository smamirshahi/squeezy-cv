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
export function Educations({ educations }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Education" />
      {educations.map((education, index) => (
        <EducationSubsection key={index} education={education} />
      ))}
    </Grid2>
  );
}
