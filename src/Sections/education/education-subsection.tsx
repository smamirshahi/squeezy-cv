import { JSX } from "react";
import {
  DatePeriodText,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { EducationProps } from "../../common/custom-types";
import { Grid2 } from "@mui/material";

interface Props {
  /** data for Education */
  education: EducationProps;
}

/** Renders a single educational section */
export function EducationSubsection({ education }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "10px" }}
    >
      <SubsectionText text={education.degree} isBold />
      <NormalText text={education.institution} />
      <DatePeriodText datePeriod={education.datePeriod} />
      <NormalText text={education.dissertationTitle} />
    </Grid2>
  );
}
