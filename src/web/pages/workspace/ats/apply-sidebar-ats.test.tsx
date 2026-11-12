// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { ApplySidebar } from "@pages/workspace/apply-sidebar";
import { sampleStore } from "@pages/workspace/ai-test-helpers";
import { navigate } from "@hooks/navigation";
import { markPlaceholder } from "@store/jobs/jobs-slice";

/** A window as wide as `width`: only the queries that match it are true */
function useWidth(width: number): void {
  vi.stubGlobal("matchMedia", (query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    return {
      matches:
        (max ? width <= Number(max[1]) : true) &&
        (min ? width >= Number(min[1]) : true),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    };
  });
}

function show(hasJob = true): void {
  const store = sampleStore();
  if (!hasJob) {
    store.dispatch(markPlaceholder());
  }
  render(
    <Provider store={store}>
      <ApplySidebar jobId={hasJob ? "main" : undefined} />
    </Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/jobs/main");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the ATS score in the Apply menu", () => {
  it("is a button under Chat on a desktop, with a summary below the menu", () => {
    useWidth(1440);
    show();
    const menu = screen.getByRole("navigation", { name: "Job application" });
    const chat = within(menu).getByRole("link", { name: /Chat/ });
    const ats = within(menu).getByRole("link", { name: /ATS score/ });
    expect(ats.getAttribute("href")).toBe("/jobs/main?view=ats");
    expect(
      chat.compareDocumentPosition(ats) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // both are AI entries: sparkle icon and AI colour
    expect(
      ats.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
    // the big panel is on its own page; the sidebar keeps the number and the status
    expect(screen.queryByRole("region", { name: "ATS score" })).toBeNull();
    const summary = screen.getByRole("region", { name: "ATS score summary" });
    expect(within(summary).getByText("Not scanned yet")).toBeTruthy();
    expect(
      within(summary).getByRole("img", { name: "ATS score: not analysed yet" })
    ).toBeTruthy();
    expect(screen.getByRole("separator", { name: /Resize/ })).toBeTruthy();
    expect(within(summary).queryByRole("button")).toBeNull();
  });

  it("does not repeat the score in the menu button on a desktop", () => {
    useWidth(1440);
    show();
    expect(
      screen.getByRole("link", { name: /ATS score/ }).textContent
    ).not.toMatch(/\d/);
  });

  it("is a tab below a desktop, with the latest score beside it", () => {
    useWidth(1024);
    show();
    const tab = screen.getByRole("link", { name: /ATS score/ });
    expect(tab.getAttribute("href")).toBe("/jobs/main?view=ats");
    expect(screen.queryByRole("region", { name: "ATS score" })).toBeNull();
    expect(
      screen.queryByRole("region", { name: "ATS score summary" })
    ).toBeNull();
    expect(tab.textContent).not.toMatch(/\d/);
  });

  it("marks the tab as the open page on its own address", () => {
    useWidth(1024);
    window.history.replaceState(null, "", "/jobs/main?view=ats");
    show();
    expect(
      screen
        .getByRole("link", { name: /ATS score/ })
        .getAttribute("aria-current")
    ).toBe("page");
  });

  it("navigates to the score when the tab is clicked", () => {
    useWidth(600);
    show();
    fireEvent.click(screen.getByRole("link", { name: /ATS score/ }));
    expect(window.location.search).toBe("?view=ats");
    navigate({ kind: "jobs", jobId: "main", view: "page" });
  });

  it("is disabled with its reason until there is a job", () => {
    useWidth(1024);
    show(false);
    expect(screen.queryByRole("link", { name: /ATS score/ })).toBeNull();
    const disabled = screen
      .getAllByTitle("Start a job application first")
      .find((entry) => entry.textContent?.includes("ATS score"));
    expect(disabled?.getAttribute("aria-disabled")).toBe("true");
  });
});
