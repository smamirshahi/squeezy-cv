import { Grid } from "@mui/material";
import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "@components/cv-typography-old";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { DatePeriod } from "@components/date-period";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { customColors } from "@custom-types/custom-styles";

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
                  customTextSx={{ color: customColors.gray }}
                  customIconSx={{
                    color: customColors.gray,
                    width: "10px",
                    mr: "5px",
                  }}
                />
              ))}
            </>
          )}
        </Grid>
      ))}
    </Grid>
  );
}
