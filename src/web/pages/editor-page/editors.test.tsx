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
  setShouldAddNewItem,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { setVariants } from "@store/jobs/jobs-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { setVault } from "@store/vault/vault-slice";
import { Section } from "@custom-types/vault-types";
import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
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

describe("EditorExperience", () => {
  it("shows the stored values", () => {
    renderWith(createStore(), <EditorExperience sectionId="experience" />);
    expect(input("Job Title").value).toBe("Senior Software Developer");
    expect(input("Company", 1).value).toBe("Sample Systems");
    expect(screen.getAllByLabelText("Job Title")).toHaveLength(3);
  });

  it("keeps edits in a draft until Apply, then writes them to the store", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);

    fireEvent.change(input("Job Title"), {
      target: { value: "Principal Engineer" },
    });
    expect(input("Job Title").value).toBe("Principal Engineer");
    expect(storedSection(store, "experience").items[0].fields.jobTitle).toBe(
      "Senior Software Developer"
    );

    click(setShouldApplyChanges, store);
    const item = storedSection(store, "experience").items[0];
    expect(item.fields.jobTitle).toBe("Principal Engineer");
    expect(item.fields.company).toBe("Example Ltd");
    expect(item.id).toBe("exp-1");
    expect(store.getState().app.shouldApplyChanges).toBe(false);
  });

  it("Discard restores the stored values", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    fireEvent.change(input("Company"), { target: { value: "Changed" } });
    click(setShouldDiscardChanges, store);
    expect(input("Company").value).toBe("Example Ltd");
    expect(store.getState().app.shouldDiscardChanges).toBe(false);
  });

  it("edits the description of an experience and applies it; there is no bullet list", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    expect(screen.queryByLabelText("Bullet Point List")).toBeNull();
    expect(screen.queryByText("Alternative wordings")).toBeNull();

    const [description] = screen.getAllByLabelText("Description");
    fireEvent.change(description, {
      target: { value: "Ran the platform team\nCut deploy time" },
    });
    click(setShouldApplyChanges, store);

    const first = storedSection(store, "experience").items[0];
    expect(first.fields.description).toBe(
      "Ran the platform team\nCut deploy time"
    );
    expect(first.bullets).toEqual([]);
  });

  it("adds a new empty experience through the footer flag", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    act(() => {
      store.dispatch(setShouldAddNewItem(true));
    });
    expect(screen.getAllByLabelText("Job Title")).toHaveLength(4);
    expect(store.getState().app.shouldAddNewItem).toBe(false);

    click(setShouldApplyChanges, store);
    const items = storedSection(store, "experience").items;
    expect(items).toHaveLength(4);
    // no end date = current, so it sits after the role that is current and before the ended ones
    expect(items[1]).toMatchObject({ shouldShow: true });
    expect(items[1].fields.jobTitle).toBe("");
  });

  it("removes an item from the draft, and only applies it on Apply", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[0].closest("button")!);
    expect(screen.getAllByLabelText("Job Title")).toHaveLength(2);
    expect(storedSection(store, "experience").items).toHaveLength(3);
    click(setShouldApplyChanges, store);
    expect(storedSection(store, "experience").items.map((i) => i.id)).toEqual([
      "exp-2",
      "exp-3",
    ]);
  });

  it("shows items in date order, newest first, and has no reorder arrows", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    expect(screen.queryByTestId("ArrowDownwardIcon")).toBeNull();
    expect(screen.queryByTestId("ArrowUpwardIcon")).toBeNull();
    // the current role first, then by end date
    expect(input("Job Title", 0).value).toBe("Senior Software Developer");
    expect(input("Job Title", 1).value).toBe("Software Developer");
    expect(input("Job Title", 2).value).toBe("Intern");
  });

  it("has no eye button: what is shown is decided per job, and edits wait for Apply", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    expect(screen.queryByTestId("VisibilityIcon")).toBeNull();
    expect(screen.queryByTestId("VisibilityOffIcon")).toBeNull();

    fireEvent.change(input("Company"), { target: { value: "Edited Co" } });
    expect(storedSection(store, "experience").items[0].fields.company).toBe(
      "Example Ltd"
    );
    click(setShouldApplyChanges, store);
    expect(storedSection(store, "experience").items[0].fields.company).toBe(
      "Edited Co"
    );
  });

  it("follows the store when a new CV is loaded", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    fireEvent.change(input("Company"), { target: { value: "Unapplied" } });
    act(() => {
      store.dispatch(setVault(migrateCvFile(sample).vault));
    });
    expect(input("Company").value).toBe("Example Ltd");
  });
});

describe("EditorEducation", () => {
  it("edits and applies a field", () => {
    const store = createStore();
    renderWith(store, <EditorEducation sectionId="education" />);
    expect(input("Degree").value).toBe("BSc Computer Science");
    fireEvent.change(input("Institute"), { target: { value: "New Uni" } });
    click(setShouldApplyChanges, store);
    expect(storedSection(store, "education").items[0].fields.institute).toBe(
      "New Uni"
    );
  });
});

describe("EditorSkills", () => {
  it("shows categories and skills", () => {
    renderWith(createStore(), <EditorSkills sectionId="skills" />);
    expect(input("Skill Category").value).toBe("Languages");
    expect(input("Skill Item 1").value).toBe("English");
  });

  it("adds and renames a skill and applies it", () => {
    const store = createStore();
    renderWith(store, <EditorSkills sectionId="skills" />);
    fireEvent.click(screen.getAllByTestId("AddIcon")[0].closest("button")!);
    expect(screen.getAllByLabelText(/Skill Item 3/)).toHaveLength(1);
    fireEvent.change(input("Skill Item 3"), { target: { value: "German" } });
    click(setShouldApplyChanges, store);
    const bullets = storedSection(store, "skills").items[0].bullets;
    expect(bullets.map((b) => b.text)).toEqual(["English", "French", "German"]);
    expect(bullets[2].rating).toBe(0);
  });

  it("adds a new category through the footer flag", () => {
    const store = createStore();
    renderWith(store, <EditorSkills sectionId="skills" />);
    act(() => {
      store.dispatch(setShouldAddNewItem(true));
    });
    expect(screen.getAllByLabelText("Skill Category")).toHaveLength(3);
    click(setShouldApplyChanges, store);
    const added = storedSection(store, "skills").items[2];
    expect(added.fields.category).toBe("");
    expect(added.bullets).toHaveLength(1);
  });
});

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
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
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
      "Location",
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
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
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
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
    fireEvent.click(screen.getByRole("option", { name: "Instagram" }));
    expect(screen.getAllByTestId("link-icon-instagram").length).toBeGreaterThan(
      0
    );

    // GitHub -> Other, then a custom label
    fireEvent.mouseDown(screen.getAllByRole("combobox")[2]);
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
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
    const names = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    expect(names.at(-1)).toBe("Other");
    const rest = names.slice(0, -1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });
});
