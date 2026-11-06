// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { SaveStatus } from "@pages/editor-page/save-status";
import {
  setSaveError,
  setSavedState,
  setStorageStatus,
} from "@store/persistence/persistence-slice";
import { toSavedState } from "@store/persistence/persistence-logic";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { updateProfile } from "@store/vault/vault-slice";

afterEach(cleanup);

function show(store: AppStore): void {
  render(
    <Provider store={store}>
      <SaveStatus />
    </Provider>
  );
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Save" });
}

function markSaved(store: AppStore): void {
  const s = store.getState();
  store.dispatch(
    setSavedState(
      toSavedState(
        s.vault,
        s.cvData.metaData,
        s.cvData.style,
        s.variants.variants
      )
    )
  );
}

describe("SaveStatus", () => {
  it("shows loading and cannot save while loading", () => {
    const store = configureStore({ reducer: rootReducer });
    show(store);
    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it("shows saved, then unsaved after an edit, which enables Save", () => {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(setStorageStatus({ status: "ready" }));
    markSaved(store);
    show(store);
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    act(() => {
      store.dispatch(updateProfile({ fullName: "Someone Else" }));
    });
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(saveButton().disabled).toBe(false);
  });

  it("shows a failed save", () => {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(setStorageStatus({ status: "ready" }));
    store.dispatch(setSaveError("Disk full"));
    show(store);
    expect(screen.getByText("Save failed")).toBeTruthy();
  });

  it("offers Retry and no saving when the server is offline or the data unreadable", () => {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(setStorageStatus({ status: "offline", message: "down" }));
    show(store);
    expect(screen.getByText("Server offline - not saved")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    act(() => {
      store.dispatch(setStorageStatus({ status: "error", message: "bad" }));
    });
    expect(screen.getByText("Cannot read saved data")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });
});
