import { BodyText, SubsectionText } from "../../common/custom-typography";
import { Grid } from "@mui/material";
import { ExperienceProps } from "../../common/custom-types";
import { DatePeriod } from "../../components/date-period";
import { BulletPoints } from "../../components/bullet-points";
import { LocationWithIcon } from "../../components/location-with-icon";

interface Props {
  /** data for each experience */
  experience: ExperienceProps;
}

/** Renders a single experience section */
export function ExperiencesSubsection({ experience }: Props): JSX.Element {
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={experience.title} isBold={true} />
      <BodyText text={experience.institute} />
      <Grid container direction="row" alignItems="center">
        <DatePeriod datePeriod={experience.datePeriod} />
        <LocationWithIcon place={experience.location} />
      </Grid>
      {experience.dissertationTitle && (
        <BodyText text={experience.dissertationTitle} isBold={true} />
      )}
      {experience.bulletPoints && (
        <BulletPoints bulletPoints={experience.bulletPoints} />
      )}
    </Grid>
  );
}
