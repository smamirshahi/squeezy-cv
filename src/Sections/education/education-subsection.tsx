import { JSX } from "react";
import {
  DatePeriodText,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { EducationProps } from "../../common/custom-types";

interface Props {
  /** data for Education */
  education: EducationProps;
}

/** Renders a single educational section */
export function EducationSubsection({ education }: Props): JSX.Element {
  return (
    <>
      <SubsectionText text={education.degree} />
      <NormalText text={education.institution} />
      <DatePeriodText datePeriod={education.datePeriod} />
      <NormalText text={education.dissertationTitle} />
    </>
  );
}
