// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FolderReconnect } from "@pages/workspace/folder-reconnect";
import { FakeFolder } from "@store/persistence/browser/fake-folder";

const disconnect = vi.fn<() => Promise<void>>();
vi.mock("@store/persistence/browser/connect-folder", () => ({
  disconnectFolder: () => disconnect(),
}));

afterEach(() => {
  cleanup();
  disconnect.mockReset();
});

function show(folder: FakeFolder): () => void {
  const onReload = vi.fn();
  render(
    <FolderReconnect
      location={{
        kind: "folder-locked",
        name: folder.name,
        handle: folder.asHandle(),
      }}
      onReload={onReload}
    />
  );
  return onReload;
}

describe("Reconnect your data folder", () => {
  it("names the folder and explains why it asks", () => {
    const folder = new FakeFolder("Dropbox");
    folder.permission = "prompt";
    show(folder);
    expect(
      screen.getByRole("heading", { name: "Reconnect your data folder" })
    ).toBeTruthy();
    expect(screen.getByText(/the folder “Dropbox”/)).toBeTruthy();
    expect(
      screen.getByText(/does not delete anything in the folder/)
    ).toBeTruthy();
  });

  it("reloads once the person allows the folder", async () => {
    const folder = new FakeFolder("Dropbox");
    folder.permission = "prompt";
    const onReload = show(folder);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect folder" }));
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
  });

  it("says so, and stays, when the person refuses", async () => {
    const folder = new FakeFolder("Dropbox");
    folder.permission = "prompt";
    folder.onRequest = "denied";
    const onReload = show(folder);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect folder" }));
    expect(
      await screen.findByText("Access to the folder was not allowed.")
    ).toBeTruthy();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("says the folder could not be opened when the browser throws", async () => {
    const folder = new FakeFolder("Dropbox");
    vi.spyOn(folder, "queryPermission").mockRejectedValue(new Error("gone"));
    const onReload = show(folder);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect folder" }));
    expect(await screen.findByText(/could not be opened/)).toBeTruthy();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("goes back to the browser's copy when the person stops using the folder", async () => {
    disconnect.mockResolvedValue(undefined);
    const onReload = show(new FakeFolder("Dropbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Stop using the folder" })
    );
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
