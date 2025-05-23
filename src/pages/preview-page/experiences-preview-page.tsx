import { Grid } from "@mui/material";
import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../../common/custom-typography";
import { cvDataSelector } from "../../store/applicant/applicant-slice";
import { useAppSelector } from "../../store/store-helper";
import { DatePeriod } from "@src/components/date-period";
import { BulletPoints } from "@src/components/bullet-points";
import { LocationWithIcon } from "../../components/location-with-icon";

/** Renders the whole experiences part */
export function ExperiencesPreviewPage(): JSX.Element {
  const { experiences } = useAppSelector(cvDataSelector);

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text="Work Experience" />

      {experiences.map((experience, index) => (
        <Grid
          container
          key={index}
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <SubsectionText text={experience.jobTitle} isBold={true} />
          <BodyText text={experience.company} />
          <Grid container direction="row" alignItems="center">
            <DatePeriod
              datePeriod={{
                start: experience.startDate,
                end: experience.endDate,
              }}
            />
            <LocationWithIcon place={experience.location} />
          </Grid>
          {experience.bulletPoints && (
            <BulletPoints bulletPoints={experience.bulletPoints} />
          )}
        </Grid>
      ))}
    </Grid>
  );
}
