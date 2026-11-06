// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Button } from "@mui/material";
import { LockBanner, LockedFieldset } from "@pages/workspace/variant-lock";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setLocks } from "@store/variants/variants-slice";

afterEach(cleanup);

function makeStore(isSent: boolean): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  if (isSent) {
    const id = store.getState().variants.activeId;
    store.dispatch(
      setLocks({
        byVariant: {
          [id]: [
            { applicationId: "a", company: "Acme", appliedAt: "2026-05-01" },
          ],
        },
        hasUnreadable: false,
      })
    );
  }
  return store;
}

function screenFor(store: AppStore): void {
  render(
    <Provider store={store}>
      <LockBanner />
      <LockedFieldset>
        <Button>Hide item</Button>
      </LockedFieldset>
    </Provider>
  );
}

describe("variant lock UI", () => {
  it("shows nothing for a variant that was not sent", () => {
    screenFor(makeStore(false));
    expect(screen.queryByText(/locked/i)).toBeNull();
    expect(isDisabled()).toBe(false);
  });

  function isDisabled(): boolean {
    return screen
      .getByRole("button", { name: "Hide item", hidden: true })
      .matches(":disabled");
  }

  it("explains the lock and disables the controls", () => {
    screenFor(makeStore(true));
    expect(screen.getByText(/Sent to Acme on 2026-05-01/)).toBeTruthy();
    expect(isDisabled()).toBe(true);
  });

  it("keeps the lock when the dialog is cancelled", () => {
    const store = makeStore(true);
    screenFor(store);
    fireEvent.click(screen.getByRole("button", { name: "Unlock to edit" }));
    expect(screen.getByText(/Unlocking lets you change/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.getState().variants.unlockedIds).toEqual([]);
  });

  it("unlocks only after approval, and can lock again", () => {
    const store = makeStore(true);
    screenFor(store);
    fireEvent.click(screen.getByRole("button", { name: "Unlock to edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlock anyway" }));
    expect(isDisabled()).toBe(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Lock again", hidden: true })
    );
    expect(store.getState().variants.unlockedIds).toEqual([]);
  });

  it("offers a new variant as the safer way", () => {
    const store = makeStore(true);
    screenFor(store);
    fireEvent.click(
      screen.getByRole("button", { name: "Create new variant from this" })
    );
    expect(store.getState().variants.variants).toHaveLength(2);
  });
});
