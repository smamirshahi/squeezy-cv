import dayjs from "dayjs";
import { CalendarMonthOutlined as CalendarMonthIcon } from "@components/ui/icons";
import { IconWithText } from "@components/icon-with-text";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";

interface DatePeriodProps {
  /** Date period with start and end */
  datePeriod: { start: string; end?: string };
}

/** Text with start and end date and a calendar icon at the beginning */
export function DatePeriod({ datePeriod }: DatePeriodProps): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);

  // No start date means the dates are not shown (e.g. a job that hides them): never "Present" alone
  if (!datePeriod.start) {
    return <></>;
  }

  return (
    <IconWithText
      variant="bodySm"
      icon={CalendarMonthIcon}
      text={`${dayjs(datePeriod.start).format(dateFormat)} - ${
        datePeriod.end ? dayjs(datePeriod.end).format(dateFormat) : "Present"
      }`}
    />
  );
}
