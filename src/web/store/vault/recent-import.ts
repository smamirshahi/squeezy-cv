import { useSyncExternalStore } from "react";

/** What the last multi-file import (#574) did to one section of the vault */
export interface RecentSectionImport {
  added: number;
  updated: number;
}

let recent: Record<string, RecentSectionImport> = {};
const listeners = new Set<() => void>();

/** Remembers the last import so the Vault can mark what it added or updated (until the next import or an undo) */
export function setRecentImport(
  next: Record<string, RecentSectionImport>
): void {
  recent = next;
  listeners.forEach((listener) => listener());
}

export function clearRecentImport(): void {
  setRecentImport({});
}

export function useRecentImport(): Record<string, RecentSectionImport> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => recent
  );
}
