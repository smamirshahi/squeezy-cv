import { closeBrowserStorage } from "@store/persistence/browser/storage-mode";
import { deleteKvStore } from "@store/persistence/browser/idb-kv";

let isDeleting = false;

/** True while everything is being deleted: the page then reloads without asking about unsaved changes */
export function isDeletingAllData(): boolean {
  return isDeleting;
}

/** Removes the service workers and their caches (the app then needs the network again) */
async function removeOfflineCopy(): Promise<void> {
  const registrations =
    (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
  await Promise.all(
    registrations.map((registration) => registration.unregister())
  );
  const names = (await globalThis.caches?.keys?.()) ?? [];
  await Promise.all(names.map((name) => globalThis.caches.delete(name)));
}

/**
 * Permanently deletes everything Squeezy CV keeps in this browser: the database (CV, templates,
 * jobs, applications with their PDFs and the previous versions), localStorage and sessionStorage
 * (settings, AI keys and choices, drafts), and the service worker with its caches. Throws a
 * readable error when another open tab blocks the database; nothing else is removed then.
 */
export async function deleteAllBrowserData(): Promise<void> {
  isDeleting = true;
  try {
    await closeBrowserStorage();
    await deleteKvStore();
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Storage may be blocked; then there is nothing of ours in it either
    }
    await removeOfflineCopy();
  } catch (error) {
    isDeleting = false;
    throw error;
  }
}
