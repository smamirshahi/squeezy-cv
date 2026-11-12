/**
 * The search and filters of the applications list, kept for the session so that "All
 * applications" on an application's page shows the same list again.
 */
const KEY = "cv-builder-applications-search";

/** `query` is what the address has after the path, such as "?q=acme" (or "") */
export function rememberListSearch(query: string): void {
  try {
    sessionStorage.setItem(KEY, query);
  } catch {
    // Blocked storage: the list then simply starts unfiltered
  }
}

export function recallListSearch(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
