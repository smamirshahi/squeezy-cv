import { BodyText, SubsectionText } from "../../common/custom-typography";
import { Grid } from "@mui/material";
import { DatePeriod } from "../../components/date-period";
import { BulletPoints } from "../../components/bullet-points";
import { LocationWithIcon } from "../../components/location-with-icon";
import { Experience } from "../../types/json-types";

interface Props {
  /** data for each experience */
  experience: Experience;
}

/** Renders a single experience section */
export function ExperienceSubsection({ experience }: Props): JSX.Element {
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={experience.jobTitle} isBold={true} />
      <BodyText text={experience.company} />
      <Grid container direction="row" alignItems="center">
        <DatePeriod
          datePeriod={{ start: experience.startDate, end: experience.endDate }}
        />
        <LocationWithIcon place={experience.location} />
      </Grid>
      {experience.bulletPoints && (
        <BulletPoints bulletPoints={experience.bulletPoints} />
      )}
    </Grid>
  );
}
