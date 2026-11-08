// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "@store/store";
import {
  descriptionLines,
  ItemDescription,
} from "@pages/preview-page/item-description";

afterEach(cleanup);

describe("descriptionLines", () => {
  it("splits on line breaks and drops empty lines and padding", () => {
    expect(descriptionLines("  First thing\r\n\n  Second thing  \n")).toEqual([
      "First thing",
      "Second thing",
    ]);
    expect(descriptionLines(undefined)).toEqual([]);
    expect(descriptionLines("   \n ")).toEqual([]);
  });
});

describe("ItemDescription", () => {
  it("draws one measurable block per line", () => {
    const store = configureStore({ reducer: rootReducer });
    const { container } = render(
      <Provider store={store}>
        <ItemDescription text={"Built the API\nLed three people"} />
      </Provider>
    );
    expect(screen.getByText("Built the API")).toBeTruthy();
    expect(screen.getByText("Led three people")).toBeTruthy();
    expect(container.querySelectorAll("[data-cv-block]")).toHaveLength(2);
  });

  it("draws nothing without text", () => {
    const store = configureStore({ reducer: rootReducer });
    const { container } = render(
      <Provider store={store}>
        <ItemDescription text="" />
      </Provider>
    );
    expect(container.innerHTML).toBe("");
  });
});
