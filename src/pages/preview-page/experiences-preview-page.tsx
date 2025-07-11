import { Box, Grid } from "@mui/material";
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
      sx={{ m: "0px", p: "0px" }}
    >
      <CvTypography variant="headingMd" text="Work Experience" />
      {experiences.map(
        (experience, index) =>
          experience.shouldShow && (
            <Grid
              container
              key={index}
              direction="column"
              alignItems="flex-start"
              sx={{ mb: "10px" }}
            >
              <CvTypography variant="headingSm" text={experience.jobTitle} />
              <Grid container direction="row" alignItems="center" gap={3}>
                <CvTypography variant="bodyMd" text={experience.company} />
                <IconWithText
                  icon={LocationOnIcon}
                  text={experience.location}
                  variant="bodyMd"
                />
              </Grid>
              <DatePeriod
                datePeriod={{
                  start: experience.startDate,
                  end: experience.endDate,
                }}
              />

              {experience.bulletPoints && (
                <Box component="ul" sx={{ my: "0px", pl: "20px" }}>
                  {experience.bulletPoints.map((bulletPoint) => (
                    <li key={bulletPoint}>
                      <CvTypography variant="bulletText" text={bulletPoint} />
                    </li>
                  ))}
                </Box>
              )}
            </Grid>
          )
      )}
    </Grid>
  );
}
