const INDENT = "  ";

function isPlain(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value !== "object";
}

function plain(value: string | number | boolean | null): string {
  return value === null ? "-" : String(value);
}

/** `key: value` lines for an object, nested values indented below their key */
function objectLines(object: Record<string, unknown>, depth: number): string[] {
  const pad = INDENT.repeat(depth);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(object)) {
    if (isPlain(value)) {
      const [first, ...rest] = plain(value).split("\n");
      lines.push(`${pad}${key}: ${first}`);
      lines.push(...rest.map((line) => `${pad}${INDENT}${line}`));
    } else if (
      Array.isArray(value)
        ? value.length === 0
        : Object.keys(value as object).length === 0
    ) {
      lines.push(`${pad}${key}: (none)`);
    } else {
      lines.push(`${pad}${key}:`, ...valueLines(value, depth + 1));
    }
  }
  return lines;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return typeof value === "object" && value !== null
    ? Object.keys(value).length === 0
    : false;
}

function valueLines(value: unknown, depth: number): string[] {
  const pad = INDENT.repeat(depth);
  if (Array.isArray(value)) {
    return value.flatMap((entry: unknown) => {
      if (isPlain(entry)) {
        return [`${pad}- ${plain(entry)}`];
      }
      // An object in a list starts on the marker's line: "- id: i2" then its other fields
      const lines = valueLines(entry, depth + 1);
      return [`${pad}- ${(lines[0] ?? "").trimStart()}`, ...lines.slice(1)];
    });
  }
  if (isPlain(value)) {
    return [`${pad}${plain(value)}`];
  }
  return objectLines(value as Record<string, unknown>, depth);
}

/**
 * The text a model receives, laid out for a person: JSON (how the app sends the CV) becomes an
 * indented outline of `label: value` lines and `-` lists; anything else (a pasted advert) is
 * unchanged. For display only: what is sent stays as it was.
 */
function toReadableText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return text;
  }
  try {
    return valueLines(JSON.parse(trimmed), 0).join("\n");
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
      const shown = Object.fromEntries(
        Object.entries(rest).filter(([, value]) => !isEmpty(value))
      );
      const task = typeof mode === "string" ? [`Task: ${mode}`] : [];
      return {
        main: [...task, ...valueLines(shown, 0)].join("\n"),
        context: isEmpty(requirements)
          ? ""
          : valueLines({ requirements }, 0).join("\n"),
      };
    }
  } catch {
    // Not JSON: shown as it is
  }
  return { main: toReadableText(text), context: "" };
}
