// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { StylePreviewPanel } from "@pages/editor-page/sections/editor-style-settings/style-preview";
import { DEFAULT_COLORS } from "@shared/style/resolve-style";
import { TypographyVariant } from "@custom-styles/custom-styles";

afterEach(cleanup);

function setup(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  render(
    <Provider store={store}>
      <EditorTypography />
      <StylePreviewPanel />
    </Provider>
  );
  return store;
}

const colorsOf = (store: AppStore) => store.getState().cvData.style.colors!;

const typographyOf = (store: AppStore) =>
  store.getState().cvData.style.typography;

describe("Style settings page", () => {
  it("shows one row for each of the 5 styles, the colours and the preview", () => {
    setup();
    expect(document.querySelectorAll("[data-style-row]")).toHaveLength(5);
    expect(screen.getByLabelText("Colours")).toBeTruthy();
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

  it("opens a palette, saves a typed colour and refuses an invalid one", () => {
    const store = setup();
    fireEvent.click(screen.getByLabelText("Text colour"));
    const field = screen.getByLabelText("Text colour hex");
    fireEvent.change(field, { target: { value: "#123" } });
    expect(colorsOf(store).text).toBe("#112233");
    fireEvent.change(field, { target: { value: "#12" } });
    expect(colorsOf(store).text).toBe("#112233");
    expect(screen.getByText("Use a colour like #555555")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Use #333333 for Text"));
    expect(colorsOf(store).text).toBe("#333333");
  });

  it("sets the secondary colour and the accent, and can remove the accent", () => {
    const store = setup();
    expect(colorsOf(store).accent).toBeUndefined();
    fireEvent.click(screen.getByLabelText("Accent colour"));
    fireEvent.click(screen.getByLabelText("Use #1f3a5f for Accent"));
    expect(colorsOf(store).accent).toBe("#1f3a5f");
    fireEvent.click(screen.getByText("No accent"));
    expect(colorsOf(store).accent).toBeUndefined();
    fireEvent.click(screen.getByLabelText("Secondary colour"));
    fireEvent.change(screen.getByLabelText("Secondary colour hex"), {
      target: { value: "#444444" },
    });
    expect(colorsOf(store).secondary).toBe("#444444");
  });

  it("has a shade area and a hue slider in the picker", () => {
    setup();
    fireEvent.click(screen.getByLabelText("Accent colour"));
    expect(screen.getByLabelText(/Accent shade/)).toBeTruthy();
    expect(screen.getByLabelText("Accent hue")).toBeTruthy();
  });

  it("changes the colour with the arrow keys on the shade area", () => {
    const store = setup();
    fireEvent.click(screen.getByLabelText("Text colour"));
    fireEvent.change(screen.getByLabelText("Text colour hex"), {
      target: { value: "#ff0000" },
    });
    fireEvent.keyDown(screen.getByLabelText(/Text shade/), {
      key: "ArrowDown",
    });
    expect(colorsOf(store).text).not.toBe("#ff0000");
    expect(colorsOf(store).text).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("groups the header options under one heading and saves each choice", () => {
    const store = setup();
    expect(screen.getByText("Show in the header")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Nationality"));
    fireEvent.click(screen.getByLabelText("Right to work"));
    fireEvent.click(screen.getByLabelText("Links (LinkedIn, GitHub, ...)"));
    const style = store.getState().cvData.style;
    expect(style.shouldShowNationality).toBe(true);
    expect(style.shouldShowRightToWork).toBe(true);
    expect(style.shouldShowLinks).toBe(false);
  });

  it("has no colour field in the style table", () => {
    setup();
    expect(screen.queryByLabelText("bodyMd colour hex")).toBeNull();
  });

  it("explains a low contrast colour in an info tooltip, not in the page", () => {
    setup();
    expect(screen.queryByLabelText(/Low contrast on white/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Text colour"));
    fireEvent.change(screen.getByLabelText("Text colour hex"), {
      target: { value: "#cccccc" },
    });
    expect(
      screen.getByLabelText("Low contrast on white for Text")
    ).toBeTruthy();
    expect(screen.queryByText(/Hard to read on white paper/)).toBeNull();
  });

  it("resets to defaults", () => {
    const store = setup();
    fireEvent.click(screen.getByLabelText("Increase headingLg size"));
    fireEvent.click(screen.getByText("Reset colours and text styles"));
    expect(typographyOf(store)).toEqual(TypographyVariant);
    expect(colorsOf(store)).toEqual(DEFAULT_COLORS);
  });

  it("tells where a style is used in a tooltip next to it", () => {
    setup();
    expect(screen.getByLabelText("Where headingLg is used")).toBeTruthy();
  });

  it("sets the space between sections and the line under titles for the whole template", () => {
    const store = setup();
    fireEvent.change(screen.getByLabelText("Space between sections (px)"), {
      target: { value: "20" },
    });
    expect(store.getState().cvData.style.sectionSpacing).toBe(20);
    fireEvent.change(screen.getByLabelText("Space between sections (px)"), {
      target: { value: "99" },
    });
    expect(store.getState().cvData.style.sectionSpacing).toBe(40);
    fireEvent.click(screen.getByLabelText("Line under section titles"));
    expect(store.getState().cvData.style.hasHeadingLine).toBe(false);
  });
});
