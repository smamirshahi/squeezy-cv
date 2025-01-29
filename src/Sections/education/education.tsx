import { Grid2 } from "@mui/material";
import { EducationSubsection } from "./education-subsection";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { EducationProps } from "../../common/custom-types";

interface Props {
  /** data for Education */
  education: EducationProps[];
}

/** Renders the whole education part */
export function Education({ education }: Props): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Education" />
      {education.map(
        ({ degree, institution, datePeriod, dissertationTitle }) => (
          <EducationSubsection
            degree={degree}
            institution={institution}
            datePeriod={datePeriod}
            dissertationTitle={dissertationTitle}
          />
        )
      )}
    </Grid2>
  );
}
