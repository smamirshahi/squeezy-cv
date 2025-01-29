import { List, ListItem } from "@mui/material";
import { JSX } from "react";
import { NormalText, SubsectionText } from "../../common/custom-typography";
import { GeneralResumeProps } from "../../common/custom-types";

interface Props {
  workExperience: GeneralResumeProps["workExperiences"][0];
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
        text={`${workExperience.datePeriod.start} - ${workExperience.datePeriod.end}`}
      />
      <List sx={{ listStyleType: "disc" }}>
        {workExperience.bulletPoints?.map((bulletPoint) => (
          <ListItem sx={{ display: "list-item" }}>{bulletPoint}</ListItem>
        ))}
      </List>
    </>
  );
}
