// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  forgetFolderHandle,
  loadFolderHandle,
  saveFolderHandle,
} from "@store/persistence/browser/folder-handle";
import { FolderHandle } from "@store/persistence/browser/folder-kv";

/** A handle that a database can copy (the real ones can be stored too; the fake has functions) */
function handle(name: string): FolderHandle {
  return { name, kind: "directory" } as unknown as FolderHandle;
}

describe("the remembered folder", () => {
  it("is none before one was chosen", async () => {
    expect(await loadFolderHandle()).toBeUndefined();
  });

  it("is kept and read back", async () => {
    await saveFolderHandle(handle("Dropbox"));
    expect((await loadFolderHandle())?.name).toBe("Dropbox");
  });

  it("is replaced when another folder is chosen", async () => {
    await saveFolderHandle(handle("First"));
    await saveFolderHandle(handle("Second"));
    expect((await loadFolderHandle())?.name).toBe("Second");
  });

  it("is forgotten, and forgetting twice is fine", async () => {
    await saveFolderHandle(handle("Gone"));
    await forgetFolderHandle();
    expect(await loadFolderHandle()).toBeUndefined();
    await forgetFolderHandle();
    expect(await loadFolderHandle()).toBeUndefined();
  });

  it("is none, without an error, when the database cannot be used", async () => {
    const original = indexedDB.open.bind(indexedDB);
    indexedDB.open = () => {
      throw new Error("blocked");
    };
    try {
      expect(await loadFolderHandle()).toBeUndefined();
    } finally {
      indexedDB.open = original;
    }
  });
});
