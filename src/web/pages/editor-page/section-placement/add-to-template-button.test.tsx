// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { AddToTemplateButton } from "@pages/editor-page/section-placement/add-to-template-button";
import { appReducer, updatePageStructure } from "@store/app/app-slice";
import { vaultReducer, setVault } from "@store/vault/vault-slice";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";

function makeStore() {
  const store = configureStore({
    reducer: { app: appReducer, vault: vaultReducer },
  });
  store.dispatch(setVault(migrateCvFile(sample).vault));
  return store;
}

describe("AddToTemplateButton", () => {
  it("offers a section the template does not place and places it", async () => {
    const store = makeStore();
    const sections = store.getState().vault.sections;
    const last = sections[sections.length - 1];
    store.dispatch(
      updatePageStructure({
        fullWidth: [
          "personalInfo",
          "contactInfo",
          ...sections.slice(0, -1).map((s) => s.id),
        ],
        left: [],
        right: [],
      })
    );
    render(
      <Provider store={store}>
        <AddToTemplateButton />
      </Provider>
    );
    fireEvent.click(
      screen.getByRole("button", { name: /add section to template/i })
    );
    fireEvent.click(await screen.findByRole("menuitem"));
    expect(store.getState().app.structure.fullWidth).toContain(last.id);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows nothing when every section is placed", () => {
    const store = makeStore();
    const ids = store.getState().vault.sections.map((s) => s.id);
    store.dispatch(
      updatePageStructure({ fullWidth: ids, left: [], right: [] })
    );
    render(
      <Provider store={store}>
        <AddToTemplateButton />
      </Provider>
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
