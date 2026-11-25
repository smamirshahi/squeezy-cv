// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { TopBar } from "@pages/workspace/top-bar";
import {
  hasSeenTutorial,
  hasSeenWelcome,
  markTutorialSeen,
  markWelcomeSeen,
  setAutoStartOff,
} from "@pages/workspace/tutorial-seen";
import { undoableReducer } from "@store/store";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import { openTutorial } from "@pages/workspace/tutorial-event";

beforeEach(() => {
  localStorage.clear();
  // The page tutorials below are for people who have been welcomed already
  markWelcomeSeen();
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
      screen.getByRole("dialog", { name: "Start from the advert" })
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
    expect(
      screen.getByRole("dialog", { name: "Where does each job stand?" })
    ).toBeTruthy();
    expect(hasSeenTutorial("applications")).toBe(true);
    expect(hasSeenTutorial("apply")).toBe(false);
    cleanup();

    show("/applications");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the Applications tutorial on an opened application too", () => {
    show("/applications/abc");
    expect(
      screen.getByRole("dialog", { name: "Where does each job stand?" })
    ).toBeTruthy();
    expect(hasSeenTutorial("applications")).toBe(true);
  });

  it("shows no tutorial by itself on a page that has none, such as Settings", () => {
    show("/settings");
    expect(
      screen.queryByRole("dialog", { name: "Where does each job stand?" })
    ).toBeNull();
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
    expect(
      screen.getByRole("dialog", { name: "Where does each job stand?" })
    ).toBeTruthy();
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

describe("welcome on the very first open", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens the Welcome overview once, before any page tutorial", () => {
    show("/jobs");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(hasSeenWelcome()).toBe(true);
    expect(hasSeenTutorial("apply")).toBe(false);
    cleanup();

    show("/jobs");
    expect(
      screen.getByRole("dialog", { name: "Start from the advert" })
    ).toBeTruthy();
  });

  it("does not open when someone has seen a page tutorial before", () => {
    markTutorialSeen("vault");
    show("/settings");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("respects Don't show on start", () => {
    setAutoStartOff(true);
    show("/settings");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the AI tutorial on the first open of the AI settings (#504)", () => {
  it("opens the first time the AI settings are opened, and not again", async () => {
    show("/settings");
    expect(hasSeenTutorial("ai")).toBe(false);
    openAiSettings();
    expect(
      await screen.findByRole("dialog", {
        name: "AI is a helper, not the author",
      })
    ).toBeTruthy();
    expect(hasSeenTutorial("ai")).toBe(true);
    cleanup();

    show("/settings");
    openAiSettings("chat");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays closed when tutorials are switched off on start", async () => {
    setAutoStartOff(true);
    show("/settings");
    openAiSettings();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(hasSeenTutorial("ai")).toBe(false);
  });

  it("opens from a How does this work? link on any time", async () => {
    markTutorialSeen("ai");
    show("/settings");
    openTutorial("ai");
    expect(
      await screen.findByRole("dialog", {
        name: "AI is a helper, not the author",
      })
    ).toBeTruthy();
  });
});
