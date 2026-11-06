// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { VaultPage } from "@pages/workspace/vault-page";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setVault } from "@store/vault/vault-slice";
import { setVariants } from "@store/variants/variants-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { Item } from "@custom-types/vault-types";

afterEach(cleanup);

const file = migrateCvFile(sample);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  render(
    <Provider store={store}>
      <VaultPage />
    </Provider>
  );
  return store;
}

function stored(store: AppStore, label: string): Item {
  return store
    .getState()
    .vault.sections.flatMap((s) => s.items)
    .find((i) => Object.values(i.fields).includes(label))!;
}

/** Open an item of the tree in the inline editor */
function open(title: string): void {
  const tree = screen.getByRole("complementary", { name: "Vault tree" });
  fireEvent.click(within(tree).getByRole("button", { name: title }));
}

describe("inline vault item editor", () => {
  it("opens when an item is chosen, says it is a shared fact, and has no Apply step", () => {
    setup();
    open("Senior Software Developer");
    const editor = screen.getByLabelText("Edit item");
    expect(within(editor).getByText(/vault fact/)).toBeTruthy();
    expect(within(editor).getByText(/Item 1 of 3/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("saves a field to the vault as you type", () => {
    const store = setup();
    open("Senior Software Developer");
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Principal Developer" },
    });
    expect(stored(store, "Principal Developer").fields.company).toBe(
      "Example Ltd"
    );
  });

  it("edits a date as a month, and Current means no end date", () => {
    const store = setup();
    open("Software Developer");
    const end = screen.getByLabelText<HTMLInputElement>("End");
    expect(end.value).toBe("2022-02");
    fireEvent.change(end, { target: { value: "2022-06" } });
    expect(stored(store, "Sample Systems").fields.endDate).toBe("2022-06-01");
    fireEvent.click(screen.getByRole("checkbox", { name: "Current" }));
    expect(stored(store, "Sample Systems").fields.endDate).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("End").disabled).toBe(true);
  });

  it("edits the canonical bullet text, and adds, moves and removes bullets", () => {
    const store = setup();
    open("Senior Software Developer");
    fireEvent.change(screen.getByLabelText("Bullet 1 text"), {
      target: { value: "Led a rebuild" },
    });
    expect(stored(store, "Example Ltd").bullets[0].text).toBe("Led a rebuild");

    fireEvent.click(screen.getByRole("button", { name: "Add bullet" }));
    expect(stored(store, "Example Ltd").bullets).toHaveLength(4);
    expect(screen.getByText("Bullets · 4")).toBeTruthy();

    const secondId = stored(store, "Example Ltd").bullets[1].id;
    fireEvent.click(screen.getByRole("button", { name: "Move bullet 2 up" }));
    expect(stored(store, "Example Ltd").bullets[0].id).toBe(secondId);

    fireEvent.click(screen.getByRole("button", { name: "Remove bullet 4" }));
    expect(stored(store, "Example Ltd").bullets).toHaveLength(3);
  });

  it("Ctrl+Enter adds the next bullet right after this one", () => {
    const store = setup();
    open("Senior Software Developer");
    const before = stored(store, "Example Ltd").bullets.map((b) => b.id);
    fireEvent.keyDown(screen.getByLabelText("Bullet 1 text"), {
      key: "Enter",
      ctrlKey: true,
    });
    const after = stored(store, "Example Ltd").bullets;
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(before[0]);
    expect(before).not.toContain(after[1].id);
  });

  it("keeps wordings and tags on the bullet, and an empty wording is removed", () => {
    const store = setup();
    open("Senior Software Developer");
    fireEvent.click(screen.getAllByRole("button", { name: "Wordings" })[0]);
    fireEvent.change(screen.getByLabelText("Short wording of bullet 1"), {
      target: { value: "Led a React dashboard" },
    });
    expect(stored(store, "Example Ltd").bullets[0].alt?.short).toBe(
      "Led a React dashboard"
    );
    expect(screen.getByText("1 wording")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Short wording of bullet 1"), {
      target: { value: "" },
    });
    expect(stored(store, "Example Ltd").bullets[0].alt).toBeUndefined();

    const tagBox = screen.getByLabelText("Add a tag to bullet 1");
    fireEvent.change(tagBox, { target: { value: "react" } });
    fireEvent.keyDown(tagBox, { key: "Enter" });
    expect(stored(store, "Example Ltd").bullets[0].tags).toContain("react");
  });

  it("goes to the previous and next item, with the buttons or [ and ]", () => {
    setup();
    open("Senior Software Developer");
    fireEvent.click(screen.getByRole("button", { name: "Next ]" }));
    expect(screen.getByText(/Item 2 of 3/)).toBeTruthy();
    fireEvent.keyDown(screen.getByLabelText("Edit item"), { key: "[" });
    expect(screen.getByText(/Item 1 of 3/)).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Prev [" }).disabled
    ).toBe(true);
  });

  it("removes the item only after confirming", async () => {
    const store = setup();
    open("Software Developer");
    fireEvent.click(screen.getByRole("button", { name: "Remove this item" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(stored(store, "Sample Systems")).toBeDefined();
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove this item" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      store
        .getState()
        .vault.sections.flatMap((s) => s.items)
        .some((i) => i.fields.company === "Sample Systems")
    ).toBe(false);
  });

  it("skills keep their own editor (ratings)", () => {
    setup();
    open("Languages");
    expect(screen.queryByLabelText("Edit item")).toBeNull();
  });
});
