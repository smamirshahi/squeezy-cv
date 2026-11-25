// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { ConnectionBanner, FirstRun } from "@pages/workspace/workspace-states";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  setStorageStatus,
  setUnreadable,
} from "@store/persistence/persistence-slice";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeStore(): AppStore {
  return configureStore({ reducer: rootReducer });
}

describe("ConnectionBanner", () => {
  it("says nothing while the server is fine", () => {
    const store = makeStore();
    store.dispatch(setStorageStatus({ status: "ready" }));
    render(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>
    );
    expect(screen.queryByText(/Saving is blocked/)).toBeNull();
  });

  it("explains an unreachable server and offers a retry", () => {
    const store = makeStore();
    store.dispatch(setStorageStatus({ status: "offline" }));
    render(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>
    );
    expect(screen.getByText(/Can’t reach the local server/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Remove unreadable items" })
    ).toBeNull();
  });

  it("offers to remove unreadable templates and jobs, and calls the server to do it", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return Promise.resolve(
          new Response(JSON.stringify({ status: "deleted" }))
        );
      })
    );
    const store = makeStore();
    store.dispatch(setStorageStatus({ status: "error", message: "broken" }));
    store.dispatch(setUnreadable({ templates: ["t1"], jobs: ["j1"] }));
    render(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove unreadable items" })
    );
    await waitFor(() =>
      expect(
        calls.some((c) => c.startsWith("DELETE") && c.includes("j1"))
      ).toBe(true)
    );
    expect(calls.some((c) => c.startsWith("DELETE") && c.includes("t1"))).toBe(
      true
    );
  });
});

describe("FirstRun", () => {
  it("shows for a new empty vault", () => {
    render(
      <Provider store={makeStore()}>
        <FirstRun />
      </Provider>
    );
    expect(screen.getByText("Your vault is empty")).toBeTruthy();
  });

  it("has an enabled AI button that opens the import dialog", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ isConfigured: true, provider: "ollama" })
          )
        )
      )
    );
    render(
      <Provider store={makeStore()}>
        <FirstRun />
      </Provider>
    );
    const button = screen.getByRole("button", {
      name: "Paste CV text, AI sorts it",
    });
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.className).toMatch(/colorSecondary/);
    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Or paste CV text")).toBeTruthy();
  });

  it("is gone once there is a CV", () => {
    const store = makeStore();
    store.dispatch(setVault(migrateCvFile(sample).vault));
    render(
      <Provider store={store}>
        <FirstRun />
      </Provider>
    );
    expect(screen.queryByText("Your vault is empty")).toBeNull();
  });
});
