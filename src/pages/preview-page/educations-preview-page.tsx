import { Grid } from "@mui/material";
import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "@components/cv-typography-old";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";

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
            <IconWithText icon={LocationOnIcon} text={education.location} />
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
