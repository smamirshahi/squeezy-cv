// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  deleteAllBrowserData,
  isDeletingAllData,
} from "@store/persistence/browser/delete-all-data";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import {
  forgetFolderHandle,
  loadFolderHandle,
  saveFolderHandle,
} from "@store/persistence/browser/folder-handle";
import { FolderHandle } from "@store/persistence/browser/folder-kv";
import {
  DatabaseBlockedError,
  openKvStore,
} from "@store/persistence/browser/idb-kv";

afterEach(() => {
  window.localStorage.clear();
});

async function databaseNames(): Promise<string[]> {
  return (await indexedDB.databases()).map((database) => database.name ?? "");
}

describe("delete all my data", () => {
  it("removes the database and the browser storage", async () => {
    const kv = openKvStore();
    await new IdbCvStorage(kv).saveVault(migrateCvFile(sample));
    await kv.close();
    window.localStorage.setItem("squeezy-cv-ai-keys", '{"claude":"k"}');
    window.sessionStorage.setItem("draft", "x");
    expect(await databaseNames()).toContain("squeezy-cv");

    await deleteAllBrowserData();

    expect(await databaseNames()).not.toContain("squeezy-cv");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(isDeletingAllData()).toBe(true);
  });

  it("forgets the chosen data folder too", async () => {
    await saveFolderHandle({ name: "Dropbox" } as unknown as FolderHandle);
    expect(await loadFolderHandle()).toBeDefined();
    await deleteAllBrowserData();
    expect(await loadFolderHandle()).toBeUndefined();
    await forgetFolderHandle();
  });

  it("says to close the other tabs when another tab holds the database, and keeps the data", async () => {
    const other = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("squeezy-cv", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("files");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // This tab does not let go either (an old version of the app, say)
    other.onversionchange = () => undefined;
    window.localStorage.setItem("keep", "me");

    await expect(deleteAllBrowserData()).rejects.toBeInstanceOf(
      DatabaseBlockedError
    );
    expect(isDeletingAllData()).toBe(false);
    expect(window.localStorage.getItem("keep")).toBe("me");
    other.close();
  });
});
