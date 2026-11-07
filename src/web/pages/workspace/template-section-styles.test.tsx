// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TemplateSample } from "@pages/workspace/template-section-styles";
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
      <TemplateSample />
    </Provider>
  );
  return store;
}

describe("template section styles", () => {
  it("shows a sample of the vault", () => {
    setup();
    expect(screen.getByTestId("sample-cv").textContent).toContain("Jane Doe");
  });
});
