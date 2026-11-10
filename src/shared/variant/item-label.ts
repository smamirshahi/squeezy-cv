import { Item } from "@custom-types/vault-types";

const LABEL_FIELDS = [
  "jobTitle",
  "degree",
  "title",
  "category",
  "company",
  "institute",
  "institution",
  "text",
];
const MAX_LABEL_LENGTH = 60;

/** Shortens text to one line for lists */
export function shorten(text: string, max = MAX_LABEL_LENGTH): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

/** A short name for an item in lists, from its first filled-in field */
export function getItemLabel(item: Item, max = MAX_LABEL_LENGTH): string {
  for (const key of LABEL_FIELDS) {
    const value = item.fields[key]?.trim();
    if (value) {
      return shorten(value, max);
    }
  }
  return "(untitled)";
}

/** "Title (Mar/2022 - Present)" for list headings; dates are left out when the start date is empty */
export function datedTitle(
  title: string,
  startDate: string | undefined,
  endDate: string | undefined,
  formatDay: (day: string) => string
): string {
  const start = startDate?.trim();
  if (!start) {
    return title;
  }
  const end = endDate?.trim();
  return `${title} (${formatDay(start)} - ${end ? formatDay(end) : "Present"})`;
}
