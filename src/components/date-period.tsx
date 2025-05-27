import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconWithText } from "@components/icon-with-text";
import { customColors } from "@customTypes/custom-styles";
import { useAppSelector } from "@src/store/store-helper";
import { styleSelector } from "@src/store/cv-data/cv-data-slice";

interface DatePeriodProps {
  /** Date period with start and end */
  datePeriod: { start: string; end?: string };
}

/** Text with start and end date and a calendar icon at the beginning */
export function DatePeriod({ datePeriod }: DatePeriodProps): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);

  return (
    <IconWithText
      icon={CalendarMonthIcon}
      text={`${dayjs(datePeriod.start).format(dateFormat)} - ${
        datePeriod.end ? dayjs(datePeriod.end).format(dateFormat) : "Present"
      }`}
      customTextSx={{ color: customColors.gray }}
    />
  );
}
