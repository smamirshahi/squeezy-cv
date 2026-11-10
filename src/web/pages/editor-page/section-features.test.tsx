// @vitest-environment jsdom
import { setItemSelection } from "@store/jobs/jobs-slice";
import { afterEach, describe, expect, it } from "vitest";
import {
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
import { setStyle } from "@store/cv-data/cv-data-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { addItem, addSection, setVault } from "@store/vault/vault-slice";
import { getDefaultSectionTitle } from "@store/vault/section-types";
import { Section } from "@custom-types/vault-types";
import { AddSectionButton } from "@pages/editor-page/sections/add-section-dialog";
import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
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

function section(store: AppStore, id: string): Section {
  return store.getState().vault.sections.find((s) => s.id === id)!;
}

describe("SectionTitleField and AddSectionButton", () => {
  it("renames a section at once", () => {
    const store = createStore();
    renderWith(
      store,
      <SectionTitleField section={section(store, "education")} />
    );
    fireEvent.change(screen.getByLabelText("Section title"), {
      target: { value: "Studies" },
    });
    expect(section(store, "education").title).toBe("Studies");
  });

  it("adds a section with the chosen type and title", () => {
    const store = createStore();
    renderWith(store, <AddSectionButton />);
    fireEvent.click(screen.getByText("New section"));
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Type" }));
    fireEvent.click(screen.getByRole("option", { name: /^Skills/ }));
    fireEvent.change(screen.getByLabelText("New section title"), {
      target: { value: "My papers" },
    });
    fireEvent.click(screen.getByText("Add"));
    expect(store.getState().vault.sections.at(-1)).toMatchObject({
      type: "skills",
      title: "My papers",
      items: [],
    });
  });

  it("uses the default title when none is typed", () => {
    const store = createStore();
    renderWith(store, <AddSectionButton />);
    fireEvent.click(screen.getByText("New section"));
    fireEvent.click(screen.getByText("Add"));
    expect(store.getState().vault.sections.at(-1)).toMatchObject({
      type: "custom",
      title: getDefaultSectionTitle("custom"),
    });
  });

  it("asks before deleting and can be cancelled", () => {
    const store = createStore();
    renderWith(
      store,
      <SectionTitleField section={section(store, "education")} />
    );
    fireEvent.click(screen.getByLabelText("Delete section Education"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/its 1 item will be deleted/)).toBeTruthy();
    fireEvent.click(within(dialog).getByText("Cancel"));
    expect(section(store, "education")).toBeTruthy();
    expect(store.getState().vault.sections).toHaveLength(4);
  });

  it("deletes a section with its items after confirming", () => {
    const store = createStore();
    renderWith(
      store,
      <SectionTitleField section={section(store, "education")} />
    );
    fireEvent.click(screen.getByLabelText("Delete section Education"));
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Delete"));
    expect(store.getState().vault.sections.map((s) => s.id)).toEqual([
      "summary",
      "experience",
      "skills",
    ]);
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
