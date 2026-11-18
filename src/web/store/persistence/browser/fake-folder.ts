import { FolderHandle } from "@store/persistence/browser/folder-kv";

/** A tiny in-memory stand-in for a folder from the File System Access API (for tests) */

let clock = 1_000;

function notFound(name: string): DOMException {
  return new DOMException(`${name} was not found`, "NotFoundError");
}

class FakeFile {
  readonly kind = "file";
  bytes: Uint8Array = new Uint8Array();
  modified = 0;

  constructor(readonly name: string) {}

  getFile(): Promise<{
    lastModified: number;
    text: () => Promise<string>;
    arrayBuffer: () => Promise<ArrayBuffer>;
  }> {
    const bytes = this.bytes;
    return Promise.resolve({
      lastModified: this.modified,
      text: () => Promise.resolve(new TextDecoder().decode(bytes)),
      arrayBuffer: () =>
        Promise.resolve(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer
        ),
    });
  }

  createWritable(): Promise<{
    write: (data: string | Uint8Array) => Promise<void>;
    close: () => Promise<void>;
  }> {
    let pending: Uint8Array = new Uint8Array();
    return Promise.resolve({
      write: (data) => {
        pending =
          typeof data === "string" ? new TextEncoder().encode(data) : data;
        return Promise.resolve();
      },
      close: () => {
        this.bytes = pending;
        this.modified = clock += 1;
        return Promise.resolve();
      },
    });
  }
}

export class FakeFolder {
  readonly kind = "directory";
  private readonly children = new Map<string, FakeFolder | FakeFile>();
  /** What `queryPermission` and `requestPermission` answer */
  permission: PermissionState = "granted";
  /** What `requestPermission` turns the permission into */
  onRequest: PermissionState = "granted";
  /** Makes every read or write fail, like a folder that went away */
  isBroken = false;

  constructor(readonly name: string = "data") {}

  private guard(): void {
    if (this.isBroken) {
      throw new DOMException("The folder is gone", "NotAllowedError");
    }
  }

  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FakeFolder> {
    this.guard();
    const existing = this.children.get(name);
    if (existing instanceof FakeFolder) {
      return Promise.resolve(existing);
    }
    if (existing || !options?.create) {
      return Promise.reject(notFound(name));
    }
    const created = new FakeFolder(name);
    this.children.set(name, created);
    return Promise.resolve(created);
  }

  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FakeFile> {
    this.guard();
    const existing = this.children.get(name);
    if (existing instanceof FakeFile) {
      return Promise.resolve(existing);
    }
    if (existing || !options?.create) {
      return Promise.reject(notFound(name));
    }
    const created = new FakeFile(name);
    this.children.set(name, created);
    return Promise.resolve(created);
  }

  removeEntry(name: string): Promise<void> {
    this.guard();
    if (!this.children.delete(name)) {
      return Promise.reject(notFound(name));
    }
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- same shape as the real API
  async *entries(): AsyncGenerator<[string, FakeFolder | FakeFile]> {
    this.guard();
    for (const entry of this.children) {
      yield entry;
    }
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve(this.permission);
  }

  requestPermission(): Promise<PermissionState> {
    this.permission = this.onRequest;
    return Promise.resolve(this.permission);
  }

  /** Reads a file by path, like `templates/a.json`; undefined when it is not there */
  async read(path: string): Promise<string | undefined> {
    const file = await this.find(path);
    return file ? new TextDecoder().decode(file.bytes) : undefined;
  }

  /** Writes a file by path the way another program would (the modification time moves on) */
  async write(path: string, content: string | Uint8Array): Promise<void> {
    const parts = path.split("/");
    const directory = await parts
      .slice(0, -1)
      .reduce<Promise<FakeFolder>>(
        async (parent, part) =>
          (await parent).getDirectoryHandle(part, { create: true }),
        Promise.resolve(this)
      );
    const file = await directory.getFileHandle(parts[parts.length - 1], {
      create: true,
    });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /** Every file path in the folder, sorted */
  async paths(prefix = ""): Promise<string[]> {
    const result: string[] = [];
    for await (const [name, entry] of this.entries()) {
      if (entry instanceof FakeFolder) {
        result.push(...(await entry.paths(`${prefix}${name}/`)));
      } else {
        result.push(`${prefix}${name}`);
      }
    }
    return result.sort();
  }

  private async find(path: string): Promise<FakeFile | undefined> {
    const parts = path.split("/");
    try {
      const directory = await parts
        .slice(0, -1)
        .reduce<Promise<FakeFolder>>(
          async (parent, part) => (await parent).getDirectoryHandle(part),
          Promise.resolve(this)
        );
      return await directory.getFileHandle(parts[parts.length - 1]);
    } catch {
      return undefined;
    }
  }

  /** The folder as the app's code sees it */
  asHandle(): FolderHandle {
    return this as unknown as FolderHandle;
  }
}
