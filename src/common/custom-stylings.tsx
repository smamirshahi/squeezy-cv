import { Typography } from "@mui/material";
import { JSX } from "react";
import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconWithText } from "./icon-with-text";
import { ExperienceProps } from "./custom-types";

const CustomColor = {
  darkBlue: "#033a91",
  black: "#000000",
};

/** The format to be used for date */
export const DATE_FORMAT = "DD/MM/YYYY";

interface TextProps {
  /** The text of the subsection */
  text: string;

  /** Whether it is bold or not */
  isBold?: boolean;
}

export function ResumeTitle({ text, isBold = false }: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "16pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
        textTransform: "uppercase",
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

export function SectionTitle({ text, isBold = false }: TextProps): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: "14pt",
        fontFamily: "Calibri, sans-serif",
        fontWeight: isBold ? "normal" : "bold",
        borderBottom: `2px solid ${CustomColor.darkBlue}`,
        textTransform: "uppercase",
        color: CustomColor.darkBlue,
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

export function SubsectionText({
  text,
  isBold = false,
}: TextProps): JSX.Element {
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

export function NormalText({ text, isBold = false }: TextProps): JSX.Element {
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

interface DatePeriodProps {
  datePeriod: ExperienceProps["datePeriod"];
}

export function DatePeriodText({ datePeriod }: DatePeriodProps): JSX.Element {
  return (
    <IconWithText
      icon={CalendarMonthIcon}
      text={`${dayjs(datePeriod.start).format(DATE_FORMAT)} - ${
        datePeriod.end ? dayjs(datePeriod.end).format(DATE_FORMAT) : "Present"
      }`}
    ></IconWithText>
  );
}
