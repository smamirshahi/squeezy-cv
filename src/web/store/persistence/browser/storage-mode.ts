import { createLocalFetch } from "@store/persistence/browser/local-api";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { KvStore, openKvStore } from "@store/persistence/browser/idb-kv";

/** True when the app was built to keep its data in the browser (`VITE_STORAGE_MODE=browser`) */
export function isBrowserMode(): boolean {
  return import.meta.env.VITE_STORAGE_MODE === "browser";
}

let localFetch: ReturnType<typeof createLocalFetch> | undefined;
let kv: KvStore | undefined;

/** The fetch that answers the API from IndexedDB; one instance for the whole page */
export function browserFetch(): ReturnType<typeof createLocalFetch> {
  kv ??= openKvStore();
  localFetch ??= createLocalFetch(new IdbCvStorage(kv));
  return localFetch;
}

/** Lets go of the database (before it is deleted); the next call opens it again */
export async function closeBrowserStorage(): Promise<void> {
  await kv?.close();
}

/**
 * Asks the browser not to evict our data when the disk is full. Best effort: the answer
 * depends on the browser (installing the app as a PWA helps).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
