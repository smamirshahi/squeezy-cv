// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  connectFolder,
  disconnectFolder,
  folderHasData,
} from "@store/persistence/browser/connect-folder";
import { FakeFolder } from "@store/persistence/browser/fake-folder";
import {
  forgetFolderHandle,
  loadFolderHandle,
} from "@store/persistence/browser/folder-handle";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { openKvStore } from "@store/persistence/browser/idb-kv";

vi.mock("@store/persistence/browser/folder-handle", () => {
  // The real database cannot copy the fake folder (it has functions), so remember it in memory
  let saved: unknown;
  return {
    saveFolderHandle: (handle: unknown) => {
      saved = handle;
      return Promise.resolve();
    },
    loadFolderHandle: () => Promise.resolve(saved),
    forgetFolderHandle: () => {
      saved = undefined;
      return Promise.resolve();
    },
  };
});

const file = migrateCvFile(sample);

beforeEach(async () => {
  // A fresh, empty browser database for every test
  globalThis.indexedDB = new IDBFactory();
  await forgetFolderHandle();
});

async function browserHasVault(): Promise<IdbCvStorage> {
  const storage = new IdbCvStorage(openKvStore());
  await storage.saveVault(file);
  return storage;
}

describe("does the folder already have data", () => {
  it("is no for an empty folder", async () => {
    expect(await folderHasData(new FakeFolder().asHandle())).toBe(false);
  });

  it("is no for a folder with other files or only copies", async () => {
    const folder = new FakeFolder();
    await folder.write("notes.txt", "hello");
    await folder.write("vault.json.bak", "{}");
    await folder.write("jobs/a.json.deleted", "{}");
    expect(await folderHasData(folder.asHandle())).toBe(false);
  });

  it("is yes with a CV, or with a template, job or application", async () => {
    for (const path of [
      "vault.json",
      "templates/a.json",
      "jobs/a.json",
      "applications/x/application.json",
    ]) {
      const folder = new FakeFolder();
      await folder.write(path, "{}");
      expect(await folderHasData(folder.asHandle())).toBe(true);
    }
  });
});

describe("start keeping the data in a folder", () => {
  it("copies the browser's data into an empty folder and remembers the folder", async () => {
    await browserHasVault();
    const folder = new FakeFolder("Dropbox");
    await connectFolder(folder.asHandle(), undefined);
    expect(await folder.paths()).toContain("vault.json");
    expect(JSON.parse((await folder.read("vault.json")) ?? "")).toHaveProperty(
      "vault"
    );
    expect(await loadFolderHandle()).toBe(folder);
  });

  it("copies everything, also the previous versions and PDFs", async () => {
    const storage = await browserHasVault();
    await storage.saveVault(file);
    const kv = openKvStore();
    await kv.put("applications/x/cv.pdf", new Uint8Array([37, 80, 68, 70]));
    const folder = new FakeFolder();
    await connectFolder(folder.asHandle(), "overwrite-folder");
    expect(await folder.paths()).toEqual([
      "applications/x/cv.pdf",
      "vault.json",
      "vault.json.bak",
    ]);
  });

  it("replaces files of the folder with the browser's data on overwrite", async () => {
    await browserHasVault();
    const folder = new FakeFolder();
    await folder.write("vault.json", '{"old":true}');
    await folder.write("jobs/keep.json", '{"id":"keep"}');
    await connectFolder(folder.asHandle(), "overwrite-folder");
    expect(
      JSON.parse((await folder.read("vault.json")) ?? "")
    ).not.toHaveProperty("old");
    // Files the browser has no counterpart for are not deleted
    expect(await folder.read("jobs/keep.json")).toBe('{"id":"keep"}');
  });

  it("leaves the folder as it is, and the browser data untouched, on use-folder", async () => {
    await browserHasVault();
    const folder = new FakeFolder();
    await folder.write("vault.json", '{"theirs":true}');
    await connectFolder(folder.asHandle(), "use-folder");
    expect(await folder.read("vault.json")).toBe('{"theirs":true}');
    expect(await loadFolderHandle()).toBe(folder);
    expect(await openKvStore().get("vault.json")).toBeDefined();
  });

  it("does not remember the folder when copying fails", async () => {
    await browserHasVault();
    const folder = new FakeFolder();
    folder.isBroken = true;
    await expect(connectFolder(folder.asHandle(), undefined)).rejects.toThrow();
    expect(await loadFolderHandle()).toBeUndefined();
  });

  it("connects an empty browser to an empty folder without error", async () => {
    const folder = new FakeFolder();
    await connectFolder(folder.asHandle(), undefined);
    expect(await folder.paths()).toEqual([]);
    expect(await loadFolderHandle()).toBe(folder);
  });
});

describe("stop keeping the data in a folder", () => {
  it("forgets the folder and leaves its files", async () => {
    const folder = new FakeFolder();
    await folder.write("vault.json", "{}");
    await connectFolder(folder.asHandle(), "use-folder");
    await disconnectFolder();
    expect(await loadFolderHandle()).toBeUndefined();
    expect(await folder.paths()).toEqual(["vault.json"]);
  });
});
