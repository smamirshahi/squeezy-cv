// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeFolder } from "@store/persistence/browser/fake-folder";
import {
  ensureFolderPermission,
  isFolderStorageSupported,
  openFolderKvStore,
  pickFolder,
} from "@store/persistence/browser/folder-kv";

afterEach(() => {
  Reflect.deleteProperty(window, "showDirectoryPicker");
});

function store(folder = new FakeFolder()): {
  folder: FakeFolder;
  kv: ReturnType<typeof openFolderKvStore>;
} {
  return { folder, kv: openFolderKvStore(folder.asHandle()) };
}

describe("folder store: reading and writing", () => {
  it("answers undefined for a file that is not there, also in a missing folder", async () => {
    const { kv } = store();
    expect(await kv.get("vault.json")).toBeUndefined();
    expect(await kv.get("templates/a.json")).toBeUndefined();
  });

  it("writes JSON as readable, indented text and reads it back as an object", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { a: 1, nested: { b: [1, 2] } });
    expect(await folder.read("vault.json")).toBe(
      JSON.stringify({ a: 1, nested: { b: [1, 2] } }, null, 2)
    );
    expect(await kv.get("vault.json")).toEqual({ a: 1, nested: { b: [1, 2] } });
  });

  it("creates the folders of a key and keeps PDFs as raw bytes", async () => {
    const { folder, kv } = store();
    const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);
    await kv.put("applications/app1/cv.pdf", bytes);
    expect(await folder.paths()).toEqual(["applications/app1/cv.pdf"]);
    const back = await kv.get("applications/app1/cv.pdf");
    expect(back).toBeInstanceOf(Uint8Array);
    expect(Array.from(back as Uint8Array)).toEqual(Array.from(bytes));
  });

  it("hands back the text of a file that is not valid JSON, so the caller can call it damaged", async () => {
    const { folder, kv } = store();
    await folder.write("vault.json", "{ not json");
    expect(await kv.get("vault.json")).toBe("{ not json");
  });

  it("reads .bak and .deleted copies as JSON too", async () => {
    const { folder, kv } = store();
    await folder.write("jobs/a.json.bak", '{"id":"a"}');
    await folder.write("jobs/a.json.deleted", '{"id":"a"}');
    expect(await kv.get("jobs/a.json.bak")).toEqual({ id: "a" });
    expect(await kv.get("jobs/a.json.deleted")).toEqual({ id: "a" });
  });

  it("replaces a file completely when it is written again with less", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { long: "x".repeat(200) });
    await kv.put("vault.json", { s: 1 });
    expect(JSON.parse((await folder.read("vault.json")) ?? "")).toEqual({
      s: 1,
    });
  });

  it("passes on errors that are not 'not found' (a folder that went away)", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { a: 1 });
    folder.isBroken = true;
    await expect(kv.get("vault.json")).rejects.toThrow("gone");
    await expect(kv.put("vault.json", {})).rejects.toThrow("gone");
  });
});

describe("folder store: previous versions and deletes", () => {
  it("keeps the first write without a .bak and moves later versions to .bak", async () => {
    const { folder, kv } = store();
    await kv.putKeepingPrevious("vault.json", { v: 1 });
    expect(await folder.paths()).toEqual(["vault.json"]);
    await kv.putKeepingPrevious("vault.json", { v: 2 });
    expect(JSON.parse((await folder.read("vault.json.bak")) ?? "")).toEqual({
      v: 1,
    });
    expect(await kv.get("vault.json")).toEqual({ v: 2 });
  });

  it("moves a deleted file to .deleted and says false when there was nothing", async () => {
    const { folder, kv } = store();
    expect(await kv.deleteKeepingCopy("jobs/a.json")).toBe(false);
    await kv.put("jobs/a.json", { id: "a" });
    expect(await kv.deleteKeepingCopy("jobs/a.json")).toBe(true);
    expect(await folder.paths()).toEqual(["jobs/a.json.deleted"]);
    expect(await kv.get("jobs/a.json")).toBeUndefined();
  });
});

describe("folder store: listing", () => {
  it("lists the keys under a prefix, sorted, through nested folders", async () => {
    const { kv } = store();
    await kv.put("vault.json", {});
    await kv.put("templates/b.json", {});
    await kv.put("templates/a.json", {});
    await kv.put("applications/x/application.json", {});
    await kv.put("applications/x/cv.pdf", new Uint8Array([1]));
    expect(await kv.keys("templates/")).toEqual([
      "templates/a.json",
      "templates/b.json",
    ]);
    expect(await kv.keys("applications/")).toEqual([
      "applications/x/application.json",
      "applications/x/cv.pdf",
    ]);
    expect(await kv.keys("")).toHaveLength(5);
    expect(await kv.keys("nothing/")).toEqual([]);
  });

  it("includes .bak files (the callers filter them) but skips temporary and hidden files", async () => {
    const { folder, kv } = store();
    await folder.write("jobs/a.json", "{}");
    await folder.write("jobs/a.json.bak", "{}");
    await folder.write("jobs/a.json.1f2e.tmp", "{}");
    await folder.write(".DS_Store", "x");
    expect(await kv.keys("jobs/")).toEqual(["jobs/a.json", "jobs/a.json.bak"]);
    expect(await kv.keys("")).not.toContain(".DS_Store");
  });

  it("close does nothing and can be called again", async () => {
    const { kv } = store();
    await kv.close();
    await kv.close();
  });
});

describe("folder store: changes made outside the app", () => {
  it("reports nothing for files it wrote or read itself", async () => {
    const { kv } = store();
    await kv.putKeepingPrevious("vault.json", { v: 1 });
    await kv.putKeepingPrevious("vault.json", { v: 2 });
    await kv.get("vault.json");
    expect(await kv.changedOutside()).toEqual([]);
  });

  it("reports a file that something else wrote", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { v: 1 });
    await kv.put("jobs/a.json", { v: 1 });
    await folder.write("jobs/a.json", '{"v":2}');
    expect(await kv.changedOutside()).toEqual(["jobs/a.json"]);
  });

  it("reports a file that something else removed", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { v: 1 });
    await folder.removeEntry("vault.json");
    expect(await kv.changedOutside()).toEqual(["vault.json"]);
  });

  it("reports a file that was removed together with its folder", async () => {
    const { folder, kv } = store();
    await kv.put("jobs/a.json", { v: 1 });
    await (await folder.getDirectoryHandle("jobs")).removeEntry("a.json");
    await folder.removeEntry("jobs");
    expect(await kv.changedOutside()).toEqual(["jobs/a.json"]);
  });

  it("does not count its own delete as a change, and ignores .bak and .deleted files", async () => {
    const { folder, kv } = store();
    await kv.put("jobs/a.json", { v: 1 });
    await kv.deleteKeepingCopy("jobs/a.json");
    await folder.write("jobs/a.json.bak", "changed");
    await folder.write("jobs/a.json.deleted", "changed");
    expect(await kv.changedOutside()).toEqual([]);
  });

  it("reports a file again when it changes again after the app wrote it again", async () => {
    const { folder, kv } = store();
    await kv.put("vault.json", { v: 1 });
    await folder.write("vault.json", '{"v":2}');
    expect(await kv.changedOutside()).toEqual(["vault.json"]);
    await kv.put("vault.json", { v: 3 });
    expect(await kv.changedOutside()).toEqual([]);
    await folder.write("vault.json", '{"v":4}');
    expect(await kv.changedOutside()).toEqual(["vault.json"]);
  });

  it("only knows files it has touched", async () => {
    const { folder, kv } = store();
    await folder.write("vault.json", "{}");
    await folder.write("vault.json", '{"a":1}');
    expect(await kv.changedOutside()).toEqual([]);
  });
});

describe("the folder picker", () => {
  it("is supported only when the browser has showDirectoryPicker", () => {
    expect(isFolderStorageSupported()).toBe(false);
    Object.defineProperty(window, "showDirectoryPicker", {
      value: vi.fn(),
      configurable: true,
    });
    expect(isFolderStorageSupported()).toBe(true);
  });

  it("asks for read and write access and returns the chosen folder", async () => {
    const folder = new FakeFolder("chosen");
    const picker = vi.fn().mockResolvedValue(folder);
    Object.defineProperty(window, "showDirectoryPicker", {
      value: picker,
      configurable: true,
    });
    expect(await pickFolder()).toBe(folder);
    expect(picker).toHaveBeenCalledWith({
      mode: "readwrite",
      id: "squeezy-cv-data",
    });
  });

  it("returns undefined when the person cancels", async () => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: vi
        .fn()
        .mockRejectedValue(new DOMException("cancelled", "AbortError")),
      configurable: true,
    });
    expect(await pickFolder()).toBeUndefined();
  });

  it("passes on other errors", async () => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: vi
        .fn()
        .mockRejectedValue(new DOMException("blocked", "SecurityError")),
      configurable: true,
    });
    await expect(pickFolder()).rejects.toThrow("blocked");
  });
});

describe("folder permission", () => {
  it("is true without asking when it is already granted", async () => {
    const folder = new FakeFolder();
    const request = vi.spyOn(folder, "requestPermission");
    expect(await ensureFolderPermission(folder.asHandle(), false)).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it("does not ask when it may not prompt", async () => {
    const folder = new FakeFolder();
    folder.permission = "prompt";
    const request = vi.spyOn(folder, "requestPermission");
    expect(await ensureFolderPermission(folder.asHandle(), false)).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("asks when it may prompt, and follows the answer", async () => {
    const allowed = new FakeFolder();
    allowed.permission = "prompt";
    expect(await ensureFolderPermission(allowed.asHandle(), true)).toBe(true);

    const refused = new FakeFolder();
    refused.permission = "prompt";
    refused.onRequest = "denied";
    expect(await ensureFolderPermission(refused.asHandle(), true)).toBe(false);
  });
});
