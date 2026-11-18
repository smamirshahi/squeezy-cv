// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { FakeFolder } from "@store/persistence/browser/fake-folder";
import {
  browserFetch,
  folderChangedOutside,
  initBrowserStorage,
  isBrowserMode,
  reconnectFolder,
  storageLocation,
} from "@store/persistence/browser/storage-mode";

let remembered: FakeFolder | undefined;
vi.mock("@store/persistence/browser/folder-handle", () => ({
  loadFolderHandle: () => Promise.resolve(remembered),
}));

const file = migrateCvFile(sample);

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  remembered = undefined;
  Object.defineProperty(window, "showDirectoryPicker", {
    value: vi.fn(),
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(window, "showDirectoryPicker");
});

async function saveVaultThroughApi(): Promise<Response> {
  return browserFetch()("/api/vault", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  });
}

describe("browser mode switch", () => {
  it("follows VITE_STORAGE_MODE", () => {
    expect(isBrowserMode()).toBe(false);
    vi.stubEnv("VITE_STORAGE_MODE", "browser");
    expect(isBrowserMode()).toBe(true);
  });
});

describe("where the data lives", () => {
  it("is the browser database when no folder was chosen", async () => {
    expect(await initBrowserStorage()).toEqual({ kind: "browser" });
    expect(storageLocation()).toEqual({ kind: "browser" });
    expect(await folderChangedOutside()).toEqual([]);
  });

  it("is the browser database when the browser cannot pick folders, even if a handle is remembered", async () => {
    Reflect.deleteProperty(window, "showDirectoryPicker");
    remembered = new FakeFolder("Dropbox");
    expect(await initBrowserStorage()).toEqual({ kind: "browser" });
  });

  it("is the folder when it was chosen and is still allowed", async () => {
    remembered = new FakeFolder("Dropbox");
    expect(await initBrowserStorage()).toEqual({
      kind: "folder",
      name: "Dropbox",
    });
  });

  it("saves through the API into the folder's files, not the browser database", async () => {
    remembered = new FakeFolder("Dropbox");
    await initBrowserStorage();
    expect((await saveVaultThroughApi()).ok).toBe(true);
    expect(await remembered.paths()).toContain("vault.json");
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(
      "squeezy-cv"
    );
  });

  it("is a locked folder when the browser wants permission again", async () => {
    const folder = new FakeFolder("Dropbox");
    folder.permission = "prompt";
    remembered = folder;
    const location = await initBrowserStorage();
    expect(location).toMatchObject({ kind: "folder-locked", name: "Dropbox" });
  });

  it("neither reads nor writes anything while the folder is locked, and says why", async () => {
    const folder = new FakeFolder("Dropbox");
    folder.permission = "prompt";
    remembered = folder;
    await initBrowserStorage();
    const response = await saveVaultThroughApi();
    expect(response.ok).toBe(false);
    expect(await folder.paths()).toEqual([]);
    expect(JSON.stringify(await response.json())).toContain(
      "folder is not connected"
    );
    expect(await (await browserFetch()("/api/vault")).ok).toBe(false);
    // The browser database was not touched either
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(
      "squeezy-cv"
    );
  });

  it("forgets an earlier folder when it starts again without one", async () => {
    remembered = new FakeFolder("Dropbox");
    await initBrowserStorage();
    remembered = undefined;
    await initBrowserStorage();
    expect(storageLocation()).toEqual({ kind: "browser" });
    expect(await folderChangedOutside()).toEqual([]);
  });
});

describe("changes made outside", () => {
  it("reports files that something else changed in the folder", async () => {
    remembered = new FakeFolder("Dropbox");
    await initBrowserStorage();
    await saveVaultThroughApi();
    expect(await folderChangedOutside()).toEqual([]);
    await remembered.write("vault.json", '{"changed":true}');
    expect(await folderChangedOutside()).toEqual(["vault.json"]);
  });
});

describe("reconnecting a folder", () => {
  it("reloads when the person allows it", async () => {
    const folder = new FakeFolder();
    folder.permission = "prompt";
    const onAllowed = vi.fn();
    expect(await reconnectFolder(folder.asHandle(), onAllowed)).toBe(true);
    expect(onAllowed).toHaveBeenCalledOnce();
  });

  it("does nothing when the person refuses", async () => {
    const folder = new FakeFolder();
    folder.permission = "prompt";
    folder.onRequest = "denied";
    const onAllowed = vi.fn();
    expect(await reconnectFolder(folder.asHandle(), onAllowed)).toBe(false);
    expect(onAllowed).not.toHaveBeenCalled();
  });
});
