import { BodyText, SubsectionText } from "../../common/custom-typography";
import { Grid } from "@mui/material";
import { DatePeriod } from "../../components/date-period";
import { LocationWithIcon } from "../../components/location-with-icon";
import { Education } from "../../types/json-types";

interface Props {
  /** data for each education */
  education: Education;
}

/** Renders a single education section */
export function EducationSubsection({ education }: Props): JSX.Element {
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={education.degree} isBold={true} />
      <BodyText text={education.institute} />
      <Grid container direction="row" alignItems="center">
        <DatePeriod
          datePeriod={{ start: education.startDate, end: education.endDate }}
        />
        <LocationWithIcon place={education.location} />
      </Grid>
      {education.dissertationTitle && (
        <BodyText
          text={`Dissertation Title: ${education.dissertationTitle}`}
          isBold={true}
        />
      )}
    </Grid>
  );
}
