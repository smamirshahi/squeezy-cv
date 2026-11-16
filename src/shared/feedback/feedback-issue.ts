import {
  FeedbackKind,
  FeedbackMood,
  FeedbackRequest,
} from "@custom-types/feedback-types";

/** The repository that receives the reports (also the target of the "open on GitHub" fallback) */
export const FEEDBACK_REPO = "smamirshahi/squeezy-cv";

const FEEDBACK_LABELS: Record<FeedbackKind, string> = {
  feedback: "Feedback",
  bug: "Bug",
  feature: "Feature",
};

const MOOD_LABELS: Record<FeedbackMood, string> = {
  happy: "Happy",
  neutral: "No feeling",
  sad: "Sad",
};

const CUSTOMER_LABEL = "customer-created";
const MAX_TITLE_SUMMARY = 70;

export interface FeedbackIssue {
  title: string;
  body: string;
  labels: string[];
}

/** The first line of the note, cut to a sensible length, for the title */
function summaryOf(note: string): string {
  const firstLine = note.trim().split(/\r?\n/)[0] ?? "";
  return firstLine.length > MAX_TITLE_SUMMARY
    ? `${firstLine.slice(0, MAX_TITLE_SUMMARY - 1).trimEnd()}…`
    : firstLine;
}

/** The issue made from a report: only what the person wrote, never any CV data */
export function buildFeedbackIssue(report: FeedbackRequest): FeedbackIssue {
  const note = report.note.trim();
  const mood =
    report.kind === "feedback" && report.mood
      ? `**Mood:** ${MOOD_LABELS[report.mood]}\n\n`
      : "";
  const info = report.appInfo?.trim();
  const appInfo = info ? `\n\n---\n**App info:** ${info}` : "";
  return {
    title: `[${FEEDBACK_LABELS[report.kind]}] ${summaryOf(note)}`,
    body: `${mood}${note}${appInfo}`,
    labels: [CUSTOMER_LABEL, report.kind],
  };
}

/** A prefilled "new issue" page on GitHub, for when the report cannot be sent from here */
export function buildNewIssueUrl(report: FeedbackRequest): string {
  const { title, body, labels } = buildFeedbackIssue(report);
  const query = new URLSearchParams({ title, body, labels: labels.join(",") });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${query.toString()}`;
}

/** Browsers in the order to test (Edge and Opera also say "Chrome", Chrome also says "Safari") */
const BROWSERS: [name: string, pattern: RegExp][] = [
  ["Edge", /Edg(?:e|A|iOS)?\/(\d+)/],
  ["Opera", /OPR\/(\d+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
  ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
  ["Safari", /Version\/(\d+).*Safari/],
];

const SYSTEMS: [name: string, pattern: RegExp][] = [
  ["iOS", /iPhone|iPad|iPod/],
  ["Android", /Android/],
  ["Windows", /Windows/],
  ["macOS", /Mac OS X|Macintosh/],
  ["Linux", /Linux|X11/],
];

/** "Chrome 157 on macOS" from the long user agent text */
function describeBrowser(userAgent: string): string {
  const browser = BROWSERS.map(
    ([name, pattern]) => [name, pattern.exec(userAgent)?.[1]] as const
  ).find(([, version]) => version !== undefined);
  const system = SYSTEMS.find(([, pattern]) => pattern.test(userAgent))?.[0];
  const name = browser ? `${browser[0]} ${browser[1]}` : "Unknown browser";
  return system ? `${name} on ${system}` : name;
}

/** The one line "Include app info" adds. It holds no CV data: only the version, the browser and which page was open. */
export function buildAppInfo(info: {
  version: string;
  userAgent: string;
  page: string;
}): string {
  return `Squeezy CV ${info.version} · ${describeBrowser(info.userAgent)} · ${info.page} page`;
}
