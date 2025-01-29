import { List, ListItem, Typography } from "@mui/material";
import { JSX } from "react";

interface Props {
  /** The title of the work subsection */
  title: string;

  /** The location of the work subsection */
  location: string;

  /** The date of the education */
  datePeriod: { start: string; end: string };
}

/** Each subsection of work experience */
export function WorkExperienceSubsection({
  title,
  location,
  datePeriod,
}: Props): JSX.Element {
  return (
    <>
      <Typography
        sx={{
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
          fontWeight: "bold",
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: "10pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {location}
      </Typography>
      <Typography
        sx={{
          fontSize: "10pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        {datePeriod.start} - {datePeriod.end}
      </Typography>
      <List sx={{ listStyleType: "disc" }}>
        <ListItem sx={{ display: "list-item" }}>as</ListItem>
      </List>
    </>
  );
}
