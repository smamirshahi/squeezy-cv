// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useFolderWatch } from "@hooks/use-folder-watch";
import type { StorageLocation } from "@store/persistence/browser/storage-mode";

const notify = vi.fn();
let browserMode = true;
let location: StorageLocation = { kind: "folder", name: "Dropbox" };
let changed: string[] | Error = [];
let unsaved = false;

vi.mock("@components/notifications/notify", () => ({
  notify: (input: unknown) => notify(input),
}));
vi.mock("@hooks/use-persistence", () => ({
  useHasUnsavedChanges: () => unsaved,
}));
vi.mock("@store/persistence/browser/storage-mode", () => ({
  isBrowserMode: () => browserMode,
  storageLocation: () => location,
  folderChangedOutside: () =>
    changed instanceof Error
      ? Promise.reject(changed)
      : Promise.resolve(changed),
}));

function Watcher(): null {
  useFolderWatch();
  return null;
}

async function comeBack(): Promise<void> {
  window.dispatchEvent(new Event("focus"));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  browserMode = true;
  location = { kind: "folder", name: "Dropbox" };
  changed = [];
  unsaved = false;
});

afterEach(() => {
  cleanup();
  notify.mockReset();
});

describe("noticing changes in the data folder", () => {
  it("says nothing when nothing changed", async () => {
    render(<Watcher />);
    await comeBack();
    expect(notify).not.toHaveBeenCalled();
  });

  it("offers a reload when files changed and nothing is unsaved", async () => {
    changed = ["vault.json"];
    render(<Watcher />);
    await comeBack();
    expect(notify).toHaveBeenCalledOnce();
    const note = notify.mock.calls[0][0] as {
      kind: string;
      text: string;
      action: { label: string };
    };
    expect(note.kind).toBe("info");
    expect(note.text).toMatch(/changed outside the app/);
    expect(note.action.label).toBe("Reload");
  });

  it("warns about a conflict when files changed and there are unsaved changes", async () => {
    changed = ["vault.json"];
    unsaved = true;
    render(<Watcher />);
    await comeBack();
    const note = notify.mock.calls[0][0] as { kind: string; text: string };
    expect(note.kind).toBe("warning");
    expect(note.text).toMatch(/also have unsaved changes/);
    expect(note.text).toMatch(/\.bak/);
  });

  it("reports the same change only once, and a new one again", async () => {
    changed = ["vault.json"];
    render(<Watcher />);
    await comeBack();
    await comeBack();
    expect(notify).toHaveBeenCalledOnce();
    changed = ["jobs/a.json", "vault.json"];
    await comeBack();
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("does not listen outside browser mode or when the data is not in a folder", async () => {
    changed = ["vault.json"];
    browserMode = false;
    const first = render(<Watcher />);
    await comeBack();
    first.unmount();
    browserMode = true;
    location = { kind: "browser" };
    render(<Watcher />);
    await comeBack();
    expect(notify).not.toHaveBeenCalled();
  });

  it("ignores a folder that cannot be read right now", async () => {
    changed = new Error("gone");
    render(<Watcher />);
    await comeBack();
    expect(notify).not.toHaveBeenCalled();
  });

  it("stops listening when the app closes", async () => {
    changed = ["vault.json"];
    const view = render(<Watcher />);
    view.unmount();
    await comeBack();
    expect(notify).not.toHaveBeenCalled();
  });
});
