// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { TopBar } from "@pages/workspace/top-bar";
import {
  hasSeenTutorial,
  markTutorialSeen,
} from "@pages/workspace/tutorial-seen";
import { undoableReducer } from "@store/store";

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

function show(path: string): void {
  window.history.replaceState(null, "", path);
  render(
    <Provider store={configureStore({ reducer: undoableReducer })}>
      <TopBar />
    </Provider>
  );
}

describe("tutorials on the first visit of a page", () => {
  it("opens the Apply tutorial the first time the Apply page is visited, and not again", () => {
    show("/jobs");
    expect(
      screen.getByRole("dialog", { name: "Start with the advert" })
    ).toBeTruthy();
    expect(hasSeenTutorial("apply")).toBe(true);
    cleanup();

    show("/jobs");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open the tutorials of the other pages", () => {
    show("/jobs");
    expect(hasSeenTutorial("vault")).toBe(false);
    expect(hasSeenTutorial("template")).toBe(false);
  });

  it("opens the Vault tutorial on the Vault page", () => {
    show("/vault");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(hasSeenTutorial("vault")).toBe(true);
    expect(hasSeenTutorial("apply")).toBe(false);
  });

  it("opens the Template tutorial on the Templates page", () => {
    show("/templates");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(hasSeenTutorial("template")).toBe(true);
  });

  it("opens the Applications tutorial the first time the Applications page is visited, and not again", () => {
    show("/applications");
    expect(screen.getByRole("dialog", { name: "Applications" })).toBeTruthy();
    expect(hasSeenTutorial("applications")).toBe(true);
    expect(hasSeenTutorial("apply")).toBe(false);
    cleanup();

    show("/applications");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the Applications tutorial on an opened application too", () => {
    show("/applications/abc");
    expect(screen.getByRole("dialog", { name: "Applications" })).toBeTruthy();
    expect(hasSeenTutorial("applications")).toBe(true);
  });

  it("shows no tutorial by itself on a page that has none, such as Settings", () => {
    show("/settings");
    expect(screen.queryByRole("dialog", { name: "Applications" })).toBeNull();
    expect(hasSeenTutorial("applications")).toBe(false);
  });

  it("lists the Applications tutorial when the Tutorials button is used", () => {
    markTutorialSeen("applications");
    show("/jobs");
    markTutorialSeen("apply");
    cleanup();
    show("/jobs");
    fireEvent.click(screen.getByRole("button", { name: "Tutorials" }));
    fireEvent.click(screen.getByRole("button", { name: /Your applications/ }));
    expect(screen.getByRole("dialog", { name: "Applications" })).toBeTruthy();
    expect(screen.getByText("Your applications · Step 1 of 4")).toBeTruthy();
  });

  it("the Tutorials button opens one again after it was seen", () => {
    markTutorialSeen("vault");
    markTutorialSeen("template");
    markTutorialSeen("apply");
    markTutorialSeen("applications");
    show("/jobs");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tutorials" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("the feedback button", () => {
  it("sits right of the Tutorials button and opens the feedback dialog", () => {
    show("/settings");
    const buttons = screen.getAllByRole("button");
    const tutorials = buttons.findIndex(
      (b) => b.getAttribute("aria-label") === "Tutorials"
    );
    expect(buttons[tutorials + 1].getAttribute("aria-label")).toBe(
      "Send feedback"
    );
    fireEvent.click(buttons[tutorials + 1]);
    expect(screen.getByRole("dialog", { name: "Send feedback" })).toBeTruthy();
  });
});
