import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const TEMP_NAME_BYTES = 6;

/** Runs tasks with the same key one after the other, so writes to one file never interleave */
export class KeyedQueue {
  private tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const result = previous.then(task, task);
    const tail = result.catch(() => undefined);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) {
        this.tails.delete(key);
      }
    });
    return result;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Reads and parses a JSON file. Returns undefined if the file does not exist. Throws if it is not valid JSON. */
export async function readJsonFile(filePath: string): Promise<unknown> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
  return JSON.parse(text);
}

/**
 * Saves JSON so that a crash or a full disk can never leave a half-written file:
 * the data goes to a temporary file in the same folder and is then renamed over the
 * target. Before that, a readable existing file is copied to `<file>.bak`; an
 * unreadable one is moved aside to `<file>.corrupt-<time>` instead of being lost, and
 * it never replaces the backup.
 *
 * @param isReadable decides whether the existing file is worth keeping as the backup
 */
export async function writeJsonAtomic(
  filePath: string,
  data: unknown,
  isReadable: (existing: unknown) => boolean
): Promise<void> {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  if (await fileExists(filePath)) {
    let existing: unknown;
    let isParsable = true;
    try {
      existing = await readJsonFile(filePath);
    } catch {
      isParsable = false;
    }
    if (isParsable && isReadable(existing)) {
      await fs.copyFile(filePath, `${filePath}.bak`);
    } else {
      await fs.rename(filePath, `${filePath}.corrupt-${Date.now()}`);
    }
  }

  const tempPath = `${filePath}.${randomBytes(TEMP_NAME_BYTES).toString("hex")}.tmp`;
  try {
    const handle = await fs.open(tempPath, "w");
    try {
      await handle.writeFile(JSON.stringify(data, null, 2), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

/** Saves binary data (e.g. a PDF) with the same temp-file-and-rename safety as `writeJsonAtomic` */
export async function writeBytesAtomic(
  filePath: string,
  bytes: Uint8Array
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomBytes(TEMP_NAME_BYTES).toString("hex")}.tmp`;
  try {
    const handle = await fs.open(tempPath, "w");
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}
