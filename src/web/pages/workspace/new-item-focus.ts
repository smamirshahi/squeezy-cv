import { useSyncExternalStore } from "react";

/**
 * "Add new item" asks the editor of the new item to focus its first input once it opens. The
 * editor may open a moment later (the address changes first), or may already be open (the item
 * is the existing empty one), so the request waits here by id and every request is counted.
 */
let pendingItemId: string | null = null;
let requests = 0;
const listeners = new Set<() => void>();

export function requestFocusOnNewItem(itemId: string): void {
  pendingItemId = itemId;
  requests += 1;
  listeners.forEach((listener) => listener());
}

/** Changes with every request, so an open editor can react to a new one */
export function useFocusRequests(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => requests
  );
}

/** True once for the item that was asked for; the request is gone afterwards */
export function takeFocusRequest(itemId: string): boolean {
  if (pendingItemId !== itemId) {
    return false;
  }
  pendingItemId = null;
  return true;
}
