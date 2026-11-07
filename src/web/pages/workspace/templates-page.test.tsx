// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TemplatesPage } from "@pages/workspace/templates-page";
import { addTemplate, templatesSelector } from "@store/jobs/jobs-slice";
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
});
