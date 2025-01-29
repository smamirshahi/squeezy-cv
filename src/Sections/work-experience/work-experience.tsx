import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { WorkExperienceSubsection } from "./work-experience-subsection";

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Work Experience" />
      <WorkExperienceSubsection
        title="Researcher"
        location="MARUM-University of Bremen"
        datePeriod={{ start: "12.2019", end: "Present" }}
      />
    </Grid2>
  );
}
