import { Typography } from "@mui/material";
import { JSX } from "react";

interface Props {
  /** The text of the subsection */
  text: string;

  isBold?: boolean;
}

export function ResumeTitle({ text, isBold = false }: Props): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "16pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

export function SectionTitle({ text, isBold = false }: Props): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "14pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
        borderBottom: "1px solid black",
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

export function SubsectionText({ text, isBold = false }: Props): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
      }}
    >
      {text}
    </Typography>
  );
}

export function NormalText({ text, isBold = false }: Props): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "10pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
      }}
    >
      {text}
    </Typography>
  );
}
