import { JSX } from "react";
import { NormalText, SubsectionText } from "../../common/custom-typography";

interface Props {
  /** Degree to earn in this section */
  degree: string;

  /** The institute that obtain the education */
  institution: string;

  /** The date of the education */
  datePeriod: { start: string; end: string };

  /** The dissertation topic */
  dissertationTitle: string;
}

/** Renders a single educational section */
export function EducationSubsection({
  degree,
  institution,
  datePeriod,
  dissertationTitle,
}: Props): JSX.Element {
  return (
    <>
      <SubsectionText text={degree} />
      <NormalText text={institution} />
      <NormalText text={`${datePeriod.start} - ${datePeriod.end}`} />
      <NormalText text={dissertationTitle} />
    </>
  );
}
