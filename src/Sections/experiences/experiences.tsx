import { Grid2 } from "@mui/material";
import { JSX } from "react";
import { SectionTitle } from "../../common/custom-typography";
import { ExperienceProps } from "../../common/custom-types";
import { ExperiencesSubsection } from "./experiences-subsection";

interface Props {
  /** The title of the section */
  sectionTitle: string;

  /** data for experiences */
  experiences: ExperienceProps[];
}

/** Renders the whole experiences part */
export function Experiences({ sectionTitle, experiences }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text={sectionTitle} />
      {experiences.map((experience, index) => (
        <ExperiencesSubsection key={index} experience={experience} />
      ))}
    </Grid2>
  );
}
