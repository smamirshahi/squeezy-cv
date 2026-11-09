/** How the Jobs tool shows a job: the CV page, or the settings of the job */
type JobsView = "page" | "settings" | "details";

/** The pages of the Templates tool */
export type TemplatesTab = "templates" | "design";

/** Where the user is. The address is the source of truth; see `parseRoute` / `formatRoute`. */
export type Route =
  | { kind: "vault"; sectionId?: string; itemId?: string }
  | { kind: "jobs"; jobId?: string; view: JobsView }
  | { kind: "templates"; tab: TemplatesTab; templateId?: string }
  | { kind: "tailor" }
  | { kind: "chat"; jobId?: string }
  | { kind: "ai" }
  | { kind: "applications"; search: string }
  | { kind: "application"; id: string }
  | { kind: "print"; jobId: string }
  | { kind: "notFound"; path: string };

const TEMPLATE_TABS: TemplatesTab[] = ["templates", "design"];

/** The routes that are pages of the workspace (they share the rail and the top bar) */
export type WorkspaceRoute = Extract<
  Route,
  { kind: "vault" | "jobs" | "templates" | "tailor" | "chat" | "ai" }
>;

/** Everything that is drawn inside the workspace shell: the tools and the applications pages */
export type ShellRoute =
  WorkspaceRoute | Extract<Route, { kind: "applications" | "application" }>;

export function isShellRoute(route: Route): route is ShellRoute {
  return (
    isWorkspaceRoute(route) ||
    route.kind === "applications" ||
    route.kind === "application"
  );
}

export function isWorkspaceRoute(route: Route): route is WorkspaceRoute {
  return (
    route.kind === "vault" ||
    route.kind === "jobs" ||
    route.kind === "templates" ||
    route.kind === "tailor" ||
    route.kind === "chat" ||
    route.kind === "ai"
  );
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function jobsViewOf(value: string | null): JobsView {
  return value === "settings" || value === "details" ? value : "page";
}

/** Turns an address (`window.location.pathname` and `.search`) into a route */
export function parseRoute(pathname: string, search = ""): Route {
  const segments = pathname.split("/").filter((s) => s !== "");
  const [first, second, third, ...rest] = segments.map(decode);
  const params = new URLSearchParams(search);
  const notFound: Route = { kind: "notFound", path: pathname };

  switch (first) {
    case undefined:
      // "/" is the Jobs tool; the old query addresses are mapped by `legacyRedirect`
      return { kind: "jobs", view: "page" };
    case "vault":
      return rest.length > 0
        ? notFound
        : { kind: "vault", sectionId: second, itemId: third };
    case "jobs":
      return third !== undefined
        ? notFound
        : {
            kind: "jobs",
            jobId: second,
            view: jobsViewOf(params.get("view")),
          };
    case "templates": {
      // `/templates`, `/templates/<tab>` (no template named yet) or `/templates/<id>/design`
      const tab = second ?? "templates";
      if (third === undefined && TEMPLATE_TABS.some((t) => t === tab)) {
        return { kind: "templates", tab: tab as TemplatesTab };
      }
      return second !== undefined && third === "design" && rest.length === 0
        ? { kind: "templates", tab: third, templateId: second }
        : notFound;
    }
    case "tailor":
      return second === undefined ? { kind: "tailor" } : notFound;
    case "chat":
      return third === undefined ? { kind: "chat", jobId: second } : notFound;
    case "settings":
    case "ai":
      return second === undefined ? { kind: "ai" } : notFound;
    case "applications":
      if (third !== undefined) {
        return notFound;
      }
      return second === undefined
        ? { kind: "applications", search }
        : { kind: "application", id: second };
    case "print":
      return second !== undefined && third === undefined
        ? { kind: "print", jobId: second }
        : notFound;
    default:
      return notFound;
  }
}

function segment(...parts: (string | undefined)[]): string {
  const used: string[] = [];
  for (const part of parts) {
    if (part === undefined || part === "") {
      break;
    }
    used.push(encodeURIComponent(part));
  }
  return used.length === 0 ? "" : `/${used.join("/")}`;
}

/** The address (path and query) of a route; the inverse of `parseRoute` */
export function formatRoute(route: Route): string {
  switch (route.kind) {
    case "vault":
      return `/vault${segment(route.sectionId, route.sectionId ? route.itemId : undefined)}`;
    case "jobs":
      return `/jobs${segment(route.jobId)}${route.view === "page" ? "" : `?view=${route.view}`}`;
    case "templates":
      if (route.tab === "templates") {
        return "/templates";
      }
      return route.templateId
        ? `/templates/${encodeURIComponent(route.templateId)}/${route.tab}`
        : `/templates/${route.tab}`;
    case "tailor":
      return "/tailor";
    case "chat":
      return `/chat${segment(route.jobId)}`;
    case "ai":
      return "/settings";
    case "applications":
      return `/applications${route.search}`;
    case "application":
      return `/applications/${encodeURIComponent(route.id)}`;
    case "print":
      return `/print/${encodeURIComponent(route.jobId)}`;
    case "notFound":
      return route.path;
  }
}

/**
 * The new address for an old one (`/?applications&status=offer`, `/?application=<id>`,
 * `/?print=<id>`, and `/` itself), or null when the address is already a current one.
 */
export function legacyRedirect(
  pathname: string,
  search: string
): string | null {
  if (pathname !== "/") {
    return null;
  }
  const params = new URLSearchParams(search);
  const printJobId = params.get("print");
  if (printJobId) {
    return formatRoute({ kind: "print", jobId: printJobId });
  }
  const applicationId = params.get("application");
  if (applicationId) {
    return formatRoute({ kind: "application", id: applicationId });
  }
  if (params.has("applications")) {
    params.delete("applications");
    const rest = params.toString();
    return `/applications${rest === "" ? "" : `?${rest}`}`;
  }
  return "/jobs";
}
