import { Typography } from "@mui/material";
import { JSX } from "react";

interface Props {
  /** The title of the section */
  title: string;
}

/** Shows the section title */
export function SectionTitle({ title }: Props): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "14pt",
        fontFamily: "Calibri, sans-serif",
        borderBottom: "1px solid black",
      }}
      gutterBottom
    >
      {title}
    </Typography>
  );
}
