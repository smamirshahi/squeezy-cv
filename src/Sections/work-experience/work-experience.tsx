import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { WorkExperienceSubsection } from "./work-experience-subsection";
import { WorkExperiencesProps } from "../../common/custom-types";

interface Props {
  /** data for work experience */
  workExperiences: WorkExperiencesProps[];
}

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience({ workExperiences }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Work Experience" />
      {workExperiences.map((workExperience) => (
        <WorkExperienceSubsection workExperience={workExperience} />
      ))}
    </Grid2>
  );
}
