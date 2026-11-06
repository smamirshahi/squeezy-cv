// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Inspector } from "@pages/workspace/inspector";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { activeVariantSelector } from "@store/variants/variants-slice";

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
