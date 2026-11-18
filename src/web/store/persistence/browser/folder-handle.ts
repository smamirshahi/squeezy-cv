import { FolderHandle } from "@store/persistence/browser/folder-kv";

/**
 * The chosen folder's handle is kept in its own tiny IndexedDB database (a handle can be
 * stored there, not in localStorage). It is separate from the data database so that a folder
 * choice survives nothing else being touched, and so "Delete all my data" can remove both.
 */
const HANDLE_DB_NAME = "squeezy-cv-folder";
const STORE = "handle";
const KEY = "folder";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The folder the person chose earlier, if any (never throws: no database means no folder) */
export async function loadFolderHandle(): Promise<FolderHandle | undefined> {
  try {
    return (await run("readonly", (store) => store.get(KEY))) as
      FolderHandle | undefined;
  } catch {
    return undefined;
  }
}

export async function saveFolderHandle(handle: FolderHandle): Promise<void> {
  await run("readwrite", (store) => store.put(handle, KEY));
}

export async function forgetFolderHandle(): Promise<void> {
  await run("readwrite", (store) => store.delete(KEY));
}
