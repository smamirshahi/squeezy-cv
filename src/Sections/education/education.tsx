import { Grid2 } from "@mui/material";
import { EducationSubsection } from "./education-subsection";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { Application } from "../../applicant";

/** Renders the whole education part */
export function Education(): JSX.Element {
  const { education } = Application;

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
