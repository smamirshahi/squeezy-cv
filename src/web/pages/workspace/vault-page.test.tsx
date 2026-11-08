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
import { VaultPage } from "@pages/workspace/vault-page";
// eslint-disable-next-line no-restricted-imports -- App.tsx is the only module outside the aliased folders
import { App } from "../../App";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { addSection, removeSection, setVault } from "@store/vault/vault-slice";

beforeEach(() => window.history.replaceState(null, "", "/vault"));
afterEach(cleanup);

function createStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  return store;
}

function renderEditor(store: AppStore): void {
  render(
    <Provider store={store}>
      <VaultPage />
    </Provider>
  );
}

describe("VaultPage", () => {
  it("lists the fixed pages and one page per vault section", () => {
    renderEditor(createStore());
    for (const label of [
      "Main Info",
      "Professional Summary",
      "Work Experience",
      "Education",
      "Skills",
    ]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
  });

  it("opens the editor of the chosen section and shows the matching footer button", () => {
    const store = createStore();
    renderEditor(store);
    expect(screen.queryByText("Add new experience")).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: /^Work Experience/ }));
    expect(store.getState().app.selectedSectionInEditorPage).toBe("experience");
    expect(screen.getAllByLabelText("Job Title")).toHaveLength(3);
    expect(screen.getByText("Add new experience")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^Skills/ }));
    expect(screen.getByText("Add new skill category")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Main Info" }));
    expect(screen.getByRole("button", { name: "Add new link" })).toBeTruthy();
  });

  it("the footer buttons add an item and apply it end to end", () => {
    const store = createStore();
    renderEditor(store);
    fireEvent.click(screen.getByRole("link", { name: /^Work Experience/ }));
    fireEvent.click(screen.getByText("Add new experience"));
    expect(screen.getAllByLabelText("Job Title")).toHaveLength(4);
    fireEvent.click(screen.getByText("Apply"));
    expect(
      store.getState().vault.sections.find((s) => s.id === "experience")!.items
    ).toHaveLength(4);
  });

  it("experience and education have no eye button and keep Add below the list", () => {
    renderEditor(createStore());
    for (const name of [/^Work Experience/, /^Education/]) {
      fireEvent.click(screen.getByRole("link", { name }));
      expect(screen.queryByTestId("VisibilityIcon")).toBeNull();
      expect(screen.queryByTestId("VisibilityOffIcon")).toBeNull();
      const add = screen.getByRole("button", { name: /^Add new/ });
      const apply = screen.getByRole("button", { name: "Apply" });
      // The add button is inside the editor panel, the footer is a separate sticky bar
      expect(apply.parentElement?.contains(add)).toBe(false);
      expect(getComputedStyle(apply.parentElement!).position).toBe("sticky");
    }
  });

  it("holds only the user's data: no job data, style or layout pages", () => {
    renderEditor(createStore());
    for (const label of ["Job data", "Style Settings", "Jobs", "SETTINGS"]) {
      expect(screen.queryByText(label), label).toBeNull();
    }
  });

  it("falls back to the first page when the selected section is deleted", () => {
    const store = createStore();
    renderEditor(store);
    fireEvent.click(screen.getByRole("link", { name: /^Education/ }));
    expect(screen.getAllByLabelText("Degree").length).toBe(1);
    act(() => {
      store.dispatch(removeSection({ id: "education" }));
    });
    expect(screen.queryAllByLabelText("Degree")).toHaveLength(0);
    expect(screen.getByLabelText("Full Name")).toBeTruthy();
  });

  it("opens the generic editor for sections without a special layout", () => {
    const store = createStore();
    renderEditor(store);
    act(() => {
      store.dispatch(
        addSection({ id: "proj", type: "projects", title: "Projects" })
      );
    });
    fireEvent.click(screen.getByRole("link", { name: /^Projects/ }));
    expect(screen.getByText("Add new item")).toBeTruthy();
    fireEvent.click(screen.getByText("Add new item"));
    expect(screen.getAllByLabelText("Title")).toHaveLength(1);
  });

  it("shows Sections only as a heading, and a section page has a title field", () => {
    const store = createStore();
    renderEditor(store);
    expect(screen.getByText("SECTIONS")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sections" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /Education/ }));
    expect(screen.getByLabelText("Section title")).toBeTruthy();
  });
});

describe("App", () => {
  it("adds new and imported sections to the page structure", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    // the default page is one column
    expect(store.getState().app.structure.fullWidth).toContain("experience");
    expect(store.getState().app.structure.left).toEqual([]);

    act(() => {
      store.dispatch(
        addSection({ id: "proj", type: "projects", title: "Projects" })
      );
    });
    expect(store.getState().app.structure.left).toContain("proj");

    act(() => {
      store.dispatch(removeSection({ id: "skills" }));
    });
    const { structure } = store.getState().app;
    expect([
      ...structure.fullWidth,
      ...structure.left,
      ...structure.right,
    ]).not.toContain("skills");
  });
});
