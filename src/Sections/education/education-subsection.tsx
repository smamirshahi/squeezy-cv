import { Box, Typography } from "@mui/material";
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
export function EducationSubsection({
  degree,
  institution,
  datePeriod,
  dissertationTitle,
}: Props): JSX.Element {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {degree}
      </Typography>
      <Typography
        sx={{
          fontSize: "10pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {institution}
      </Typography>
      <Typography
        sx={{
          fontSize: "10pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {datePeriod.start} - {datePeriod.end}
      </Typography>
      <Typography
        sx={{
          fontSize: "10pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {dissertationTitle}
      </Typography>
    </Box>
  );
}
