/** What the top bar and the overflow banner say about how full the pages are */
export interface FitMetrics {
  /** How much of the allowed pages the content uses, in percent. Above 100 means it overflows. */
  usedPercent: number;

  /** Lines of text that do not fit within the page limit (0 when it fits) */
  linesOver: number;

  isOverflowing: boolean;
}

export interface FitMetricsInput {
  /** Height of the content with page-break pushes counted, px (`Pagination.totalHeight`) */
  totalHeight: number;

  /** Height of the text area of one page, px */
  pageHeight: number;

  pageLimit: number;

  /** Height of one line of body text, px */
  lineHeightPx: number;
}

/** Pure: turns the measured heights into the numbers shown to the user */
export function computeFitMetrics(input: FitMetricsInput): FitMetrics {
  const allowed = input.pageLimit * input.pageHeight;
  const overflowPx = Math.max(0, input.totalHeight - allowed);
  const linesOver =
    overflowPx > 0
      ? Math.ceil(overflowPx / Math.max(1, input.lineHeightPx))
      : 0;
  return {
    usedPercent:
      allowed > 0 ? Math.round((input.totalHeight / allowed) * 100) : 0,
    linesOver,
    isOverflowing: linesOver > 0,
  };
}
