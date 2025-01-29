import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/section-title";
import { WorkExperienceSubsection } from "./work-subsection";

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle title="Work Experience" />
      <WorkExperienceSubsection
        title="Researcher"
        location="MARUM-University of Bremen"
        datePeriod={{ start: "12.2019", end: "Present" }}
      />
    </Grid2>
  );
}
