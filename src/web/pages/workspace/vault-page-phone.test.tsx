// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { VaultPage } from "@pages/workspace/vault-page";
import { rootReducer } from "@store/store";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { setVault } from "@store/vault/vault-slice";

/** A window as wide as a phone: only the queries that say "max-width" match */
function usePhoneWidth(): void {
  vi.stubGlobal("matchMedia", (query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const isMatch =
      (max ? 390 <= Number(max[1]) : true) &&
      (min ? 390 >= Number(min[1]) : true);
    return {
      matches: isMatch,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    };
  });
}

function renderVault(path: string): void {
  window.history.replaceState(null, "", path);
  const store = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(migrateCvFile(sample).vault));
  render(
    <Provider store={store}>
      <VaultPage />
    </Provider>
  );
}

beforeEach(() => usePhoneWidth());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("VaultPage on a phone", () => {
  it("shows the tree as chips with the actions in a menu, and no side panel", () => {
    renderVault("/vault");
    expect(screen.getByRole("link", { name: "Work Experience" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "More vault actions" })
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "New section" })).toHaveLength(
      1
    );
    expect(screen.queryByLabelText("Item panel")).toBeNull();
  });

  it("opens an item as its own screen with a link back to the section", () => {
    renderVault("/vault/experience/exp-1");
    expect(screen.getByLabelText("Edit item")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Work Experience/ }).length
    ).toBeGreaterThan(1);
    expect(screen.queryByText("Add new experience")).toBeNull();
  });
});
