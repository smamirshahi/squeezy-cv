import { useSyncExternalStore } from "react";

/** The five kinds of notification, each with its own icon and colour */
export type NotificationKind =
  "success" | "info" | "warning" | "error" | "undo";

interface NotificationAction {
  label: string;
  /** Runs when the action is used; the notification closes after it */
  onClick?: () => void;
  /** Or a link inside the app */
  href?: string;
}

export interface NotificationInput {
  kind?: NotificationKind;
  text: string;
  action?: NotificationAction;
  /** AI-related messages carry the sparkle icon and the AI colour */
  isAi?: boolean;
}

export interface NotificationItem extends NotificationInput {
  id: number;
  kind: NotificationKind;
}

/** A notification goes away after this long, unless it is an error */
export const NOTIFICATION_DURATION_MS = 6000;
/** At most this many are shown; the oldest leaves when another arrives */
const MAX_NOTIFICATIONS = 3;

let items: NotificationItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: NotificationItem[]): void {
  items = next;
  listeners.forEach((listener) => listener());
}

/** Shows a notification and returns its id. Newest is last. */
export function notify(input: NotificationInput): number {
  const id = nextId++;
  const item: NotificationItem = { ...input, id, kind: input.kind ?? "info" };
  emit([...items, item].slice(-MAX_NOTIFICATIONS));
  return id;
}

export function dismissNotification(id: number): void {
  emit(items.filter((item) => item.id !== id));
}

/** Closes the newest notification (Esc). Returns false when there is none. */
export function dismissNewestNotification(): boolean {
  const newest = items[items.length - 1];
  if (!newest) {
    return false;
  }
  dismissNotification(newest.id);
  return true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotifications(): NotificationItem[] {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => items
  );
}
