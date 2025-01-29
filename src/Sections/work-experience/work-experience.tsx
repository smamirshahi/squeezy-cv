import { Box } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/section-title";
import { WorkExperienceSubsection } from "./work-subsection";

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience(): JSX.Element {
  return (
    <Box>
      <SectionTitle title="Work Experience" />
      <WorkExperienceSubsection />
    </Box>
  );
}
