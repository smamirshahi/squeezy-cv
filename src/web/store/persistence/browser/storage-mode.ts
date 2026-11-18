import { createLocalFetch } from "@store/persistence/browser/local-api";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { KvStore, openKvStore } from "@store/persistence/browser/idb-kv";
import {
  ensureFolderPermission,
  FolderHandle,
  isFolderStorageSupported,
  FolderKvStore,
  openFolderKvStore,
} from "@store/persistence/browser/folder-kv";
import { loadFolderHandle } from "@store/persistence/browser/folder-handle";
import { StorageError } from "@shared/storage/cv-storage";

/** True when the app was built to keep its data in the browser (`VITE_STORAGE_MODE=browser`) */
export function isBrowserMode(): boolean {
  return import.meta.env.VITE_STORAGE_MODE === "browser";
}

/** Where the data is kept this visit: the browser database, a chosen folder, or a folder that needs permission again */
export type StorageLocation =
  | { kind: "browser" }
  | { kind: "folder"; name: string }
  | { kind: "folder-locked"; name: string; handle: FolderHandle };

let localFetch: ReturnType<typeof createLocalFetch> | undefined;
let kv: KvStore | undefined;
let folderKv: FolderKvStore | undefined;
let location: StorageLocation = { kind: "browser" };

/** Where the data lives (valid after `initBrowserStorage`) */
export function storageLocation(): StorageLocation {
  return location;
}

/** A store for a folder that is not allowed yet: every use says what to do, nothing is read or written */
function lockedStore(): KvStore {
  const locked = (): Promise<never> =>
    Promise.reject(
      new StorageError(
        "corrupt",
        "The data folder is not connected. Reconnect it first."
      )
    );
  return {
    get: locked,
    put: locked,
    putKeepingPrevious: locked,
    deleteKeepingCopy: locked,
    keys: locked,
    close: () => Promise.resolve(),
  };
}

/**
 * Decides where the data lives before the app starts: a folder chosen earlier when the browser
 * still allows it, a locked folder when permission has to be asked again (needs a click, see
 * `reconnectFolder`), otherwise the browser database. The data is never silently taken from the
 * browser database while a folder is chosen: that would show old data and could overwrite the folder.
 */
export async function initBrowserStorage(): Promise<StorageLocation> {
  const handle = isFolderStorageSupported()
    ? await loadFolderHandle()
    : undefined;
  folderKv = undefined;
  if (!handle) {
    kv = openKvStore();
    location = { kind: "browser" };
  } else if (await ensureFolderPermission(handle, false)) {
    folderKv = openFolderKvStore(handle);
    kv = folderKv;
    location = { kind: "folder", name: handle.name };
  } else {
    kv = lockedStore();
    location = { kind: "folder-locked", name: handle.name, handle };
  }
  localFetch = undefined;
  return location;
}

/** The files in the data folder that were changed by something other than this page (empty in other storage) */
export async function folderChangedOutside(): Promise<string[]> {
  return (await folderKv?.changedOutside()) ?? [];
}

/** Called from a click: asks the browser to allow the remembered folder again, then reloads (`onAllowed`) */
export async function reconnectFolder(
  handle: FolderHandle,
  onAllowed: () => void = () => window.location.reload()
): Promise<boolean> {
  if (!(await ensureFolderPermission(handle, true))) {
    return false;
  }
  onAllowed();
  return true;
}

/** The fetch that answers the API from the chosen store; one instance for the whole page */
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
