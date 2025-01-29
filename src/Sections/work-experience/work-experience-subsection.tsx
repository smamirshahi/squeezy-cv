import { List, ListItem } from "@mui/material";
import { JSX } from "react";
import { NormalText, SubsectionText } from "../../common/custom-typography";

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
      <SubsectionText text={title} isBold />
      <NormalText text={location} />
      <NormalText text={`${datePeriod.start} - ${datePeriod.end}`} />
      <List sx={{ listStyleType: "disc" }}>
        <ListItem sx={{ display: "list-item" }}>as</ListItem>
      </List>
    </>
  );
}
