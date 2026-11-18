import { openKvStore } from "@store/persistence/browser/idb-kv";
import {
  FolderHandle,
  openFolderKvStore,
} from "@store/persistence/browser/folder-kv";
import {
  forgetFolderHandle,
  saveFolderHandle,
} from "@store/persistence/browser/folder-handle";

/** What to do with a folder that already holds Squeezy CV data */
export type FolderChoice = "use-folder" | "overwrite-folder";

/** True when the folder already has a CV, a template, a job or an application in it */
export async function folderHasData(handle: FolderHandle): Promise<boolean> {
  const keys = await openFolderKvStore(handle).keys("");
  return keys.some((key) => /(^vault\.json$)|(\/[^/]+\.json$)/.test(key));
}

/** Copies everything in the browser database into the folder (files with the same name are replaced) */
async function copyBrowserDataToFolder(handle: FolderHandle): Promise<void> {
  const browser = openKvStore();
  const folder = openFolderKvStore(handle);
  try {
    for (const key of await browser.keys("")) {
      await folder.put(key, await browser.get(key));
    }
  } finally {
    await browser.close();
  }
}

/**
 * Starts keeping the data in the folder. An empty folder gets the current data; a folder with
 * data needs a choice: `use-folder` leaves the folder as it is (the browser copy is kept
 * untouched, not deleted), `overwrite-folder` replaces files with the browser data. Nothing is
 * merged. The caller reloads the page afterwards so the app reads from the folder.
 */
export async function connectFolder(
  handle: FolderHandle,
  choice: FolderChoice | undefined
): Promise<void> {
  if (choice !== "use-folder") {
    await copyBrowserDataToFolder(handle);
  }
  await saveFolderHandle(handle);
}

/** Goes back to the browser database. The files in the folder stay where they are. */
export async function disconnectFolder(): Promise<void> {
  await forgetFolderHandle();
}
