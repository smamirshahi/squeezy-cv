import { JSX } from "react";
import {
  DatePeriodText,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { Grid2 } from "@mui/material";
import { ExperienceProps } from "../../common/custom-types";

interface Props {
  /** data for each experience */
  experience: ExperienceProps;
}

/** Renders a single experience section */
export function ExperiencesSubsection({ experience }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={experience.title} isBold />
      <NormalText text={experience.institute} />
      <DatePeriodText datePeriod={experience.datePeriod} />
      {experience.dissertationTitle && (
        <NormalText text={experience.dissertationTitle} />
      )}
      {/* <List sx={{ listStyleType: "disc" }}>
        {workExperience.bulletPoints.map((bulletPoint, index) => (
          <ListItem key={index} sx={{ display: "list-item" }}>
            {bulletPoint}
          </ListItem>
        ))}
      </List> */}
    </Grid2>
  );
}
