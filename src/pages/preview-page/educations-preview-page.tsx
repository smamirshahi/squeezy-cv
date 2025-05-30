import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypographyNew } from "@components/cv-typography";

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
      <CvTypographyNew variant="headingLg" text="Education" />

      {educations.map((education, index) => (
        <Grid
          key={index}
          container
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <CvTypographyNew variant="headingMd" text={education.degree} />
          <CvTypographyNew variant="headingSm" text={education.institute} />
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
            <CvTypographyNew
              variant="bodyLg"
              text={`Dissertation Title: ${education.dissertationTitle}`}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
}
