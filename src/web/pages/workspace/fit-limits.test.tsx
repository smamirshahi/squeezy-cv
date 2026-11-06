// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Inspector } from "@pages/workspace/inspector";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { activeVariantSelector } from "@store/variants/variants-slice";
import { setSelectedBlock } from "@store/app/app-slice";
import { setVault } from "@store/vault/vault-slice";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  render(
    <Provider store={store}>
      <Inspector />
    </Provider>
  );
  return store;
}

describe("auto-fit limit fields", () => {
  it("an empty field is not saved as 0 and shows the saved value when left", () => {
    const store = setup();
    const field = screen.getByLabelText<HTMLInputElement>("Margins ≥ mm");
    fireEvent.change(field, { target: { value: "" } });
    expect(field.value).toBe("");
    expect(
      activeVariantSelector(store.getState()).fitLimits?.minMarginMm
    ).toBeUndefined();
    fireEvent.blur(field);
    expect(field.value).toBe("14");
  });

  it("saves a typed number inside its range and clamps one outside it", () => {
    const store = setup();
    const field = screen.getByLabelText<HTMLInputElement>("Text ≥ pt");
    fireEvent.change(field, { target: { value: "10" } });
    expect(activeVariantSelector(store.getState()).fitLimits?.minBodyPt).toBe(
      10
    );
    fireEvent.change(field, { target: { value: "2" } });
    expect(activeVariantSelector(store.getState()).fitLimits?.minBodyPt).toBe(
      6
    );
    fireEvent.blur(field);
    expect(field.value).toBe("6");
  });

  it("shows spacing as a percentage", () => {
    setup();
    expect(screen.getByLabelText<HTMLInputElement>("Spacing ≥ %").value).toBe(
      "40"
    );
  });
});

describe("skills style in the inspector", () => {
  it("changes only the active variant: level style, columns, minimum level", () => {
    const store = setup();
    const vault = migrateCvFile(sample).vault;
    const skills = vault.sections.find((s) => s.type === "skills")!;
    act(() => {
      store.dispatch(setVault(vault));
      store.dispatch(setSelectedBlock({ sectionId: skills.id }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Bars" }));
    fireEvent.click(screen.getByRole("button", { name: "2 columns" }));
    const variant = activeVariantSelector(store.getState());
    expect(variant.skillDisplay).toBe("bars");
    expect(variant.skillColumns).toBe(2);
    expect(store.getState().vault.sections).toEqual(vault.sections);
  });

  it("groups flat, and the skill list hides and counts skills for this variant only", () => {
    const store = setup();
    const vault = migrateCvFile(sample).vault;
    const skills = vault.sections.find((s) => s.type === "skills")!;
    act(() => {
      store.dispatch(setVault(vault));
      store.dispatch(setSelectedBlock({ sectionId: skills.id }));
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Flat, highest level first" })
    );
    expect(activeVariantSelector(store.getState()).skillGroupBy).toBe("level");

    const total = skills.items.flatMap((i) => i.bullets).length;
    expect(screen.getByText(`${total} of ${total} shown`)).toBeTruthy();
    const first = skills.items[0].bullets[0];
    fireEvent.click(screen.getByRole("button", { name: `Hide ${first.text}` }));
    expect(screen.getByText(`${total - 1} of ${total} shown`)).toBeTruthy();
    expect(store.getState().vault.sections).toEqual(vault.sections);
  });
});
