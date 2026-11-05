export type LinkKind = "linkedin" | "github" | "generic";

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
  } catch {
    return undefined;
  }
}

function hostWithoutWww(parsed: URL): string {
  return parsed.hostname.replace(/^www\./i, "").toLowerCase();
}

/** Decides which icon a link gets, from its host */
export function getLinkKind(url: string): LinkKind {
  const parsed = parseUrl(url);
  if (!parsed) {
    return "generic";
  }
  const host = hostWithoutWww(parsed);
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    return "linkedin";
  }
  if (host === "github.com") {
    return "github";
  }
  return "generic";
}

/**
 * The text shown on the CV for a link. Full: the URL as written. Short: the last path
 * segment (e.g. the profile id), or the host when there is no path.
 */
export function getLinkDisplayText(
  url: string,
  shouldShowFull: boolean
): string {
  if (shouldShowFull) {
    return url;
  }
  const parsed = parseUrl(url);
  if (!parsed) {
    return url;
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments.length > 0
    ? segments[segments.length - 1]
    : hostWithoutWww(parsed);
}
