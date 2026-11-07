import {
  MouseEvent,
  useEffect,
  useId,
  useMemo,
  useSyncExternalStore,
} from "react";
import { Route, formatRoute, parseRoute } from "@shared/routing/routes";

const NAVIGATE_EVENT = "cv-navigate";

const LEAVE_MESSAGE =
  "You have changes that are not applied yet. Leave this page and lose them?";

/** Editors with unapplied drafts (see `useUnappliedDraft`), by id */
const dirtyDrafts = new Set<string>();

/** The address the user is on, so a cancelled Back can return to it */
let currentUrl = "";

function readUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function canLeave(): boolean {
  return dirtyDrafts.size === 0 || window.confirm(LEAVE_MESSAGE);
}

interface NavigateOptions {
  /** Replace the current history entry instead of adding one */
  replace?: boolean;
}

/**
 * Goes to a route inside the app (no page load). Asks first when an editor holds
 * unapplied changes. Returns false when the user chose to stay.
 */
export function navigate(
  to: Route | string,
  options: NavigateOptions = {}
): boolean {
  const url = typeof to === "string" ? to : formatRoute(to);
  if (url === readUrl()) {
    return true;
  }
  if (!options.replace && !canLeave()) {
    return false;
  }
  if (options.replace) {
    window.history.replaceState(null, "", url);
  } else {
    window.history.pushState(null, "", url);
  }
  currentUrl = readUrl();
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  return true;
}

/**
 * The click handler of a link that points inside the app: a plain click navigates
 * without reloading; middle click, Ctrl/Cmd/Shift click and "open in new tab" keep their
 * normal browser behaviour because the element is a real link with an `href`.
 */
export function onAppLinkClick(
  event: MouseEvent<HTMLElement>,
  to: Route | string
): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  navigate(to);
}

function subscribe(listener: () => void): () => void {
  function onPopState(): void {
    // Back/Forward already changed the address: put it back if the user wants to stay
    if (currentUrl !== "" && !canLeave()) {
      window.history.pushState(null, "", currentUrl);
      return;
    }
    currentUrl = readUrl();
    listener();
  }
  currentUrl = readUrl();
  window.addEventListener("popstate", onPopState);
  window.addEventListener(NAVIGATE_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener(NAVIGATE_EVENT, listener);
  };
}

/** The current address as text; the route is made from it */
function useUrl(): string {
  return useSyncExternalStore(subscribe, readUrl, () => "/");
}

/** The route of the current address; updates on navigation, Back and Forward */
export function useRoute(): Route {
  const url = useUrl();
  return useMemo(() => {
    const [path, ...query] = url.split("?");
    return parseRoute(path, query.length > 0 ? `?${query.join("?")}` : "");
  }, [url]);
}

/**
 * Tell the router that an editor holds changes it has not applied: leaving through a
 * link or Back asks first. Pass true while there is something to lose.
 */
export function useUnappliedDraft(isDirty: boolean): void {
  const id = useId();
  useEffect(() => {
    if (isDirty) {
      dirtyDrafts.add(id);
    } else {
      dirtyDrafts.delete(id);
    }
    return () => {
      dirtyDrafts.delete(id);
    };
  }, [id, isDirty]);
}
