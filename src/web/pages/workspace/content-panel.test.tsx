// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { ContentPanel } from "@pages/workspace/content-panel";
import { OPEN_GENERAL_EVENT } from "@pages/workspace/general-settings-event";
import { sampleStore, stubAiServer } from "@pages/workspace/ai-test-helpers";
import { sectionsSelector } from "@store/vault/vault-slice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  stubAiServer();
  const store = sampleStore();
  render(
    <Provider store={store}>
      <ContentPanel />
    </Provider>
  );
  return store;
}

describe("ContentPanel as a step-by-step wizard", () => {
  it("opens on the General step, with the step count and a progress bar", () => {
    const store = setup();
    const total = 2 + sectionsSelector(store.getState()).length;
    expect(screen.getByText(`Step 1 of ${total}`)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "General" })).toBeTruthy();
    expect(
      screen.getByRole("img", { name: `Step 1 of ${total}` })
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "General" })).toBeTruthy();
  });

  it("names the step that Next and Back go to", () => {
    setup();
    const back = screen.getByRole("button", { name: "Back" });
    expect((back as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Next: Header and links" })
    );
    expect(
      screen.getByRole("heading", { name: "Header and links" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back: General" })).toBeTruthy();
    // the next step after the header is the first section
    const next = screen.getByRole("button", { name: /^Next: / });
    fireEvent.click(next);
    expect(
      screen.getByRole("button", { name: "Back: Header and links" })
    ).toBeTruthy();
  });

  it("the page limit lives on the General step only", () => {
    setup();
    expect(screen.getByRole("button", { name: "2 pages" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Next: Header and links" })
    );
    expect(screen.queryByRole("button", { name: "2 pages" })).toBeNull();
  });

  it("goes back to General when asked from the page-limit warning", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Next: Header and links" })
    );
    act(() => {
      window.dispatchEvent(new Event(OPEN_GENERAL_EVENT));
    });
    expect(screen.getByRole("heading", { name: "General" })).toBeTruthy();
  });

  it("the Go to step menu jumps to any step", () => {
    setup();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Go to step" }));
    fireEvent.click(screen.getByRole("option", { name: "Header and links" }));
    expect(
      screen.getByRole("heading", { name: "Header and links" })
    ).toBeTruthy();
  });
});
