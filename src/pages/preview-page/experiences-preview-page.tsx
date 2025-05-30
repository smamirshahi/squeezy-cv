import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypographyNew } from "@components/cv-typography";

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
      <CvTypographyNew variant="headingLg" text="Work Experience" />
      {experiences.map((experience, index) => (
        <Grid
          container
          key={index}
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <CvTypographyNew variant="headingMd" text={experience.jobTitle} />
          <CvTypographyNew variant="headingSm" text={experience.company} />
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
            <>
              {experience.bulletPoints.map((bulletPoint, index) => (
                <IconWithText
                  key={index}
                  icon={FiberManualRecordIcon}
                  text={bulletPoint}
                  // customTextSx={{ color: customColors.gray }}
                  // customIconSx={{
                  //   color: customColors.gray,
                  //   width: "10px",
                  //   mr: "5px",
                  // }}
                />
              ))}
            </>
          )}
        </Grid>
      ))}
    </Grid>
  );
}
