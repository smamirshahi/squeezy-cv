import { BodyText, SubsectionText } from "../../common/custom-typography";
import { Grid2 } from "@mui/material";
import { ExperienceProps } from "../../common/custom-types";
import { IconWithText } from "../../common/icon-with-text";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { DatePeriod } from "../../components/date-period";
import { BulletPoints } from "../../components/bullet-points";

interface Props {
  /** data for each experience */
  experience: ExperienceProps;
}

/** Renders a single experience section */
export function ExperiencesSubsection({ experience }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={experience.title} isBold={true} />
      <BodyText text={experience.institute} />
      <Grid2 container direction="row" alignItems="center">
        <DatePeriod datePeriod={experience.datePeriod} />
        <IconWithText icon={LocationOnIcon} text={experience.location} />
      </Grid2>
      {experience.dissertationTitle && (
        <BodyText text={experience.dissertationTitle} isBold={true} />
      )}
      {experience.bulletPoints && (
        <BulletPoints bulletPoints={experience.bulletPoints} />
      )}
    </Grid2>
  );
}
