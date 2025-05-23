import { Grid } from "@mui/material";
import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../../common/custom-typography";
import { cvDataSelector } from "../../store/applicant/applicant-slice";
import { useAppSelector } from "../../store/store-helper";
import { LocationWithIcon } from "../../components/location-with-icon";
import { DatePeriod } from "@src/components/date-period";

/** Renders the whole education part in preview page */
export function EducationsPreviewPage(): JSX.Element {
  const { educations } = useAppSelector(cvDataSelector);

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Education" />

      {educations.map((education, index) => (
        <Grid
          key={index}
          container
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <SubsectionText text={education.degree} isBold={true} />
          <BodyText text={education.institute} />
          <Grid container direction="row" alignItems="center">
            <DatePeriod
              datePeriod={{
                start: education.startDate,
                end: education.endDate,
              }}
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
      ))}
    </Grid>
  );
}
