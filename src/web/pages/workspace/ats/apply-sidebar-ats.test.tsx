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
  it("is a section under the menu on a desktop, below a divider", () => {
    useWidth(1440);
    show();
    const menu = screen.getByRole("navigation", { name: "Job application" });
    expect(
      within(menu).getByRole("link", { name: /Job application/ })
    ).toBeTruthy();
    expect(within(menu).getByRole("link", { name: /Chat/ })).toBeTruthy();
    // the score is not one of the menu's links: it is its own section after them
    expect(within(menu).queryByText("ATS score")).toBeNull();
    const section = screen.getByRole("region", { name: "ATS score" });
    expect(section).toBeTruthy();
    expect(screen.getByRole("separator", { name: /Resize/ })).toBeTruthy();
    expect(
      menu.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /ATS score/ })).toBeNull();
  });

  it("is a tab below a desktop, with the latest score beside it", () => {
    useWidth(1024);
    show();
    const tab = screen.getByRole("link", { name: /ATS score/ });
    expect(tab.getAttribute("href")).toBe("/jobs/main?view=ats");
    expect(screen.queryByRole("region", { name: "ATS score" })).toBeNull();
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
