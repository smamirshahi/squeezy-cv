// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { TopBar } from "@pages/workspace/top-bar";
import { ToolRail } from "@pages/workspace/tool-rail";
import { markTutorialSeen } from "@pages/workspace/tutorial-seen";
import { undoableReducer } from "@store/store";

/** A window as wide as a phone: only the queries that say "max-width" match */
function useWidth(width: number): void {
  vi.stubGlobal("matchMedia", (query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const isMatch =
      (max ? width <= Number(max[1]) : true) &&
      (min ? width >= Number(min[1]) : true);
    return {
      matches: isMatch,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    };
  });
}

function showBoth(): void {
  window.history.replaceState(null, "", "/vault");
  render(
    <Provider store={configureStore({ reducer: undoableReducer })}>
      <TopBar />
      <ToolRail />
    </Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
  markTutorialSeen("vault");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("phone shell", () => {
  it("moves About, Settings and the theme switch into the More menu", () => {
    useWidth(390);
    showBoth();
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Vault/ })).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "How the app works" })
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "About CV Builder and its author" })
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("keeps About, Settings and the flow steps in the rail and bar on a desktop", () => {
    useWidth(1440);
    showBoth();
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "How the app works" })
    ).toBeTruthy();
  });
});
