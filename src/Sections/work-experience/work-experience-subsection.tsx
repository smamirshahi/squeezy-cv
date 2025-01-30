import { List, ListItem } from "@mui/material";
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
    <>
      <SubsectionText text={workExperience.jobTitle} isBold />
      <NormalText text={workExperience.location} />
      <DatePeriodText datePeriod={workExperience.datePeriod} />
      <List sx={{ listStyleType: "disc" }}>
        {workExperience.bulletPoints?.map((bulletPoint, index) => (
          <ListItem key={index} sx={{ display: "list-item" }}>
            {bulletPoint}
          </ListItem>
        ))}
      </List>
    </>
  );
}
