const INDENT = "  ";
const BULLET = "• ";
/** Keys that name an item: shown as its heading, never as a line of its own */
const HEADING_KEYS = ["label", "title", "name"];

function isPlain(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value !== "object";
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.every(isEmpty);
  }
  return typeof value === "object"
    ? Object.values(value as object).every(isEmpty)
    : false;
}

/** `startDate` / `start_date` -> "Start date" */
function humanKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function plain(value: string | number | boolean | null): string {
  return value === null ? "" : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function indent(lines: string[], depth: number): string[] {
  return lines.map((line) =>
    line === "" ? line : INDENT.repeat(depth) + line
  );
}

/** The name an item goes by, if it has one */
function headingOf(item: Record<string, unknown>): string {
  for (const key of HEADING_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

/** `Key: value` lines of an object; technical ids and empty parts are left out */
function objectLines(
  object: Record<string, unknown>,
  skip: string[],
  heading: string
): string[] {
  const lines: string[] = [];
  const entries = Object.entries(object).flatMap(
    ([key, value]): [string, unknown][] =>
      // `fields` is how the app groups an item's own lines: shown as if they were direct
      key === "fields" && isRecord(value)
        ? Object.entries(value)
        : [[key, value]]
  );
  for (const [key, value] of entries) {
    if (key === "id" || skip.includes(key) || isEmpty(value)) {
      continue;
    }
    if (isPlain(value)) {
      const text = plain(value);
      // a line that only repeats the heading adds nothing
      if (
        heading !== "" &&
        text.trim().toLowerCase() === heading.toLowerCase()
      ) {
        continue;
      }
      const [first, ...rest] = text.split("\n");
      lines.push(`${humanKey(key)}: ${first}`);
      lines.push(...rest.map((line) => `${INDENT}${line}`));
    } else if (Array.isArray(value) && value.every(isPlain)) {
      lines.push(`${humanKey(key)}:`);
      lines.push(
        ...value
          .filter((entry) => !isEmpty(entry))
          .map((entry) => `${INDENT}${BULLET}${plain(entry)}`)
      );
    } else {
      lines.push(`${humanKey(key)}:`);
      lines.push(...indent(valueLines(value), 1));
    }
  }
  return lines;
}

/** One item of a list: a bullet with its name, its details indented beneath */
function itemLines(item: Record<string, unknown>): string[] {
  const heading = headingOf(item);
  const details = objectLines(item, [...HEADING_KEYS, "section"], heading);
  if (heading === "") {
    return details.length === 0
      ? []
      : [`${BULLET}${details[0]}`, ...indent(details.slice(1), 1)];
  }
  return [`${BULLET}${heading}`, ...indent(details, 1)];
}

/** A list of items, with the section named when it changes */
function listLines(list: unknown[]): string[] {
  const lines: string[] = [];
  let section = "";
  for (const entry of list) {
    if (isEmpty(entry)) {
      continue;
    }
    if (isPlain(entry)) {
      lines.push(`${BULLET}${plain(entry)}`);
      continue;
    }
    if (Array.isArray(entry)) {
      lines.push(...listLines(entry));
      continue;
    }
    const record = entry as Record<string, unknown>;
    const itemSection =
      typeof record.section === "string" ? record.section.trim() : "";
    if (itemSection !== "" && itemSection !== section) {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(itemSection);
      section = itemSection;
    }
    lines.push(...itemLines(record));
  }
  return lines;
}

function valueLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return listLines(value);
  }
  if (isRecord(value)) {
    // a request is mostly `items: [...]`: the list is the text, other keys are notes above it
    const { items, ...rest } = value;
    const notes = objectLines(rest, [], "");
    const list = Array.isArray(items) ? listLines(items) : [];
    return notes.length > 0 && list.length > 0
      ? [...notes, "", ...list]
      : [...notes, ...list];
  }
  return isPlain(value) && plain(value) !== "" ? [plain(value)] : [];
}

/**
 * The text a model receives, laid out for a person: JSON (how the app sends the CV) becomes
 * short headings, plain lines and bullets, without technical ids or empty parts; anything else
 * (a pasted advert) is unchanged. For display only: what is sent stays as it was.
 */
function toReadableText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return text;
  }
  try {
    return valueLines(JSON.parse(trimmed)).join("\n");
  } catch {
    return text;
  }
}

/**
 * The same layout in two parts: the main text, and the job `requirements` that some requests
 * carry first (keywords, must-haves), which are context rather than the CV and are shown apart.
 */
export function toReadableParts(text: string): {
  main: string;
  context: string;
} {
  try {
    const parsed: unknown = JSON.parse(text.trim());
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      ("requirements" in parsed || "mode" in parsed)
    ) {
      const { requirements, mode, ...rest } = parsed as Record<string, unknown>;
      // Wording requests (shorten, rephrase ...): the task is one line, empty parts are not listed
      const task = typeof mode === "string" ? [`Task: ${mode}`] : [];
      return {
        main: [...task, ...valueLines(rest)].join("\n"),
        context: isEmpty(requirements)
          ? ""
          : valueLines({ requirements }).join("\n"),
      };
    }
  } catch {
    // Not JSON: shown as it is
  }
  return { main: toReadableText(text), context: "" };
}
