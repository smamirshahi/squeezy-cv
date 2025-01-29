import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { WorkExperienceSubsection } from "./work-experience-subsection";
import { Application } from "../../applicant";

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience(): JSX.Element {
  const { workExperience } = Application;

  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Work Experience" />
      {workExperience.map(({ jobTitle, location, datePeriod }) => (
        <WorkExperienceSubsection
          title={jobTitle}
          location={location}
          datePeriod={datePeriod}
        />
      ))}
    </Grid2>
  );
}
