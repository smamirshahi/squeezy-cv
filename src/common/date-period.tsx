import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconWithText } from "./icon-with-text";
import { ExperienceProps } from "./custom-types";
import { customColors, DATE_FORMAT } from "./custom-styles";

interface DatePeriodProps {
  /** Date period with start and end */
  datePeriod: ExperienceProps["datePeriod"];
}

/** Text with start and end date */
export function DatePeriod({ datePeriod }: DatePeriodProps): JSX.Element {
  return (
    <IconWithText
      icon={CalendarMonthIcon}
      text={`${dayjs(datePeriod.start).format(DATE_FORMAT)} - ${
        datePeriod.end ? dayjs(datePeriod.end).format(DATE_FORMAT) : "Present"
      }`}
      customSx={{color: customColors.gray}}
    ></IconWithText>
  );
}
