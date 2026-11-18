// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FolderSection } from "@pages/workspace/folder-section";
import { FakeFolder } from "@store/persistence/browser/fake-folder";
import type { StorageLocation } from "@store/persistence/browser/storage-mode";

const connect = vi.fn<(...args: unknown[]) => Promise<void>>();
const disconnect = vi.fn<() => Promise<void>>();
let hasData = false;
let location: StorageLocation = { kind: "browser" };
let supported = true;
let picked: FakeFolder | undefined;
let pickError: Error | undefined;

vi.mock("@store/persistence/browser/connect-folder", () => ({
  connectFolder: (...args: unknown[]) => connect(...args),
  disconnectFolder: () => disconnect(),
  folderHasData: () => Promise.resolve(hasData),
}));
vi.mock("@store/persistence/browser/folder-kv", () => ({
  isFolderStorageSupported: () => supported,
  pickFolder: () =>
    pickError ? Promise.reject(pickError) : Promise.resolve(picked),
}));
vi.mock("@store/persistence/browser/storage-mode", () => ({
  storageLocation: () => location,
}));

beforeEach(() => {
  connect.mockResolvedValue(undefined);
  disconnect.mockResolvedValue(undefined);
  hasData = false;
  location = { kind: "browser" };
  supported = true;
  picked = new FakeFolder("Dropbox");
  pickError = undefined;
});

afterEach(() => {
  cleanup();
  connect.mockReset();
  disconnect.mockReset();
});

function show(): () => void {
  const onReload = vi.fn();
  render(<FolderSection onReload={onReload} />);
  return onReload;
}

describe("Store my data in a folder", () => {
  it("explains the idea, the privacy cost and that AI keys stay out", () => {
    show();
    expect(screen.getByText("Store my data in a folder")).toBeTruthy();
    expect(screen.getByText(/synced by Drive, Dropbox/)).toBeTruthy();
    expect(screen.getByText(/unencrypted unless your disk/)).toBeTruthy();
    expect(screen.getByText(/AI keys are never written/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose folder" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Disconnect" })).toBeNull();
  });

  it("says the browser cannot do it, without any buttons, where the API is missing", () => {
    supported = false;
    show();
    expect(screen.getByText(/needs Chrome or Edge/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("connects an empty folder at once and reloads", async () => {
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(connect).toHaveBeenCalledWith(picked, undefined);
  });

  it("does nothing when the picker is cancelled", async () => {
    picked = undefined;
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Choose folder" })).toBeTruthy()
    );
    expect(connect).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("asks what to do with a folder that has data, and never merges", async () => {
    hasData = true;
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    expect(await screen.findByText(/already has Squeezy CV data/)).toBeTruthy();
    expect(screen.getByText(/never merged/)).toBeTruthy();
    expect(connect).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Choose folder" })).toBeNull();
  });

  it("uses the folder's data when asked to", async () => {
    hasData = true;
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Use the folder’s data/ })
    );
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(connect.mock.calls[0][1]).toBe("use-folder");
  });

  it("replaces the folder's data with the browser's when asked to", async () => {
    hasData = true;
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Replace it with this browser/,
      })
    );
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(connect.mock.calls[0][1]).toBe("overwrite-folder");
  });

  it("goes back to the choice button on Cancel without touching anything", async () => {
    hasData = true;
    show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Choose folder" })).toBeTruthy();
    expect(connect).not.toHaveBeenCalled();
  });

  it("shows an error and does not reload when connecting fails", async () => {
    connect.mockRejectedValue(new Error("The folder is read-only."));
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    expect(await screen.findByText("The folder is read-only.")).toBeTruthy();
    expect(onReload).not.toHaveBeenCalled();
    // The person can try again
    expect(
      screen
        .getByRole("button", { name: "Choose folder" })
        .hasAttribute("disabled")
    ).toBe(false);
  });

  it("shows an error when the picker itself fails", async () => {
    pickError = new Error("Blocked by the browser.");
    show();
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    expect(await screen.findByText("Blocked by the browser.")).toBeTruthy();
    expect(connect).not.toHaveBeenCalled();
  });

  it("names the folder in use and offers another folder and Disconnect", () => {
    location = { kind: "folder", name: "Dropbox" };
    show();
    expect(
      screen.getByText(/Your data is in the folder “Dropbox”/)
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Choose another folder" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });

  it("disconnects and reloads", async () => {
    location = { kind: "folder", name: "Dropbox" };
    const onReload = show();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
