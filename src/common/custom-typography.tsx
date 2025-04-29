import { SxProps, Typography } from "@mui/material";
import { customColors } from "./custom-styles";

interface TextProps {
  /** The text of the subsection */
  text: string;

  /** Whether it is bold or not */
  isBold?: boolean;

  customSx?: SxProps
}

/** The title for the whole resume */
export function ResumeTitle({ text, isBold = false, customSx }: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "16pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "bold" : "normal",
        textTransform: "uppercase",
        ...customSx
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

/** The Title of a section */
export function SectionTitle({ text, isBold = false, customSx }: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "14pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "bold" : "normal",
        borderBottom: `2px solid ${customColors.darkBlue}`,
        textTransform: "uppercase",
        color: customColors.darkBlue,
        ...customSx
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

/** The subsection text */
export function SubsectionText({
  text,
  isBold = false,
  customSx
}: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "bold" : "normal",
        ...customSx
      }}
    >
      {text}
    </Typography>
  );
}

/** The text for a normal body text */
export function BodyText({ text, isBold = false, customSx }: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "10pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "bold" : "normal",
        textAlign: "left",
        ...customSx
      }}
    >
      {text}
    </Typography>
  );
}
