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
import {
  setDateFormat,
  setShouldShowRightToWork,
  setShouldShowNationality,
} from "@store/cv-data/cv-data-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { setItemSelection, setVariants } from "@store/jobs/jobs-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  moveSection,
  removeSection,
  setVault,
  updateProfile,
} from "@store/vault/vault-slice";
import {
  reconcileStructure,
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";
import { HEADER_IDS } from "@shared/vault/default-vault";

function createStore(): AppStore {
  return configureStore({ reducer: rootReducer });
}

function makeStore(): AppStore {
  const store = createStore();
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "v1")]));
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
      setItemSelection({
        jobId: "v1",
        itemId: "exp-3",
        change: { isVisible: true },
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
    // a section the structure does not place yet is added to the left column
    expect(html).toContain("Front-end developer with six years");
  });

  it("is not affected by the order of sections in the vault", () => {
    const store = makeStore();
    store.dispatch(moveSection({ id: "skills", toIndex: 0 }));
    expect(render(store)).toContain("French");
  });
});

/** Only the words on the page, one chunk per element */
function textOf(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

describe("UK single-column template", () => {
  it("is the default: header first, then each section in order", () => {
    const text = textOf(render(makeStore()));
    expect(text).toMatchSnapshot();

    const order = [
      "Jane Doe",
      "Professional Summary",
      "Work Experience",
      "Education",
      "Skills",
    ].map((heading) => text.indexOf(heading));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("puts sections in one full-width column and none in the others", () => {
    const sections = makeStore().getState().vault.sections;
    const layout = singleColumnLayout(sections);
    expect(layout.left).toEqual([]);
    expect(layout.right).toEqual([]);
    expect(layout.fullWidth.slice(0, 2)).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
  });

  it("still offers the two-column layout", () => {
    const store = makeStore();
    const sections = store.getState().vault.sections;
    const layout = twoColumnLayout(sections);
    expect(layout.fullWidth).toContain("summary");
    expect(layout.left).toEqual(["experience"]);
    expect(layout.right).toEqual(["education", "skills"]);

    store.dispatch(updatePageStructure(layout));
    const text = textOf(render(store));
    expect(text).toContain("Senior Software Developer");
    expect(text).toContain("University of Example");
  });

  it("writes dates as month and year", () => {
    const withDefault = makeStore();
    withDefault.dispatch(setDateFormat("MMM YYYY"));
    const text = textOf(render(withDefault));
    expect(text).toMatch(
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\b/
    );
    const store = makeStore();
    store.dispatch(setDateFormat("DD/MM/YYYY"));
    expect(textOf(render(store))).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("shows the right-to-work line only when it is set and turned on", () => {
    const store = makeStore();
    store.dispatch(
      updateProfile({ rightToWork: "Eligible to work in the UK" })
    );
    expect(textOf(render(store))).not.toContain("Eligible to work");

    store.dispatch(setShouldShowRightToWork(true));
    expect(textOf(render(store))).toContain("Eligible to work in the UK");

    store.dispatch(updateProfile({ rightToWork: "" }));
    expect(textOf(render(store))).not.toContain("Eligible to work");
  });

  it("shows the nationalities only when set and turned on", () => {
    const store = makeStore();
    store.dispatch(updateProfile({ nationalities: ["British", "Iranian"] }));
    expect(textOf(render(store))).not.toContain("Nationality");

    store.dispatch(setShouldShowNationality(true));
    expect(textOf(render(store))).toContain("Nationality: British, Iranian");

    store.dispatch(updateProfile({ nationalities: [] }));
    expect(textOf(render(store))).not.toContain("Nationality");
  });

  it("draws a highlighted item in bold", () => {
    const store = makeStore();
    const plain = render(store);
    store.dispatch(
      setItemSelection({
        jobId: "v1",
        itemId: "exp-1",
        change: { emphasis: "high" },
      })
    );
    const highlighted = render(store);
    expect(highlighted).not.toBe(plain);
    expect(highlighted.match(/font-weight:700/g)?.length ?? 0).toBeGreaterThan(
      plain.match(/font-weight:700/g)?.length ?? 0
    );
  });

  it("keeps items together and the page black on white", () => {
    const html = render(makeStore());
    expect(html).toContain("break-inside:avoid");
    expect(html).toMatch(/color:#000;background-color:#fff/);
  });
});
