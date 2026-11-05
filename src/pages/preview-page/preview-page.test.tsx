import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AppStore } from "@store/store-helper";
import sample from "@fixtures/sample-cv.json";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { rootReducer } from "@store/store";
import { setMetaData, setStyle } from "@store/cv-data/cv-data-slice";
import { updatePageStructure } from "@store/app/app-slice";
import { migrateCvFile } from "@store/vault/migrate-vault";
import {
  moveSection,
  removeSection,
  setItemVisibility,
  setVault,
  updateProfile,
} from "@store/vault/vault-slice";
import { reconcileStructure } from "@store/vault/page-structure";
import { HEADER_IDS } from "@store/vault/default-vault";

function createStore(): AppStore {
  return configureStore({ reducer: rootReducer });
}

function makeStore(): AppStore {
  const store = createStore();
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setMetaData(file.metaData));
  return store;
}

function render(store: AppStore): string {
  return renderToString(
    <Provider store={store}>
      <PreviewPage contentRef={{ current: null }} />
    </Provider>
  );
}

describe("PreviewPage (rendered from the vault)", () => {
  it("shows the profile, links, summary and all section content", () => {
    const html = render(makeStore());
    for (const text of [
      "Jane Doe",
      "Software Developer",
      "jane.doe@example.com",
      "https://www.linkedin.com/in/janedoe-example",
      "https://github.com/janedoe-example",
      "Front-end developer with six years",
      "Work Experience",
      "Senior Software Developer",
      "Example Ltd",
      "Mentored two junior developers",
      "BSc Computer Science",
      "University of Example",
      "Frontend",
      "French",
    ]) {
      expect(html, text).toContain(text);
    }
  });

  it("does not show hidden items", () => {
    const html = render(makeStore());
    expect(html).not.toContain("Demo Co");
    expect(html).not.toContain("Fixed UI bugs in a legacy jQuery");
  });

  it("shows an item as soon as it is made visible", () => {
    const store = makeStore();
    store.dispatch(
      setItemVisibility({
        sectionId: "experience",
        itemId: "exp-3",
        shouldShow: true,
      })
    );
    expect(render(store)).toContain("Demo Co");
  });

  it("uses the section title as the heading", () => {
    const store = makeStore();
    const vault = store.getState().vault;
    const sections = vault.sections.map((s) =>
      s.id === "education" ? { ...s, title: "Studies" } : s
    );
    store.dispatch(setVault({ ...vault, sections }));
    const html = render(store);
    expect(html).toContain("Studies");
  });

  it("shortens links when the style says so", () => {
    const store = makeStore();
    const style = store.getState().cvData.style;
    store.dispatch(setStyle({ ...style, shouldShowFullContactLinks: false }));
    const html = render(store);
    expect(html).not.toContain("https://github.com/janedoe-example");
    expect(html).toContain("janedoe-example");
  });

  it("hides the name block when there is no name", () => {
    const store = makeStore();
    store.dispatch(updateProfile({ fullName: "" }));
    expect(render(store)).not.toContain("Jane Doe");
  });

  it("drops a deleted section once the structure is reconciled", () => {
    const store = makeStore();
    store.dispatch(removeSection({ id: "skills" }));
    const state = store.getState();
    store.dispatch(
      updatePageStructure(
        reconcileStructure(state.app.structure, [
          ...HEADER_IDS,
          ...state.vault.sections.map((s) => s.id),
        ])
      )
    );
    const html = render(store);
    expect(html).not.toContain("French");
    expect(html).toContain("Work Experience");
  });

  it("renders sections in the order of the page structure", () => {
    const store = makeStore();
    store.dispatch(
      updatePageStructure({
        fullWidth: ["personalInfo"],
        left: ["education"],
        right: ["experience"],
      })
    );
    const html = render(store);
    expect(html.indexOf("University of Example")).toBeLessThan(
      html.indexOf("Senior Software Developer")
    );
    expect(html).not.toContain("Front-end developer with six years");
  });

  it("is not affected by the order of sections in the vault", () => {
    const store = makeStore();
    store.dispatch(moveSection({ id: "skills", toIndex: 0 }));
    expect(render(store)).toContain("French");
  });
});
