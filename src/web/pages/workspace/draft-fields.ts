import { useSyncExternalStore } from "react";

/** The unapplied field edits of the item being edited, so the item list can show them as you type */
interface DraftFields {
  itemId: string;
  fields: Record<string, string>;
}

let current: DraftFields | null = null;
const listeners = new Set<() => void>();

/** Set by the item editor; null when there is no unapplied edit */
export function setDraftFields(next: DraftFields | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The unapplied edits (null when there are none); use `withDraft` to merge them into an item */
export function useDraftFields(): DraftFields | null {
  return useSyncExternalStore(subscribe, () => current);
}

/** The item with its unapplied edits shown */
export function withDraft<
  T extends { id: string; fields: Record<string, string> },
>(item: T, draft: DraftFields | null): T {
  return draft?.itemId === item.id
    ? { ...item, fields: { ...item.fields, ...draft.fields } }
    : item;
}
