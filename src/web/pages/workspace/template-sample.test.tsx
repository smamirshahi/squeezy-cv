// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TemplateSample } from "@pages/workspace/template-section-styles";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setSectionShown, setVariants } from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

const file = migrateCvFile(sample);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  render(
    <Provider store={store}>
      <TemplateSample />
    </Provider>
  );
  return store;
}

const sampleText = (): string =>
  screen.getByTestId("sample-cv").textContent ?? "";

describe("template sample", () => {
  it("shows every section of the vault", () => {
    setup();
    for (const section of file.vault.sections) {
      if (section.items.length > 0) {
        expect(sampleText()).toContain(section.title);
      }
    }
  });

  it("leaves out a section removed from the active job and brings it back", () => {
    const store = setup();
    const section = file.vault.sections.find(
      (s) => s.type === "education" && s.items.length > 0
    )!;
    expect(sampleText()).toContain(section.title);

    act(() => {
      store.dispatch(
        setSectionShown({
          jobId: "main",
          sectionId: section.id,
          isShown: false,
        })
      );
    });
    expect(sampleText()).not.toContain(section.title);

    act(() => {
      store.dispatch(
        setSectionShown({ jobId: "main", sectionId: section.id, isShown: true })
      );
    });
    expect(sampleText()).toContain(section.title);
  });
});
