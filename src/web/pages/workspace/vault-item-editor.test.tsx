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

/** Open a section, then an item of its list in the middle: its editor shows in the right panel */
function open(title: string): void {
  const tree = screen.getByRole("complementary", { name: "Vault tree" });
  const main = screen.getByRole("main", { name: "Edit" });
  for (const section of within(tree).getAllByRole("link")) {
    fireEvent.click(section);
    const item = within(main).queryAllByRole("link", {
      name: new RegExp(`^${title}`),
    })[0];
    if (item) {
      fireEvent.click(item);
      return;
    }
  }
  throw new Error(`No item "${title}" in any section`);
}

/** Choose an option of the Level dropdown of the skill at `index` (one per row, in order) */
function pickLevel(index: number, option: string): void {
  fireEvent.mouseDown(
    screen.getAllByRole("combobox", { name: /^Level/ })[index]
  );
  fireEvent.click(screen.getByRole("option", { name: option }));
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

  it("opens when an item is chosen and has no vault-fact banner", () => {
    setup();
    open("Senior Software Developer");
    const editor = screen.getByLabelText("Edit item");
    expect(within(editor).queryByText(/vault fact/)).toBeNull();
    expect(within(editor).getByText(/Item 1 of 3/)).toBeTruthy();
  });

  it("keeps edits in a draft until Apply, and Discard restores the stored values", () => {
    const store = setup();
    open("Senior Software Developer");
    const apply = screen.getByRole<HTMLButtonElement>("button", {
      name: "Apply",
    });
    const discard = screen.getByRole<HTMLButtonElement>("button", {
      name: "Discard",
    });
    expect(apply.disabled).toBe(true);
    expect(discard.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Principal Developer" },
    });
    expect(apply.disabled).toBe(false);
    expect(
      store
        .getState()
        .vault.sections.flatMap((s) => s.items)
        .some((i) => i.fields.title === "Principal Developer")
    ).toBe(false);
    fireEvent.click(discard);
    expect(screen.getByLabelText<HTMLInputElement>("Job title").value).toBe(
      "Senior Software Developer"
    );
    expect(apply.disabled).toBe(true);
  });

  it("saves the fields to the vault on Apply", () => {
    const store = setup();
    open("Senior Software Developer");
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Principal Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(stored(store, "Sample Systems").fields.endDate).toBe("2022-06-01");
    fireEvent.click(screen.getByRole("checkbox", { name: "Current" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
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

  it("explains level in one (i) and uses the same delete icon as the lists", () => {
    setup();
    open("Languages");
    expect(screen.getByLabelText("About level")).toBeTruthy();
    // the lists and the editor share the Outlined delete icon; the old "DeleteOutline" one is gone
    expect(screen.queryByTestId("DeleteOutlineIcon")).toBeNull();
    expect(screen.getAllByTestId("DeleteOutlinedIcon").length).toBeGreaterThan(
      0
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
    fireEvent.click(
      screen.getByRole("button", { name: /^Delete Software Developer/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(stored(store, "Sample Systems")).toBeDefined();
    fireEvent.click(
      await screen.findByRole("button", {
        name: /^Delete Software Developer/,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      store
        .getState()
        .vault.sections.flatMap((s) => s.items)
        .some((i) => i.fields.company === "Sample Systems")
    ).toBe(false);
  });

  it("has no Years field, and always shows skill levels", () => {
    const store = setup();
    open("Languages");
    pickLevel(0, "4 – Fluent");
    expect(stored(store, "Languages").bullets[0].rating).toBe(4);
    expect(screen.queryByLabelText(/years$/)).toBeNull();

    expect(screen.queryByLabelText(/Track my level/)).toBeNull();
    expect(screen.getAllByRole("combobox", { name: /^Level/ })).toHaveLength(2);
    expect(stored(store, "Languages").bullets[0].rating).toBe(4);
  });

  it("edits a skills category inline: category name, skill names, levels, add, move and remove", () => {
    const store = setup();
    open("Languages");
    const editor = screen.getByLabelText("Edit item");
    expect(within(editor).getByText("Skills · 2")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Spoken languages" },
    });
    expect(stored(store, "Spoken languages")).toBeDefined();

    const secondId = stored(store, "Spoken languages").bullets[1].id;
    const bulletOf = (id: string) =>
      stored(store, "Spoken languages").bullets.find(
        (bullet) => bullet.id === id
      );
    fireEvent.change(screen.getByLabelText("Skill 2 name"), {
      target: { value: "Français" },
    });
    expect(bulletOf(secondId)?.text).toBe("Français");

    // A language group has its own level names, whole steps from 1 to 5.
    // A skill moves in the list when its level changes (highest level first),
    // so the row is found again by its text.
    const rowOf = () =>
      stored(store, "Spoken languages").bullets.findIndex(
        (bullet) => bullet.id === secondId
      );
    pickLevel(rowOf(), "3 – Professional");
    expect(bulletOf(secondId)?.rating).toBe(3);
    pickLevel(rowOf(), "4 – Fluent");
    expect(bulletOf(secondId)?.rating).toBe(4);
    pickLevel(rowOf(), "5 – Native");
    expect(bulletOf(secondId)?.rating).toBe(5);
    expect(screen.queryByRole("button", { name: / plus$/ })).toBeNull();
    // there is no "No level" choice: whether levels show is up to the template
    fireEvent.mouseDown(
      screen.getAllByRole("combobox", { name: /^Level/ })[rowOf()]
    );
    expect(screen.queryByRole("option", { name: "No level" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    // the highest level is first
    const ratings = stored(store, "Spoken languages").bullets.map(
      (bullet) => bullet.rating ?? 0
    );
    expect(ratings).toEqual([...ratings].sort((x, y) => y - x));

    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));
    expect(stored(store, "Spoken languages").bullets).toHaveLength(3);
    // only one empty skill at a time: a second click reuses the empty one
    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));
    expect(stored(store, "Spoken languages").bullets).toHaveLength(3);
    expect(screen.queryByRole("button", { name: / plus$/ })).toBeNull();

    const movedId = stored(store, "Spoken languages").bullets[1].id;
    fireEvent.click(screen.getByRole("button", { name: "Move skill 2 up" }));
    expect(stored(store, "Spoken languages").bullets[0].id).toBe(movedId);

    fireEvent.click(screen.getByRole("button", { name: "Remove skill 3" }));
    expect(stored(store, "Spoken languages").bullets).toHaveLength(2);
  });
});
