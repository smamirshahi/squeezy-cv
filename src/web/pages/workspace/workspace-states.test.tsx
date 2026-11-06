// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { ConnectionBanner, FirstRun } from "@pages/workspace/workspace-states";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStorageStatus } from "@store/persistence/persistence-slice";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

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
