// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { setVariants } from "@store/jobs/jobs-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { setVault } from "@store/vault/vault-slice";
import { Section } from "@custom-types/vault-types";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";

afterEach(cleanup);

function createStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "v1")]));
  store.dispatch(setStyle(file.style));
  return store;
}

function renderWith(store: AppStore, ui: JSX.Element): void {
  render(<Provider store={store}>{ui}</Provider>);
}

function click(
  flag: typeof setShouldApplyChanges | typeof setShouldDiscardChanges,
  store: AppStore
): void {
  act(() => {
    store.dispatch(flag(true));
  });
}

function storedSection(store: AppStore, id: string): Section {
  return store.getState().vault.sections.find((s) => s.id === id)!;
}

function input(label: string, index = 0): HTMLInputElement {
  return screen.getAllByLabelText(label)[index] as HTMLInputElement;
}

describe("EditorSummary", () => {
  it("edits the summary text and applies it", () => {
    const store = createStore();
    renderWith(store, <EditorSummary sectionId="summary" />);
    const field = screen.getByLabelText<HTMLTextAreaElement>(
      "Professional Summary"
    );
    expect(field.value).toMatch(/^Front-end developer/);
    fireEvent.change(field, { target: { value: "New summary" } });
    click(setShouldApplyChanges, store);
    expect(storedSection(store, "summary").items[0].fields.text).toBe(
      "New summary"
    );
  });

  it("creates the summary item when there is none yet", () => {
    const store = createStore();
    store.dispatch(
      setVault({
        ...store.getState().vault,
        sections: store
          .getState()
          .vault.sections.map((s) =>
            s.id === "summary" ? { ...s, items: [] } : s
          ),
      })
    );
    renderWith(store, <EditorSummary sectionId="summary" />);
    fireEvent.change(screen.getByLabelText("Professional Summary"), {
      target: { value: "Fresh" },
    });
    click(setShouldApplyChanges, store);
    const items = storedSection(store, "summary").items;
    expect(items).toHaveLength(1);
    expect(items[0].fields.text).toBe("Fresh");
    expect(items[0].shouldShow).toBe(true);
  });
});

/** The Type dropdown of the link at `index` (the profile fields above it are comboboxes too) */
function linkTypeBox(index: number): HTMLElement {
  return screen.getAllByRole("combobox", { name: /^Type/ })[index];
}

describe("EditorMainInfo", () => {
  it("picks several nationalities from an autofill list", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    const box = screen.getByRole("combobox", { name: /Nationality/ });
    fireEvent.change(box, { target: { value: "Brit" } });
    fireEvent.click(screen.getByRole("option", { name: "British" }));
    fireEvent.change(box, { target: { value: "Iran" } });
    fireEvent.click(screen.getByRole("option", { name: "Iranian" }));
    click(setShouldApplyChanges, store);
    expect(store.getState().vault.profile.nationalities).toEqual([
      "British",
      "Iranian",
    ]);
  });

  it("sets and clears marital status and gender from lists, both optional", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    expect(store.getState().vault.profile.maritalStatus).toBeUndefined();

    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: /Marital status/ })
    );
    fireEvent.click(screen.getByRole("option", { name: "Married" }));
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Gender/ }));
    fireEvent.click(screen.getByRole("option", { name: "Non-binary" }));
    click(setShouldApplyChanges, store);
    expect(store.getState().vault.profile).toMatchObject({
      maritalStatus: "Married",
      gender: "Non-binary",
    });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Gender/ }));
    fireEvent.click(screen.getByRole("option", { name: "Not stated" }));
    click(setShouldApplyChanges, store);
    expect(store.getState().vault.profile.gender).toBe("");
  });

  it("adds and removes other job titles and explains why", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    expect(screen.getByLabelText("Why keep other job titles")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Add another job title" })
    );
    fireEvent.change(screen.getByLabelText("Other job title 1"), {
      target: { value: "Frontend Engineer" },
    });
    click(setShouldApplyChanges, store);
    expect(store.getState().vault.profile.headlineOptions).toEqual([
      "Frontend Engineer",
    ]);
    fireEvent.click(screen.getByLabelText("Remove job title 1"));
    expect(screen.queryByLabelText("Other job title 1")).toBeNull();
  });

  it("has no sort buttons for the links (order belongs to the job)", () => {
    renderWith(createStore(), <EditorMainInfo />);
    expect(
      document.querySelector('[data-testid="ArrowUpwardIcon"]')
    ).toBeNull();
  });

  it("disables a link type that another link already uses", () => {
    renderWith(createStore(), <EditorMainInfo />);
    fireEvent.mouseDown(linkTypeBox(0));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    const github = options.find((o) => /GitHub/.test(o.textContent ?? ""))!;
    const other = options.find((o) => /Other/.test(o.textContent ?? ""))!;
    expect(github.getAttribute("aria-disabled")).toBe("true");
    expect(other.getAttribute("aria-disabled")).toBeNull();
  });

  it("shows an example placeholder in every contact field", () => {
    renderWith(createStore(), <EditorMainInfo />);
    for (const label of [
      "Full Name",
      "Job Title",
      "Right to work (optional)",
      "Email",
      "Phone",
      "Location (city, country)",
    ]) {
      expect(
        screen.getByLabelText(label).getAttribute("placeholder")
      ).toBeTruthy();
    }
  });

  it("edits the profile and applies it", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    expect(input("Full Name").value).toBe("Jane Doe");
    fireEvent.change(input("Full Name"), { target: { value: "Jane Q. Doe" } });
    fireEvent.change(input("Phone"), { target: { value: "" } });
    click(setShouldApplyChanges, store);
    const { profile } = store.getState().vault;
    expect(profile.fullName).toBe("Jane Q. Doe");
    expect(profile.phone).toBe("");
    expect(profile.email).toBe("jane.doe@example.com");
  });

  it("adds, edits and removes links", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    expect(screen.getAllByLabelText("URL")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add new link" }));
    expect(screen.getAllByLabelText("URL")).toHaveLength(3);
    // a new link is "Other", so it is the only one with a free label field
    expect(screen.getAllByLabelText("Label")).toHaveLength(1);
    fireEvent.change(input("Label"), { target: { value: "My blog 2" } });
    fireEvent.change(input("URL", 2), {
      target: { value: "https://jane.example.com" },
    });

    // remove GitHub
    fireEvent.click(screen.getAllByLabelText("Remove link")[1]);
    click(setShouldApplyChanges, store);

    expect(store.getState().vault.links.map((l) => l.label)).toEqual([
      "LinkedIn",
      "My blog 2",
    ]);
  });

  it("shows the type and icon of saved links", () => {
    renderWith(createStore(), <EditorMainInfo />);
    const labels = createStore()
      .getState()
      .vault.links.map((l) => l.label);
    expect(labels).toEqual(["LinkedIn", "GitHub"]);
    expect(screen.getByTestId("link-icon-linkedin")).toBeTruthy();
    expect(screen.getByTestId("link-icon-github")).toBeTruthy();
    // known types have no free label field
    expect(screen.queryAllByLabelText("Label")).toHaveLength(0);
  });

  it("lists the link types with icons and an Other option", () => {
    renderWith(createStore(), <EditorMainInfo />);
    fireEvent.mouseDown(linkTypeBox(0));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    const names = options.map((option) => option.textContent);
    expect(names).toEqual(
      expect.arrayContaining(["GitHub", "X", "LinkedIn", "Instagram", "Other"])
    );
    expect(names.at(-1)).toBe("Other");
    // every option carries its icon
    for (const option of options) {
      expect(
        option.querySelector('[data-testid^="link-icon-"]')
      ).not.toBeNull();
    }
  });

  it("choosing a type writes its name; Other brings the label field", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);

    // LinkedIn -> Instagram
    fireEvent.mouseDown(linkTypeBox(0));
    fireEvent.click(screen.getByRole("option", { name: "Instagram" }));
    expect(screen.getAllByTestId("link-icon-instagram").length).toBeGreaterThan(
      0
    );

    // GitHub -> Other, then a custom label
    fireEvent.mouseDown(linkTypeBox(1));
    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    fireEvent.change(input("Label"), { target: { value: "My site" } });

    click(setShouldApplyChanges, store);
    expect(store.getState().vault.links.map((l) => l.label)).toEqual([
      "Instagram",
      "My site",
    ]);
  });

  it("picks the type from a pasted address on a new link", () => {
    const store = createStore();
    renderWith(store, <EditorMainInfo />);
    fireEvent.click(screen.getByRole("button", { name: "Add new link" }));
    fireEvent.change(input("URL", 2), {
      target: { value: "https://github.com/jane" },
    });
    expect(screen.queryAllByLabelText("Label")).toHaveLength(0);
    click(setShouldApplyChanges, store);
    expect(store.getState().vault.links[2].label).toBe("GitHub");
  });

  it("lists the link types alphabetically with Other last", () => {
    renderWith(createStore(), <EditorMainInfo />);
    fireEvent.mouseDown(linkTypeBox(0));
    const names = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    expect(names.at(-1)).toBe("Other");
    const rest = names.slice(0, -1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });
});
