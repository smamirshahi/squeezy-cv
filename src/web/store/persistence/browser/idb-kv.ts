/**
 * A tiny key-value store on IndexedDB: one object store, string keys like `templates/<id>.json`,
 * values are anything the structured clone algorithm copies (parsed JSON, bytes). It plays the
 * part of the `data/` folder in browser mode.
 */
export interface KvStore {
  get(key: string): Promise<unknown>;
  /** Writes `value` at `key`; the previous value moves to `<key>.bak` in the same transaction */
  putKeepingPrevious(key: string, value: unknown): Promise<void>;
  /** Writes without keeping a previous version (used for the `.bak` and the PDF bytes) */
  put(key: string, value: unknown): Promise<void>;
  /** Moves the value to `<key>.deleted` and removes the key. False when there was nothing. */
  deleteKeepingCopy(key: string): Promise<boolean>;
  /** The keys that start with `prefix`, sorted */
  keys(prefix: string): Promise<string[]>;
  /** Closes the connection (before the database is deleted) */
  close(): Promise<void>;
}

const DB_NAME = "squeezy-cv";
const DB_VERSION = 1;
const STORE = "files";
/** The highest character, so `prefix` .. `prefix + HIGH` covers every key with that prefix */
const HIGH = "￿";

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      // Another tab that deletes the database may do so: let go of it
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("The browser database is blocked by another tab."));
  });
}

/** Thrown by `deleteKvStore` when another open tab still holds the database */
export class DatabaseBlockedError extends Error {}

/** Deletes the whole database (close its `KvStore` first) */
export function deleteKvStore(name: string = DB_NAME): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new DatabaseBlockedError(
          "Another Squeezy CV tab is still open. Close the other tabs and try again."
        )
      );
  });
}

export function openKvStore(name: string = DB_NAME): KvStore {
  let connection: Promise<IDBDatabase> | undefined;
  const db = (): Promise<IDBDatabase> => (connection ??= open(name));

  return {
    async get(key) {
      const transaction = (await db()).transaction(STORE, "readonly");
      return done(transaction.objectStore(STORE).get(key));
    },
    async put(key, value) {
      const transaction = (await db()).transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(value, key);
      await finished(transaction);
    },
    async putKeepingPrevious(key, value) {
      const transaction = (await db()).transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const existing = await done(store.get(key));
      if (existing !== undefined) {
        store.put(existing, `${key}.bak`);
      }
      store.put(value, key);
      await finished(transaction);
    },
    async deleteKeepingCopy(key) {
      const transaction = (await db()).transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const existing = await done(store.get(key));
      if (existing === undefined) {
        return false;
      }
      store.put(existing, `${key}.deleted`);
      store.delete(key);
      await finished(transaction);
      return true;
    },
    async keys(prefix) {
      const transaction = (await db()).transaction(STORE, "readonly");
      const found = await done(
        transaction
          .objectStore(STORE)
          .getAllKeys(IDBKeyRange.bound(prefix, prefix + HIGH))
      );
      return found.map(String).sort();
    },
    async close() {
      if (connection) {
        (await connection).close();
        connection = undefined;
      }
    },
  };
}
