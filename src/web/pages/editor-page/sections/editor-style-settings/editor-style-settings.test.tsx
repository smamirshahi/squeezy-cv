// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { TypographyVariant } from "@custom-styles/custom-styles";

afterEach(cleanup);

function setup(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  render(
    <Provider store={store}>
      <EditorTypography />
    </Provider>
  );
  return store;
}

const typographyOf = (store: AppStore) =>
  store.getState().cvData.style.typography;

describe("Style settings page", () => {
  it("shows one row for each of the 8 styles and the preview", () => {
    setup();
    expect(document.querySelectorAll("[data-style-row]")).toHaveLength(8);
    expect(screen.getByLabelText("Live preview")).toBeTruthy();
    expect(screen.queryByText("Apply")).toBeNull();
  });

  it("steps the size at once", () => {
    const store = setup();
    expect(typographyOf(store).bodyMd.fontSize).toBe("10pt");
    fireEvent.click(screen.getByLabelText("Increase bodyMd size"));
    expect(typographyOf(store).bodyMd.fontSize).toBe("11pt");
    fireEvent.click(screen.getByLabelText("Decrease bodyMd size"));
    fireEvent.click(screen.getByLabelText("Decrease bodyMd size"));
    expect(typographyOf(store).bodyMd.fontSize).toBe("9pt");
  });

  it("toggles the weight and marks the pressed button", () => {
    const store = setup();
    const group = screen.getByLabelText("bodyMd weight");
    const bold = group.querySelectorAll("button")[1];
    fireEvent.click(bold);
    expect(typographyOf(store).bodyMd.fontWeight).toBe("700");
    expect(bold.getAttribute("aria-pressed")).toBe("true");
  });

  it("saves a valid colour, picks presets, and refuses an invalid one", () => {
    const store = setup();
    const field = screen.getByLabelText("bodyMd colour hex");
    fireEvent.change(field, { target: { value: "#123" } });
    expect(typographyOf(store).bodyMd.color).toBe("#112233");
    fireEvent.change(field, { target: { value: "#12" } });
    expect(typographyOf(store).bodyMd.color).toBe("#112233");
    expect(screen.getByText("Use a colour like #555555")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Use #333333 for bodyMd"));
    expect(typographyOf(store).bodyMd.color).toBe("#333333");
  });

  it("warns about a colour with low contrast", () => {
    setup();
    fireEvent.change(screen.getByLabelText("bodyMd colour hex"), {
      target: { value: "#cccccc" },
    });
    expect(screen.getByText(/Low contrast on white/)).toBeTruthy();
  });

  it("shows the style names in the preview only when asked", () => {
    setup();
    const paper = screen.getByTestId("style-preview-paper");
    expect(paper.textContent).toContain("headingLg");
    fireEvent.click(screen.getByLabelText("Show style names"));
    expect(paper.textContent).not.toContain("headingLg");
  });

  it("draws the preview with the current style and resets to defaults", () => {
    const store = setup();
    fireEvent.click(screen.getByLabelText("Increase headingLg size"));
    const line = document.querySelector("[data-style-line=headingLg]");
    expect(getComputedStyle(line as Element).fontSize).toBe("26.6667px"); // 20pt
    fireEvent.click(screen.getByText("Reset to defaults"));
    expect(typographyOf(store)).toEqual(TypographyVariant);
  });
});
