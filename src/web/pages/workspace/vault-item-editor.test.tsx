// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import {
  addItem,
  ensureUnsortedSection,
  setVault,
} from "@store/vault/vault-slice";
import { setVariants } from "@store/jobs/jobs-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { Item } from "@custom-types/vault-types";

beforeEach(() => window.history.replaceState(null, "", "/vault"));
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
  fireEvent.click(within(tree).getByRole("link", { name: title }));
}

describe("inline vault item editor", () => {
  it("has no Move to section in normal sections, but keeps it for Unsorted items", () => {
    const store = setup();
    open("Senior Software Developer");
    expect(screen.queryByLabelText("Move to section")).toBeNull();

    cleanup();
    store.dispatch(ensureUnsortedSection());
    store.dispatch(
      addItem({
        sectionId: "unsorted",
        id: "u1",
        fields: { title: "AWS cert" },
      })
    );
    render(
      <Provider store={store}>
        <VaultPage />
      </Provider>
    );
    open("AWS cert");
    expect(screen.getAllByLabelText("Move to section").length).toBeGreaterThan(
      0
    );
  });

  it("opens when an item is chosen, has no vault-fact banner and no Apply step", () => {
    setup();
    open("Senior Software Developer");
    const editor = screen.getByLabelText("Edit item");
    expect(within(editor).queryByText(/vault fact/)).toBeNull();
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

  it("writes a free-text description of an experience to the vault", () => {
    const store = setup();
    open("Senior Software Developer");
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Ran the platform team\nCut deploy time" },
    });
    expect(stored(store, "Example Ltd").fields.description).toBe(
      "Ran the platform team\nCut deploy time"
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

  it("has no bullets, wordings or Add bullet for a job: the description is the text", () => {
    setup();
    open("Senior Software Developer");
    expect(screen.queryByRole("button", { name: "Add bullet" })).toBeNull();
    expect(screen.queryByText(/Bullets ·/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Wordings" })).toBeNull();
    expect(screen.getByLabelText("Description")).toBeTruthy();
  });

  it("explains the description in an (i) tooltip", async () => {
    setup();
    open("Senior Software Developer");
    fireEvent.mouseOver(screen.getByLabelText("About this field"));
    expect(
      await screen.findByText(/Write freely whatever comes to your mind/)
    ).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toMatch(
      /AI can generate bullet points from it or reword it for a specific job/
    );
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

  it("sets and clears Years, ignores invalid years, and keeps levels when tracking is turned off", () => {
    const store = setup();
    open("Languages");
    const first = stored(store, "Languages").bullets[0];
    fireEvent.click(screen.getByLabelText(`${first.text} level 4`));
    const years = screen.getByLabelText(`${first.text} years`);

    fireEvent.change(years, { target: { value: "7" } });
    expect(stored(store, "Languages").bullets[0].years).toBe(7);
    fireEvent.change(years, { target: { value: "-2" } });
    fireEvent.change(years, { target: { value: "2.5" } });
    expect(stored(store, "Languages").bullets[0].years).toBe(7);
    fireEvent.change(years, { target: { value: "" } });
    expect(stored(store, "Languages").bullets[0].years).toBeUndefined();

    fireEvent.click(screen.getByLabelText(/Track my level/));
    expect(screen.queryByLabelText(`${first.text} level 4`)).toBeNull();
    expect(stored(store, "Languages").bullets[0].rating).toBe(4);
    fireEvent.click(screen.getByLabelText(/Track my level/));
    expect(screen.getByLabelText(`${first.text} level 4`)).toBeTruthy();
  });

  it("edits a skills group inline: group name, skill names, levels, add, move and remove", () => {
    const store = setup();
    open("Languages");
    const editor = screen.getByLabelText("Edit item");
    expect(within(editor).getByText("Skills · 2")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Group"), {
      target: { value: "Spoken languages" },
    });
    expect(stored(store, "Spoken languages")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Skill 2 name"), {
      target: { value: "Français" },
    });
    expect(stored(store, "Spoken languages").bullets[1].text).toBe("Français");

    // level: pick 3 stars, then clear it (levels are optional)
    fireEvent.click(screen.getByLabelText("Français level 3"));
    expect(stored(store, "Spoken languages").bullets[1].rating).toBe(3);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear level of Français" })
    );
    expect(stored(store, "Spoken languages").bullets[1].rating).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));
    expect(stored(store, "Spoken languages").bullets).toHaveLength(3);

    const secondId = stored(store, "Spoken languages").bullets[1].id;
    fireEvent.click(screen.getByRole("button", { name: "Move skill 2 up" }));
    expect(stored(store, "Spoken languages").bullets[0].id).toBe(secondId);

    fireEvent.click(screen.getByRole("button", { name: "Remove skill 3" }));
    expect(stored(store, "Spoken languages").bullets).toHaveLength(2);
  });
});
