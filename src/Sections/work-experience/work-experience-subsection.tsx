import { List, ListItem } from "@mui/material";
import { JSX } from "react";
import {
  DATE_FORMAT,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { WorkExperiencesProps } from "../../common/custom-types";
import dayjs from "dayjs";

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
      <NormalText
        text={`${dayjs(workExperience.datePeriod.start).format(
          DATE_FORMAT
        )} - ${
          workExperience.datePeriod.end
            ? dayjs(workExperience.datePeriod.end).format(DATE_FORMAT)
            : "Present"
        }`}
      />
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
