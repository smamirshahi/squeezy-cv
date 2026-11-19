// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
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
import { TemplatesPage } from "@pages/workspace/templates-page";
import {
  addTemplate,
  markPlaceholder,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(migrateCvFile(sample).vault));
  store.dispatch(addTemplate({ id: "second", name: "Second look" }));
  render(
    <Provider store={store}>
      <TemplatesPage />
    </Provider>
  );
  return store;
}

describe("templates page", () => {
  it("shows the sample of the clicked template and highlights its card", () => {
    const store = setup();
    const [first] = templatesSelector(store.getState());
    expect(screen.getByText(`Sample: ${first.name}`)).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Show a sample of Second look" })
    );
    expect(screen.getByText("Sample: Second look")).toBeTruthy();
    const cards = screen.getAllByRole("listitem");
    const selected = cards.filter(
      (card) => card.getAttribute("data-selected") === "true"
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain("Second look");
    expect(screen.getByTestId("sample-cv").textContent).toContain("Jane Doe");
  });

  it("with no template: no cards, and the Sections and Design links are disabled", () => {
    const store: AppStore = configureStore({ reducer: rootReducer });
    store.dispatch(setVault(migrateCvFile(sample).vault));
    store.dispatch(markPlaceholder());
    render(
      <Provider store={store}>
        <TemplatesPage />
      </Provider>
    );
    expect(
      within(screen.getByRole("list", { name: "Templates" })).queryAllByRole(
        "listitem"
      )
    ).toHaveLength(0);
    expect(screen.getByRole("button", { name: "New template" })).toBeTruthy();
    for (const name of ["Sections", "Design"]) {
      const link = screen.getByText(name).closest("a");
      expect(link?.getAttribute("aria-disabled")).toBe("true");
    }
    expect(screen.getAllByText("Create a template first")).toHaveLength(2);
  });

  it("lists the Developer template as premade, below the templates", () => {
    setup();
    const premade = within(screen.getByRole("list", { name: "Premade" }));
    expect(premade.getByText("Developer")).toBeTruthy();
    expect(premade.getByText("Premade")).toBeTruthy();
    // it is not a saved template yet
    expect(
      within(screen.getByRole("list", { name: "Templates" })).queryByText(
        "Developer"
      )
    ).toBeNull();
  });

  it("adds a one-column Developer template from the premade card", () => {
    const store = setup();
    const before = templatesSelector(store.getState()).length;
    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Developer template to my templates",
      })
    );
    const templates = templatesSelector(store.getState());
    expect(templates).toHaveLength(before + 1);
    const added = templates.find((t) => t.name === "Developer")!;
    expect(added.layout.left).toEqual([]);
    expect(added.layout.right).toEqual([]);
    expect(added.layout.fullWidth.slice(0, 2)).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
    expect(added.style.colors).toEqual({
      text: "#222222",
      secondary: "#555555",
      accent: "#1f3a5f",
    });
    // a real card appears, and the premade card stays so it can be added again
    expect(
      within(screen.getByRole("list", { name: "Templates" })).getByText(
        "Developer"
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Add Developer template to my templates",
      })
    ).toBeTruthy();
  });
});
