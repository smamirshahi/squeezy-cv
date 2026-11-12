// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TopBar } from "@pages/workspace/top-bar";
import { markTutorialSeen } from "@pages/workspace/tutorial-seen";
import { useUndoShortcuts } from "@pages/workspace/use-undo-shortcuts";
import { undoableReducer } from "@store/store";
import { clearHistory } from "@store/history/history";
import { setVault, updateItemFields } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

beforeEach(() => {
  // A tutorial would open over the top bar the first time; these tests are about undo
  markTutorialSeen("vault");
  markTutorialSeen("template");
  markTutorialSeen("apply");
});

const file = migrateCvFile(sample);
const section = file.vault.sections.find((s) => s.type === "experience")!;
const item = section.items[0];

function Shortcuts(): null {
  useUndoShortcuts();
  return null;
}

function setup(): ReturnType<
  typeof configureStore<ReturnType<typeof undoableReducer>>
> {
  const store = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(clearHistory());
  render(
    <Provider store={store}>
      <TopBar />
      <Shortcuts />
    </Provider>
  );
  return store;
}

function jobTitle(store: ReturnType<typeof setup>): string | undefined {
  return store
    .getState()
    .vault.sections.find((s) => s.id === section.id)
    ?.items.find((i) => i.id === item.id)?.fields.jobTitle;
}

function edit(store: ReturnType<typeof setup>, value: string): void {
  act(() => {
    store.dispatch(
      updateItemFields({
        sectionId: section.id,
        itemId: item.id,
        fields: { jobTitle: value },
      })
    );
  });
}

describe("undo and redo in the top bar", () => {
  it("are disabled until there is something to undo", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Redo" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("undo and redo buttons go back and forth through an edit", () => {
    const store = setup();
    const original = jobTitle(store);
    edit(store, "Principal");
    expect(
      screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(jobTitle(store)).toBe(original);
    expect(
      screen.getByRole("button", { name: "Redo" }).hasAttribute("disabled")
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(jobTitle(store)).toBe("Principal");
  });

  it("Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y work, but not while typing in a field", () => {
    const store = setup();
    const original = jobTitle(store);
    edit(store, "Principal");
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    expect(jobTitle(store)).toBe(original);
    fireEvent.keyDown(document.body, {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(jobTitle(store)).toBe("Principal");
    fireEvent.keyDown(document.body, { key: "z", metaKey: true });
    fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
    expect(jobTitle(store)).toBe("Principal");

    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(jobTitle(store)).toBe("Principal");
  });
});
