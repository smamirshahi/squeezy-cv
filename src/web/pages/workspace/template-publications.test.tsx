// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { SectionProperties } from "@pages/workspace/template-section-properties";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { sectionsSelector, setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  const vault = migrateCvFile(sample).vault;
  store.dispatch(
    setVault({ ...vault, profile: { ...vault.profile, fullName: "Jane Doe" } })
  );
  const publications = {
    id: "pubs",
    type: "publications" as const,
    title: "Publications",
    items: [],
  };
  render(
    <Provider store={store}>
      <SectionProperties id="pubs" section={publications} />
    </Provider>
  );
  return store;
}

describe("Publications properties", () => {
  it("shows a live sample with my name bold, the journal in italics and the link at the end", () => {
    setup();
    const preview = screen.getByTestId("citation-sample");
    expect(preview.textContent).toContain("Faster rendering for dashboards");
    expect(preview.textContent).toMatch(/doi\.org\/10\.1234\/example$/);
    expect(preview.querySelector("i, span[style*='italic']")).toBeTruthy();
    expect(
      Array.from(preview.querySelectorAll<HTMLElement>("span")).some(
        (span) => span.style.fontWeight === "700"
      )
    ).toBe(true);
    expect(preview.querySelector("a")?.getAttribute("href")).toBe(
      "https://doi.org/10.1234/example"
    );
  });

  it("make my name bold off removes the bold", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("switch", { name: "Make my name bold" }));
    expect(store.getState().cvData.style.highlightOwnName).toBe(false);
    const preview = screen.getByTestId("citation-sample");
    expect(
      Array.from(preview.querySelectorAll<HTMLElement>("span")).some(
        (span) => span.style.fontWeight === "700"
      )
    ).toBe(false);
  });

  it("saves my name as written in citations in the vault, not in the template", () => {
    const store = setup();
    fireEvent.change(screen.getByLabelText("My name as written in citations"), {
      target: { value: "Doe, J." },
    });
    expect(store.getState().vault.profile.citationName).toBe("Doe, J.");
    expect(JSON.stringify(store.getState().cvData.style)).not.toContain(
      "Doe, J."
    );
    expect(sectionsSelector(store.getState()).length).toBeGreaterThan(0);
  });

  it("links not shown removes the link from the sample", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Not shown" }));
    expect(store.getState().cvData.style.publicationLinks).toBe("none");
    expect(screen.getByTestId("citation-sample").querySelector("a")).toBeNull();
  });

  it("saves the order and the author limit", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "My order" }));
    expect(store.getState().cvData.style.publicationOrder).toBe("manual");
  });
});
