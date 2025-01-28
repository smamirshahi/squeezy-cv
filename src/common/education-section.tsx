import { Box } from "@mui/material";
import { JSX } from "react";

interface Props {
  title: string;
  institution: string;
  date: string;
  topic: string;
}

export function EducationSection({
  title,
  institution,
  date,
  topic,
}: Props): JSX.Element {
  return (
    <Box>
      <p>{title}</p>
      <p>{institution}</p>
      <p>{date}</p>
      <p>{topic}</p>
    </Box>
  );
}
