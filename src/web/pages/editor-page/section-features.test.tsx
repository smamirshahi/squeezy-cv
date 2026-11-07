// @vitest-environment jsdom
import { setItemSelection } from "@store/jobs/jobs-slice";
import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setShouldApplyChanges } from "@store/app/app-slice";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { addItem, addSection, setVault } from "@store/vault/vault-slice";
import { Section } from "@custom-types/vault-types";
import { EditorSections } from "@pages/editor-page/sections/editor-sections";
import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorGenericSection } from "@pages/editor-page/sections/editor-generic-section/editor-generic-section";
import { PreviewPage } from "@pages/preview-page/preview-page";

afterEach(cleanup);

function createStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  return store;
}

function renderWith(store: AppStore, ui: JSX.Element): void {
  render(<Provider store={store}>{ui}</Provider>);
}

function apply(store: AppStore): void {
  act(() => {
    store.dispatch(setShouldApplyChanges(true));
  });
}

function section(store: AppStore, id: string): Section {
  return store.getState().vault.sections.find((s) => s.id === id)!;
}

function titles(store: AppStore): string[] {
  return store.getState().vault.sections.map((s) => s.title);
}

/** Opens the collapsed "Tags ..." panel of the item with the given index */
function openExtras(index = 0): void {
  fireEvent.click(
    screen.getAllByText(/^Tags( and alternative wordings)?$/)[index]
  );
}

function addTag(label: string, tag: string, index = 0): void {
  const field = screen
    .getAllByLabelText<HTMLInputElement>(label)
    .filter((el) => el.tagName === "INPUT")[index];
  fireEvent.change(field, { target: { value: tag } });
  fireEvent.keyDown(field, { key: "Enter" });
}

function wording(label: string): HTMLElement {
  // multiline fields have a hidden shadow textarea; use the real one
  const [field] = screen
    .getAllByLabelText(label)
    .filter((el) => el.getAttribute("aria-hidden") !== "true");
  return field;
}

describe("EditorSections (manage sections)", () => {
  it("lists all sections with their type", () => {
    renderWith(createStore(), <EditorSections />);
    const fields = screen.getAllByLabelText<HTMLInputElement>("Section title");
    expect(fields.map((f) => f.value)).toEqual([
      "Professional Summary",
      "Work Experience",
      "Education",
      "Skills",
    ]);
  });

  it("renames a section at once", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.change(screen.getAllByLabelText("Section title")[2], {
      target: { value: "Studies" },
    });
    expect(section(store, "education").title).toBe("Studies");
  });

  it("reorders sections", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.click(
      screen.getAllByTestId("ArrowDownwardIcon")[0].closest("button")!
    );
    expect(titles(store)).toEqual([
      "Work Experience",
      "Professional Summary",
      "Education",
      "Skills",
    ]);
  });

  it("adds a section with the chosen type and title", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Type" }));
    fireEvent.click(screen.getByRole("option", { name: "Publications" }));
    fireEvent.change(screen.getByLabelText("New section title"), {
      target: { value: "My papers" },
    });
    fireEvent.click(screen.getByText("Add section"));

    const added = store.getState().vault.sections.at(-1)!;
    expect(added).toMatchObject({
      type: "publications",
      title: "My papers",
      items: [],
    });
    expect(added.id).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>("New section title").value
    ).toBe("");
  });

  it("uses the default title when none is typed", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.click(screen.getByText("Add section"));
    expect(store.getState().vault.sections.at(-1)).toMatchObject({
      type: "projects",
      title: "Projects",
    });
  });

  it("asks before deleting and can be cancelled", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.click(screen.getByLabelText("Delete section Education"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/1 item\(s\) will be deleted/)
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByText("Cancel"));
    expect(section(store, "education")).toBeTruthy();
    expect(store.getState().vault.sections).toHaveLength(4);
  });

  it("deletes a section with its items after confirming", () => {
    const store = createStore();
    renderWith(store, <EditorSections />);
    fireEvent.click(screen.getByLabelText("Delete section Education"));
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Delete"));
    expect(store.getState().vault.sections.map((s) => s.id)).toEqual([
      "summary",
      "experience",
      "skills",
    ]);
  });
});

describe("tags and alternative wordings", () => {
  it("adds item tags in the draft and applies them, normalized", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    openExtras(0);
    addTag("Tags", "react");
    addTag("Tags", "React");
    addTag("Tags", "leadership");
    expect(section(store, "experience").items[0].tags).toEqual([]);
    apply(store);
    expect(section(store, "experience").items[0].tags).toEqual([
      "react",
      "leadership",
    ]);
    expect(section(store, "experience").items[1].tags).toEqual([]);
  });

  it("offers tags used elsewhere as suggestions", () => {
    const store = createStore();
    const vault = store.getState().vault;
    store.dispatch(
      setVault({
        ...vault,
        sections: vault.sections.map((s) =>
          s.id === "education"
            ? {
                ...s,
                items: s.items.map((i) => ({ ...i, tags: ["research"] })),
              }
            : s
        ),
      })
    );
    renderWith(store, <EditorExperience sectionId="experience" />);
    openExtras(0);
    fireEvent.mouseDown(screen.getAllByLabelText("Tags")[0]);
    expect(
      screen.getByRole("option", { name: "research", hidden: true })
    ).toBeTruthy();
  });

  it("edits tags on education items and skill groups", () => {
    const store = createStore();
    renderWith(store, <EditorEducation sectionId="education" />);
    openExtras(0);
    addTag("Tags", "academic");
    apply(store);
    expect(section(store, "education").items[0].tags).toEqual(["academic"]);
    cleanup();

    renderWith(store, <EditorSkills sectionId="skills" />);
    openExtras(1);
    addTag("Tags", "web");
    apply(store);
    expect(section(store, "skills").items[1].tags).toEqual(["web"]);
  });

  it("sets alternative wordings and bullet tags without touching the main text", () => {
    const store = createStore();
    const mainText = section(store, "experience").items[0].bullets[0].text;
    renderWith(store, <EditorExperience sectionId="experience" />);

    openExtras(0);
    fireEvent.change(wording("Short wording of bullet 1"), {
      target: { value: "Led dashboard" },
    });
    addTag("Tags of bullet 1", "frontend");
    apply(store);

    const bullet = section(store, "experience").items[0].bullets[0];
    expect(bullet.text).toBe(mainText);
    expect(bullet.alt).toEqual({ short: "Led dashboard" });
    expect(bullet.tags).toEqual(["frontend"]);
  });

  it("clearing an alternative wording removes it", () => {
    const store = createStore();
    renderWith(store, <EditorExperience sectionId="experience" />);
    openExtras(0);
    fireEvent.change(wording("Long wording of bullet 2"), {
      target: { value: "A longer version" },
    });
    expect(
      (wording("Long wording of bullet 2") as HTMLTextAreaElement).value
    ).toBe("A longer version");
    fireEvent.change(wording("Long wording of bullet 2"), {
      target: { value: "" },
    });
    apply(store);
    expect(section(store, "experience").items[0].bullets[1]).not.toHaveProperty(
      "alt"
    );
  });

  it("discarding drops unapplied tags", () => {
    const store = createStore();
    renderWith(store, <EditorEducation sectionId="education" />);
    openExtras(0);
    addTag("Tags", "temp");
    expect(screen.getByText("temp")).toBeTruthy();
    act(() => {
      store.dispatch({ type: "app/setShouldDiscardChanges", payload: true });
    });
    expect(screen.queryByText("temp")).toBeNull();
  });
});

describe("generic sections", () => {
  function storeWithProjects(): AppStore {
    const store = createStore();
    store.dispatch(
      addSection({ id: "proj", type: "projects", title: "Projects" })
    );
    return store;
  }

  it("adds and edits an item and applies it", () => {
    const store = storeWithProjects();
    renderWith(store, <EditorGenericSection sectionId="proj" />);
    expect(screen.queryAllByLabelText("Title")).toHaveLength(0);
    act(() => {
      store.dispatch({ type: "app/setShouldAddNewItem", payload: true });
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "CV Builder" },
    });
    fireEvent.change(screen.getByLabelText("Subtitle"), {
      target: { value: "Side project" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Builds CVs" },
    });
    fireEvent.change(screen.getByLabelText("Bullet Point List"), {
      target: { value: "• Uses React\n• Has tests" },
    });
    openExtras(0);
    addTag("Tags", "react");
    apply(store);

    const item = section(store, "proj").items[0];
    expect(item.fields).toMatchObject({
      title: "CV Builder",
      subtitle: "Side project",
      description: "Builds CVs",
    });
    expect(item.bullets.map((b) => b.text)).toEqual([
      "Uses React",
      "Has tests",
    ]);
    expect(item.tags).toEqual(["react"]);
    expect(item.shouldShow).toBe(true);
  });

  it("is shown in the preview, and hidden items are not", () => {
    const store = storeWithProjects();
    store.dispatch(
      addItem({
        sectionId: "proj",
        id: "p1",
        fields: { title: "Visible project", subtitle: "Lab" },
      })
    );
    store.dispatch(
      addItem({
        sectionId: "proj",
        id: "p2",
        fields: { title: "Secret project" },
      })
    );
    store.dispatch(
      setItemSelection({
        jobId: store.getState().jobs.activeJobId,
        itemId: "p2",
        change: { isVisible: false },
      })
    );
    // the page structure normally gets this from useSyncStructure
    store.dispatch({
      type: "app/updatePageStructure",
      payload: { fullWidth: ["personalInfo"], left: ["proj"], right: [] },
    });
    const html = renderToString(
      <Provider store={store}>
        <PreviewPage contentRef={{ current: null }} />
      </Provider>
    );
    expect(html).toContain("Projects");
    expect(html).toContain("Visible project");
    expect(html).toContain("Lab");
    expect(html).not.toContain("Secret project");

    store.dispatch(
      setItemSelection({
        jobId: store.getState().jobs.activeJobId,
        itemId: "p2",
        change: { isVisible: true },
      })
    );
    expect(
      renderToString(
        <Provider store={store}>
          <PreviewPage contentRef={{ current: null }} />
        </Provider>
      )
    ).toContain("Secret project");
  });

  it("shows nothing for a generic section whose items are all hidden or missing", () => {
    const store = storeWithProjects();
    store.dispatch({
      type: "app/updatePageStructure",
      payload: { fullWidth: [], left: ["proj"], right: [] },
    });
    const html = renderToString(
      <Provider store={store}>
        <PreviewPage contentRef={{ current: null }} />
      </Provider>
    );
    expect(html).not.toContain("Projects");
  });
});
