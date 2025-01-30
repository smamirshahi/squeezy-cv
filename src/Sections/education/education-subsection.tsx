import { JSX } from "react";
import {
  DATE_FORMAT,
  NormalText,
  SubsectionText,
} from "../../common/custom-stylings";
import { EducationProps } from "../../common/custom-types";
import dayjs from "dayjs";

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
      <NormalText
        text={`${dayjs(education.datePeriod.start).format(DATE_FORMAT)} - ${
          education.datePeriod.end
            ? dayjs(education.datePeriod.end).format(DATE_FORMAT)
            : "Present"
        }`}
      />
      <NormalText text={education.dissertationTitle} />
    </>
  );
}
