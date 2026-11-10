// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  AwardsPreviewPage,
  InterestsPreviewPage,
} from "@pages/preview-page/awards-interests-preview-page";
import { rootReducer } from "@store/store";
import { RenderedSection } from "@shared/variant/render";

afterEach(cleanup);

function section(
  type: "awards" | "interests",
  fields: Record<string, string>[]
): RenderedSection {
  return {
    kind: "section",
    id: type,
    type,
    title: type === "awards" ? "Awards" : "Personal Interests",
    items: fields.map((f, index) => ({
      id: `i${index}`,
      fields: f,
      emphasis: "normal",
      bullets: [],
    })),
  };
}

function draw(node: JSX.Element): HTMLElement {
  const store = configureStore({ reducer: rootReducer });
  return render(<Provider store={store}>{node}</Provider>).container;
}

describe("awards on the page", () => {
  it("writes title, issuer and date on one line with the description under it", () => {
    const page = draw(
      <AwardsPreviewPage
        section={section("awards", [
          {
            title: "Best Poster",
            issuer: "MARUM",
            date: "2015",
            description: "PhD Days Conference",
          },
        ])}
      />
    );
    expect(page.textContent).toContain("Awards");
    expect(page.textContent).toContain("Best Poster, MARUM, 2015");
    expect(page.textContent).toContain("PhD Days Conference");
  });

  it("leaves out empty parts and links the line when there is a link", () => {
    const page = draw(
      <AwardsPreviewPage
        section={section("awards", [
          { title: "Prize", issuer: "", date: "", link: "example.org/prize" },
        ])}
      />
    );
    expect(page.textContent).toContain("Prize");
    expect(page.textContent).not.toContain("Prize,");
    expect(page.querySelector("a")?.getAttribute("href")).toContain(
      "example.org/prize"
    );
  });

  it("draws nothing without items", () => {
    expect(
      draw(<AwardsPreviewPage section={section("awards", [])} />).innerHTML
    ).toBe("");
  });
});

describe("personal interests on the page", () => {
  it("joins the interests and the detail with a dash", () => {
    const page = draw(
      <InterestsPreviewPage
        section={section("interests", [
          { title: "Cycling", detail: "Club cyclist" },
          { title: "Puzzles" },
        ])}
      />
    );
    expect(page.textContent).toContain("Cycling – Club cyclist");
    expect(page.textContent).toContain("Puzzles");
    expect(page.textContent).not.toContain("Puzzles –");
  });

  it("draws nothing without items", () => {
    expect(
      draw(<InterestsPreviewPage section={section("interests", [])} />)
        .innerHTML
    ).toBe("");
  });
});
