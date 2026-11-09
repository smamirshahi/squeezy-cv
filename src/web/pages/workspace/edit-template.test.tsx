// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
// eslint-disable-next-line no-restricted-imports -- App.tsx is the only module outside the aliased folders
import { App } from "../../App";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle, setPaperMargin } from "@store/cv-data/cv-data-slice";
import { updatePageStructure } from "@store/app/app-slice";
import { addTemplate, templatesSelector } from "@store/jobs/jobs-slice";
import { undo } from "@store/history/history";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { setVault } from "@store/vault/vault-slice";

/** A store with the default job on its template; `open` adds a second, unused template "second" */
function createStore(): AppStore {
  const store = configureStore({ reducer: undoableReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  return store;
}

async function open(path: string): Promise<AppStore> {
  window.history.replaceState(null, "", path);
  const store = createStore();
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  await waitFor(() =>
    expect(store.getState().persistence.status).not.toBe("loading")
  );
  // After loading, because the load of the (empty, offline) data sets the templates itself
  act(() => {
    store.dispatch(addTemplate({ id: "second", name: "Second look" }));
  });
  return store;
}

function look(store: AppStore, id: string) {
  const template = templatesSelector(store.getState()).find((t) => t.id === id);
  if (!template) {
    throw new Error(`no template ${id}`);
  }
  return template;
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("no server")));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("editing the template named in the address", () => {
  it("writes style edits to that template, not to the active job's", async () => {
    const store = await open("/templates/second/design");
    const firstId = templatesSelector(store.getState())[0].id;
    const before = look(store, firstId).style;
    expect(store.getState().app.editedTemplateId).toBe("second");

    act(() => {
      store.dispatch(setPaperMargin("normal"));
    });
    await waitFor(() =>
      expect(look(store, "second").style.paperMargin).toBe("normal")
    );
    expect(look(store, firstId).style).toEqual(before);
  });

  it("writes layout edits to that template only", async () => {
    const store = await open("/templates/second/design");
    const firstId = templatesSelector(store.getState())[0].id;
    const before = look(store, firstId).layout;
    const custom = { fullWidth: ["personalInfo"], left: [], right: [] };

    act(() => {
      store.dispatch(updatePageStructure(custom));
    });
    await waitFor(() =>
      expect(look(store, "second").layout.fullWidth).toEqual(custom.fullWidth)
    );
    expect(look(store, firstId).layout).toEqual(before);
  });

  it("loads the template's own look when the switcher changes it", async () => {
    const store = await open("/templates/second/design");
    const firstId = templatesSelector(store.getState())[0].id;
    act(() => {
      store.dispatch(setPaperMargin("normal"));
    });
    await waitFor(() =>
      expect(look(store, "second").style.paperMargin).toBe("normal")
    );

    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Editing template" })
    );
    fireEvent.click(screen.getByRole("option", { name: /^Second look/ }));
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Editing template" })
    );
    const options = screen.getAllByRole("option");
    fireEvent.click(
      options.find((o) => !/Second look/.test(o.textContent ?? ""))!
    );

    await waitFor(() =>
      expect(window.location.pathname).toBe(`/templates/${firstId}/design`)
    );
    expect(store.getState().cvData.style).toEqual(look(store, firstId).style);
    expect(look(store, "second").style.paperMargin).toBe("normal");
  });

  it("names the template and says when the job being edited does not use it", async () => {
    await open("/templates/second/design");
    const field = screen.getByRole("combobox", { name: "Editing template" });
    expect(field.textContent).toContain("Second look");
    expect(
      screen.getByText(/Not used by the job you are editing/)
    ).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain(
      "Changes template “Second look”, used by 0 jobs"
    );
  });

  it("fills in the active job's template when the address has none", async () => {
    const store = await open("/templates/design");
    const firstId = templatesSelector(store.getState())[0].id;
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/templates/${firstId}/design`)
    );
    expect(store.getState().app.editedTemplateId).toBe(firstId);
  });

  it("shows not found for an unknown template", async () => {
    const store = await open("/templates/nope/design");
    expect(
      screen.getByRole("main", { name: "Not found" }).textContent
    ).toContain("This template does not exist");
    expect(
      screen.queryByRole("combobox", { name: "Editing template" })
    ).toBeNull();
    expect(store.getState().app.editedTemplateId).toBeNull();
  });

  it("goes back to the active job's template when the page is left", async () => {
    const store = await open("/templates/second/design");
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Tools" })).getByRole(
        "link",
        { name: "Vault" }
      )
    );
    await waitFor(() =>
      expect(store.getState().app.editedTemplateId).toBeNull()
    );
    const firstId = templatesSelector(store.getState())[0].id;
    expect(store.getState().cvData.style).toEqual(look(store, firstId).style);
  });

  it("undo restores the edited template's look in the editor", async () => {
    const store = await open("/templates/second/design");
    const original = look(store, "second").style.paperMargin;
    const other = original === "normal" ? "narrow" : "normal";
    act(() => {
      store.dispatch(setPaperMargin(other));
    });
    await waitFor(() =>
      expect(look(store, "second").style.paperMargin).toBe(other)
    );
    act(() => {
      store.dispatch(undo());
    });
    await waitFor(() =>
      expect(store.getState().cvData.style.paperMargin).toBe(original)
    );
    expect(look(store, "second").style.paperMargin).toBe(original);
  });
});

describe("the Templates list", () => {
  it("has an Edit button on every card that opens Design for that template", async () => {
    const store = await open("/templates");
    const edit = screen.getByRole("link", {
      name: "Edit template Second look",
    });
    expect(edit.getAttribute("href")).toBe("/templates/second/design");
    fireEvent.click(edit);
    expect(window.location.pathname).toBe("/templates/second/design");
    await waitFor(() =>
      expect(store.getState().app.editedTemplateId).toBe("second")
    );
    expect(
      screen.getByRole("combobox", { name: "Editing template" }).textContent
    ).toContain("Second look");
  });

  it("opens Design for the template picked on the list", async () => {
    await open("/templates");
    fireEvent.click(
      screen.getByRole("button", { name: "Show a sample of Second look" })
    );
    const nav = screen.getByRole("navigation", { name: "Template sections" });
    expect(
      within(nav).getByRole("link", { name: "Design" }).getAttribute("href")
    ).toBe("/templates/second/design");
  });

  it("selects a newly created template, and the Design tab then edits it", async () => {
    const store = await open("/templates");
    fireEvent.change(screen.getByLabelText("New template name"), {
      target: { value: "Fresh" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    const fresh = templatesSelector(store.getState()).find(
      (t) => t.name === "Fresh"
    )!;
    const nav = screen.getByRole("navigation", { name: "Template sections" });
    expect(
      within(nav).getByRole("link", { name: "Design" }).getAttribute("href")
    ).toBe(`/templates/${fresh.id}/design`);
  });
});
