import { KvStore } from "@store/persistence/browser/idb-kv";

/**
 * The part of the File System Access API we use. `lib.dom` does not describe the permission
 * methods or `showDirectoryPicker` yet, so they are declared here.
 */
export interface FolderHandle extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
}

const JSON_KEY = /\.json(\.bak|\.deleted)?$/;
const INDENT = 2;

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

/** The folder names and the file name of a key like `applications/<id>/application.json` */
function splitKey(key: string): { dirs: string[]; file: string } {
  const parts = key.split("/");
  return { dirs: parts.slice(0, -1), file: parts[parts.length - 1] };
}

async function directoryFor(
  root: FileSystemDirectoryHandle,
  dirs: string[],
  create: boolean
): Promise<FileSystemDirectoryHandle | undefined> {
  let current = root;
  for (const name of dirs) {
    try {
      current = await current.getDirectoryHandle(name, { create });
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }
  return current;
}

/** The modification time of a file, or undefined when it is not there */
async function modifiedAt(
  root: FileSystemDirectoryHandle,
  key: string
): Promise<number | undefined> {
  const { dirs, file } = splitKey(key);
  const directory = await directoryFor(root, dirs, false);
  if (!directory) {
    return undefined;
  }
  try {
    return (await (await directory.getFileHandle(file)).getFile()).lastModified;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

async function writeFile(
  root: FileSystemDirectoryHandle,
  key: string,
  value: unknown
): Promise<void> {
  const { dirs, file } = splitKey(key);
  const directory = await directoryFor(root, dirs, true);
  const handle = await directory!.getFileHandle(file, { create: true });
  // `createWritable` writes to a swap file and replaces the real one on close
  const writable = await handle.createWritable();
  try {
    await writable.write(
      value instanceof Uint8Array
        ? (value as Uint8Array<ArrayBuffer>)
        : JSON.stringify(value, null, INDENT)
    );
  } finally {
    await writable.close();
  }
}

interface Entry {
  value: unknown;
  modified: number;
}

/** The content and modification time of a file, or undefined when it is not there */
async function readEntry(
  root: FileSystemDirectoryHandle,
  key: string
): Promise<Entry | undefined> {
  const { dirs, file } = splitKey(key);
  const directory = await directoryFor(root, dirs, false);
  if (!directory) {
    return undefined;
  }
  let handle: FileSystemFileHandle;
  try {
    handle = await directory.getFileHandle(file);
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
  const blob = await handle.getFile();
  if (!JSON_KEY.test(key)) {
    return {
      value: new Uint8Array(await blob.arrayBuffer()),
      modified: blob.lastModified,
    };
  }
  const text = await blob.text();
  try {
    return { value: JSON.parse(text), modified: blob.lastModified };
  } catch {
    // The caller treats anything that is not an object as a damaged file
    return { value: text, modified: blob.lastModified };
  }
}

async function removeFile(
  root: FileSystemDirectoryHandle,
  key: string
): Promise<void> {
  const { dirs, file } = splitKey(key);
  const directory = await directoryFor(root, dirs, false);
  try {
    await directory?.removeEntry(file);
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

async function collectKeys(
  directory: FileSystemDirectoryHandle,
  path: string,
  into: string[]
): Promise<void> {
  for await (const [name, entry] of directory.entries()) {
    if (entry.kind === "directory") {
      await collectKeys(entry, `${path}${name}/`, into);
    } else if (!name.endsWith(".tmp") && !name.startsWith(".")) {
      into.push(`${path}${name}`);
    }
  }
}

/** A `KvStore` on a folder, which can also tell when files were changed by something else */
export interface FolderKvStore extends KvStore {
  /**
   * The files this store has read or written whose content was changed (or removed) by
   * something else since, for example the sync client of Drive or Dropbox, or server mode.
   */
  changedOutside(): Promise<string[]>;
}

/** The previous versions and deleted copies are not data of their own */
function isTracked(key: string): boolean {
  return !key.endsWith(".bak") && !key.endsWith(".deleted");
}

/**
 * The same key-value store as `idb-kv.ts`, but the keys are real files in a folder the user
 * picked: `vault.json`, `templates/<id>.json`, `applications/<id>/cv.pdf` and so on, the same
 * layout as the server's `data/` folder. `<key>.bak` and `<key>.deleted` sit next to the file
 * like they do there, so server mode can open the folder and the other way round.
 */
export function openFolderKvStore(
  root: FileSystemDirectoryHandle
): FolderKvStore {
  /** The modification time each file had when this store last read or wrote it */
  const seen = new Map<string, number | undefined>();

  async function write(key: string, value: unknown): Promise<void> {
    await writeFile(root, key, value);
    if (isTracked(key)) {
      seen.set(key, await modifiedAt(root, key));
    }
  }

  async function read(key: string): Promise<Entry | undefined> {
    const entry = await readEntry(root, key);
    if (isTracked(key)) {
      seen.set(key, entry?.modified);
    }
    return entry;
  }

  return {
    get: async (key) => (await read(key))?.value,
    put: write,
    async putKeepingPrevious(key, value) {
      const existing = await read(key);
      if (existing !== undefined) {
        await write(`${key}.bak`, existing.value);
      }
      await write(key, value);
    },
    async deleteKeepingCopy(key) {
      const existing = await read(key);
      if (existing === undefined) {
        return false;
      }
      await write(`${key}.deleted`, existing.value);
      await removeFile(root, key);
      seen.set(key, undefined);
      return true;
    },
    async keys(prefix) {
      const all: string[] = [];
      await collectKeys(root, "", all);
      return all.filter((key) => key.startsWith(prefix)).sort();
    },
    async changedOutside() {
      const changed: string[] = [];
      for (const [key, before] of seen) {
        if ((await modifiedAt(root, key)) !== before) {
          changed.push(key);
        }
      }
      return changed.sort();
    },
    // A folder handle holds no connection
    close: () => Promise.resolve(),
  };
}

/** True when this browser can pick a folder (Chrome, Edge; not Safari, Firefox or phones) */
export function isFolderStorageSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Opens the browser's folder picker; undefined when the person cancels */
export async function pickFolder(): Promise<FolderHandle | undefined> {
  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker(options: {
          mode: "readwrite";
          id: string;
        }): Promise<FolderHandle>;
      }
    ).showDirectoryPicker;
    return await picker.call(window, {
      mode: "readwrite",
      id: "squeezy-cv-data",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return undefined;
    }
    throw error;
  }
}

/**
 * True when we may write to the folder. Must be called from a click when the permission has
 * to be asked again (the browser forgets it between visits).
 */
export async function ensureFolderPermission(
  handle: FolderHandle,
  mayPrompt: boolean
): Promise<boolean> {
  const options = { mode: "readwrite" } as const;
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }
  return mayPrompt && (await handle.requestPermission(options)) === "granted";
}
