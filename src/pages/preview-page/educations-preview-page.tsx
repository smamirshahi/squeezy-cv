import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypography } from "@components/cv-typography";

/** Renders the whole education part in preview page */
export function EducationsPreviewPage(): JSX.Element | null {
  const { educations } = useAppSelector(cvDataSelector);

  if (educations.length === 0) {
    return null;
  }

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <CvTypography variant="headingMd" text="Education" />
      {educations.map(
        (education, index) =>
          !education.shouldHide && (
            <Grid
              key={index}
              container
              direction="column"
              alignItems="flex-start"
              sx={{ mb: "10px" }}
            >
              <CvTypography variant="headingSm" text={education.degree} />
              <Grid container direction="row" alignItems="center">
                <CvTypography variant="bodyMd" text={education.institute} />
                <IconWithText
                  icon={LocationOnIcon}
                  text={education.location}
                  variant="bodyMd"
                />
              </Grid>
              <DatePeriod
                datePeriod={{
                  start: education.startDate,
                  end: education.endDate,
                }}
              />

              {education.dissertationTitle && (
                <CvTypography
                  variant="bulletText"
                  text={`Dissertation Title: ${education.dissertationTitle}`}
                />
              )}
            </Grid>
          )
      )}
    </Grid>
  );
}
