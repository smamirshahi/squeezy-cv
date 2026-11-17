// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { rootReducer } from "@store/store";
import { RenderedSection } from "@shared/variant/render";
import { setSkillsLayout } from "@store/cv-data/cv-data-slice";

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

describe("skills layout", () => {
  function drawLayout(
    layout: "list" | "two" | "three" | "inline" | undefined,
    jobColumns: 1 | 2 = 1
  ): HTMLElement {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(setSkillsLayout(layout));
    const rendered = section();
    rendered.skillStyle = { columns: jobColumns };
    return render(
      <Provider store={store}>
        <SkillsPreviewPage section={rendered} />
      </Provider>
    ).container;
  }

  /** The grid size (12, 6, 4 or "auto") of every skill, not of the group heading */
  const widths = (container: HTMLElement): string[] =>
    [...container.querySelectorAll(".MuiGrid-container [data-cv-block]")].map(
      (block) => /MuiGrid-grid-xs-(\w+)/.exec(block.className)?.[1] ?? ""
    );

  it("is one skill per line when nothing is set, or the job's two columns", () => {
    const [first] = widths(drawLayout(undefined));
    cleanup();
    expect(first).toBe("12");
    expect(widths(drawLayout(undefined, 2))[0]).toBe("6");
  });

  it("the template's columns win over the job's", () => {
    expect(widths(drawLayout("two"))[0]).toBe("6");
    cleanup();
    expect(widths(drawLayout("three", 2))[0]).toBe("4");
  });

  it("one line sizes each skill to its content", () => {
    expect(widths(drawLayout("inline"))[0]).toBe("auto");
  });

  it("keeps every skill in every layout", () => {
    for (const layout of ["list", "two", "three", "inline"] as const) {
      const text = drawLayout(layout).textContent ?? "";
      cleanup();
      expect(text).toContain("React");
      expect(text).toContain("Git");
    }
  });
});
