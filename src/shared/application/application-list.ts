import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  ApplicationSummary,
} from "@custom-types/application-types";
import { isNoReply } from "@shared/application/application-utils";

export type SortKey = "appliedAt" | "company";
type SortDirection = "asc" | "desc";

export interface ListView {
  /** Matches company, role, job name or template name, ignoring case */
  query: string;

  /** Only this status, only those with no reply ("noReply", needs `today`), or all */
  status: ApplicationStatus | "all" | "noReply";
  sortKey: SortKey;
  sortDirection: SortDirection;
}

/** Newest first, everything shown */
export const DEFAULT_LIST_VIEW: ListView = {
  query: "",
  status: "all",
  sortKey: "appliedAt",
  sortDirection: "desc",
};

function compare(
  first: ApplicationSummary,
  second: ApplicationSummary,
  key: SortKey
): number {
  if (key === "company") {
    return first.company.localeCompare(second.company, "en", {
      sensitivity: "base",
    });
  }
  return first.appliedAt.localeCompare(second.appliedAt);
}

/** Search, status filter and sort. Damaged entries stay visible (searching cannot hide a problem). */
export function arrangeApplications(
  applications: ApplicationSummary[],
  view: ListView,
  today?: string
): ApplicationSummary[] {
  const query = view.query.trim().toLowerCase();
  const shown = applications.filter((application) => {
    if (application.isCorrupt) {
      return true;
    }
    if (view.status === "noReply") {
      if (today === undefined || !isNoReply(application, today)) {
        return false;
      }
    } else if (view.status !== "all" && application.status !== view.status) {
      return false;
    }
    return (
      query === "" ||
      application.company.toLowerCase().includes(query) ||
      application.role.toLowerCase().includes(query) ||
      application.jobName.toLowerCase().includes(query) ||
      application.templateName.toLowerCase().includes(query)
    );
  });
  const sign = view.sortDirection === "asc" ? 1 : -1;
  return shown.sort((first, second) => {
    if (first.isCorrupt !== second.isCorrupt) {
      return first.isCorrupt ? 1 : -1;
    }
    // Ties (e.g. the same day) fall back to the id, so the order never jumps around
    return (
      sign * compare(first, second, view.sortKey) ||
      sign * first.id.localeCompare(second.id)
    );
  });
}

export function countByStatus(
  applications: ApplicationSummary[]
): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, 0])
  ) as Record<ApplicationStatus, number>;
  for (const application of applications) {
    if (!application.isCorrupt) {
      counts[application.status] += 1;
    }
  }
  return counts;
}

/** How many applications are still "Applied" after a long quiet time */
export function countNoReply(
  applications: ApplicationSummary[],
  today: string
): number {
  return applications.filter(
    (application) => !application.isCorrupt && isNoReply(application, today)
  ).length;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** e.g. "12 applications: 5 waiting, 3 interviews, 4 rejected" */
export function summariseApplications(
  applications: ApplicationSummary[],
  today: string
): string {
  const readable = applications.filter((application) => !application.isCorrupt);
  if (readable.length === 0) {
    return "No applications yet";
  }
  const counts = countByStatus(readable);
  const quiet = readable.filter((application) =>
    isNoReply(application, today)
  ).length;
  const parts: [number, string][] = [
    [counts.applied, "waiting"],
    [counts.interview, counts.interview === 1 ? "interview" : "interviews"],
    [counts.offer, counts.offer === 1 ? "offer" : "offers"],
    [counts.accepted, "accepted"],
    [counts.rejected, "rejected"],
    [counts.withdrawn, "withdrawn"],
  ];
  const text = parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(", ");
  const noReply = quiet > 0 ? ` (${quiet} with no reply)` : "";
  return `${plural(readable.length, "application", "applications")}: ${text}${noReply}`;
}

/** The list's state as a query string, so the address keeps the search and filters */
export function viewToQuery(view: ListView): string {
  const params = new URLSearchParams();
  if (view.query.trim() !== "") {
    params.set("q", view.query.trim());
  }
  if (view.status !== "all") {
    params.set("status", view.status);
  }
  if (
    view.sortKey !== DEFAULT_LIST_VIEW.sortKey ||
    view.sortDirection !== DEFAULT_LIST_VIEW.sortDirection
  ) {
    params.set("sort", view.sortKey);
    params.set("dir", view.sortDirection);
  }
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

export function queryToView(search: string): ListView {
  const params = new URLSearchParams(search);
  const status = params.get("status");
  const sort = params.get("sort");
  const direction = params.get("dir");
  return {
    query: params.get("q") ?? "",
    status:
      status === "noReply"
        ? "noReply"
        : (APPLICATION_STATUSES.find((s) => s === status) ?? "all"),
    sortKey: sort === "company" || sort === "appliedAt" ? sort : "appliedAt",
    sortDirection:
      direction === "asc" || direction === "desc" ? direction : "desc",
  };
}
