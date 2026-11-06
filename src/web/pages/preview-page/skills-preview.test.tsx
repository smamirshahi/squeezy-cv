// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { rootReducer } from "@store/store";
import { RenderedSection } from "@shared/variant/render";

afterEach(cleanup);

function section(
  display?: "none" | "dots" | "bars" | "stars"
): RenderedSection {
  return {
    kind: "section",
    id: "s",
    type: "skills",
    title: "Skills",
    skillStyle: { ...(display ? { display } : {}), columns: 1 },
    items: [
      {
        id: "i",
        fields: { category: "Core" },
        emphasis: "normal",
        bullets: [
          { id: "b1", text: "React", rating: 4 },
          { id: "b2", text: "Git" },
        ],
      },
    ],
  };
}

function draw(display?: "none" | "dots" | "bars" | "stars"): HTMLElement {
  const store = configureStore({ reducer: rootReducer });
  return render(
    <Provider store={store}>
      <SkillsPreviewPage section={section(display)} />
    </Provider>
  ).container;
}

describe("skill levels on the page", () => {
  it("dots and stars are text symbols next to a real-text name", () => {
    expect(draw("dots").textContent).toContain("React");
    expect(draw("dots").textContent).toContain("●●●●○");
    expect(draw("stars").textContent).toContain("★★★★☆");
  });

  it("bars are drawn shapes with no text, and none shows names only", () => {
    const bars = draw("bars");
    expect(bars.querySelector('[data-cv-level="bars"]')).toBeTruthy();
    expect(bars.textContent).not.toMatch(/[●★▰]/);
    const none = draw("none");
    expect(none.querySelector("[data-cv-level]")).toBeNull();
    expect(none.textContent).toContain("React");
  });

  it("a skill without a level has no symbol", () => {
    const text = draw("dots").textContent ?? "";
    expect(text.match(/○/g)?.length).toBe(1);
  });
});
