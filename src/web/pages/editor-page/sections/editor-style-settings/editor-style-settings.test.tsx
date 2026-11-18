// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { TemplateDesignPage } from "@pages/workspace/template-design-page";
import { DEFAULT_COLORS } from "@shared/style/resolve-style";
import { TypographyVariant } from "@custom-styles/custom-styles";

afterEach(cleanup);

/** The Design tab opens on Page; the settings of the other groups show after choosing the group */
function setup(group?: "Colours" | "Typography"): AppStore {
  const store = configureStore({ reducer: rootReducer });
  render(
    <Provider store={store}>
      <TemplateDesignPage templateId="t1" />
    </Provider>
  );
  if (group) {
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${group}`) })
    );
  }
  return store;
}

/** One text style is open at a time (headingLg at first): opens the row of another one */
function openStyle(variant: string): void {
  const row = document.querySelector<HTMLElement>(
    `[data-style-row="${variant}"]`
  );
  fireEvent.click(within(row!).getAllByRole("button")[0]);
}

const colorsOf = (store: AppStore) => store.getState().cvData.style.colors!;

const typographyOf = (store: AppStore) =>
  store.getState().cvData.style.typography;

describe("Style settings page", () => {
  it("has the groups Page, Colours and Typography, opens on Page and shows the preview", () => {
    setup();
    const groups = screen.getByLabelText("Design groups");
    for (const name of ["Page", "Colours", "Typography"]) {
      expect(
        within(groups).getByRole("button", { name: new RegExp(`^${name}`) })
      ).toBeTruthy();
    }
    expect(
      screen.getByRole("button", { name: /^Page/ }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(screen.getByLabelText("Template design")).toBeTruthy();
    expect(screen.queryByText("Apply")).toBeNull();
  });

  it("shows one row for each of the 5 styles in Typography and the colours in Colours", () => {
    setup("Typography");
    expect(document.querySelectorAll("[data-style-row]")).toHaveLength(5);
    expect(screen.queryByLabelText("Colours")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Colours/ }));
    expect(screen.getByLabelText("Colours")).toBeTruthy();
    expect(document.querySelectorAll("[data-style-row]")).toHaveLength(0);
  });

  it("steps the size at once", () => {
    const store = setup("Typography");
    openStyle("bodyMd");
    expect(typographyOf(store).bodyMd.fontSize).toBe("10pt");
    fireEvent.click(screen.getByLabelText("Increase bodyMd size"));
    expect(typographyOf(store).bodyMd.fontSize).toBe("11pt");
    fireEvent.click(screen.getByLabelText("Decrease bodyMd size"));
    fireEvent.click(screen.getByLabelText("Decrease bodyMd size"));
    expect(typographyOf(store).bodyMd.fontSize).toBe("9pt");
  });

  it("toggles the weight and marks the pressed button", () => {
    const store = setup("Typography");
    openStyle("bodyMd");
    const group = screen.getByLabelText("bodyMd weight");
    const bold = group.querySelectorAll("button")[1];
    fireEvent.click(bold);
    expect(typographyOf(store).bodyMd.fontWeight).toBe("700");
    expect(bold.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a palette, saves a typed colour and refuses an invalid one", () => {
    const store = setup("Colours");
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
    const store = setup("Colours");
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
    setup("Colours");
    fireEvent.click(screen.getByLabelText("Accent colour"));
    expect(screen.getByLabelText(/Accent shade/)).toBeTruthy();
    expect(screen.getByLabelText("Accent hue")).toBeTruthy();
  });

  it("changes the colour with the arrow keys on the shade area", () => {
    const store = setup("Colours");
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

  it("keeps only what is the same everywhere: the options of one section moved to Sections", () => {
    setup();
    expect(screen.queryByText("Show in the header")).toBeNull();
    expect(screen.queryByLabelText("Nationality")).toBeNull();
    expect(screen.queryByLabelText("Links (LinkedIn, GitHub, ...)")).toBeNull();
    expect(screen.queryByText("Publication style")).toBeNull();
    expect(screen.queryByText("Skill Icon")).toBeNull();
    expect(screen.getAllByText("Bullet Point Icon").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Icons next to details")).toBeTruthy();
  });

  it("has no colour field in the style table", () => {
    setup();
    expect(screen.queryByLabelText("bodyMd colour hex")).toBeNull();
  });

  it("explains a low contrast colour in an info tooltip, not in the page", () => {
    setup("Colours");
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
    const store = setup("Typography");
    fireEvent.click(screen.getByLabelText("Increase headingLg size"));
    fireEvent.click(screen.getByText("Reset colours and text styles"));
    expect(typographyOf(store)).toEqual(TypographyVariant);
    expect(colorsOf(store)).toEqual(DEFAULT_COLORS);
  });

  it("tells where a style is used in a tooltip next to it", () => {
    setup("Typography");
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
