import { JSX } from "react";
import {
  DatePeriodText,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { Grid2 } from "@mui/material";
import { ExperienceProps } from "../../common/custom-types";
import { IconWithText } from "../../common/icon-with-text";
import LocationOnIcon from "@mui/icons-material/LocationOn";

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
      <SubsectionText text={experience.title} isBold={true} />
      <NormalText text={experience.institute} />
      <Grid2 container direction="row" alignItems="center">
        <DatePeriodText datePeriod={experience.datePeriod} />
        <IconWithText icon={LocationOnIcon} text={experience.location} />
      </Grid2>
      {experience.dissertationTitle && (
        <NormalText text={experience.dissertationTitle} isBold={true} />
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
