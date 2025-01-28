import { Box } from "@mui/material";
import { JSX } from "react";

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
export function EducationSection({
  degree,
  institution,
  datePeriod,
  dissertationTitle,
}: Props): JSX.Element {
  return (
    <Box>
      <p>{degree}</p>
      <p>{institution}</p>
      <p>
        {datePeriod.start} - {datePeriod.end}
      </p>
      <p>{dissertationTitle}</p>
    </Box>
  );
}
