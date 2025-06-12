import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypography } from "@components/cv-typography";

/** Renders the whole experiences part */
export function ExperiencesPreviewPage(): JSX.Element | null {
  const { experiences } = useAppSelector(cvDataSelector);

  if (experiences.length === 0) {
    return null;
  }

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <CvTypography variant="headingLg" text="Work Experience" />
      {experiences.map((experience, index) => (
        <Grid
          container
          key={index}
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <CvTypography variant="headingMd" text={experience.jobTitle} />
          <CvTypography variant="headingSm" text={experience.company} />
          <Grid container direction="row" alignItems="center">
            <DatePeriod
              datePeriod={{
                start: experience.startDate,
                end: experience.endDate,
              }}
            />
            <IconWithText icon={LocationOnIcon} text={experience.location} />
          </Grid>
          {experience.bulletPoints && (
            // <BulletPoints bulletPoints={experience.bulletPoints} />
            <ul>
              {experience.bulletPoints.map((bulletPoint) => (
                <li key={bulletPoint.id}>
                  <CvTypography variant="bulletText" text={bulletPoint.text} />
                </li>
              ))}
            </ul>
          )}
        </Grid>
      ))}
    </Grid>
  );
}
