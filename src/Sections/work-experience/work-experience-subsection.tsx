import { Grid2, List, ListItem } from "@mui/material";
import { JSX } from "react";
import {
  DatePeriodText,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { WorkExperiencesProps } from "../../common/custom-types";

interface Props {
  workExperience: WorkExperiencesProps;
}

/** Each subsection of work experience */
export function WorkExperienceSubsection({
  workExperience,
}: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={workExperience.jobTitle} isBold />
      <NormalText text={workExperience.location} />
      <DatePeriodText datePeriod={workExperience.datePeriod} />
      {workExperience.bulletPoints && (
        <List sx={{ listStyleType: "disc" }}>
          {workExperience.bulletPoints.map((bulletPoint, index) => (
            <ListItem key={index} sx={{ display: "list-item" }}>
              {bulletPoint}
            </ListItem>
          ))}
        </List>
      )}
    </Grid2>
  );
}
