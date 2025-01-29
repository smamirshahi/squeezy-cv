import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { WorkExperienceSubsection } from "./work-experience-subsection";
import { GeneralResumeProps } from "../../common/custom-types";

interface Props {
  /** data for work experience */
  workExperience: GeneralResumeProps["workExperience"];
}

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience({ workExperience }: Props): JSX.Element {
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
