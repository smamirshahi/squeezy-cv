import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconWithText } from "../common/icon-with-text";
import { ExperienceProps } from "../types/custom-types";
import { customColors, DATE_FORMAT } from "../common/custom-styles";

interface DatePeriodProps {
  /** Date period with start and end */
  datePeriod: ExperienceProps["datePeriod"];
}

/** Text with start and end date and a calendar icon at the beginning */
export function DatePeriod({ datePeriod }: DatePeriodProps): JSX.Element {
  return (
    <IconWithText
      icon={CalendarMonthIcon}
      text={`${dayjs(datePeriod.start).format(DATE_FORMAT)} - ${
        datePeriod.end ? dayjs(datePeriod.end).format(DATE_FORMAT) : "Present"
      }`}
      customTextSx={{ color: customColors.gray }}
    ></IconWithText>
  );
}
