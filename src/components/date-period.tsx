import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconWithText } from "@components/icon-with-text";
import { customColors, DATE_FORMAT } from "@customTypes/custom-styles";

interface DatePeriodProps {
  /** Date period with start and end */
  datePeriod: { start: string; end?: string };
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
    />
  );
}
