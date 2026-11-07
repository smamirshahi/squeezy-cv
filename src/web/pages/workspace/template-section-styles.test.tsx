// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TemplateSectionStyles } from "@pages/workspace/template-section-styles";
import { activeTemplateSelector } from "@store/jobs/jobs-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

const file = migrateCvFile(sample);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  render(
    <Provider store={store}>
      <TemplateSectionStyles />
    </Provider>
  );
  return store;
}

describe("template section styles", () => {
  it("says which template changes and shows a sample of the vault", () => {
    setup();
    expect(screen.getByRole("note").textContent).toContain("Changes template");
    expect(screen.getByTestId("sample-cv").textContent).toContain("Jane Doe");
  });

  it("saves a heading size for the picked section", () => {
    const store = setup();
    fireEvent.change(screen.getByLabelText("Heading size (pt)"), {
      target: { value: "20" },
    });
    const first = file.vault.sections[0].id;
    expect(activeTemplateSelector(store.getState()).sectionStyles).toEqual({
      [first]: { headingSize: 20 },
    });
  });

  it("turns the line off and resets to the global style", () => {
    const store = setup();
    fireEvent.click(screen.getByLabelText("Line under the heading"));
    const first = file.vault.sections[0].id;
    expect(
      activeTemplateSelector(store.getState()).sectionStyles?.[first]
    ).toEqual({ showDivider: false });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Use the global style for this section",
      })
    );
    expect(
      activeTemplateSelector(store.getState()).sectionStyles
    ).toBeUndefined();
  });

  it("does not save an invalid colour", () => {
    const store = setup();
    const field = screen.getByLabelText("Heading colour");
    fireEvent.change(field, { target: { value: "nope" } });
    expect(
      activeTemplateSelector(store.getState()).sectionStyles
    ).toBeUndefined();
    fireEvent.change(field, { target: { value: "#112233" } });
    expect(
      Object.values(
        activeTemplateSelector(store.getState()).sectionStyles ?? {}
      )[0]
    ).toEqual({ headingColor: "#112233" });
  });
});
